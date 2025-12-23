import { Card } from "./Card";

export function StorageCard(props: { onResetAll: () => void; onExport: () => void; onImport: (json: string) => void }) {
  return (
    <Card title="Storage" hint="Everything is stored in this browser (localStorage).">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn" onClick={props.onExport}>
          Export JSON
        </button>
        <label className="btn" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          Import JSON
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (!file) return;
              const text = await file.text();
              props.onImport(text);
            }}
          />
        </label>
      </div>

      <div className="dangerZone">
        <div className="rowBetween">
          <div>
            <strong>Danger zone</strong>
            <div className="muted" style={{ marginTop: 4 }}>
              This clears players, scores, words, and the current round.
            </div>
          </div>
          <button className="btn btnBad" onClick={props.onResetAll}>
            Reset all data
          </button>
        </div>
      </div>
    </Card>
  );
}


