import React, { useMemo } from 'react';
import Card from './Card.jsx';

function polarToStyle(index, total) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 42;
  const x = 50 + radius * Math.cos(angle);
  const y = 50 + radius * Math.sin(angle);
  return { left: `${x}%`, top: `${y}%` };
}

export default function Table({
  players,
  trick,
  currentTurnPlayerId,
  winnerId,
  roundTricks,
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
      <div className="absolute inset-0">
        {players.map((player, idx) => (
          <div
            key={player.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-2 text-xs font-semibold ${
              currentTurnPlayerId === player.id
                ? 'border-amber-300 bg-amber-200/20 text-amber-100'
                : 'border-white/20 bg-black/50'
            }`}
            style={polarToStyle(idx, players.length)}
          >
            <div>{player.name}</div>
            <div className="text-[10px] text-felt-200">Cards: {player.handCount ?? 0}</div>
            <div className="text-[10px] text-felt-200">Tricks: {roundTricks?.[player.id] ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="absolute flex items-center gap-4">
        {trick.cards?.map((play) => (
          <div
            key={play.playerId}
            style={showLastTrick && winnerId ? { '--dx': dx, '--dy': dy } : {}}
            className={`flex flex-col items-center ${
              winnerId === play.playerId ? 'scale-105' : ''
            } ${showLastTrick && winnerId ? 'move-to-winner' : ''}`}
          >
            <div className={winnerId === play.playerId ? 'winner-glow ring-2 ring-amber-300' : ''}>
              <Card card={play.card} selectable={false} disabled />
            </div>
            <div className="mt-2 text-xs text-felt-200">
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
