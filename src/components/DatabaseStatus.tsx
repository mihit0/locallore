"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export function DatabaseStatus() {
  const [status, setStatus] = useState<string>('Checking...');
  const { user } = useAuth();

  useEffect(() => {
    checkDatabaseStatus();
  }, [user]);

  const checkDatabaseStatus = async () => {
    try {
      // Get all interactions count for current user
      const { data: userInteractions, error: userError } = await supabase
        .from('user_event_interactions')
        .select('id, interaction_type')
        .eq('user_id', user?.id || '');

      if (userError) {
        setStatus(`❌ User interactions error: ${userError.message}`);
        return;
      }

      // Get total interactions count
      const { data: allInteractions, error: allError } = await supabase
        .from('user_event_interactions')
        .select('id');

      if (allError) {
        setStatus(`❌ All interactions error: ${allError.message}`);
        return;
      }

      // Test if we can read events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, tags, category');

      if (eventsError) {
        setStatus(`❌ Events table error: ${eventsError.message}`);
        return;
      }

      // Count interactions by type for current user
      const bookmarks = userInteractions?.filter(i => i.interaction_type === 'bookmark').length || 0;
      const attends = userInteractions?.filter(i => i.interaction_type === 'attend').length || 0;
      const views = userInteractions?.filter(i => i.interaction_type === 'view').length || 0;

      setStatus(`✅ Database OK - User: ${bookmarks} bookmarks, ${attends} attending, ${views} views | Total: ${allInteractions?.length || 0} interactions, ${events?.length || 0} events`);
    } catch (error) {
      setStatus(`❌ Connection error: ${error}`);
    }
  };

  if (!user) {
    return (
      <div className="bg-red-900/80 text-white p-3 rounded border border-red-700 text-xs max-w-sm">
        <div className="font-mono">❌ Not logged in</div>
      </div>
    );
  }

  return (
    <div className="bg-black/80 text-white p-3 rounded border border-gray-700 text-xs max-w-sm">
      <div className="font-mono text-[10px] leading-4">{status}</div>
      <button 
        onClick={checkDatabaseStatus}
        className="mt-2 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
      >
        Refresh
      </button>
    </div>
  );
} 