import * as React from "react";
import type { WordEntry, GameStatus } from "../state/types";

type Props = {
  words: WordEntry[];
  gameStatus: GameStatus;
  onAddWord: (text: string, theme: string) => void;
  onDeleteWord: (wordId: string) => void;
  onMoveWord: (wordId: string, direction: "up" | "down") => void;
  onStartGame: () => void;
  onEndGame: () => void;
  onResetAll: () => void;
  onExportExcel: () => void;
  onImportExcel: (file: File) => void;
};

export function AdminView({
  words,
  gameStatus,
  onAddWord,
  onDeleteWord,
  onMoveWord,
  onStartGame,
  onEndGame,
  onResetAll,
  onExportExcel,
  onImportExcel,
}: Props) {
  const [draft, setDraft] = React.useState("");
  const [themeDraft, setThemeDraft] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const sorted = [...words].sort((a, b) => a.order - b.order);
  const unusedCount = words.filter((w) => !w.used).length;
  const usedCount = words.filter((w) => w.used).length;

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddWord(trimmed, themeDraft.trim());
    setDraft("");
    // Keep theme for consecutive words in same category
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportExcel(file);
    e.target.value = "";
  };

  const isLocked = gameStatus === "playing";

  return (
    <div className="adminLayout">
      {/* Left Column: Word Bank */}
      <div className="adminMain">
        <div className="adminSection">
          <div className="sectionHeader">
            <div className="sectionTitle">
              <h2>Word Bank</h2>
              <div className="sectionStats">
                <span className="statBadge">{words.length} total</span>
                {usedCount > 0 && <span className="statBadge used">{usedCount} used</span>}
                {unusedCount > 0 && <span className="statBadge ready">{unusedCount} ready</span>}
              </div>
            </div>
          </div>

          {/* Add Word Input */}
          <div className="addWordArea">
            <div className="addWordFields">
              <input
                type="text"
                placeholder="Theme / Category (optional)"
                value={themeDraft}
                onChange={(e) => setThemeDraft(e.target.value)}
                disabled={isLocked}
                className="themeInput"
              />
              <input
                type="text"
                placeholder="Type a word or phrase to add..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                disabled={isLocked}
                className="addWordInput"
              />
            </div>
            <button 
              className="btn btnPrimary" 
              onClick={handleAdd} 
              disabled={isLocked || !draft.trim()}
            >
              + Add
            </button>
          </div>

          {isLocked && (
            <div className="lockNotice">
              <span className="lockIcon">🔒</span>
              Game in progress — end game to edit words
            </div>
          )}

          {/* Word List */}
          <div className="wordList">
            {sorted.length === 0 ? (
              <div className="emptyState">
                <div className="emptyIcon">📝</div>
                <p>No words yet</p>
                <span>Add words above or import from Excel</span>
              </div>
            ) : (
              sorted.map((w, idx) => (
                <div 
                  key={w.id} 
                  className={`wordRow ${w.used ? "wordUsed" : ""}`}
                >
                  <div className="wordOrder">{idx + 1}</div>
                  <div className="wordContent">
                    <div className="wordMain">
                      <span className="wordText">{w.text}</span>
                      {w.used && <span className="usedTag">✓ Used</span>}
                    </div>
                    {w.theme && <span className="wordTheme">{w.theme}</span>}
                  </div>
                  <div className="wordActions">
                    <button
                      className="iconBtn"
                      onClick={() => onMoveWord(w.id, "up")}
                      disabled={idx === 0 || isLocked}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="iconBtn"
                      onClick={() => onMoveWord(w.id, "down")}
                      disabled={idx === sorted.length - 1 || isLocked}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="iconBtn danger"
                      onClick={() => onDeleteWord(w.id)}
                      disabled={isLocked}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Controls */}
      <div className="adminSidebar">
        {/* Game Controls */}
        <div className="adminSection">
          <div className="sectionHeader">
            <h2>Game Controls</h2>
          </div>
          
          <div className="controlsContent">
            {gameStatus === "setup" && (
              <>
                <p className="controlHint">
                  Add all your words, arrange the order, then start the game.
                </p>
                <button
                  className="btn btnPrimary btnLarge btnFull"
                  onClick={onStartGame}
                  disabled={words.length === 0}
                >
                  <span className="btnIcon">▶</span>
                  Start Game
                  <span className="btnMeta">{words.length} words</span>
                </button>
              </>
            )}
            
            {gameStatus === "playing" && (
              <>
                <div className="statusBadge playing">
                  <span className="statusDot" />
                  Game in Progress
                </div>
                <p className="controlHint">
                  Switch to Game tab to play. End game here to edit words.
                </p>
                <button className="btn btnDanger btnLarge btnFull" onClick={onEndGame}>
                  <span className="btnIcon">■</span>
                  End Game
                </button>
              </>
            )}
            
            {gameStatus === "ended" && (
              <>
                <div className="statusBadge ended">
                  Game Ended
                </div>
                <p className="controlHint">
                  Add more words or start a new game with unused words.
                </p>
                <button
                  className="btn btnPrimary btnLarge btnFull"
                  onClick={onStartGame}
                  disabled={unusedCount === 0}
                >
                  <span className="btnIcon">▶</span>
                  New Game
                  <span className="btnMeta">{unusedCount} unused</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div className="adminSection">
          <div className="sectionHeader">
            <h2>Data</h2>
          </div>
          
          <div className="dataButtons">
            <button className="btn btnFull" onClick={onExportExcel}>
              <span className="btnIcon">📥</span>
              Export Excel
            </button>
            <button className="btn btnFull" onClick={() => fileRef.current?.click()}>
              <span className="btnIcon">📤</span>
              Import Excel
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </div>
          
          <div className="dangerZone">
            <button className="btn btnDanger btnFull btnSmall" onClick={onResetAll}>
              Reset All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
