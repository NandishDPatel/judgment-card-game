import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function useGameClient() {
  const [status, setStatus] = useState('disconnected');
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [notification, setNotification] = useState(null);
  const [timer, setTimer] = useState(15);
  const wsRef = useRef(null);

  console.log('GameClient status:', import.meta.env.VITE_WS_URL, status);

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
      setStatus('disconnected');
      wsRef.current = null;
      setTimeout(connect, 3000); // retry every 3s
    };
    ws.onerror = () => setStatus('error');

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'room:state') {
        setRoom(msg.payload.room);
        setMe(msg.payload.me);
        setTimer(msg.payload.timer ?? 15);
      }
      if (msg.type === 'room:error') {
        setNotification({ type: 'error', message: msg.payload.message });
      }
      if (msg.type === 'game:notification') {
        setNotification({ type: 'info', message: msg.payload.message });
      }
    };
  }, [wsUrl]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const send = useCallback((type, payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type, payload }));
  }, []);

  return {
    status,
    room,
    me,
    notification,
    clearNotification: () => setNotification(null),
    timer,
    send
  };
}
