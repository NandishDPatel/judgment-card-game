import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import Store from "./store.js";
import {
  addPlayer,
  createRoom,
  placeBid,
  playCard,
  roomView,
  startGame,
} from "./game.js";

const PORT = process.env.PORT || 8080;
const TURN_SECONDS = 15;

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.send("Judgment server is running."));

const server = app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

const wss = new WebSocketServer({ server });
const store = new Store();
const clientMeta = new Map();

function setTurnTimer(room) {
  if (room.phase === "lobby" || room.phase === "finished") {
    room.turnExpiresAt = null;
    room.turnNotified = false;
    return;
  }
  room.turnExpiresAt = Date.now() + TURN_SECONDS * 1000;
  room.turnNotified = false;
}

function broadcastRoom(room) {
  wss.clients.forEach((ws) => {
    const meta = clientMeta.get(ws);
    if (!meta || meta.roomCode !== room.code) return;
    const timer = room.turnExpiresAt
      ? Math.max(0, Math.ceil((room.turnExpiresAt - Date.now()) / 1000))
      : TURN_SECONDS;
    ws.send(
      JSON.stringify({
        type: "room:state",
        payload: {
          room: roomView(room, meta.playerId),
          me: { id: meta.playerId },
          timer,
        },
      }),
    );
  });
}

function notifyPlayer(room, playerId, message) {
  wss.clients.forEach((ws) => {
    const meta = clientMeta.get(ws);
    if (!meta || meta.roomCode !== room.code || meta.playerId !== playerId)
      return;
    ws.send(
      JSON.stringify({ type: "game:notification", payload: { message } }),
    );
  });
}

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    try {
      const { type, payload } = JSON.parse(raw.toString());
      if (type === "room:create") {
        const room = createRoom(payload);
        const playerId = room.players[0].id;
        clientMeta.set(ws, { roomCode: room.code, playerId });
        await store.saveRoom(room);
        setTurnTimer(room);
        broadcastRoom(room);
        return;
      }

      if (type === "room:join") {
        const room = await store.getRoom(payload.roomCode);

        if (!room) throw new Error("Room not found.");

        const existingPlayer = room.players.find(
          (p) => p.reconnectToken === payload.reconnectToken,
        );

        if (existingPlayer) {
          existingPlayer.connected = true;
          clientMeta.set(ws, {
            roomCode: room.code,
            playerId: existingPlayer.id,
          });
          await store.saveRoom(room);
          broadcastRoom(room);
          return;
        }

        if (room.phase !== "lobby") {
          throw new Error("Game already started. Cannot join mid-game.");
        }

        const playerId = addPlayer(room, payload.name, payload.reconnectToken);
        clientMeta.set(ws, { roomCode: room.code, playerId });
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      const meta = clientMeta.get(ws);
      if (!meta) throw new Error("Not in a room.");
      const room = await store.getRoom(meta.roomCode);
      if (!room) throw new Error("Room not found.");

      if (type === "room:start") {
        if (meta.playerId !== room.hostId)
          throw new Error("Only host can start.");
        if (room.players.length !== room.maxPlayers)
          throw new Error("Waiting for all players.");
        startGame(room);
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      if (type === "room:stop") {
        if (meta.playerId !== room.hostId)
          throw new Error("Only host can stop.");
        room.phase = "finished";
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      if (type === "room:restart") {
        if (meta.playerId !== room.hostId)
          throw new Error("Only host can restart.");
        room.phase = "lobby";
        room.round = null;
        room.rounds = [];
        room.roundIndex = 0;
        room.trick = { cards: [], suitLed: null, leaderId: null };
        room.lastTrick = null;
        room.currentTurnPlayerId = room.hostId;
        room.currentTurnPlayerName =
          room.players.find((p) => p.id === room.hostId)?.name ?? "";
        room.players.forEach((player) => {
          player.totalScore = 0;
          player.hand = [];
          player.handCount = 0;
        });
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      if (type === "game:bid") {
        placeBid(room, meta.playerId, payload.bid);
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      if (type === "game:playCard") {
        playCard(room, meta.playerId, payload.cardId);
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "room:error",
          payload: { message: error.message },
        }),
      );
    }
  });

  ws.on('close', () => {
  const meta = clientMeta.get(ws);
  clientMeta.delete(ws);
  if (!meta) return;

  store.getRoom(meta.roomCode).then((room) => {
    if (!room) return;
    const player = room.players.find((p) => p.id === meta.playerId);
    if (!player) return;
    player.connected = false;
    store.saveRoom(room);
    broadcastRoom(room); 
  });
});
});

setInterval(async () => {
  for (const room of store.rooms.values()) {
    if (!room.turnExpiresAt) continue;
    const remaining = Math.max(
      0,
      Math.ceil((room.turnExpiresAt - Date.now()) / 1000),
    );
    if (remaining === 0 && !room.turnNotified) {
      room.turnNotified = true;
      notifyPlayer(
        room,
        room.currentTurnPlayerId,
        "Please play, it's your turn.",
      );
    }
    broadcastRoom(room);
  }
}, 1000);
