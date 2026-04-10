import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TURN_REMINDER_MESSAGE = "Please play, it's your turn.";

export default function useGameClient() {
  const [status, setStatus] = useState('disconnected');
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [notification, setNotification] = useState(null);
  const [timer, setTimer] = useState(15);
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

    ws.onopen = () => setStatus('connected');

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
  };
}