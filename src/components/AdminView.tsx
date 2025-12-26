import * as React from "react";
import type { WordEntry, GameStatus, QuestionSet } from "../state/types";

type Props = {
  sets: QuestionSet[];
  activeSetId?: string;
  allWords: WordEntry[];
  gameStatus: GameStatus;
  onCreateSet: (name: string) => void;
  onDeleteSet: (setId: string) => void;
  onSelectSet: (setId: string) => void;
  onAddWord: (text: string, theme: string) => void;
  onDeleteWord: (wordId: string) => void;
  onMoveWord: (wordId: string, direction: "up" | "down") => void;
  onStartGame: (setId: string) => void;
  onEndGame: () => void;
  onResetAll: () => void;
  onExportExcel: () => void;
  onImportExcel: (file: File) => void;
};

export function AdminView({
  sets,
  activeSetId,
  allWords,
  gameStatus,
  onCreateSet,
  onDeleteSet,
  onSelectSet,
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
  const [setNameDraft, setSetNameDraft] = React.useState("");
  const [showAnswers, setShowAnswers] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const activeSetWords = allWords.filter((w) => w.setId === activeSetId);
  const sorted = [...activeSetWords].sort((a, b) => a.order - b.order);
  const activeSet = sets.find((s) => s.id === activeSetId);

  // Mask text with asterisks
  const maskText = (text: string) => {
    return text.split("").map((char) => (char === " " ? " " : "•")).join("");
  };

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed || !activeSetId) return;
    onAddWord(trimmed, themeDraft.trim());
    setDraft("");
  };

  const handleCreateSet = () => {
    const name = setNameDraft.trim();
    if (!name) return;
    onCreateSet(name);
    setSetNameDraft("");
  };

  const handleDeleteSet = (setId: string) => {
    const setToDelete = sets.find((s) => s.id === setId);
    const wordCount = allWords.filter((w) => w.setId === setId).length;
    const ok = window.confirm(
      `Delete set "${setToDelete?.name}"?\n\nThis will also delete ${wordCount} word(s) in this set.`
    );
    if (ok) onDeleteSet(setId);
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
      {/* Left Column: Sets & Words */}
      <div className="adminMain">
        {/* Question Sets */}
        <div className="adminSection">
          <div className="sectionHeader">
            <div className="sectionTitle">
              <h2>Question Sets</h2>
              <span className="statBadge">{sets.length} set{sets.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="setsList">
            {sets.length === 0 ? (
              <div className="emptyState small">
                <p>No sets yet</p>
                <span>Create a set to start adding questions</span>
              </div>
            ) : (
              sets.map((s) => (
                <div
                  key={s.id}
                  className={`setItem ${s.id === activeSetId ? "active" : ""}`}
                  onClick={() => onSelectSet(s.id)}
                >
                  <span className="setName">{s.name}</span>
                  <span className="setCount">
                    {allWords.filter((w) => w.setId === s.id).length} questions
                  </span>
                  <button
                    className="iconBtn danger small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSet(s.id);
                    }}
                    disabled={isLocked}
                    title="Delete set"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="createSetArea">
            <input
              type="text"
              placeholder="New set name..."
              value={setNameDraft}
              onChange={(e) => setSetNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSet()}
              disabled={isLocked}
            />
            <button
              className="btn btnPrimary"
              onClick={handleCreateSet}
              disabled={isLocked || !setNameDraft.trim()}
            >
              + Create Set
            </button>
          </div>
        </div>

        {/* Words in Selected Set */}
        <div className="adminSection">
          <div className="sectionHeader">
            <div className="sectionTitle">
              <h2>{activeSet ? activeSet.name : "Select a Set"}</h2>
              {activeSet && (
                <span className="statBadge ready">{sorted.length} question{sorted.length !== 1 ? "s" : ""}</span>
              )}
            </div>
            {activeSet && sorted.length > 0 && (
              <button
                className={`toggleBtn ${showAnswers ? "active" : ""}`}
                onClick={() => setShowAnswers(!showAnswers)}
                title={showAnswers ? "Hide answers" : "Show answers"}
              >
                {showAnswers ? "🔓 Answers Visible" : "🔒 Answers Hidden"}
              </button>
            )}
          </div>

          {!activeSet ? (
            <div className="emptyState">
              <div className="emptyIcon">📋</div>
              <p>No set selected</p>
              <span>Create or select a set to add questions</span>
            </div>
          ) : (
            <>
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
                  Game in progress — end game to edit
                </div>
              )}

              {/* Word List */}
              <div className="wordList">
                {sorted.length === 0 ? (
                  <div className="emptyState small">
                    <p>No questions in this set</p>
                    <span>Add questions above</span>
                  </div>
                ) : (
                  sorted.map((w, idx) => (
                    <div key={w.id} className="wordRow">
                      <div className="wordOrder">{idx + 1}</div>
                      <div className="wordContent">
                        <div className="wordMain">
                          <span className={`wordText ${!showAnswers ? "masked" : ""}`}>
                            {showAnswers ? w.text : maskText(w.text)}
                          </span>
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
            </>
          )}
        </div>
      </div>

      {/* Right Column: Controls */}
      <div className="adminSidebar">
        {/* Game Controls */}
        <div className="adminSection">
          <div className="sectionHeader">
            <h2>Start Game</h2>
          </div>

          <div className="controlsContent">
            {gameStatus === "playing" ? (
              <>
                <div className="statusBadge playing">
                  <span className="statusDot" />
                  Game in Progress
                </div>
                <p className="controlHint">
                  Switch to Game tab to play. End game here to edit.
                </p>
                <button className="btn btnDanger btnLarge btnFull" onClick={onEndGame}>
                  <span className="btnIcon">■</span>
                  End Game
                </button>
              </>
            ) : (
              <>
                <p className="controlHint">
                  Select a question set to start the game.
                </p>
                <div className="startGameList">
                  {sets.length === 0 ? (
                    <p className="muted" style={{ textAlign: "center", padding: 12 }}>
                      Create a set first
                    </p>
                  ) : (
                    sets.map((s) => {
                      const count = allWords.filter((w) => w.setId === s.id).length;
                      return (
                        <button
                          key={s.id}
                          className="btn btnFull startSetBtn"
                          onClick={() => onStartGame(s.id)}
                          disabled={count === 0}
                        >
                          <span className="startSetName">▶ {s.name}</span>
                          <span className="startSetCount">{count} questions</span>
                        </button>
                      );
                    })
                  )}
                </div>
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
