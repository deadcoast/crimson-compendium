// Dependency-free helpers shared by core and branch components (kept separate to avoid import cycles).
export const TIER_NAMES: Record<number, string> = {
  1: 'Best in class',
  2: 'Above the rest',
  3: 'Average',
  4: 'Below average',
  5: 'Not good',
};

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Media paths are stored relative to /public; the build serves them beside index.html. */
export const mediaUrl = (src: string) => `./${src}`;

export const CREDITS: Record<string, { name: string; url: string }> = {
  game8: { name: 'Game8', url: 'https://game8.co/games/Crimson-Desert' },
  fextralife: { name: 'Fextralife Wiki', url: 'https://crimsondesertgame.wiki.fextralife.com/' },
  gamerant: { name: 'GameRant', url: 'https://gamerant.com/db/video-game/crimson-desert/' },
  gamesradar: { name: 'GamesRadar+', url: 'https://www.gamesradar.com/' },
  powerupgaming: { name: 'PowerUp Gaming', url: 'https://powerupgaming.co.uk/' },
  gamingpromax: { name: 'Gaming ProMax', url: 'https://gamingpromax.com/' },
  beebom: { name: 'Beebom', url: 'https://beebom.com/crimson-desert-mounts/' },
  mythras: { name: 'Pearl Abyss key art via Mythras', url: 'https://gamertagmythras.com/blog/crimson-desert/crimson-desert-dlc-unlock-requirements' },
};

export const PUBLISHERS: Record<string, string> = {
  game8: 'Game8', fextralife: 'Fextralife', gamerant: 'GameRant', gamesradar: 'GamesRadar+',
  powerupgaming: 'PowerUp Gaming', thegamer: 'TheGamer', vulkk: 'Vulkk', thegameswiki: 'The Games Wiki',
  destructoid: 'Destructoid', gfinity: 'Gfinity', rpgsite: 'RPG Site', keengamer: 'KeenGamer',
  gamingdeputy: 'GamingDeputy', mobalytics: 'Mobalytics', nerdschalk: 'Nerds Chalk', everythingedinburgh: 'Everything Edinburgh',
  allthingshow: 'All Things How', gamingpromax: 'Gaming ProMax', beebom: 'Beebom', mythras: 'Mythras',
};
