
export const TABLE_WIDTH = 4; // feet
export const TABLE_DEPTH = 8; // feet
export const TABLE_HEIGHT = 3.5; // feet
export const GRAVITY = 32.2; // feet/s^2
export const CUP_RADIUS = 0.3; // feet (approx pint glass)
export const DIE_SIZE = 0.15; // feet (slightly bigger)

export const WORLD_SCALE = 100; // pixels per foot

export const MIN_HEIGHT_REQ = 8; // feet (minimum height for a valid toss)

export const COLORS = {
  TABLE: '#8B4513', // Plywood brown
  TABLE_LINE: '#FFFFFF',
  GRASS: '#4CAF50',
  SKY: '#87CEEB',
  DIE: '#FFFFFF',
  CUP: '#FF0000',
  PLAYER_1: '#3B82F6',
  PLAYER_2: '#EF4444',
  PLAYER_3: '#10B981',
  PLAYER_4: '#F59E0B',
  PLAYER_5: '#8B5CF6',
  PLAYER_6: '#EC4899',
};

export const TEAM_NAMES = [
  'Tazer Lasers', 'Tommy Daggers', 'Johnny Mortars', 'Pasha Rocket', 'Milo Launcher',
  'Die-Hard Drinkers', 'The Pint-Sized Pros', 'The Beer-ly Legal', 'Toss Bosses', 'The Die-namic Duo',
  'Sluggers', 'Bombers', 'Table Titans', 'Pint Pirates', 'Foam Fighters',
  'The Foam-O Sapiens', 'Die Another Day'
];

export const TEAM_COLORS = [
  COLORS.PLAYER_1, COLORS.PLAYER_2, COLORS.PLAYER_3, 
  COLORS.PLAYER_4, COLORS.PLAYER_5, COLORS.PLAYER_6
];
