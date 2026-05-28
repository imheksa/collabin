import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../stores/gameStore';
import { Fighter } from '../types';

export type MatchmakingStatus = 'idle' | 'waiting' | 'matched' | 'error';

export function useMatchmaking() {
  const { player1, setPlayer2, setMatchId, setIsHost, setScreen } = useGameStore();
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [queueId, setQueueIdState] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queueIdRef = useRef<string | null>(null);

  const joinQueue = useCallback(async () => {
    if (!player1) return;
    setStatus('waiting');

    try {
      const res = await fetch('/api/queue-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: player1.profile.username,
          fighterData: { profile: player1.profile, stats: player1.stats },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Queue error');

      if (data.matched) {
        const opponent = data.opponentData as Fighter;
        setPlayer2(opponent);
        setMatchId(data.matchId);
        setIsHost(false);
        setStatus('matched');
        setScreen('vs_screen');
      } else {
        queueIdRef.current = data.queueId;
        setQueueIdState(data.queueId);
        subscribeToQueue(data.queueId);
      }
    } catch (err) {
      console.error('Queue join error:', err);
      setStatus('error');
    }
  }, [player1, setPlayer2, setMatchId, setIsHost, setScreen]);

  const subscribeToQueue = useCallback((qId: string) => {
    const ch = supabase
      .channel(`queue_row:${qId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'match_queue', filter: `id=eq.${qId}` },
        async (payload) => {
          if (payload.new.status !== 'matched') return;
          const matchId = payload.new.match_id as string;

          const { data: match } = await supabase
            .from('matches')
            .select('player2_username, player2_data')
            .eq('id', matchId)
            .single();

          if (match?.player2_data) {
            const opponent = match.player2_data as Fighter;
            setPlayer2(opponent);
            setMatchId(matchId);
            setIsHost(true);
            setStatus('matched');
            setScreen('vs_screen');
          }
          supabase.removeChannel(ch);
          channelRef.current = null;
        }
      )
      .subscribe();

    channelRef.current = ch;
  }, [setPlayer2, setMatchId, setIsHost, setScreen]);

  const leaveQueue = useCallback(async () => {
    const qId = queueIdRef.current;
    setStatus('idle');
    setQueueIdState(null);
    queueIdRef.current = null;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!qId) return;
    try {
      await fetch('/api/queue-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: qId }),
      });
    } catch (err) {
      console.error('Queue leave error:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return { status, queueId, joinQueue, leaveQueue };
}
