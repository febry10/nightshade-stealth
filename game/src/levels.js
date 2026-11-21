// Nightshade — Silent Infiltration: the three missions.
//
// Maps are plain text grids. Legend:
//   '#' wall (blocks movement and sight)   '.' floor
//   's' shadow floor (dark: detection is slower there)
//   'C' crate (blocks movement and sight)  'P' player start
//   'X' exit (opens once every artifact is stolen)
// Guards, cameras and artifacts are placed in the `guards`, `cameras` and
// `artifacts` lists below, in tile coordinates; a level's `par` is the time
// in seconds a clean run should take, for the time bonus.

import { TILE } from './config.js';

export const LEVELS = [
  {
    name: 'The Gallery',
    briefing:
      'A quiet museum after closing. Steal the Moon Pearl and the Sun Opal, then slip out the south door. Three guards walk the halls — stay out of their lantern light.',
    par: 75,
    map: [
      '##############################',
      '#P...ss......##......ss......#',
      '#....ss......##..............#',
      '#..C....C....##...C....C.....#',
      '#............................#',
      '#............................#',
      '#..C....C....##...C....C.....#',
      '#....ss......##......ss......#',
      '#....ss......##......ss......#',
      '#............................#',
      '#..C....C....##...C....C.....#',
      '#............................#',
      '#....ss......##......ss......#',
      '#....ss......##......ss......#',
      '#..C....C....##...C....C.....#',
      '#............................#',
      '#....ss......##......ss...X..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 5], [12, 5]] },
      { waypoints: [[20, 4], [20, 13]] },
      { waypoints: [[16, 15], [27, 15]] },
    ],
    cameras: [],
    artifacts: [
      { col: 21, row: 1, name: 'Moon Pearl' },
      { col: 24, row: 16, name: 'Sun Opal' },
    ],
  },
  {
    name: 'The Manor',
    briefing:
      'Lord Vey’s manor, three treasures behind locked doors and one watching eye. Four guards and a turning camera — the shadows are your only friends here.',
    par: 105,
    map: [
      '##############################',
      '#P....ss....#......ss..#.....#',
      '#....ss....#...........#.....#',
      '#..C....C..#...C....C..#.....#',
      '#..........#...........#..C..#',
      '#..........#...........#.....#',
      '#......ss........ss..........#',
      '#..C.......C......C......C...#',
      '#............................#',
      '#.....####.....####.....#....#',
      '#.....#...........#.....#....#',
      '#..C..#..ss...C..#..C..#.....#',
      '#.....#...........#.....#....#',
      '#.....#....ss....#.....#.....#',
      '#.....#...........#.....#....#',
      '#.....#....C......#.....#..X.#',
      '#.....#...........#.....#....#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 6], [13, 6]] },
      { waypoints: [[16, 6], [27, 6]] },
      { waypoints: [[24, 1], [24, 8]] },
      { waypoints: [[2, 10], [2, 15]] },
    ],
    cameras: [{ col: 12, row: 9, base: Math.PI / 2, sweep: 1.1, speed: 0.45 }],
    artifacts: [
      { col: 26, row: 2, name: 'Jade Idol' },
      { col: 26, row: 12, name: 'Ruby Mask' },
      { col: 2, row: 15, name: 'Ivory Key' },
    ],
  },
  {
    name: 'The Vault',
    briefing:
      'The Nightshade Diamond waits in the vault, behind five guards and two cameras. Take the Diamond and the two vault gems, then vanish. No mistakes tonight.',
    par: 135,
    map: [
      '##############################',
      '#P....ss....#.....ss...#.....#',
      '#....ss.....#..........#..C..#',
      '#..C....C...#..C...C...#.....#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#..C....C...#..C...C...#..C..#',
      '#.....ss........ss........ss.#',
      '#............................#',
      '#..C....C...#..C...C...#..C..#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#..C....C...#..C...C...#.....#',
      '#....ss.....#.....ss...#.....#',
      '#...........#..........#..X..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 5], [10, 5]] },
      { waypoints: [[14, 5], [21, 5]] },
      { waypoints: [[24, 5], [28, 5]] },
      { waypoints: [[2, 12], [10, 12]] },
      { waypoints: [[14, 12], [21, 12]] },
    ],
    cameras: [
      { col: 12, row: 8, base: Math.PI / 2, sweep: 1.2, speed: 0.55 },
      { col: 17, row: 9, base: -Math.PI / 2, sweep: 1.2, speed: 0.5 },
    ],
    artifacts: [
      { col: 16, row: 16, name: 'Nightshade Diamond' },
      { col: 26, row: 15, name: 'Vault Sapphire' },
      { col: 3, row: 2, name: 'Vault Emerald' },
    ],
  },
];

