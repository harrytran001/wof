import * as React from "react";
import type { Player, RoundState, WordEntry } from "../state/types";
import { Card } from "./Card";
import { maskPhrase, normalizePhrase } from "../lib/normalize";

export function PuzzleCard(props: {
  players: Player[];
  activePlayerId?: string;
  words: WordEntry[];
  round: RoundState;
  onStartRandomRound: () => void;
  onStartSpecificRound: (wordId: string) => void;
  onSetRevealAnswer: (reveal: boolean) => void;
  onSubmitGuess: (args: { playerId?: string; guess: string }) => void;
  onClearRound: () => void;
}) {
  const currentWord = props.round.wordId ? props.words.find((w) => w.id === props.round.wordId) : undefined;
  const [guess, setGuess] = React.useState("");
  const [playerId, setPlayerId] = React.useState<string | "">(props.activePlayerId ?? "");

  React.useEffect(() => {
    setPlayerId(props.activePlayerId ?? "");
  }, [props.activePlayerId]);

  const unusedWords = props.words.filter((w) => !w.used);
  const hasUnused = unusedWords.length > 0;

  const statusPill =
    props.round.status === "idle" ? (
      <span className="pill">No round</span>
    ) : props.round.status === "in_play" ? (
      <span className="pill">In play</span>
    ) : (
      <span className="pill" style={{ borderColor: "rgba(34,197,94,0.45)" }}>
        Solved
      </span>
    );

  return (
    <Card
      title="Puzzle / Guess"
      hint="Host picks a word, then players guess the full phrase."
      right={<div className="row">{statusPill}</div>}
    >
      <div className="puzzle">
        {currentWord ? (
          <>
            <div className="rowBetween">
              <strong>Current puzzle</strong>
              <div className="row">
                <label className="row" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={props.round.revealAnswer}
                    onChange={(e) => props.onSetRevealAnswer(e.target.checked)}
                  />
                  <span className="muted">Reveal answer</span>
                </label>
                <button className="btn" onClick={props.onClearRound}>
                  Clear round
                </button>
              </div>
            </div>

            <div className="masked mono">{maskPhrase(currentWord.text)}</div>
            {props.round.revealAnswer ? <div className="answer mono">Answer: {currentWord.text}</div> : null}

            <div className="row">
              <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} style={{ minWidth: 220 }}>
                <option value="">(No player selected)</option>
                {props.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Enter full-phrase guess…"
                style={{ flex: 1, minWidth: 240 }}
                disabled={props.round.status === "solved"}
              />
              <button
                className="btn btnPrimary"
                disabled={!guess.trim() || props.round.status === "solved"}
                onClick={() => {
                  props.onSubmitGuess({
                    playerId: playerId || undefined,
                    guess,
                  });
                  setGuess("");
                }}
              >
                Submit guess
              </button>
            </div>

            {props.round.lastGuess ? (
              <div className="rowBetween" style={{ marginTop: 6 }}>
                <div className="muted">
                  Last guess:{" "}
                  <span className="mono">
                    “{props.round.lastGuess.guess}”
                    {" · "}
                    {props.round.lastGuess.correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                {props.round.lastGuess.correct ? (
                  <span className="pill" style={{ borderColor: "rgba(34,197,94,0.45)" }}>
                    Solved
                  </span>
                ) : (
                  <span className="pill" style={{ borderColor: "rgba(239,68,68,0.45)" }}>
                    Try again
                  </span>
                )}
              </div>
            ) : null}

            {props.round.status === "solved" ? (
              <div className="muted" style={{ marginTop: 8 }}>
                This round is solved. Start a new round to keep playing.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="rowBetween">
              <strong>Pick a puzzle</strong>
              <div className="row">
                <button className="btn btnPrimary" disabled={!hasUnused} onClick={props.onStartRandomRound}>
                  Start random unused
                </button>
              </div>
            </div>

            <div className="muted">
              {props.words.length === 0
                ? "No words yet. Go to Admin to add some."
                : hasUnused
                  ? `${unusedWords.length} unused word(s) available.`
                  : "All words are marked used. Add more in Admin."}
            </div>

            {unusedWords.length > 0 ? (
              <div className="row" style={{ marginTop: 10 }}>
                <select
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    props.onStartSpecificRound(id);
                  }}
                  style={{ minWidth: 280 }}
                >
                  <option value="">Or pick a specific unused word…</option>
                  {unusedWords
                    .slice()
                    .sort((a, b) => a.createdAt - b.createdAt)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.text}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
          </>
        )}
      </div>

      {currentWord ? (
        <div style={{ marginTop: 12 }}>
          <div className="muted">
            Guess matching is forgiving (ignores punctuation/case/extra spaces). Example normalized answer:{" "}
            <span className="mono">{normalizePhrase(currentWord.text)}</span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}


