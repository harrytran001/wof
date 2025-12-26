import * as React from "react";
import * as XLSX from "xlsx";
import { defaultState } from "./state/defaultState";
import type { AppStateV1, Player, WordEntry, PuzzleState, QuestionSet } from "./state/types";
import { usePersistedState } from "./state/usePersistedState";
import { id } from "./lib/ids";
import { AdminView } from "./components/AdminView";
import { GameView } from "./components/GameView";

type Tab = "game" | "admin";

const STORAGE_KEY = "wof_state_v2";

function migrateToV1(raw: unknown): AppStateV1 {
  const asAny = raw as Partial<AppStateV1> | null;
  if (!asAny) return defaultState;
  
  // Migrate puzzles to include wrongLetters if missing
  const puzzles = Array.isArray(asAny.puzzles) 
    ? asAny.puzzles.map((p) => ({
        ...p,
        wrongLetters: p.wrongLetters ?? [],
      }))
    : [];
  
  // Handle sets migration
  let sets = Array.isArray(asAny.sets) ? asAny.sets : [];
  let activeSetId = asAny.activeSetId;
  
  // Migrate words - ensure they have setId
  let words = Array.isArray(asAny.words) ? asAny.words : [];
  
  // If there are words without setId, create a default set for them
  const wordsWithoutSet = words.filter((w) => !w.setId);
  if (wordsWithoutSet.length > 0 && sets.length === 0) {
    const defaultSet: QuestionSet = {
      id: id("s"),
      name: "Default Set",
      createdAt: Date.now(),
    };
    sets = [defaultSet];
    activeSetId = defaultSet.id;
    words = words.map((w) => ({
      ...w,
      theme: w.theme ?? "",
      setId: w.setId ?? defaultSet.id,
    }));
  } else {
    words = words.map((w) => ({
      ...w,
      theme: w.theme ?? "",
      setId: w.setId ?? (sets[0]?.id || ""),
    }));
  }
  
  return {
    ...defaultState,
    ...asAny,
    players: Array.isArray(asAny.players) ? asAny.players : [],
    sets,
    words,
    activeSetId,
    puzzles,
    gameStatus: asAny.gameStatus ?? "setup",
    currentPuzzleIndex: asAny.currentPuzzleIndex ?? 0,
  };
}

