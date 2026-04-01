# Judgment aka Kachuful

Monorepo with:

- `client` React + Tailwind (Vercel)
- `server` Node + WebSockets (Render)
- `Supabase` optional persistence

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

## Card assets

See `client/public/cards/README.md` for the public-domain deck sheet and slicing script.

## Environment variables

### Server

Optional Supabase persistence:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

When enabled, create a `rooms` table:

- `code` (text, primary key)
- `state` (jsonb)
- `updated_at` (timestamptz)

### Client

If your server is not local, set:

```
VITE_WS_URL=wss://your-render-domain
```
