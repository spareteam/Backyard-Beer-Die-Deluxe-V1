
export enum GamePhase {
  START_SCREEN = 'START_SCREEN',
  TEAM_SETUP = 'TEAM_SETUP',
  POSITIONING = 'POSITIONING',
  AIMING_UP = 'AIMING_UP',
  AIMING_SIDE = 'AIMING_SIDE',
  POWER = 'POWER',
  FLIGHT = 'FLIGHT',
  DEFENSE = 'DEFENSE',
  RESULT = 'RESULT',
  GAME_OVER = 'GAME_OVER'
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Player {
  name: string;
  isCPU: boolean;
  jerseyNumber: number;
}

export interface Team {
  name: string;
  color: string;
  players: Player[];
}

export enum Difficulty {
  EASY = 'EASY',
  HARD = 'HARD'
}

export interface Wind {
  speed: number;
  direction: number;
}

export interface ReplayFrame {
  diePosition: Vector3;
  defenderPos: Vector3[];
  isCaught: boolean;
  catcherIndex: number | null;
  isSink: boolean;
  message: string;
}

export interface GameState {
  phase: GamePhase;
  score: [number, number];
  currentPlayerIndex: number;
  diePosition: Vector3;
  dieVelocity: Vector3;
  tossAngleUp: number;
  tossAngleSide: number;
  tossPower: number;
  tossStartPos: Vector3;
  defenderPos: Vector3[];
  cameraLerp: number; // 0 for Isometric, 1 for Head-on
  sideLerp: number; // 0 for Team 1 side, 1 for Team 2 side
  isCaught: boolean;
  catcherIndex: number | null;
  lastCatchAttempt: number[]; // timestamp
  isSink: boolean;
  isDancing: boolean;
  maxHeightReached: number;
  dieStatus: 'none' | 'short' | 'low' | 'live' | 'dead';
  windTurnsLeft: number;
  message: string;
  teams: [Team, Team];
  difficulty: Difficulty;
  wind: Wind; // speed in ft/s, direction in radians
  replayFrames: ReplayFrame[];
  isReplaying: boolean;
  replayIndex: number;
}
