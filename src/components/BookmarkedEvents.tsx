"use client";

import { useState, useEffect } from 'react';
import { Event } from '@/types/event';
import { EventCard } from '@/components/EventCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bookmark, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface BookmarkedEventsProps {
  userId?: string;
}

export function BookmarkedEvents({ userId }: BookmarkedEventsProps) {
  const [bookmarkedEvents, setBookmarkedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (userId || user?.id) {
      loadBookmarkedEvents();
    }
  }, [userId, user]);

  // Set up real-time subscription for bookmarks
  useEffect(() => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const subscription = supabase
      .channel('bookmark-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_event_interactions',
        filter: `user_id=eq.${targetUserId}`
      }, (payload) => {
        console.log('Bookmark interaction changed:', payload);
        loadBookmarkedEvents(); // Reload when bookmark interactions change
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, user]);

  const loadBookmarkedEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        setBookmarkedEvents([]);
        return;
      }

      console.log('Loading bookmarked events for user:', targetUserId);

      // Get bookmarked event IDs - Add better error handling
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from('user_event_interactions')
        .select('event_id')
        .eq('user_id', targetUserId)
        .eq('interaction_type', 'bookmark');

      if (bookmarkError) {
        console.error('Bookmark query error:', bookmarkError);
        console.error('Full error details:', {
          message: bookmarkError.message,
          details: bookmarkError.details,
          hint: bookmarkError.hint,
          code: bookmarkError.code
        });
        
        // Check if it's a permissions error
        if (bookmarkError.code === '42501' || bookmarkError.message.includes('permission denied')) {
          setError('Permission denied - please log in again');
        } else if (bookmarkError.code === '42P01') {
          setError('Table not found - database setup issue');
        } else {
          setError(`Database error: ${bookmarkError.message}`);
        }
        return;
      }

      console.log('Found bookmarks:', bookmarkData);

      if (!bookmarkData || bookmarkData.length === 0) {
        setBookmarkedEvents([]);
        return;
      }

      const eventIds = bookmarkData.map(b => b.event_id);
      console.log('Fetching events with IDs:', eventIds);

      // Get the actual events with creator info - Better error handling
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *
        `)
        .in('id', eventIds)
        .gte('end_time', new Date().toISOString()) // Only show future events
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Events query error:', eventsError);
        console.error('Full error details:', {
          message: eventsError.message,
          details: eventsError.details,
          hint: eventsError.hint,
          code: eventsError.code
        });
        setError(`Events fetch error: ${eventsError.message}`);
        return;
      }

      // Separately fetch creator information for each event
      if (eventsData && eventsData.length > 0) {
        const eventsWithCreators = await Promise.all(
          eventsData.map(async (event) => {
            const { data: creatorData } = await supabase
              .from('users')
              .select('display_name, graduation_year')
              .eq('id', event.user_id)
              .single();
            
            return {
              ...event,
              creator: creatorData || { display_name: 'Unknown', graduation_year: null }
            };
          })
        );
        setBookmarkedEvents(eventsWithCreators);
      } else {
        setBookmarkedEvents([]);
      }
    } catch (error) {
      console.error('Error loading bookmarked events:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkUpdate = () => {
    // Reload bookmarked events when a bookmark is updated
    console.log('Bookmark updated, reloading...');
    loadBookmarkedEvents();
  };

  if (loading) {
    return (
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            Bookmarked Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-black/40 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            Bookmarked Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-2">Error loading bookmarks</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button 
              onClick={loadBookmarkedEvents}
              className="bg-[#B1810B] hover:bg-[#B1810B]/80 text-white px-4 py-2 rounded text-sm"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          Bookmarked Events
          {bookmarkedEvents.length > 0 && (
            <span className="text-sm bg-[#B1810B]/20 text-[#B1810B] px-2 py-1 rounded border border-[#B1810B]/30">
              {bookmarkedEvents.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookmarkedEvents.length === 0 ? (
          <div className="text-center py-8">
            <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No bookmarked events yet</p>
            <p className="text-sm text-gray-500">
              Bookmark events to see them here for easy access
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarkedEvents.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                showMapButton 
                onBookmarkUpdate={handleBookmarkUpdate}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 