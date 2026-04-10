import React, { useMemo } from 'react';
import Card from './Card.jsx';

function polarToStyle(index, total) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 42;
  const x = 50 + radius * Math.cos(angle);
  const y = 50 + radius * Math.sin(angle);
  return { left: `${x}%`, top: `${y}%` };
}

function suitSymbol(key) {
  if (key === 'S') return '♠';
  if (key === 'D') return '♦';
  if (key === 'C') return '♣';
  if (key === 'H') return '♥';
  return '?';
}

export default function Table({
  players,
  trick,
  currentTurnPlayerId,
  winnerId,
  roundTricks,
  roundBids,
  cardsPerPlayer,
  trumpSuit,
  showLastTrick,
  nextPlayerName
}) {
  const positions = useMemo(() => {
    const map = new Map();
    players.forEach((player, idx) => {
      map.set(player.id, polarToStyle(idx, players.length));
    });
    return map;
  }, [players]);

  const winnerPos = winnerId ? positions.get(winnerId) : null;
  const dx = winnerPos ? `${parseFloat(winnerPos.left) - 50}%` : '0%';
  const dy = winnerPos ? `${parseFloat(winnerPos.top) - 50}%` : '0%';

  return (
    <div className="relative mx-auto flex h-[320px] w-full max-w-4xl items-center justify-center sm:h-[420px]">
      <div className="table-oval h-full w-full" />
      {trumpSuit ? (
        <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-felt-200/70 sm:text-xs">
            Trump
          </div>
          <div className="mt-1 text-6xl text-white/8 sm:text-7xl md:text-8xl">
            {suitSymbol(trumpSuit)}
          </div>
        </div>
      ) : null}
      <div className="absolute inset-0">
        {players.map((player, idx) => (
          <div
            key={player.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-[2px] ${
              currentTurnPlayerId === player.id
                ? 'border-amber-300 bg-amber-200/20 text-amber-100'
                : 'border-white/20 bg-black/50'
            }`}
            style={polarToStyle(idx, players.length)}
          >
            <div className="max-w-[7rem] truncate text-center">{player.name}</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-medium text-felt-200">
              <span>Total: {cardsPerPlayer ?? 0}</span>
              <span>Left: {player.handCount ?? 0}</span>
              <span>Bid: {roundBids?.[player.id] ?? 0}</span>
              <span>Got: {roundTricks?.[player.id] ?? 0}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 z-10 flex w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-wrap items-start justify-center gap-2 sm:w-auto sm:max-w-none sm:flex-nowrap sm:items-center sm:gap-4">
        {trick.cards?.map((play) => (
          <div
            key={play.playerId}
            style={showLastTrick && winnerId ? { '--dx': dx, '--dy': dy } : {}}
            className={`flex min-w-[4rem] flex-col items-center ${
              winnerId === play.playerId ? 'scale-105' : ''
            } ${showLastTrick && winnerId ? 'move-to-winner' : ''}`}
          >
            <div className={winnerId === play.playerId ? 'winner-glow ring-2 ring-amber-300' : ''}>
              <Card card={play.card} selectable={false} disabled compact dimWhenInactive={false} />
            </div>
            <div className="mt-1 text-center text-[10px] text-felt-200 sm:mt-2 sm:text-xs">
              {play.playerName}
              {winnerId === play.playerId ? ' • Winner' : ''}
            </div>
          </div>
        ))}
      </div>
      {showLastTrick && winnerId ? (
        <div className="absolute rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs text-felt-50">
          Next: {nextPlayerName}
        </div>
      ) : null}
    </div>
  );
}
