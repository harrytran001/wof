export type Player = {
  id: string;
  name: string;
  score: number;
  createdAt: number;
};

export type QuestionSet = {
  id: string;
  name: string;
  createdAt: number;
};

export type WordEntry = {
  id: string;
  text: string;
  theme: string;
  setId: string;
  order: number;
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
  sets: QuestionSet[];
  words: WordEntry[];
  activeSetId?: string; // which set is selected for editing/playing
  gameStatus: GameStatus;
  currentPuzzleIndex: number;
  puzzles: PuzzleState[]; // one per word when game starts
};
