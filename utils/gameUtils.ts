import { WORLD_SIZE } from '../types';

export const getRandomColor = () => {
  const hues = [0, 60, 120, 180, 240, 300, 330];
  const hue = hues[Math.floor(Math.random() * hues.length)];
  return `hsl(${hue}, 70%, 60%)`;
};

export const getRandomPosition = () => {
  return Math.floor(Math.random() * WORLD_SIZE);
};

// Helper to get shortest delta on a wrapping map
export const getWrappedDelta = (v1: number, v2: number): number => {
  let delta = v2 - v1;
  if (delta > WORLD_SIZE / 2) delta -= WORLD_SIZE;
  if (delta < -WORLD_SIZE / 2) delta += WORLD_SIZE;
  return delta;
};

export const checkCollision = (
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean => {
  const dx = getWrappedDelta(x1, x2);
  const dy = getWrappedDelta(y1, y2);
  const dist = Math.hypot(dx, dy);
  return dist < r1 + r2; // Simple intersection
};

export const checkConsumption = (
  predatorR: number,
  preyR: number,
  dist: number
): boolean => {
  // Center of predator must cover center of prey somewhat, and predator must be significantly larger
  return predatorR > preyR * 1.1 && dist < predatorR - preyR * 0.3;
};
