import type { AppStateV1 } from "./types";

export const defaultState: AppStateV1 = {
  version: 1,
  players: [],
  activePlayerId: undefined,
  sets: [],
  words: [],
  activeSetId: undefined,
  gameStatus: "setup",
  currentPuzzleIndex: 0,
  puzzles: [],
};