export function App() {
  const [tab, setTab] = React.useState<Tab>("admin");
  const [showIntro, setShowIntro] = React.useState(false);
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

  // Set actions
  const createSet = (name: string) => {
    update((s) => {
      const newSet: QuestionSet = { id: id("s"), name, createdAt: Date.now() };
      return { 
        ...s, 
        sets: [...s.sets, newSet],
        activeSetId: s.activeSetId ?? newSet.id, // Select if first set
      };
    });
  };

  const deleteSet = (setId: string) => {
    update((s) => {
      // Remove set and all its words
      const newSets = s.sets.filter((set) => set.id !== setId);
      const newWords = s.words.filter((w) => w.setId !== setId);
      const newActiveSetId = s.activeSetId === setId ? newSets[0]?.id : s.activeSetId;
      return { ...s, sets: newSets, words: newWords, activeSetId: newActiveSetId };
    });
  };

  const selectSet = (setId: string) => {
    update((s) => ({ ...s, activeSetId: setId }));
  };

  // Word actions
  const addWord = (text: string, theme: string) => {
    update((s) => {
      if (!s.activeSetId) return s;
      
      // Get max order for this set
      const setWords = s.words.filter((w) => w.setId === s.activeSetId);
      const maxOrder = setWords.reduce((max, w) => Math.max(max, w.order), 0);
      
      const entry: WordEntry = {
        id: id("w"),
        text,
        theme,
        setId: s.activeSetId,
        order: maxOrder + 1,
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
      // Only move within the same set
      const word = s.words.find((w) => w.id === wordId);
      if (!word) return s;
      
      const setWords = s.words.filter((w) => w.setId === word.setId);
      const sorted = [...setWords].sort((a, b) => a.order - b.order);
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
  const startGame = (setId: string) => {
    update((s) => {
      // Use all words from the selected set in order
      const setWords = s.words
        .filter((w) => w.setId === setId)
        .sort((a, b) => a.order - b.order);
      
      if (setWords.length === 0) return s;

      const newPuzzles: PuzzleState[] = setWords.map((w) => ({
        wordId: w.id,
        revealedLetters: [],
        wrongLetters: [],
        solved: false,
      }));

      return {
        ...s,
        activeSetId: setId,
        gameStatus: "playing",
        currentPuzzleIndex: 0,
        puzzles: newPuzzles,
      };
    });
    setShowIntro(true);
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
      
      return { ...s, puzzles: newPuzzles };
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
    // Create workbook with sheets for each set
    const wb = XLSX.utils.book_new();
    
    // Export each set as a separate sheet
    state.sets.forEach((set) => {
      const setWords = state.words
        .filter((w) => w.setId === set.id)
        .sort((a, b) => a.order - b.order);
      
      const wordsData = setWords.map((w, idx) => ({
        "Order": idx + 1,
        "Theme": w.theme || "",
        "Word/Phrase": w.text,
      }));
      
      if (wordsData.length > 0) {
        const sheet = XLSX.utils.json_to_sheet(wordsData);
        sheet["!cols"] = [{ wch: 8 }, { wch: 20 }, { wch: 40 }];
        // Sanitize sheet name (Excel has restrictions)
        const sheetName = set.name.slice(0, 31).replace(/[\\/*?[\]]/g, "-");
        XLSX.utils.book_append_sheet(wb, sheet, sheetName);
      }
    });
    
    // Players sheet
    const playersData = state.players.map((p) => ({
      "Name": p.name,
      "Score": p.score,
    }));
    if (playersData.length > 0) {
      const playersSheet = XLSX.utils.json_to_sheet(playersData);
      playersSheet["!cols"] = [{ wch: 25 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, playersSheet, "Players");
    }
    
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
            if (row[name] !== undefined) return String(row[name]);
            const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
            if (key && row[key] !== undefined) return String(row[key]);
          }
          return undefined;
        };
        
        const importedSets: QuestionSet[] = [];
        const importedWords: WordEntry[] = [];
        const importedPlayers: Player[] = [];
        
        // Each sheet (except "Players") becomes a set
        wb.SheetNames.forEach((sheetName) => {
          if (sheetName.toLowerCase() === "players") {
            // Handle players sheet
            const sheet = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
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
          } else {
            // Create a set from this sheet
            const setObj: QuestionSet = {
              id: id("s"),
              name: sheetName,
              createdAt: Date.now(),
            };
            importedSets.push(setObj);
            
            const sheet = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
            rows.forEach((row, idx) => {
              const text = findCol(row, "Word/Phrase", "Word", "Phrase", "Text", "Answer")?.trim();
              if (text) {
                const orderVal = findCol(row, "Order", "#", "No", "Number");
                const themeVal = findCol(row, "Theme", "Category", "Topic");
                
                importedWords.push({
                  id: id("w"),
                  text,
                  theme: themeVal?.trim() || "",
                  setId: setObj.id,
                  order: orderVal ? parseInt(orderVal, 10) : idx + 1,
                  createdAt: Date.now(),
                });
              }
            });
          }
        });
        
        if (importedWords.length === 0 && importedPlayers.length === 0) {
          window.alert("No valid data found in the Excel file.\n\nMake sure you have columns like 'Word' or 'Phrase' or 'Text'.");
          return;
        }
        
        const ok = window.confirm(
          `Found ${importedSets.length} set(s) with ${importedWords.length} word(s) and ${importedPlayers.length} player(s).\n\nThis will replace current data. Continue?`
        );
        if (!ok) return;
        
        setState((prev) => ({
          ...prev,
          sets: importedSets.length > 0 ? importedSets : prev.sets,
          words: importedWords.length > 0 ? importedWords : prev.words,
          activeSetId: importedSets.length > 0 ? importedSets[0].id : prev.activeSetId,
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
              <>Game ended · {state.sets.length} sets available</>
            ) : (
              <>{state.sets.length} sets · {state.words.length} total words · {state.players.length} players</>
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
          showIntro={showIntro}
          onDismissIntro={() => setShowIntro(false)}
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
          sets={state.sets}
          activeSetId={state.activeSetId}
          allWords={state.words}
          gameStatus={state.gameStatus}
          onCreateSet={createSet}
          onDeleteSet={deleteSet}
          onSelectSet={selectSet}
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
