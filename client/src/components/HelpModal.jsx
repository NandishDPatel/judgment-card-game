import React from 'react';

export default function HelpModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-table-900 p-6 text-felt-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">How to Play Judgment aka Kachuful</h2>
            <p className="mt-1 text-sm text-felt-200">Quick guide, rules, and scoring.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-xs transition hover:bg-white/10 active:scale-[0.98]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-6 text-sm leading-6">
          <section>
            <h3 className="text-base font-semibold text-felt-50">Basics</h3>
            <ul className="mt-2 list-disc pl-5 text-felt-200">
              <li>Players: 3 to 15.</li>
              <li>Host creates the room and shares the link or code.</li>
              <li>Each player joins with a name. No login needed.</li>
              <li>Trump rotates each round in order: Spades → Diamonds → Clubs → Hearts.</li>
              <li>Round leader rotates clockwise each round (host, then next player, etc.).</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-felt-50">Round Flow</h3>
            <ul className="mt-2 list-disc pl-5 text-felt-200">
              <li>Cards per player follow a down-up pattern: max, max-1, …, 1, 2, …, max, and repeat.</li>
              <li>Before each round, players bid how many hands they will take.</li>
              <li>Bid options are capped: 0 to min(cards in round, 9).</li>
              <li>Last bidder cannot make the total bids exactly equal to the round’s total hands.</li>
              <li>Each trick: players play one card in turn; winner leads the next trick.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-felt-50">Card Play Rules (1 Deck)</h3>
            <ul className="mt-2 list-disc pl-5 text-felt-200">
              <li>Card order (low → high): 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A.</li>
              <li>Players must follow the suit led if they can.</li>
              <li>If you don’t have the suit led, you may play a trump to win or any other suit as a “fish” (won’t take the hand).</li>
              <li>If trump is led, you must play trump if you have it.</li>
              <li>Highest card of the led suit wins unless a trump is played; then highest trump wins.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-felt-50">Card Play Rules (2 Decks)</h3>
            <ul className="mt-2 list-disc pl-5 text-felt-200">
              <li>All 1-deck rules apply.</li>
              <li>If two identical cards (same rank + same suit) are played in a trick, the second one wins over the first.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-felt-50">Scoring</h3>
            <ul className="mt-2 list-disc pl-5 text-felt-200">
              <li>Let <span className="text-felt-50">bid = n</span>.</li>
              <li>If you match your bid: score = <span className="text-felt-50">10 + 11 × n</span>.</li>
              <li>If you miss your bid: score = <span className="text-felt-50">-(10 + 11 × n)</span>.</li>
              <li>Examples: 0→±10, 1→±21, 2→±32, 3→±43, 4→±54.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-felt-50">Turn Timer</h3>
            <ul className="mt-2 list-disc pl-5 text-felt-200">
              <li>Each player has 15 seconds to act.</li>
              <li>If time runs out, a reminder is shown (no auto-play).</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
