import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TURN_REMINDER_MESSAGE = "Please play, it's your turn.";

export default function useGameClient() {
  const [status, setStatus] = useState('disconnected');
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [notification, setNotification] = useState(null);
  const [timer, setTimer] = useState(15);
  // Goes up by one every time a socket opens. App.jsx re-sends room:join
  // for each new connection, because the server forgets which seat a
  // socket belongs to when the old one drops.
  const [connectionId, setConnectionId] = useState(0);
  // Goes up when the server ends our session (room closed, or this seat was
  // opened in another tab/device), so App.jsx can return to the home screen.
  const [sessionEnded, setSessionEnded] = useState(0);
  const wsRef = useRef(null);
  const intentionalCloseRef = useRef(false);

  const wsUrl = useMemo(() => {
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
    const host = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${host}:8080`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => {
      setStatus('connected');
      setConnectionId((id) => id + 1);
    };

    ws.onclose = () => {
      wsRef.current = null;
      setStatus('disconnected');

      if (!intentionalCloseRef.current) {
        setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'room:state') {
          setRoom(msg.payload.room);
          setMe(msg.payload.me);
          setTimer(msg.payload.timer ?? 15);
          setNotification((current) => {
            if (current?.message !== TURN_REMINDER_MESSAGE) return current;
            return (msg.payload.timer ?? 15) > 0 ? null : current;
          });
        }

        if (msg.type === 'room:error') {
          setNotification({ type: 'error', message: msg.payload.message });

          if (
            msg.payload.message?.toLowerCase().includes('not found') ||
            msg.payload.message?.toLowerCase().includes('does not exist')
          ) {
            setRoom(null);
            setMe(null);
          }
        }

        if (msg.type === 'room:closed' || msg.type === 'room:replaced') {
          setRoom(null);
          setMe(null);
          setNotification({ type: 'info', message: msg.payload.message });
          setSessionEnded((n) => n + 1);
        }

        if (msg.type === 'game:notification') {
          setNotification({ type: 'info', message: msg.payload.message });
        }
      } catch {
        // Ignore malformed messages
      }
    };
  }, [wsUrl]);

  useEffect(() => {
    intentionalCloseRef.current = false;
    connect();
    return () => {
      intentionalCloseRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((type, payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type, payload }));
  }, []);

  const clearRoom = useCallback(() => {
    setRoom(null);
    setMe(null);
  }, []);

  return {
    status,
    room,
    me,
    notification,
    clearNotification: () => setNotification(null),
    clearRoom,
    timer,
    send,
    connectionId,
    sessionEnded,
  };
}