export const SUITS = [
  { key: 'S', name: 'Spades', symbol: '♠', color: 'text-felt-50' },
  { key: 'D', name: 'Diamonds', symbol: '♦', color: 'text-red-300' },
  { key: 'C', name: 'Clubs', symbol: '♣', color: 'text-felt-50' },
  { key: 'H', name: 'Hearts', symbol: '♥', color: 'text-red-300' }
];

export const RANKS = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: '9' },
  { value: 10, label: '10' },
  { value: 11, label: 'J' },
  { value: 12, label: 'Q' },
  { value: 13, label: 'K' },
  { value: 14, label: 'A' }
];

export function rankLabel(rank) {
  return RANKS.find((r) => r.value === rank)?.label ?? String(rank);
}

export function cardCode(card) {
  const rank = rankLabel(card.rank);
  return `${rank}${card.suit}`;
}

export function cardImageHref(card) {
  return `/cards/generated/${cardCode(card)}.png`;
}

export function trumpOrder(roundIndex) {
  const order = ['S', 'D', 'C', 'H'];
  return order[roundIndex % order.length];
}
