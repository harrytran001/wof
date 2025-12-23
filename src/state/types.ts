export type Player = {
  id: string;
  name: string;
  score: number;
  createdAt: number;
};

export type WordEntry = {
  id: string;
  text: string;
  theme: string;
  order: number;
  used: boolean;
  createdAt: number;
};

export type GameStatus = "setup" | "playing" | "ended";

export type PuzzleState = {
  wordId: string;
  revealedLetters: string[]; // lowercase letters that have been revealed
  wrongLetters: string[]; // lowercase letters guessed but not in word
  solved: boolean;
};

export type AppStateV1 = {
  version: 1;
  players: Player[];
  activePlayerId?: string;
  words: WordEntry[];
  gameStatus: GameStatus;
  currentPuzzleIndex: number;
  puzzles: PuzzleState[]; // one per word when game starts
};
