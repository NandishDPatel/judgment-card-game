import React from 'react';
import { cardImageHref, rankLabel } from '../lib/cards.js';

export default function Card({ card, selectable, onClick, disabled }) {
  if (!card) return null;
  const suitSymbol = card.suit === 'S' ? '♠' : card.suit === 'D' ? '♦' : card.suit === 'C' ? '♣' : '♥';
  const rank = rankLabel(card.rank);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-28 w-20 flex-col items-center justify-center rounded-xl border border-white/30 bg-white/90 text-slate-900 transition sm:h-32 sm:w-24 lg:h-36 lg:w-28 ${
        selectable ? 'hover:-translate-y-2 hover:shadow-2xl' : 'opacity-60'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} card-shadow`}
    >
      <img
        src={cardImageHref(card)}
        alt={`${rank}${suitSymbol}`}
        className="h-full w-full rounded-xl object-cover scale-[0.92]"
        style={{ transformOrigin: 'center' }}
      />
      <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1 text-xs font-semibold text-white">
        {rank}{suitSymbol}
      </div>
    </button>
  );
}
