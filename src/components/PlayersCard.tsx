import * as React from "react";
import type { Player } from "../state/types";
import { Card } from "./Card";

function formatScore(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export function PlayersCard(props: {
  players: Player[];
  activePlayerId?: string;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onSetActivePlayer: (playerId: string) => void;
  onAdjustScore: (playerId: string, delta: number) => void;
}) {
  const [name, setName] = React.useState("");
  const [delta, setDelta] = React.useState("100");

  return (
    <Card
      title="Players"
      hint="Add players by name, set active player, and adjust points."
      right={<span className="pill">{props.players.length} player(s)</span>}
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name…"
          style={{ minWidth: 220, flex: 1 }}
        />
        <button
          className="btn btnPrimary"
          onClick={() => {
            const trimmed = name.trim();
            if (!trimmed) return;
            props.onAddPlayer(trimmed);
            setName("");
          }}
        >
          Add player
        </button>
      </div>

      {props.players.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No players yet. Add a few to get started.
        </p>
      ) : (
        <div className="list">
          {props.players.map((p) => {
            const isActive = p.id === props.activePlayerId;
            return (
              <div className="item" key={p.id}>
                <div className="rowBetween">
                  <div className="row" style={{ gap: 10 }}>
                    <label className="row" style={{ gap: 8, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="activePlayer"
                        checked={isActive}
                        onChange={() => props.onSetActivePlayer(p.id)}
                      />
                      <strong>{p.name}</strong>
                    </label>
                    <span className="pill mono">Score: {formatScore(p.score)}</span>
                  </div>
                  <button className="btn btnBad" onClick={() => props.onRemovePlayer(p.id)} title="Remove player">
                    Remove
                  </button>
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn" onClick={() => props.onAdjustScore(p.id, -100)}>
                    -100
                  </button>
                  <button className="btn" onClick={() => props.onAdjustScore(p.id, -500)}>
                    -500
                  </button>
                  <button className="btn btnGood" onClick={() => props.onAdjustScore(p.id, 100)}>
                    +100
                  </button>
                  <button className="btn btnGood" onClick={() => props.onAdjustScore(p.id, 500)}>
                    +500
                  </button>

                  <span className="pill">Custom</span>
                  <input
                    value={delta}
                    onChange={(e) => setDelta(e.target.value)}
                    inputMode="numeric"
                    placeholder="e.g. 250"
                    style={{ width: 120 }}
                  />
                  <button
                    className="btn"
                    onClick={() => {
                      const parsed = Number(delta);
                      if (!Number.isFinite(parsed) || parsed === 0) return;
                      props.onAdjustScore(p.id, parsed);
                    }}
                  >
                    Add
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      const parsed = Number(delta);
                      if (!Number.isFinite(parsed) || parsed === 0) return;
                      props.onAdjustScore(p.id, -Math.abs(parsed));
                    }}
                  >
                    Deduct
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}