// ---------------------------------------------------------------- parsing

const tileAt = (def, col, row) => def.map[row][col];

export function isWalkable(def, col, row) {
  if (col < 0 || row < 0 || col >= def.map[0].length || row >= def.map.length) return false;
  const t = tileAt(def, col, row);
  return t !== '#' && t !== 'C';
}

function rectOf(col, row) {
  return { x: col * TILE, y: row * TILE, w: TILE, h: TILE };
}

/** Turns a level definition into the rectangles and entities the game uses. */
export function parseLevel(def) {
  const walls = [];
  const crates = [];
  const shadows = [];
  let playerStart = null;
  let exit = null;
  for (let row = 0; row < def.map.length; row++) {
    for (let col = 0; col < def.map[row].length; col++) {
      const t = def.map[row][col];
      if (t === '#') walls.push(rectOf(col, row));
      else if (t === 'C') crates.push(rectOf(col, row));
      else if (t === 's') shadows.push(rectOf(col, row));
      else if (t === 'P') playerStart = { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
      else if (t === 'X') exit = { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2, col, row };
    }
  }
  return {
    walls,
    crates,
    shadows,
    solids: walls.concat(crates),
    playerStart,
    exit,
    guards: def.guards.map((g) => ({
      waypoints: g.waypoints.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 })),
    })),
    cameras: def.cameras.map((c, i) => ({
      x: c.col * TILE + TILE / 2,
      y: c.row * TILE + TILE / 2,
      base: c.base,
      sweep: c.sweep,
      speed: c.speed,
      phase: i,
    })),
    artifacts: def.artifacts.map((a) => ({
      x: a.col * TILE + TILE / 2,
      y: a.row * TILE + TILE / 2,
      name: a.name,
      taken: false,
    })),
  };
}

/** Checks a level definition for the mistakes a hand-written map can hold. */
export function validateLevel(def, index) {
  const problems = [];
  const width = def.map[0].length;
  def.map.forEach((row, i) => {
    if (row.length !== width) problems.push(`level ${index} row ${i}: ${row.length} chars, expected ${width}`);
    for (const ch of row) {
      if (!'# .sCPX'.includes(ch)) problems.push(`level ${index} row ${i}: unknown tile '${ch}'`);
    }
  });
  const flat = def.map.join('');
  if ((flat.match(/P/g) || []).length !== 1) problems.push(`level ${index}: needs exactly one P`);
  if ((flat.match(/X/g) || []).length !== 1) problems.push(`level ${index}: needs exactly one X`);
  const clearPath = (a, b) => {
    // Sample the straight walk between two tile centres; every sample must
    // sit on a walkable tile (walls and crates block a patrol route).
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 4));
    for (let i = 0; i <= steps; i++) {
      const c = Math.floor(a[0] + (dx * i) / steps);
      const r = Math.floor(a[1] + (dy * i) / steps);
      if (!isWalkable(def, c, r)) return false;
    }
    return true;
  };
  def.guards.forEach((g, gi) => {
    g.waypoints.forEach((w, wi) => {
      if (!isWalkable(def, w[0], w[1])) problems.push(`level ${index} guard ${gi} waypoint ${wi} (${w}) is not walkable`);
    });
    for (let i = 0; i < g.waypoints.length; i++) {
      const a = g.waypoints[i];
      const b = g.waypoints[(i + 1) % g.waypoints.length];
      if (!clearPath(a, b)) problems.push(`level ${index} guard ${gi} leg ${a} -> ${b} crosses a wall or crate`);
    }
  });
  def.cameras.forEach((c, ci) => {
    if (!isWalkable(def, c.col, c.row)) problems.push(`level ${index} camera ${ci} (${c.col},${c.row}) is not walkable`);
  });
  def.artifacts.forEach((a, ai) => {
    if (!isWalkable(def, a.col, a.row)) problems.push(`level ${index} artifact ${ai} (${a.col},${a.row}) is not walkable`);
  });
  return problems;
}
