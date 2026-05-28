import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../stores/gameStore';

export function usePresence(username: string | undefined) {
  const { setOnlinePlayers, setActiveMatches } = useGameStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!username || !import.meta.env.VITE_SUPABASE_URL) return;

    const ch = supabase.channel('lobby', { config: { presence: { key: username } } });
    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ username: string; status: string }>();
      const users = Object.values(state).flat();
      const online = users.length;
      const inMatch = users.filter(u => u.status === 'in_match').length;
      setOnlinePlayers(Math.max(1, online));
      setActiveMatches(Math.floor(inMatch / 2));
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ username, status: 'online', ts: Date.now() });
      }
    });

    return () => {
      ch.untrack();
      supabase.removeChannel(ch);
    };
  }, [username, setOnlinePlayers, setActiveMatches]);

  const setInMatch = async () => {
    channelRef.current?.track({ username, status: 'in_match', ts: Date.now() });
  };

  const setOnline = async () => {
    channelRef.current?.track({ username, status: 'online', ts: Date.now() });
  };

  return { setInMatch, setOnline };
}
