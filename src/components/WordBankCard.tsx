import * as React from "react";
import type { WordEntry } from "../state/types";
import { Card } from "./Card";

export function WordBankCard(props: {
  words: WordEntry[];
  onAddWord: (text: string) => void;
  onDeleteWord: (wordId: string) => void;
  onToggleUsed: (wordId: string) => void;
  onStartSpecificRound: (wordId: string) => void;
}) {
  const [text, setText] = React.useState("");

  const unusedCount = props.words.filter((w) => !w.used).length;

  return (
    <Card
      title="Word bank (Admin)"
      hint="Add words/phrases before the game. Start a round using any entry."
      right={
        <div className="row" style={{ gap: 8 }}>
          <span className="pill">{unusedCount} unused</span>
          <span className="pill">{props.words.length} total</span>
        </div>
      }
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Add a word/phrase (e.g. "HAPPY HOLIDAYS")…'
          style={{ flex: 1, minWidth: 260 }}
        />
        <button
          className="btn btnPrimary"
          onClick={() => {
            const trimmed = text.trim();
            if (!trimmed) return;
            props.onAddWord(trimmed);
            setText("");
          }}
        >
          Add word
        </button>
      </div>

      {props.words.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No words yet.
        </p>
      ) : (
        <div className="list">
          {props.words
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((w) => (
              <div className="item" key={w.id}>
                <div className="rowBetween">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, wordBreak: "break-word" }}>{w.text}</div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      Status:{" "}
                      {w.used ? (
                        <span className="pill" style={{ borderColor: "rgba(239,68,68,0.45)" }}>
                          used
                        </span>
                      ) : (
                        <span className="pill" style={{ borderColor: "rgba(34,197,94,0.45)" }}>
                          unused
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="row">
                    <button className="btn" onClick={() => props.onStartSpecificRound(w.id)} title="Use this for round">
                      Start round
                    </button>
                    <button className="btn" onClick={() => props.onToggleUsed(w.id)}>
                      Mark {w.used ? "unused" : "used"}
                    </button>
                    <button className="btn btnBad" onClick={() => props.onDeleteWord(w.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}


