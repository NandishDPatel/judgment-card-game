import React, { useMemo, useState } from 'react';

export default function CreateJoin({ onCreate, onJoin, loading, initialRoomCode, initialName, status, notification, onDismiss, onHelp }) {
  const [name, setName] = useState(initialName ?? '');
  const [roomCode, setRoomCode] = useState(initialRoomCode ?? '');
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [decks, setDecks] = useState(1);

  const deckOptions = useMemo(() => {
    return [1, 2];
  }, [maxPlayers]);

  return (
    <div className="min-h-screen bg-felt-pattern px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-4xl text-felt-50">Judgment aka Kachuful</h1>
          <button
            onClick={onHelp}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-felt-50 transition hover:bg-white/10 active:scale-[0.98]"
          >
            Help
          </button>
        </div>
        <p className="mt-2 max-w-2xl text-felt-200">
          Create a room, invite friends, and play real-time tricks with rotating trump.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-felt-200">
          <span className={`rounded-full border px-3 py-1 ${status === 'connected' ? 'border-emerald-300/50 text-emerald-200' : 'border-amber-300/40 text-amber-200'}`}>
            Connection: {status}
          </span>
          <span>Server must be running at ws://localhost:8080</span>
        </div>
        {notification ? (
          <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-200/10 px-4 py-2 text-sm text-amber-100">
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button onClick={onDismiss} className="text-xs underline">Dismiss</button>
            </div>
          </div>
        ) : null}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <h2 className="font-display text-2xl">Create Game</h2>
            <label className="mt-4 block text-sm text-felt-200">Your name</label>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-felt-50"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
            <label className="mt-4 block text-sm text-felt-200">Number of players</label>
            <input
              type="number"
              min={2}
              max={15}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            />
            <label className="mt-4 block text-sm text-felt-200">Number of decks</label>
            <div className="mt-2 flex gap-3">
              {deckOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDecks(option)}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    decks === option ? 'border-amber-300 bg-amber-200/20' : 'border-white/10 bg-black/30'
                  }`}
                >
                  {option} Deck{option > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            {maxPlayers > 6 ? (
              <div className="mt-2 text-xs text-felt-200">
                Tip: For more than 6 players, 2 decks are recommended.
              </div>
            ) : null}
            <button
              type="button"
              disabled={loading || !name || status !== 'connected'}
              onClick={() => onCreate({ name, maxPlayers, decks })}
              className="mt-6 w-full rounded-lg bg-felt-400 px-4 py-2 font-semibold text-white transition hover:bg-felt-600 active:scale-[0.99] disabled:opacity-50"
            >
              Create Room
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <h2 className="font-display text-2xl">Join Game</h2>
            <label className="mt-4 block text-sm text-felt-200">Your name</label>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-felt-50"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
            {initialRoomCode ? (
              <div className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-felt-200">
                Joining room <span className="font-semibold text-felt-50">{roomCode}</span>
              </div>
            ) : (
              <>
                <label className="mt-4 block text-sm text-felt-200">Room code</label>
                <input
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 uppercase"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                />
              </>
            )}
            <button
              type="button"
              disabled={loading || !name || roomCode.length < 4 || status !== 'connected'}
              onClick={() => onJoin({ name, roomCode })}
              className="mt-6 w-full rounded-lg bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/25 active:scale-[0.99] disabled:opacity-50"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
