"use client";

type VoteDeckProps = {
  cards: string[];
  selected: string | null;
  disabled: boolean;
  onVote: (value: string) => void;
};

export function VoteDeck({ cards, selected, disabled, onVote }: VoteDeckProps) {
  return (
    <section className="panel vote-deck">
      <div className="panel__heading">
        <h2>Sua estimativa</h2>
        {disabled ? <span className="tag tag--muted">Votos revelados</span> : null}
      </div>
      <div className="vote-deck__cards">
        {cards.map((card) => (
          <button
            key={card}
            type="button"
            className={`vote-card ${selected === card ? "is-selected" : ""}`}
            disabled={disabled}
            onClick={() => onVote(card)}
          >
            {card}
          </button>
        ))}
      </div>
    </section>
  );
}
