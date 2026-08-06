export const FIBONACCI = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "☕"];
export const TSHIRT = ["XS", "S", "M", "L", "XL", "?", "☕"];

export function cardsFor(deck: "fibonacci" | "tshirt") {
  return deck === "fibonacci" ? FIBONACCI : TSHIRT;
}
