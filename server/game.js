import { nanoid } from 'nanoid';

const SUITS = ['S', 'D', 'C', 'H'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function createRoom({ name, maxPlayers, decks, reconnectToken }) {
  if (!name || name.trim().length === 0) {
    throw new Error('Name is required.');
  }
  if (maxPlayers < 2 || maxPlayers > 15) {
    throw new Error('Players must be between 2 and 15.');
  }
  const code = nanoid(6).toUpperCase();
  const hostId = nanoid();
  const players = [createPlayer(hostId, name, 0, reconnectToken)];
  const maxCards = Math.floor((52 * decks) / maxPlayers);
  const roundSequence = buildRoundSequence(maxCards);

  return {
    code,
    hostId,
    maxPlayers,
    decks,
    players,
    phase: 'lobby',
    round: null,
    rounds: [],
    roundSequence,
    roundIndex: 0,
    trick: { cards: [], suitLed: null, leaderId: null },
    lastTrick: null,
    currentTurnPlayerId: hostId,
    currentTurnPlayerName: name,
    createdAt: new Date().toISOString()
  };
}

export function addPlayer(room, name, reconnectToken) {
  if (!name || name.trim().length === 0) {
    throw new Error('Name is required.');
  }
  if (reconnectToken) {
    const existingByToken = room.players.find((player) => player.reconnectToken === reconnectToken);
    if (existingByToken) {
      return existingByToken.id;
    }
  }
  const existing = room.players.find((player) => player.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (room.phase !== 'lobby') {
      throw new Error('This player can only rejoin from the original device.');
    }
    existing.reconnectToken = reconnectToken ?? existing.reconnectToken ?? nanoid();
    return existing.id;
  }
  if (room.phase !== 'lobby') {
    throw new Error('Game already started.');
  }
  if (room.players.length >= room.maxPlayers) {
    throw new Error('Room is full.');
  }
  const seatIndex = room.players.length;
  const playerId = nanoid();
  room.players.push(createPlayer(playerId, name, seatIndex, reconnectToken));
  return playerId;
}

export function startGame(room) {
  if (room.players.length < 2) {
    throw new Error('Need at least 2 players.');
  }
  room.phase = 'bidding';
  room.roundIndex = 0;
  startRound(room, room.roundSequence[room.roundIndex]);
}

function createPlayer(id, name, seatIndex, reconnectToken) {
  return {
    id,
    name: name.trim(),
    seatIndex,
    reconnectToken: reconnectToken ?? nanoid(),
    totalScore: 0,
    hand: [],
    handCount: 0
  };
}

function buildRoundSequence(maxCards) {
  const down = [];
  for (let i = maxCards; i >= 1; i -= 1) down.push(i);
  const up = [];
  for (let i = 2; i <= maxCards; i += 1) up.push(i);
  return [...down, ...up];
}

function createDeck(decks) {
  const cards = [];
  for (let deck = 1; deck <= decks; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${suit}${rank}-${deck}-${nanoid(4)}`,
          suit,
          rank,
          deck
        });
      }
    }
  }
  return cards;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function roundTrump(roundIndex) {
  const order = ['S', 'D', 'C', 'H'];
  return order[roundIndex % order.length];
}

function roundLeaderId(room) {
  const ordered = orderedPlayers(room);
  const hostIndex = ordered.findIndex((p) => p.id === room.hostId);
  const leaderIndex = (hostIndex + room.roundIndex) % ordered.length;
  return ordered[leaderIndex].id;
}

export function startRound(room, cardsPerPlayer) {
  const deck = shuffle(createDeck(room.decks));
  const trumpSuit = roundTrump(room.roundIndex);
  room.trick = { cards: [], suitLed: null, leaderId: null };
  room.lastTrick = null;
  room.round = {
    index: room.roundIndex,
    cardsPerPlayer,
    trumpSuit,
    bids: {},
    tricks: {},
    points: {},
    leaderId: roundLeaderId(room),
    currentTurnId: null,
    phase: 'bidding'
  };

  const playersInOrder = orderedPlayers(room);
  playersInOrder.forEach((player) => {
    player.hand = deck.splice(0, cardsPerPlayer);
    player.handCount = player.hand.length;
    room.round.tricks[player.id] = 0;
  });

  room.currentTurnPlayerId = room.round.leaderId;
  room.currentTurnPlayerName = room.players.find((p) => p.id === room.currentTurnPlayerId)?.name;
}

function orderedPlayers(room) {
  return [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
}

function nextPlayerId(room, fromPlayerId) {
  const ordered = orderedPlayers(room);
  const idx = ordered.findIndex((p) => p.id === fromPlayerId);
  return ordered[(idx + 1) % ordered.length].id;
}

export function availableBids(room) {
  const bids = [];
  const maxBid = Math.min(room.round.cardsPerPlayer, 9);
  for (let i = 0; i <= maxBid; i += 1) bids.push(i);
  const playersOrdered = orderedPlayers(room);
  const lastBidderId = playersOrdered[(playersOrdered.findIndex((p) => p.id === room.round.leaderId) + playersOrdered.length - 1) % playersOrdered.length].id;

  if (room.currentTurnPlayerId === lastBidderId) {
    const totalSoFar = Object.values(room.round.bids).reduce((sum, v) => sum + v, 0);
    const disallowed = room.round.cardsPerPlayer - totalSoFar;
    return bids.filter((bid) => bid !== disallowed);
  }

  return bids;
}

export function placeBid(room, playerId, bid) {
  if (room.phase !== 'bidding') throw new Error('Not bidding phase.');
  if (room.currentTurnPlayerId !== playerId) throw new Error('Not your turn to bid.');
  const valid = availableBids(room);
  if (!valid.includes(bid)) throw new Error('Invalid bid.');

  room.round.bids[playerId] = bid;

  const allBid = Object.keys(room.round.bids).length === room.players.length;
  if (allBid) {
    room.phase = 'playing';
    room.round.phase = 'playing';
    room.currentTurnPlayerId = room.round.leaderId;
    room.currentTurnPlayerName = room.players.find((p) => p.id === room.currentTurnPlayerId)?.name;
    room.trick = { cards: [], suitLed: null, leaderId: room.round.leaderId };
    return;
  }

  room.currentTurnPlayerId = nextPlayerId(room, playerId);
  room.currentTurnPlayerName = room.players.find((p) => p.id === room.currentTurnPlayerId)?.name;
}

function validCardsForPlayer(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return [];
  if (room.phase !== 'playing') return [];
  if (room.currentTurnPlayerId !== playerId) return [];
  if (room.trick.cards.length === 0) return player.hand.map((c) => c.id);

  const suitLed = room.trick.suitLed;
  const hasSuit = player.hand.some((card) => card.suit === suitLed);
  if (hasSuit) {
    return player.hand.filter((card) => card.suit === suitLed).map((c) => c.id);
  }
  return player.hand.map((c) => c.id);
}

export function playCard(room, playerId, cardId) {
  if (room.phase !== 'playing') throw new Error('Not playing phase.');
  if (room.currentTurnPlayerId !== playerId) throw new Error('Not your turn.');
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found.');

  if (room.trick.cards.length === 0) {
    room.lastTrick = null;
  }

  const valid = validCardsForPlayer(room, playerId);
  if (!valid.includes(cardId)) throw new Error('Invalid card for this trick.');

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  const [card] = player.hand.splice(cardIndex, 1);
  player.handCount = player.hand.length;

  if (room.trick.cards.length === 0) {
    room.trick.suitLed = card.suit;
    room.trick.leaderId = playerId;
  }

  room.trick.cards.push({
    playerId,
    playerName: player.name,
    card,
    order: room.trick.cards.length
  });

  const trickComplete = room.trick.cards.length === room.players.length;
  if (!trickComplete) {
    room.currentTurnPlayerId = nextPlayerId(room, playerId);
    room.currentTurnPlayerName = room.players.find((p) => p.id === room.currentTurnPlayerId)?.name;
    return;
  }

  const winner = resolveTrick(room);
  room.round.tricks[winner.playerId] += 1;
  room.lastTrick = {
    id: nanoid(),
    cards: room.trick.cards,
    winnerId: winner.playerId
  };
  room.trick = { cards: [], suitLed: null, leaderId: winner.playerId };
  room.currentTurnPlayerId = winner.playerId;
  room.currentTurnPlayerName = room.players.find((p) => p.id === winner.playerId)?.name;

  const roundOver = room.players.every((p) => p.hand.length === 0);
  if (roundOver) {
    finishRound(room);
  }
}

function resolveTrick(room) {
  const trump = room.round.trumpSuit;
  const suitLed = room.trick.suitLed;

  const sorted = [...room.trick.cards].sort((a, b) => {
    const aIsTrump = a.card.suit === trump;
    const bIsTrump = b.card.suit === trump;
    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    const aIsLed = a.card.suit === suitLed;
    const bIsLed = b.card.suit === suitLed;
    if (aIsLed && !bIsLed) return -1;
    if (!aIsLed && bIsLed) return 1;

    if (a.card.rank !== b.card.rank) return b.card.rank - a.card.rank;

    if (a.card.suit === b.card.suit && a.card.rank === b.card.rank) {
      return b.order - a.order;
    }

    return 0;
  });

  return sorted[0];
}

function finishRound(room) {
  const round = room.round;
  const roundRecord = {
    id: nanoid(),
    index: round.index,
    trumpSuit: round.trumpSuit,
    cardsPerPlayer: round.cardsPerPlayer,
    bids: { ...round.bids },
    tricks: { ...round.tricks },
    points: {}
  };

  room.players.forEach((player) => {
    const bid = round.bids[player.id] ?? 0;
    const got = round.tricks[player.id] ?? 0;
    let points = 0;
    const base = 10 + bid * 11;
    if (bid === got) points = base;
    else points = -base;
    roundRecord.points[player.id] = points;
    player.totalScore += points;
  });

  room.rounds.push(roundRecord);

  room.roundIndex += 1;
  const sequenceIndex = room.roundIndex % room.roundSequence.length;
  room.phase = 'bidding';
  startRound(room, room.roundSequence[sequenceIndex]);
}

export function roomView(room, viewerId) {
  const players = [...room.players]
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((player) => ({
      id: player.id,
      name: player.name,
      seatIndex: player.seatIndex,
      totalScore: player.totalScore,
      handCount: player.hand.length,
      hand: player.id === viewerId ? player.hand : undefined
    }));

  const view = {
    code: room.code,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    decks: room.decks,
    players,
    phase: room.phase,
    round: room.round,
    rounds: room.rounds,
    trick: room.trick,
    lastTrick: room.lastTrick ?? null,
    currentTurnPlayerId: room.currentTurnPlayerId,
    currentTurnPlayerName: room.currentTurnPlayerName
  };

  if (room.phase === 'bidding' && room.currentTurnPlayerId === viewerId) {
    view.validBids = availableBids(room);
  }

  if (room.phase === 'playing') {
    view.validCardIds = validCardsForPlayer(room, viewerId);
  }

  return view;
}
