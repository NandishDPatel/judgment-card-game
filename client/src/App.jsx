import React, { useEffect, useMemo, useRef, useState } from 'react';
import useGameClient from './lib/useGameClient.js';
import CreateJoin from './components/CreateJoin.jsx';
import Lobby from './components/Lobby.jsx';
import Table from './components/Table.jsx';
import Scoreboard from './components/Scoreboard.jsx';
import Card from './components/Card.jsx';
import Timer from './components/Timer.jsx';
import HelpModal from './components/HelpModal.jsx';
import { SUITS } from './lib/cards.js';

const RECONNECT_TOKEN_KEY = 'judgment:deviceToken';

function suitLabel(key) {
  return SUITS.find((s) => s.key === key)?.name ?? key;
}

function getReconnectToken() {
  const existingToken = window.localStorage.getItem(RECONNECT_TOKEN_KEY);
  if (existingToken) return existingToken;
  const token =
    window.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(RECONNECT_TOKEN_KEY, token);
  return token;
}

export default function App() {
  const { room, me, send, notification, clearNotification, clearRoom, timer, status } =
    useGameClient();
  const reconnectToken = useMemo(() => getReconnectToken(), []);

  const [urlRoomCode, setUrlRoomCode] = useState(
    () => new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? ''
  );
  const [storedRoomCode, setStoredRoomCode] = useState(
    () => window.localStorage.getItem('judgment:lastRoom') ?? ''
  );

  const initialRoomCode = urlRoomCode || storedRoomCode;

  const autoRejoinName = useMemo(
    () =>
      urlRoomCode
        ? window.localStorage.getItem(`judgment:name:${urlRoomCode}`) ?? ''
        : '',
    [urlRoomCode]
  );

  const initialName =
    autoRejoinName ||
    (storedRoomCode
      ? window.localStorage.getItem(`judgment:name:${storedRoomCode}`) ?? ''
      : '');

  const lastJoinedConnectionRef = useRef(null);

  const mePlayer = useMemo(() => {
    if (!room || !me) return null;
    return room.players.find((p) => p.id === me.id) ?? null;
  }, [room, me]);

  const [showLastTrick, setShowLastTrick] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  function resetToHome() {
    clearRoom();
    clearNotification();
    lastJoinedConnectionRef.current = null;
    window.localStorage.removeItem('judgment:lastRoom');
    setStoredRoomCode('');
    setUrlRoomCode('');

    const current = new URL(window.location.href);
    current.searchParams.delete('room');
    window.history.replaceState({}, '', current.toString());
  }

  useEffect(() => {
    if (room?.code && mePlayer?.name) {
      window.localStorage.setItem(`judgment:name:${room.code}`, mePlayer.name);
      window.localStorage.setItem('judgment:lastRoom', room.code);
      setStoredRoomCode(room.code);
      const current = new URL(window.location.href);
      if (current.searchParams.get('room') !== room.code) {
        current.searchParams.set('room', room.code);
        window.history.replaceState({}, '', current.toString());
        setUrlRoomCode(room.code);
      }
    }
  }, [room?.code, mePlayer?.name]);

  useEffect(() => {
    if (!room?.lastTrick?.id) return;
    setShowLastTrick(true);
    const timerId = window.setTimeout(() => setShowLastTrick(false), 1200);
    return () => window.clearTimeout(timerId);
  }, [room?.lastTrick?.id]);

  useEffect(() => {
    if (status !== 'connected') return;
    if (room) return;
    if (!urlRoomCode || !autoRejoinName) return;

    const connectionKey = `${urlRoomCode}:${status}:${Date.now().toString().slice(0, -3)}`;
    if (lastJoinedConnectionRef.current === urlRoomCode) return;

    lastJoinedConnectionRef.current = urlRoomCode;
    send('room:join', {
      name: autoRejoinName,
      roomCode: urlRoomCode,
      reconnectToken,
    });
  }, [status, room, urlRoomCode, autoRejoinName, send, reconnectToken]);

  useEffect(() => {
    if (status === 'disconnected') {
      lastJoinedConnectionRef.current = null;
    }
  }, [status]);

  if (!room) {
    return (
      <>
        <CreateJoin
          loading={false}
          initialRoomCode={initialRoomCode}
          initialName={autoRejoinName || initialName}
          inviteMode={Boolean(urlRoomCode)}
          status={status}
          notification={notification}
          onDismiss={clearNotification}
          onHelp={() => setShowHelp(true)}
          onCreate={(payload) => {
            window.localStorage.setItem(`judgment:name:pending`, payload.name);
            send('room:create', { ...payload, reconnectToken });
          }}
          onJoin={(payload) => {
            window.localStorage.setItem(
              `judgment:name:${payload.roomCode}`,
              payload.name
            );
            window.localStorage.setItem('judgment:lastRoom', payload.roomCode);
            setStoredRoomCode(payload.roomCode);
            setUrlRoomCode(payload.roomCode);
            send('room:join', { ...payload, reconnectToken });
          }}
        />
        <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (room.phase === 'lobby') {
    return (
      <>
        <Lobby
          room={room}
          me={me}
          notification={notification}
          onDismiss={clearNotification}
          onHelp={() => setShowHelp(true)}
          onStart={() => send('room:start', { roomCode: room.code })}
          onCreateNewGame={resetToHome}
        />
        <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (room.phase === 'finished') {
    return (
      <div className="min-h-screen bg-felt-pattern px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-black/40 p-6">
          <h1 className="font-display text-3xl">Game Stopped</h1>
          <p className="mt-2 text-felt-200">
            The host stopped the game. Final scores are below.
          </p>
          {room.hostId === me?.id ? (
            <button
              onClick={() => send('room:restart', { roomCode: room.code })}
              className="mt-4 rounded-full border border-amber-300 bg-amber-200/20 px-4 py-2 text-sm transition hover:bg-amber-200/30 active:scale-[0.98]"
            >
              Restart Game
            </button>
          ) : null}
          <Scoreboard players={room.players} rounds={room.rounds} />
        </div>
        <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    );
  }

  const isMyTurn = room.currentTurnPlayerId === me?.id;
  const displayTrick = room.trick?.cards?.length
    ? room.trick
    : showLastTrick
      ? room.lastTrick ?? { cards: [] }
      : { cards: [] };
  const winnerId = showLastTrick ? room.lastTrick?.winnerId ?? null : null;

  return (
    <div className="min-h-screen bg-felt-pattern px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl">Judgment aka Kachuful</h1>
            <div className="mt-2 text-sm text-felt-200">
              Round {room.round.index + 1} • {room.round.cardsPerPlayer} cards •
              Trump {suitLabel(room.round.trumpSuit)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Timer seconds={timer} />
            <div className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm">
              Turn: {room.currentTurnPlayerName}
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-felt-50 transition hover:bg-white/10 active:scale-[0.98]"
            >
              Help
            </button>
            {room.hostId === me?.id ? (
              <button
                onClick={() => send('room:stop', { roomCode: room.code })}
                className="rounded-full border border-red-400/60 bg-red-400/10 px-4 py-2 text-xs text-red-100 transition hover:bg-red-400/20 active:scale-[0.98]"
              >
                Stop Game
              </button>
            ) : null}
          </div>
        </header>

        {notification ? (
          <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-200/10 px-4 py-2 text-sm text-amber-100">
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button onClick={clearNotification} className="text-xs underline">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <Table
            players={room.players}
            trick={displayTrick}
            currentTurnPlayerId={room.currentTurnPlayerId}
            winnerId={winnerId}
            roundTricks={room.round?.tricks ?? {}}
            roundBids={room.round?.bids ?? {}}
            cardsPerPlayer={room.round?.cardsPerPlayer ?? 0}
            trumpSuit={room.round?.trumpSuit ?? null}
            showLastTrick={showLastTrick}
            nextPlayerName={room.currentTurnPlayerName}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-felt-200">
                Predict your hands
              </div>
              <div className="mt-1 text-xs text-felt-200">
                You can only click valid cards.
              </div>
            </div>
            {room.phase === 'bidding' && isMyTurn ? (
              <div className="flex flex-wrap gap-2">
                {(room.validBids ?? []).map((bid) => (
                  <button
                    key={bid}
                    onClick={() =>
                      send('game:bid', { roomCode: room.code, bid })
                    }
                    className="rounded-full border border-amber-300 bg-amber-200/20 px-4 py-2 text-sm"
                  >
                    {bid} hands
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 flex-wrap justify-between">
            {mePlayer?.hand?.map((card) => (
              <Card
                key={card.id}
                card={card}
                selectable={room.validCardIds?.includes(card.id)}
                disabled={!room.validCardIds?.includes(card.id)}
                onClick={() =>
                  send('game:playCard', {
                    roomCode: room.code,
                    cardId: card.id,
                  })
                }
              />
            ))}
          </div>
        </div>

        <Scoreboard
          players={room.players}
          rounds={room.rounds}
          currentRound={room.round}
        />
      </div>
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
