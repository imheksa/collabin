import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../stores/gameStore';
import { Fighter } from '../types';
import { getProfile, MMR_DEFAULT } from '../utils/playerProfile';

export type MatchmakingStatus = 'idle' | 'waiting' | 'matched' | 'error';

export function useMatchmaking() {
  const { player1, setPlayer2, setMatchId, setIsHost, setScreen } = useGameStore();
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [isRanked, setIsRanked] = useState(false);
  const [queueId, setQueueIdState] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queueIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedRef = useRef(false);

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
  }, []);

  const handleMatch = useCallback((opponent: Fighter, matchId: string, isHost: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    stopAll();
    setPlayer2(opponent);
    setMatchId(matchId);
    setIsHost(isHost);
    setStatus('matched');
    setScreen('vs_screen');
  }, [stopAll, setPlayer2, setMatchId, setIsHost, setScreen]);

  const startPolling = useCallback((qId: string) => {
    pollRef.current = setInterval(async () => {
      if (resolvedRef.current) return;
      try {
        const { data: row } = await supabase
          .from('match_queue').select('status,match_id').eq('id', qId).single();
        if (row?.status !== 'matched' || !row.match_id) return;

        const { data: match } = await supabase
          .from('matches').select('player2_data').eq('id', row.match_id).single();
        if (match?.player2_data) {
          handleMatch(match.player2_data as Fighter, row.match_id, true);
        }
      } catch { /* ignore */ }
    }, 5000);
  }, [handleMatch]);

  const joinQueue = useCallback(async (ranked = false) => {
    if (!player1) return;
    resolvedRef.current = false;
    setStatus('waiting');
    setIsRanked(ranked);

    const myMmr = getProfile(player1.profile.username).mmr ?? MMR_DEFAULT;

    try {
      const res = await fetch('/api/queue-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: player1.profile.username,
          fighterData: { profile: player1.profile, stats: player1.stats },
          mmr: myMmr,
          ranked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Queue error');

      if (data.matched) {
        handleMatch(data.opponentData as Fighter, data.matchId, false);
      } else {
        queueIdRef.current = data.queueId;
        setQueueIdState(data.queueId);
        subscribeToQueue(data.queueId);
        startPolling(data.queueId);
      }
    } catch (err) {
      console.error('Queue join error:', err);
      setStatus('error');
    }
  }, [player1, handleMatch, startPolling]);

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
            .select('player2_data')
            .eq('id', matchId)
            .single();

          if (match?.player2_data) {
            handleMatch(match.player2_data as Fighter, matchId, true);
          }
          supabase.removeChannel(ch);
          channelRef.current = null;
        }
      )
      .subscribe();

    channelRef.current = ch;
  }, [handleMatch]);

  const leaveQueue = useCallback(async () => {
    const qId = queueIdRef.current;
    resolvedRef.current = true;
    stopAll();
    setStatus('idle');
    setIsRanked(false);
    setQueueIdState(null);
    queueIdRef.current = null;

    if (!qId) return;
    try {
      await fetch('/api/queue-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: qId, username: player1?.profile.username }),
      });
    } catch (err) {
      console.error('Queue leave error:', err);
    }
  }, [stopAll]);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  return { status, queueId, isRanked, joinQueue, leaveQueue };
}
