import React from 'react';

export default function Lobby({ room, me, onStart, notification, onDismiss, onHelp }) {
  const shareUrl = `${window.location.origin}/?room=${room.code}`;
  const canStart = room.players.length === room.maxPlayers;

  return (
    <div className="min-h-screen bg-felt-pattern px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl">Room {room.code}</h1>
            <p className="mt-2 text-felt-200">Waiting for players to join.</p>
          </div>
          <button
            onClick={onHelp}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-felt-50 transition hover:bg-white/10 active:scale-[0.98]"
          >
            Help
          </button>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
            <div className="text-felt-200">Share link</div>
            <div className="mt-1 break-all font-semibold text-felt-50">{shareUrl}</div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText?.(shareUrl)}
              className="mt-3 rounded-full border border-white/20 px-3 py-1 text-xs transition hover:bg-white/10 active:scale-[0.98]"
            >
              Copy Link
            </button>
          </div>
        </div>
        {notification ? (
          <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-200/10 px-4 py-2 text-sm text-amber-100">
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button onClick={onDismiss} className="text-xs underline">Dismiss</button>
            </div>
          </div>
        ) : null}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <div className="text-sm uppercase tracking-[0.2em] text-felt-200">Players</div>
            <div className="mt-2 text-xs text-felt-200">
              {room.players.length} / {room.maxPlayers} joined
            </div>
            <ul className="mt-4 space-y-2">
              {room.players.map((player) => (
                <li key={player.id} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
                  <span>{player.name}</span>
                  {room.hostId === player.id ? (
                    <span className="rounded-full border border-amber-300 px-2 py-1 text-xs text-amber-200">Host</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <div className="text-sm uppercase tracking-[0.2em] text-felt-200">Game setup</div>
            <div className="mt-4 space-y-2 text-sm">
              <div>Max players: {room.maxPlayers}</div>
              <div>Decks: {room.decks}</div>
            </div>
            {me?.id === room.hostId ? (
              <button
                type="button"
                disabled={!canStart}
                onClick={onStart}
                className="mt-6 w-full rounded-lg bg-felt-400 px-4 py-2 font-semibold text-white transition hover:bg-felt-600 active:scale-[0.99] disabled:opacity-50"
              >
                Start Game
              </button>
            ) : (
              <div className="mt-6 text-sm text-felt-200">
                Waiting for the host to start the game.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
