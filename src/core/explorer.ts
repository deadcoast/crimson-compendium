// The explorer's model: the compendium as an IDE-style tree of folders and entries.
// Semantics follow the VS Code tree widget (abstractTree.ts / listWidget.ts):
// fixed-height rows, focus separate from selection, ←/→ collapse-or-parent / expand-or-first-child,
// type navigation with an 800 ms buffer, filter that keeps ancestors, sticky ancestor rows.
import type { Branch, Entry, ListContext, View } from './types';
import { frontOf, href, lensEntries, tierOf, ROMAN } from './tree';

/** VS Code's list row height; touch layouts pass a taller row. */
export const ROW = 22;

export type NodeKind = 'branch' | 'leaf' | 'cat' | 'catleaf' | 'folder' | 'lens' | 'ladder' | 'route' | 'matrix' | 'entry';

export interface TNode {
  key: string;
  dom: string;
  kind: NodeKind;
  label: string;
  desc?: string;
  href?: string;
  accent?: string;
  glyph?: string;
  entry?: Entry;
  /** entry rows: the list they hang in, so opening one keeps that list in the index */
  ctx?: ListContext;
  /** right-hand decoration on entry rows inside a ranked lens */
  rank?: { text: string; top: boolean };
  count?: number;
  children?: TNode[];
  depth: number;
  parent?: TNode;
}

export interface Row {
  node: TNode;
  expanded: boolean;
  /** index of the last row inside this row's subtree */
  last: number;
  posinset: number;
  setsize: number;
  hits?: [number, number];
}

const domId = (key: string) => 'tx-' + key.replace(/[^a-z0-9]+/gi, '_');

function make(parent: TNode | undefined, part: string, n: Omit<TNode, 'key' | 'dom' | 'depth' | 'parent'>): TNode {
  const key = parent ? `${parent.key}/${part}` : part;
  const node: TNode = { ...n, key, dom: domId(key), depth: parent ? parent.depth + 1 : 0, parent };
  if (parent) (parent.children ??= []).push(node);
  return node;
}

function entries(b: Branch, parent: TNode, list: Entry[], ctx: ListContext, rankBy?: string) {
  for (const e of list) {
    const t = rankBy ? Math.round(tierOf(e, rankBy)) : 0;
    make(parent, e.id, {
      kind: 'entry',
      label: e.name,
      href: href.entry(b, e.id),
      entry: e,
      ctx,
      rank: rankBy ? { text: t >= 1 && t <= 5 ? ROMAN[t] : '—', top: t === 1 } : undefined,
    });
  }
}

export function buildTree(branches: Branch[]): TNode[] {
  return branches.map((b) => {
    const accent = b.accent ?? 'crimson';
    const root = make(undefined, b.id, { kind: 'branch', label: b.title, href: href.branch(b), count: b.entries.length, glyph: 'diamond', accent });
    // the branch's views lead it, its front door first: they are where a reader starts, the leaves are what they point into
    const views = [
      ...(b.matrix ? [() => make(root, 'matrix', { kind: 'matrix', label: b.matrix!.title, href: href.matrix(b), glyph: 'grid', accent, count: b.matrix!.sheets[0].rows.length })] : []),
      ...(b.route ? [() => make(root, 'route', { kind: 'route', label: b.route!.title, href: href.route(b), glyph: 'route', accent, count: b.route!.phases.length })] : []),
    ];
    if (frontOf(b) === 'route') views.reverse();
    views.forEach((v) => v());
    for (const l of b.leaves) {
      const members = b.entries.filter((e) => e.leaf === l.id);
      const n = make(root, `leaf:${l.id}`, { kind: 'leaf', label: l.label, href: href.leaf(b, l.id), accent: l.accent, count: members.length });
      entries(b, n, members, { kind: 'leaf', id: l.id });
    }
    for (const c of b.categories) {
      const n = make(root, `cat:${c.id}`, { kind: 'cat', label: c.label, desc: c.subtitle, href: href.cat(b, c.id), accent: c.accent, glyph: c.glyph, count: c.entries.length });
      for (const cl of c.leaves) {
        const ln = make(n, cl.id, { kind: 'catleaf', label: cl.label, href: href.cat(b, c.id, cl.id), accent: cl.accent, count: cl.entries.length });
        entries(b, ln, cl.entries, { kind: 'cat', id: c.id, leaf: cl.id });
      }
    }
    // a branch with no lenses gets no empty folder
    const ride = b.lenses.length ? make(root, 'ride', { kind: 'folder', label: b.labels?.lenses ?? 'Ride for', glyph: 'lens', accent }) : root;
    for (const lens of b.lenses) {
      const list = lensEntries(b, lens);
      const n = make(ride, lens.id, { kind: 'lens', label: lens.label, href: href.lens(b, lens.id), accent, count: list.length });
      entries(b, n, list, { kind: 'lens', id: lens.id }, lens.sortBy);
    }
    make(root, 'ladder', { kind: 'ladder', label: 'Tier ladder', href: href.ladder(b), glyph: 'ladder', accent });
    return root;
  });
}

