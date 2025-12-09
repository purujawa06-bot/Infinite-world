
export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface Food {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
}

export enum GameStatus {
  MENU,
  PLAYING,
  GAME_OVER
}

export const WORLD_SIZE = 3000;
export const INITIAL_RADIUS = 20;
