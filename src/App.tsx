import * as React from "react";
import * as XLSX from "xlsx";
import { defaultState } from "./state/defaultState";
import type { AppStateV1, Player, WordEntry, PuzzleState } from "./state/types";
import { usePersistedState } from "./state/usePersistedState";
import { id } from "./lib/ids";
import { AdminView } from "./components/AdminView";
import { GameView } from "./components/GameView";

type Tab = "game" | "admin";

const STORAGE_KEY = "wof_state_v1";

function migrateToV1(raw: unknown): AppStateV1 {
  const asAny = raw as Partial<AppStateV1> | null;
  if (!asAny || asAny.version !== 1) return defaultState;
  
  // Migrate puzzles to include wrongLetters if missing
  const puzzles = Array.isArray(asAny.puzzles) 
    ? asAny.puzzles.map((p) => ({
        ...p,
        wrongLetters: p.wrongLetters ?? [],
      }))
    : [];
  
  // Migrate words to include theme if missing
  const words = Array.isArray(asAny.words)
    ? asAny.words.map((w) => ({
        ...w,
        theme: w.theme ?? "",
      }))
    : [];
  
  return {
    ...defaultState,
    ...asAny,
    players: Array.isArray(asAny.players) ? asAny.players : [],
    words,
    puzzles,
    gameStatus: asAny.gameStatus ?? "setup",
    currentPuzzleIndex: asAny.currentPuzzleIndex ?? 0,
  };
}

