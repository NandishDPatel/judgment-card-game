import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import Store from "./store.js";
import {
  addPlayer,
  createRoom,
  findPlayerByName,
  placeBid,
  playCard,
  roomView,
  startGame,
} from "./game.js";

const PORT = process.env.PORT || 8080;
const TURN_SECONDS = 15;

// Heartbeat: ping every socket; a socket that misses one full interval is dead.
const HEARTBEAT_MS = 30 * 1000;
// Room cleanup: delete rooms nobody is using any more.
const ROOM_IDLE_MS = 60 * 60 * 1000; // no game activity for 60 min
const ROOM_EMPTY_MS = 15 * 60 * 1000; // every player offline for 15 min
const CLEANUP_INTERVAL_MS = 60 * 1000;

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.send("Judgment server is running."));

const server = app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

const wss = new WebSocketServer({ server });
const store = new Store();
// socket -> { roomCode, playerId }. A socket is just the "phone line";
// this map is how the server knows which seat is on the other end.
const clientMeta = new Map();

function sendTo(ws, type, payload) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type, payload }));
}

function setTurnTimer(room) {
  if (room.phase === "lobby" || room.phase === "finished") {
    room.turnExpiresAt = null;
    room.turnNotified = false;
    return;
  }
  room.turnExpiresAt = Date.now() + TURN_SECONDS * 1000;
  room.turnNotified = false;
}

function touch(room) {
  room.lastActivityAt = Date.now();
}

function broadcastRoom(room) {
  const timer = room.turnExpiresAt
    ? Math.max(0, Math.ceil((room.turnExpiresAt - Date.now()) / 1000))
    : TURN_SECONDS;
  for (const [ws, meta] of clientMeta) {
    if (meta.roomCode !== room.code) continue;
    sendTo(ws, "room:state", {
      room: roomView(room, meta.playerId),
      me: { id: meta.playerId },
      timer,
    });
  }
}

function notifyPlayer(room, playerId, message) {
  for (const [ws, meta] of clientMeta) {
    if (meta.roomCode !== room.code || meta.playerId !== playerId) continue;
    sendTo(ws, "game:notification", { message });
  }
}

function socketsForPlayer(roomCode, playerId, exceptWs = null) {
  const sockets = [];
  for (const [ws, meta] of clientMeta) {
    if (ws === exceptWs) continue;
    if (meta.roomCode === roomCode && meta.playerId === playerId) {
      sockets.push(ws);
    }
  }
  return sockets;
}

// Put this socket in a seat. Any older socket still holding that seat
// (a background tab, WhatsApp's in-app browser, a dead connection) is
// detached, so the newest connection always wins.
function attachSocket(ws, room, player) {
  for (const other of socketsForPlayer(room.code, player.id, ws)) {
    clientMeta.delete(other);
    sendTo(other, "room:replaced", {
      message:
        "You opened this game in another tab or device, so this one was disconnected.",
    });
  }
  clientMeta.set(ws, { roomCode: room.code, playerId: player.id });
  player.connected = true;
  room.allDisconnectedSince = null;
}

// Mark a seat offline, but only if no other socket still holds it.
function markDisconnected(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return;
  if (socketsForPlayer(room.code, playerId).length > 0) return;
  player.connected = false;
  if (room.players.every((p) => !p.connected)) {
    room.allDisconnectedSince ??= Date.now();
  }
}

// Called when a socket switches to another room/seat.
async function releaseClientRoom(ws) {
  const previousMeta = clientMeta.get(ws);
  if (!previousMeta) return;
  clientMeta.delete(ws);

  const previousRoom = await store.getRoom(previousMeta.roomCode);
  if (!previousRoom) return;
  markDisconnected(previousRoom, previousMeta.playerId);
  await store.saveRoom(previousRoom);
  broadcastRoom(previousRoom);
}

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", async (raw) => {
    try {
      const { type, payload = {} } = JSON.parse(raw.toString());
      if (type === "room:create") {
        await releaseClientRoom(ws);
        const room = createRoom(payload);
        attachSocket(ws, room, room.players[0]);
        touch(room);
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      if (type === "room:join") {
        const roomCode = String(payload.roomCode ?? "").trim().toUpperCase();
        const room = await store.getRoom(roomCode);
        if (!room) throw new Error("Room not found.");

        // 1) Same browser as before: the device token matches a seat.
        let player = payload.reconnectToken
          ? room.players.find((p) => p.reconnectToken === payload.reconnectToken)
          : null;

        // 2) Different browser/app/device: claim the seat by typing the same
        //    name. The seat adopts this browser's token so step 1 works next time.
        if (!player) {
          player = findPlayerByName(room, payload.name);
          if (player && payload.reconnectToken) {
            player.reconnectToken = payload.reconnectToken;
          }
        }

        // 3) Genuinely new player: only allowed before the game starts.
        if (!player) {
          if (room.phase !== "lobby") {
            throw new Error(
              "Game already started. To rejoin, enter exactly the same name you used before.",
            );
          }
          const playerId = addPlayer(room, payload.name, payload.reconnectToken);
          player = room.players.find((p) => p.id === playerId);
        }

        const previousMeta = clientMeta.get(ws);
        if (
          previousMeta &&
          (previousMeta.roomCode !== room.code ||
            previousMeta.playerId !== player.id)
        ) {
          await releaseClientRoom(ws);
        }

        attachSocket(ws, room, player);
        touch(room);
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
        touch(room);
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      if (type === "room:stop") {
        if (meta.playerId !== room.hostId)
          throw new Error("Only host can stop.");
        room.phase = "finished";
        touch(room);
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
        touch(room);
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      if (type === "game:bid") {
        placeBid(room, meta.playerId, payload.bid);
        touch(room);
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }

      if (type === "game:playCard") {
        playCard(room, meta.playerId, payload.cardId);
        touch(room);
        setTurnTimer(room);
        await store.saveRoom(room);
        broadcastRoom(room);
        return;
      }
    } catch (error) {
      sendTo(ws, "room:error", { message: error.message });
    }
  });

  ws.on("close", async () => {
    const meta = clientMeta.get(ws);
    clientMeta.delete(ws);
    // No meta = this socket was already replaced by a newer one; nothing to do.
    if (!meta) return;
    try {
      const room = await store.getRoom(meta.roomCode);
      if (!room) return;
      markDisconnected(room, meta.playerId);
      await store.saveRoom(room);
      broadcastRoom(room);
    } catch (error) {
      console.error("close handler failed", error);
    }
  });
});

// Turn timer tick.
setInterval(() => {
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

// Heartbeat: find connections that died silently (phone lost signal, app
// backgrounded) and close them, which runs the normal "close" handler.
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_MS);

// Cleanup: remove abandoned rooms and tell anyone still looking at them.
setInterval(async () => {
  const now = Date.now();
  for (const room of [...store.rooms.values()]) {
    const idleFor = now - (room.lastActivityAt ?? now);
    const emptyFor = room.allDisconnectedSince
      ? now - room.allDisconnectedSince
      : 0;
    if (idleFor < ROOM_IDLE_MS && emptyFor < ROOM_EMPTY_MS) continue;

    for (const [ws, meta] of [...clientMeta]) {
      if (meta.roomCode !== room.code) continue;
      clientMeta.delete(ws);
      sendTo(ws, "room:closed", {
        message: "This room was closed because nobody played for a while.",
      });
    }
    try {
      await store.deleteRoom(room.code);
    } catch (error) {
      console.error("room cleanup failed", room.code, error);
    }
  }
}, CLEANUP_INTERVAL_MS);
