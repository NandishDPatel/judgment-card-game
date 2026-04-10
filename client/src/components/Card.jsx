import React from 'react';
import { cardImageHref, rankLabel } from '../lib/cards.js';

export default function Card({ card, selectable, onClick, disabled, compact = false, dimWhenInactive = true }) {
  if (!card) return null;
  const suitSymbol = card.suit === 'S' ? '♠' : card.suit === 'D' ? '♦' : card.suit === 'C' ? '♣' : '♥';
  const rank = rankLabel(card.rank);
  const sizeClasses = compact
    ? 'h-20 w-14 rounded-lg sm:h-24 sm:w-16 md:h-28 md:w-20'
    : 'h-28 w-20 rounded-xl sm:h-32 sm:w-24 lg:h-36 lg:w-28';
  const inactiveClasses = selectable || !dimWhenInactive ? '' : 'opacity-60';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center border border-white/30 bg-white/90 text-slate-900 transition ${sizeClasses} ${inactiveClasses} ${
        selectable ? 'hover:-translate-y-2 hover:shadow-2xl' : ''
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} card-shadow`}
    >
      <img
        src={cardImageHref(card)}
        alt={`${rank}${suitSymbol}`}
        className="h-full w-full rounded-xl object-cover scale-[0.92]"
        style={{ transformOrigin: 'center' }}
      />
      <div className={`absolute rounded bg-black/70 font-semibold text-white ${compact ? 'bottom-1 right-1 px-1 text-[10px]' : 'bottom-2 right-2 px-1 text-xs'}`}>
        {rank}{suitSymbol}
      </div>
    </button>
  );
}
