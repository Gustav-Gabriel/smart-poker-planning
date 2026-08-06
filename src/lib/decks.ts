export const FIBONACCI = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "☕"];
export const TSHIRT = ["XS", "S", "M", "L", "XL", "?", "☕"];

const NON_SCORE_CARDS = new Set(["?", "☕"]);

export function cardsFor(deck: "fibonacci" | "tshirt") {
  return deck === "fibonacci" ? FIBONACCI : TSHIRT;
}

/** Score cards only — excludes uncertainty (`?`) and coffee (`☕`). */
export function scoreCardsFor(deck: "fibonacci" | "tshirt") {
  return cardsFor(deck).filter((card) => !NON_SCORE_CARDS.has(card));
}
