import React from 'react';
import { SUITS } from '../lib/cards.js';

function suitSymbol(key) {
  return SUITS.find((s) => s.key === key)?.symbol ?? key;
}

export default function Scoreboard({ players, rounds, currentRound }) {
  const liveRound =
    currentRound && currentRound.cardsPerPlayer
      ? {
          id: 'live',
          trumpSuit: currentRound.trumpSuit,
          cardsPerPlayer: currentRound.cardsPerPlayer,
          bids: currentRound.bids,
          tricks: currentRound.tricks,
          points: currentRound.points ?? {}
        }
      : null;
  const rows = liveRound ? [liveRound, ...rounds] : rounds;

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="mb-3 text-sm uppercase tracking-[0.2em] text-felt-200">Scoreboard</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-felt-200">
            <th className="pb-2">Round</th>
            <th className="pb-2">Trump</th>
            <th className="pb-2">Cards</th>
            {players.map((player) => (
              <th key={player.id} className="pb-2">{player.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((round, idx) => (
            <tr key={round.id ?? idx} className="border-t border-white/5">
              <td className="py-2 font-semibold">
                {round.id === 'live'
                  ? `Round ${(currentRound?.index ?? 0) + 1}`
                  : `Round ${(round.index ?? 0) + 1}`}
              </td>
              <td className="py-2 text-lg">{suitSymbol(round.trumpSuit)}</td>
              <td className="py-2">{round.cardsPerPlayer ?? '-'}</td>
              {players.map((player) => {
                const bid = round.bids?.[player.id] ?? '-';
                const actual = round.tricks?.[player.id] ?? '-';
                const points = round.points?.[player.id] ?? '-';
                return (
                  <td key={player.id} className="py-2">
                    <div className="flex flex-col">
                      <span>Bid: {bid}</span>
                      <span>Got: {actual}</span>
                      <span className="text-felt-200">Pts: {points}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/10 text-felt-50">
            <td className="pt-3 font-semibold" colSpan={2}>Total</td>
            {players.map((player) => (
              <td key={player.id} className="pt-3 font-semibold">
                {player.totalScore ?? 0}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
