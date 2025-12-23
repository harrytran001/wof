import type * as React from "react";

export function Card(props: { title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      <header className="cardHeader">
        <div className="row" style={{ gap: 8 }}>
          <h2>{props.title}</h2>
          {props.hint ? <span className="hint">{props.hint}</span> : null}
        </div>
        {props.right}
      </header>
      {props.children}
    </section>
  );
}


