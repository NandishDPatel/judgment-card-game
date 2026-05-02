# Judgment aka Kachuful

- Game is accessible live at: **https://judgment-card-game.vercel.app/**

- `client` React + Tailwind (Vercel)
- `server` Node + WebSockets (Render)

## Local dev

1. Install dependencies

```bash
cd client
npm install

cd ../server
npm install
```

2. Start server

```bash
cd server
npm run dev
```

3. Start client

```bash
cd client
npm run dev
```

Client runs on `http://localhost:5173` and connects to `ws://localhost:8080` by default.

## Environment variables

### Client

Make sure to setup env variable for wherever your server is running, set:

```
VITE_WS_URL=http://localhost:8080
```