export function index(roots: TNode[]): Map<string, TNode> {
  const m = new Map<string, TNode>();
  const walk = (n: TNode) => { m.set(n.key, n); n.children?.forEach(walk); };
  roots.forEach(walk);
  return m;
}

/** The list node a context lives at — where the active entry row hangs. */
export function ctxKey(b: Branch, ctx: ListContext): string {
  if (ctx.kind === 'leaf') return `${b.id}/leaf:${ctx.id}`;
  if (ctx.kind === 'lens') return `${b.id}/ride/${ctx.id}`;
  return `${b.id}/cat:${ctx.id}${ctx.leaf ? '/' + ctx.leaf : ''}`;
}

/** The row the current route selects. An entry under a whole category resolves to its category leaf. */
export function activeKey(view: View, ctx: ListContext, nodes: Map<string, TNode>): string {
  const b = view.branch;
  if (view.kind === 'ladder') return `${b.id}/ladder`;
  if (view.kind === 'route') return `${b.id}/route`;
  if (view.kind === 'matrix') return `${b.id}/matrix`;
  if (view.kind !== 'entry') return ctxKey(b, ctx);
  const direct = `${ctxKey(b, ctx)}/${view.entry.id}`;
  if (nodes.has(direct)) return direct;
  if (ctx.kind === 'cat') {
    const cat = b.categories.find((c) => c.id === ctx.id);
    const cl = cat?.leaves.find((l) => l.entries.includes(view.entry));
    if (cl) return `${b.id}/cat:${ctx.id}/${cl.id}/${view.entry.id}`;
  }
  return `${b.id}/leaf:${view.entry.leaf}/${view.entry.id}`;
}

export const ancestors = (n: TNode | undefined): TNode[] => {
  const out: TNode[] = [];
  for (let p = n?.parent; p; p = p.parent) out.unshift(p);
  return out;
};

export function hitRange(label: string, q: string): [number, number] | undefined {
  if (!q) return undefined;
  const i = label.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? undefined : [i, i + q.length];
}

/** Visible rows. With a filter, a node shows when it or a descendant matches, and ancestors of matches open. */
export function flatten(roots: TNode[], expanded: Set<string>, q = ''): Row[] {
  const rows: Row[] = [];
  const keep = new Map<TNode, boolean>();
  const matchDown = (n: TNode): boolean => {
    const self = !!hitRange(n.label, q);
    const kids = (n.children ?? []).map(matchDown).some(Boolean);
    keep.set(n, self || kids);
    return self || kids;
  };
  if (q) roots.forEach(matchDown);

  const visit = (n: TNode, pos: number, size: number) => {
    const childKids = (n.children ?? []).filter((c) => !q || keep.get(c));
    const open = childKids.length > 0 && (!!q || expanded.has(n.key));
    const row: Row = { node: n, expanded: open, last: rows.length, posinset: pos, setsize: size, hits: hitRange(n.label, q) };
    rows.push(row);
    if (open) childKids.forEach((c, i) => visit(c, i + 1, childKids.length));
    row.last = rows.length - 1;
  };
  const tops = roots.filter((r) => !q || keep.get(r));
  tops.forEach((r, i) => visit(r, i + 1, tops.length));
  return rows;
}

/** VS Code-style sticky scroll: the ancestors of the row under the stack pin to the top, pushed up by the next one. */
export function stickyRows(rows: Row[], at: Map<string, number>, scrollTop: number, ROW = 22, max = 3): { i: number; y: number }[] {
  const out: { i: number; y: number }[] = [];
  for (let level = 0; level < max; level++) {
    const under = rows[Math.floor((scrollTop + level * ROW) / ROW)];
    if (!under) break;
    let n: TNode | undefined = under.node;
    while (n && n.depth > level) n = n.parent;
    if (!n || n.depth !== level) break;
    const i = at.get(n.key);
    if (i === undefined || !rows[i].expanded || i * ROW >= scrollTop + level * ROW) break;
    const bottom = (rows[i].last + 1) * ROW - scrollTop;
    const y = Math.min(level * ROW, bottom - ROW);
    out.push({ i, y });
    if (y < level * ROW) break;
  }
  return out;
}
