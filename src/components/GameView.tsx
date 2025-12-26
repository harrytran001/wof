import * as React from "react";
import { Card } from "./Card";
import type { Player, WordEntry, PuzzleState, GameStatus } from "../state/types";
import { normalizePhrase } from "../lib/normalize";

type LetterGuessResult = { correct: boolean; positions: number[] };

type Props = {
  players: Player[];
  words: WordEntry[];
  puzzles: PuzzleState[];
  currentPuzzleIndex: number;
  gameStatus: GameStatus;
  showIntro: boolean;
  onDismissIntro: () => void;
  onGuessLetter: (letter: string) => LetterGuessResult;
  onSolvePuzzle: () => void;
  onNextPuzzle: () => void;
  onPrevPuzzle: () => void;
  onAdjustScore: (playerId: string, delta: number) => void;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onEndGame: () => void;
};

type GuessFeedback = {
  letter: string;
  correct: boolean;
  positions: number[];
  timestamp: number;
};

// Generate confetti pieces
function generateConfetti(count: number) {
  const colors = ["#7c3aed", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 2,
    size: 8 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));
}

export function GameView({
  players,
  words,
  puzzles,
  currentPuzzleIndex,
  gameStatus,
  showIntro,
  onDismissIntro,
  onGuessLetter,
  onSolvePuzzle,
  onNextPuzzle,
  onPrevPuzzle,
  onAdjustScore,
  onAddPlayer,
  onRemovePlayer,
  onEndGame,
}: Props) {
  const [letterGuess, setLetterGuess] = React.useState("");
  const [solveGuess, setSolveGuess] = React.useState("");
  const [scoreInputs, setScoreInputs] = React.useState<Record<string, string>>({});
  const [playerDraft, setPlayerDraft] = React.useState("");
  const [wrongSolve, setWrongSolve] = React.useState(false);
  const [feedback, setFeedback] = React.useState<GuessFeedback | null>(null);
  const [confetti] = React.useState(() => generateConfetti(50));

  const currentPuzzle = puzzles[currentPuzzleIndex];
  const currentWord = currentPuzzle ? words.find((w) => w.id === currentPuzzle.wordId) : undefined;

  // Clear feedback after 3 seconds
  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleLetterGuess = () => {
    const letter = letterGuess.trim().toLowerCase();
    if (letter.length !== 1 || !/[a-z]/.test(letter)) return;
    
    // Check if already guessed
    if (currentPuzzle?.revealedLetters.includes(letter) || 
        currentPuzzle?.wrongLetters.includes(letter)) {
      setLetterGuess("");
      return;
    }
    
    const result = onGuessLetter(letter);
    setFeedback({
      letter: letter.toUpperCase(),
      correct: result.correct,
      positions: result.positions,
      timestamp: Date.now(),
    });
    setLetterGuess("");
  };

  const handleSolve = () => {
    const guess = solveGuess.trim();
    if (!guess || !currentWord) return;
    
    const correct = normalizePhrase(guess) === normalizePhrase(currentWord.text);
    if (correct) {
      onSolvePuzzle();
      setSolveGuess("");
      setWrongSolve(false);
      setFeedback(null);
    } else {
      setWrongSolve(true);
      setTimeout(() => setWrongSolve(false), 1500);
    }
  };

  const handleAddPlayer = () => {
    const name = playerDraft.trim();
    if (!name) return;
    onAddPlayer(name);
    setPlayerDraft("");
  };

  const handleScoreAdjust = (playerId: string, delta: number) => {
    const inputVal = scoreInputs[playerId] || "";
    const amount = parseInt(inputVal, 10) || 100;
    onAdjustScore(playerId, delta * amount);
  };

  // Render puzzle board with letter tiles
  const renderPuzzleBoard = () => {
    if (!currentWord || !currentPuzzle) return null;
    
    const revealed = new Set(currentPuzzle.revealedLetters);
    const text = currentWord.text;
    const chars = text.split("");
    
    // Build array of elements with proper global indices
    const elements: React.ReactNode[] = [];
    let currentWordChars: React.ReactNode[] = [];
    
    chars.forEach((char, globalIdx) => {
      const lower = char.toLowerCase();
      const isLetter = /[a-z]/i.test(char);
      const isRevealed = currentPuzzle.solved || revealed.has(lower);
      const isHighlighted = feedback?.correct && feedback.positions.includes(globalIdx);
      
      if (char === " ") {
        // End current word, add space
        if (currentWordChars.length > 0) {
          elements.push(
            <div key={`word-${globalIdx}`} className="puzzleWord">
              {currentWordChars}
            </div>
          );
          currentWordChars = [];
        }
        elements.push(<span key={`space-${globalIdx}`} className="puzzleTile space" />);
      } else if (!isLetter) {
        // Punctuation - add to current word
        currentWordChars.push(
          <span key={globalIdx} className="puzzleTile punctuation">
            {char}
          </span>
        );
      } else {
        // Letter
        currentWordChars.push(
          <span
            key={globalIdx}
            className={`puzzleTile ${isRevealed ? "revealed" : "hidden"} ${isHighlighted ? "highlighted" : ""}`}
          >
            {isRevealed ? char.toUpperCase() : ""}
          </span>
        );
      }
    });
    
    // Add remaining word
    if (currentWordChars.length > 0) {
      elements.push(
        <div key="word-last" className="puzzleWord">
          {currentWordChars}
        </div>
      );
    }
    
    return <div className="puzzleBoard">{elements}</div>;
  };

  // Render feedback for the last guess
  const renderFeedback = () => {
    if (!feedback) return null;
    
    if (feedback.correct) {
      const posText = feedback.positions.length === 1 
        ? `position ${feedback.positions[0] + 1}` 
        : `positions ${feedback.positions.map((p) => p + 1).join(", ")}`;
      
      return (
        <div className="guessFeedback correct">
          <span className="feedbackIcon">✓</span>
          <span className="feedbackLetter">{feedback.letter}</span>
          <span className="feedbackText">
            Found {feedback.positions.length} time{feedback.positions.length > 1 ? "s" : ""} at {posText}
          </span>
        </div>
      );
    }
    
    return (
      <div className="guessFeedback wrong">
        <span className="feedbackIcon">✗</span>
        <span className="feedbackLetter">{feedback.letter}</span>
        <span className="feedbackText">Not in the puzzle</span>
      </div>
    );
  };

  // Intro Screen with Confetti (only when game is playing and intro hasn't been dismissed)
  if (showIntro && gameStatus === "playing") {
    return (
      <div className="introOverlay">
        <div className="confettiContainer">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="confettiPiece"
              style={{
                left: `${piece.left}%`,
                backgroundColor: piece.color,
                width: piece.size,
                height: piece.size,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          ))}
        </div>
        <div className="introContent">
          <div className="introWheel">🎡</div>
          <h1 className="introTitle">Wheel of Fortune</h1>
          <div className="introSubtitle">for</div>
          <h2 className="introName">Tyrus</h2>
          <p className="introTagline">✨ Let the games begin! ✨</p>
          <button className="btn btnPrimary btnLarge introStart" onClick={onDismissIntro}>
            Start Playing →
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === "setup") {
    return (
      <div className="gameLayout">
        <Card title="Game Not Started">
          <p className="muted" style={{ textAlign: "center", padding: 40 }}>
            Go to <strong>Admin</strong> tab to add words and start the game.
          </p>
        </Card>
      </div>
    );
  }

  if (gameStatus === "ended" || puzzles.length === 0) {
    return (
      <div className="gameLayout">
        <Card title="Final Scores">
          <div className="finalScores">
            {players
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div key={p.id} className={`finalScoreRow ${i === 0 ? "winner" : ""}`}>
                  <span className="rank">#{i + 1}</span>
                  <span className="name">{p.name}</span>
                  <span className="score">{p.score.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    );
  }

  const totalPuzzles = puzzles.length;
  const solvedCount = puzzles.filter((p) => p.solved).length;

  return (
    <div className="gameLayout twoColumn">
      {/* LEFT: Playing Board */}
      <div className="gameLeft">
        <Card
          title={`Puzzle ${currentPuzzleIndex + 1} of ${totalPuzzles}`}
          hint={currentPuzzle?.solved ? "SOLVED ✓" : `${solvedCount} solved`}
        >
          {/* Theme display */}
          {currentWord?.theme && (
            <div className="puzzleTheme">
              <span className="themeLabel">Theme:</span>
              <span className="themeValue">{currentWord.theme}</span>
            </div>
          )}
          
          {renderPuzzleBoard()}

          {/* Feedback display */}
          {renderFeedback()}

          {/* Used letters display */}
          {currentPuzzle && !currentPuzzle.solved && (
            <div className="usedLettersSection">
              <div className="usedLettersRow">
                <span className="usedLabel correct">Correct:</span>
                <span className="usedLetters">
                  {currentPuzzle.revealedLetters.length > 0
                    ? currentPuzzle.revealedLetters.map((l) => l.toUpperCase()).join(" ")
                    : "—"}
                </span>
              </div>
              <div className="usedLettersRow">
                <span className="usedLabel wrong">Wrong:</span>
                <span className="usedLetters">
                  {currentPuzzle.wrongLetters.length > 0
                    ? currentPuzzle.wrongLetters.map((l) => l.toUpperCase()).join(" ")
                    : "—"}
                </span>
              </div>
            </div>
          )}

          {/* Controls */}
          {currentPuzzle?.solved ? (
            <div className="solvedBanner">
              ✓ PUZZLE SOLVED!
            </div>
          ) : (
            <div className="guessControls">
              <div className="guessRow">
                <label>Guess letter:</label>
                <input
                  type="text"
                  maxLength={1}
                  value={letterGuess}
                  onChange={(e) => setLetterGuess(e.target.value.replace(/[^a-zA-Z]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleLetterGuess()}
                  placeholder="A-Z"
                  className="letterInput"
                />
                <button className="btn btnPrimary" onClick={handleLetterGuess}>
                  Reveal
                </button>
              </div>

              <div className="guessRow">
                <label>Solve:</label>
                <input
                  type="text"
                  value={solveGuess}
                  onChange={(e) => setSolveGuess(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSolve()}
                  placeholder="Type full answer..."
                  className={`solveInput ${wrongSolve ? "wrongGuess" : ""}`}
                />
                <button className="btn btnGood" onClick={handleSolve}>
                  Solve
                </button>
              </div>
              {wrongSolve && <div className="wrongMessage">Wrong answer! Try again.</div>}
            </div>
          )}

          {/* Navigation */}
          <div className="puzzleNav">
            {currentPuzzleIndex > 0 ? (
              <button className="btn" onClick={onPrevPuzzle}>
                ← Previous
              </button>
            ) : (
              <div />
            )}
            {currentPuzzleIndex < totalPuzzles - 1 ? (
              <button className="btn" onClick={onNextPuzzle}>
                Next →
              </button>
            ) : (
              <div />
            )}
          </div>
        </Card>
      </div>

      {/* RIGHT: Players & Scoreboard */}
      <div className="gameRight">
        {/* Scoreboard */}
        <Card title="Scoreboard">
          <div className="scoreboard">
            {players.length === 0 ? (
              <p className="muted" style={{ textAlign: "center", padding: 16 }}>
                No players yet
              </p>
            ) : (
              players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div key={p.id} className={`scoreboardRow ${i === 0 && p.score > 0 ? "leading" : ""}`}>
                    <span className="scoreboardRank">#{i + 1}</span>
                    <span className="scoreboardName">{p.name}</span>
                    <span className="scoreboardScore">{p.score.toLocaleString()}</span>
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* Player Management */}
        <Card title="Manage Players">
          <div className="addPlayerRow">
            <input
              type="text"
              placeholder="Player name..."
              value={playerDraft}
              onChange={(e) => setPlayerDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
            />
            <button className="btn btnPrimary" onClick={handleAddPlayer}>
              Add
            </button>
          </div>

          <div className="playersList">
            {players.map((p) => (
              <div key={p.id} className="playerCard">
                <div className="playerHeader">
                  <span className="playerName">{p.name}</span>
                  <button
                    className="btnIcon"
                    onClick={() => onRemovePlayer(p.id)}
                    title="Remove player"
                  >
                    ✕
                  </button>
                </div>
                <div className="playerScoreDisplay">
                  {p.score.toLocaleString()}
                </div>
                <div className="scoreAdjust">
                  <input
                    type="number"
                    placeholder="100"
                    value={scoreInputs[p.id] || ""}
                    onChange={(e) =>
                      setScoreInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    className="scoreAmountInput"
                  />
                  <button
                    className="btn btnBad"
                    onClick={() => handleScoreAdjust(p.id, -1)}
                  >
                    − Deduct
                  </button>
                  <button
                    className="btn btnGood"
                    onClick={() => handleScoreAdjust(p.id, 1)}
                  >
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* End Game */}
        <Card title="Game Controls">
          <button className="btn btnDanger btnLarge btnFull" onClick={onEndGame}>
            ■ End Game
          </button>
        </Card>
      </div>
    </div>
  );
}