export function App() {
  const [tab, setTab] = React.useState<Tab>("admin");
  const [state, setState] = usePersistedState<AppStateV1>({
    key: STORAGE_KEY,
    defaultValue: defaultState,
    migrate: migrateToV1,
  });

  const update = (fn: (draft: AppStateV1) => AppStateV1) => setState((prev) => fn(prev));

  // Player actions
  const addPlayer = (name: string) => {
    update((s) => {
      const newPlayer: Player = { id: id("p"), name, score: 0, createdAt: Date.now() };
      return { ...s, players: [...s.players, newPlayer] };
    });
  };

  const removePlayer = (playerId: string) => {
    update((s) => ({ ...s, players: s.players.filter((p) => p.id !== playerId) }));
  };

  const adjustScore = (playerId: string, delta: number) => {
    update((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === playerId ? { ...p, score: p.score + delta } : p)),
    }));
  };

  // Word actions
  const addWord = (text: string, theme: string) => {
    update((s) => {
      const maxOrder = s.words.reduce((max, w) => Math.max(max, w.order), 0);
      const entry: WordEntry = {
        id: id("w"),
        text,
        theme,
        order: maxOrder + 1,
        used: false,
        createdAt: Date.now(),
      };
      return { ...s, words: [...s.words, entry] };
    });
  };

  const deleteWord = (wordId: string) => {
    update((s) => ({ ...s, words: s.words.filter((w) => w.id !== wordId) }));
  };

  const moveWord = (wordId: string, direction: "up" | "down") => {
    update((s) => {
      const sorted = [...s.words].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((w) => w.id === wordId);
      if (idx === -1) return s;
      
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return s;
      
      // Swap orders
      const currentOrder = sorted[idx].order;
      const swapOrder = sorted[swapIdx].order;
      
      return {
        ...s,
        words: s.words.map((w) => {
          if (w.id === wordId) return { ...w, order: swapOrder };
          if (w.id === sorted[swapIdx].id) return { ...w, order: currentOrder };
          return w;
        }),
      };
    });
  };

  // Game actions
  const startGame = () => {
    update((s) => {
      // Use all unused words in order
      const unusedWords = s.words
        .filter((w) => !w.used)
        .sort((a, b) => a.order - b.order);
      
      if (unusedWords.length === 0) return s;

      const newPuzzles: PuzzleState[] = unusedWords.map((w) => ({
        wordId: w.id,
        revealedLetters: [],
        wrongLetters: [],
        solved: false,
      }));

      return {
        ...s,
        gameStatus: "playing",
        currentPuzzleIndex: 0,
        puzzles: newPuzzles,
      };
    });
    setTab("game");
  };

  const endGame = () => {
    update((s) => ({
      ...s,
      gameStatus: "ended",
      puzzles: [],
      currentPuzzleIndex: 0,
    }));
  };

  const guessLetter = (letter: string): { correct: boolean; positions: number[] } => {
    let result = { correct: false, positions: [] as number[] };
    
    update((s) => {
      const puzzle = s.puzzles[s.currentPuzzleIndex];
      if (!puzzle || puzzle.solved) return s;
      
      const lower = letter.toLowerCase();
      // Already guessed this letter
      if (puzzle.revealedLetters.includes(lower) || puzzle.wrongLetters.includes(lower)) {
        return s;
      }
      
      const word = s.words.find((w) => w.id === puzzle.wordId);
      if (!word) return s;
      
      // Find positions where this letter appears
      const positions: number[] = [];
      word.text.split("").forEach((char, idx) => {
        if (char.toLowerCase() === lower) {
          positions.push(idx);
        }
      });
      
      const isCorrect = positions.length > 0;
      result = { correct: isCorrect, positions };
      
      const newPuzzles = [...s.puzzles];
      if (isCorrect) {
        newPuzzles[s.currentPuzzleIndex] = {
          ...puzzle,
          revealedLetters: [...puzzle.revealedLetters, lower],
          wrongLetters: puzzle.wrongLetters,
        };
      } else {
        newPuzzles[s.currentPuzzleIndex] = {
          ...puzzle,
          revealedLetters: puzzle.revealedLetters,
          wrongLetters: [...puzzle.wrongLetters, lower],
        };
      }
      
      return { ...s, puzzles: newPuzzles };
    });
    
    return result;
  };

  const solvePuzzle = () => {
    update((s) => {
      const puzzle = s.puzzles[s.currentPuzzleIndex];
      if (!puzzle || puzzle.solved) return s;
      
      // Mark puzzle as solved
      const newPuzzles = [...s.puzzles];
      newPuzzles[s.currentPuzzleIndex] = { ...puzzle, solved: true };
      
      // Mark word as used
      const newWords = s.words.map((w) =>
        w.id === puzzle.wordId ? { ...w, used: true } : w
      );
      
      return { ...s, puzzles: newPuzzles, words: newWords };
    });
  };

  const nextPuzzle = () => {
    update((s) => {
      if (s.currentPuzzleIndex >= s.puzzles.length - 1) return s;
      return { ...s, currentPuzzleIndex: s.currentPuzzleIndex + 1 };
    });
  };

  const prevPuzzle = () => {
    update((s) => {
      if (s.currentPuzzleIndex <= 0) return s;
      return { ...s, currentPuzzleIndex: s.currentPuzzleIndex - 1 };
    });
  };

  // Data actions
  const resetAll = () => {
    const ok = window.confirm("Reset all data? This cannot be undone.");
    if (!ok) return;
    setState(defaultState);
  };

  const exportExcel = () => {
    // Create workbook with two sheets: Words and Players
    const wb = XLSX.utils.book_new();
    
    // Words sheet
    const wordsData = [...state.words]
      .sort((a, b) => a.order - b.order)
      .map((w, idx) => ({
        "Order": idx + 1,
        "Theme": w.theme || "",
        "Word/Phrase": w.text,
        "Used": w.used ? "Yes" : "No",
      }));
    const wordsSheet = XLSX.utils.json_to_sheet(wordsData);
    wordsSheet["!cols"] = [{ wch: 8 }, { wch: 20 }, { wch: 40 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wordsSheet, "Words");
    
    // Players sheet
    const playersData = state.players.map((p) => ({
      "Name": p.name,
      "Score": p.score,
    }));
    const playersSheet = XLSX.utils.json_to_sheet(playersData);
    playersSheet["!cols"] = [{ wch: 25 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, playersSheet, "Players");
    
    // Download
    XLSX.writeFile(wb, "wheel-of-fortune.xlsx");
  };

  const importExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        
        // Helper to find column value with flexible naming
        const findCol = (row: Record<string, unknown>, ...names: string[]): string | undefined => {
          for (const name of names) {
            // Try exact match first
            if (row[name] !== undefined) return String(row[name]);
            // Try case-insensitive
            const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
            if (key && row[key] !== undefined) return String(row[key]);
          }
          return undefined;
        };
        
        // Read Words sheet (or first sheet if "Words" doesn't exist)
        const wordsSheet = wb.Sheets["Words"] || wb.Sheets[wb.SheetNames[0]];
        const importedWords: WordEntry[] = [];
        
        if (wordsSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wordsSheet);
          rows.forEach((row, idx) => {
            // Flexible column matching for word/phrase
            const text = findCol(row, "Word/Phrase", "Word", "Phrase", "Text", "Answer")?.trim();
            if (text) {
              const orderVal = findCol(row, "Order", "#", "No", "Number");
              const themeVal = findCol(row, "Theme", "Category", "Topic");
              const usedVal = findCol(row, "Used", "Done", "Completed");
              
              importedWords.push({
                id: id("w"),
                text,
                theme: themeVal?.trim() || "",
                order: orderVal ? parseInt(orderVal, 10) : idx + 1,
                used: usedVal?.toLowerCase() === "yes" || usedVal?.toLowerCase() === "true",
                createdAt: Date.now(),
              });
            }
          });
        }
        
        // Read Players sheet
        const playersSheet = wb.Sheets["Players"];
        const importedPlayers: Player[] = [];
        
        if (playersSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(playersSheet);
          rows.forEach((row) => {
            const name = findCol(row, "Name", "Player")?.trim();
            if (name) {
              const scoreVal = findCol(row, "Score", "Points");
              importedPlayers.push({
                id: id("p"),
                name,
                score: scoreVal ? parseInt(scoreVal, 10) : 0,
                createdAt: Date.now(),
              });
            }
          });
        }
        
        if (importedWords.length === 0 && importedPlayers.length === 0) {
          window.alert("No valid data found in the Excel file.\n\nMake sure you have columns like 'Word' or 'Phrase' or 'Text'.");
          return;
        }
        
        const ok = window.confirm(
          `Found ${importedWords.length} word(s) and ${importedPlayers.length} player(s).\n\nThis will replace current data. Continue?`
        );
        if (!ok) return;
        
        setState((prev) => ({
          ...prev,
          words: importedWords.length > 0 ? importedWords : prev.words,
          players: importedPlayers.length > 0 ? importedPlayers : prev.players,
        }));
      } catch {
        window.alert("Could not read the Excel file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const solvedCount = state.puzzles.filter((p) => p.solved).length;
  const totalPuzzles = state.puzzles.length;

  return (
    <div className="container">
      <div className="topbar">
        <div className="title">
          <h1>Wheel of Fortune for Tyrus</h1>
          <p>
            {state.gameStatus === "playing" ? (
              <>
                Game in progress · Puzzle {state.currentPuzzleIndex + 1}/{totalPuzzles} · {solvedCount} solved
              </>
            ) : state.gameStatus === "ended" ? (
              <>Game ended · {state.words.length} words in bank</>
            ) : (
              <>{state.words.length} words ready · {state.players.length} players</>
            )}
          </p>
        </div>
        <div className="tabs" role="tablist" aria-label="Main tabs">
          <button
            className={`tab ${tab === "game" ? "tabActive" : ""}`}
            onClick={() => setTab("game")}
          >
            Game
          </button>
          <button
            className={`tab ${tab === "admin" ? "tabActive" : ""}`}
            onClick={() => setTab("admin")}
          >
            Admin
          </button>
        </div>
      </div>

      {tab === "game" ? (
        <GameView
          players={state.players}
          words={state.words}
          puzzles={state.puzzles}
          currentPuzzleIndex={state.currentPuzzleIndex}
          gameStatus={state.gameStatus}
          onGuessLetter={guessLetter}
          onSolvePuzzle={solvePuzzle}
          onNextPuzzle={nextPuzzle}
          onPrevPuzzle={prevPuzzle}
          onAdjustScore={adjustScore}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onEndGame={endGame}
        />
      ) : (
        <AdminView
          words={state.words}
          gameStatus={state.gameStatus}
          onAddWord={addWord}
          onDeleteWord={deleteWord}
          onMoveWord={moveWord}
          onStartGame={startGame}
          onEndGame={endGame}
          onResetAll={resetAll}
          onExportExcel={exportExcel}
          onImportExcel={importExcel}
        />
      )}
    </div>
  );
}
