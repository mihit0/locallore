"use client";

import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Event } from '@/types/event';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MapPin, Bookmark, Share, UserCheck } from 'lucide-react';
import { EventDetailsSheet } from '@/components/map/EventDetailsSheet';
import { useRouter } from 'next/navigation';
import { TAG_CATEGORIES, TAG_COLORS } from '@/types/event';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const getTagColor = (tag: string): string => {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if ((tags as readonly string[]).includes(tag)) {
      return TAG_COLORS[category as keyof typeof TAG_COLORS];
    }
  }
  return TAG_COLORS.General;
};

const getTagBadgeClasses = (tag: string): string => {
  const color = getTagColor(tag);
  return `text-xs border-0`;
};

// Helper function to render tags with confidence scores
const renderTagWithConfidence = (tag: string, confidence?: number) => {
  const baseColor = getTagColor(tag);
  const hasConfidence = confidence !== undefined && confidence > 0;
  
  return (
    <Badge
      key={tag}
      variant="outline"
      className="text-xs border-0 h-5 px-2 relative"
      style={{
        backgroundColor: hasConfidence 
          ? `${baseColor}${Math.round(confidence * 255).toString(16).padStart(2, '0').slice(0, 2)}` 
          : `${baseColor}15`,
        color: baseColor,
        borderColor: `${baseColor}20`
      }}
    >
      {tag}
      {hasConfidence && confidence > 0.7 && (
        <span className="ml-1 text-xs opacity-75">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </Badge>
  );
};

interface EventCardProps {
  event: Event;
  showMapButton?: boolean;
  onBookmarkUpdate?: () => void;
  externalBookmarkState?: boolean;
  externalAttendState?: boolean;
  onStateChange?: (eventId: string, isBookmarked: boolean, isAttending: boolean) => void;
  spamProbability?: number;
  qualityScore?: number;
  recommendationScore?: number;
}

export function EventCard({ 
  event, 
  showMapButton = false, 
  onBookmarkUpdate,
  externalBookmarkState,
  externalAttendState,
  onStateChange,
  spamProbability = 0,
  qualityScore = 1,
  recommendationScore
}: EventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(externalBookmarkState ?? false);
  const [isAttending, setIsAttending] = useState(externalAttendState ?? false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (externalBookmarkState !== undefined) {
      setIsBookmarked(externalBookmarkState);
    }
    if (externalAttendState !== undefined) {
      setIsAttending(externalAttendState);
    }
  }, [externalBookmarkState, externalAttendState]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          try {
            // Note: View tracking works for both authenticated and unauthenticated users
            await fetch(`/api/events/${event.id}/interact`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'view' })
            });
          } catch (error) {
            console.error('Error tracking view:', error);
          }
        }
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    // Load bookmark and attendance status only for authenticated users
    if (user) {
      loadInteractionStatus();
    }

    return () => observer.disconnect();
  }, [event.id, user]);

  // Real-time subscription to update attendee count when others interact
  useEffect(() => {
    if (!event) return;

    console.log(`📡 Setting up real-time subscription for event ${event.id}`);
    
    const channel = supabase
      .channel(`event-${event.id}-interactions`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_event_interactions',
          filter: `event_id=eq.${event.id}`
        },
        (payload) => {
          console.log(`🔄 Real-time update for event ${event.id}:`, payload);
          // Update interaction status after real-time changes
          setTimeout(() => {
            if (user) {
              loadInteractionStatus();
            } else {
              loadAttendeeCount();
            }
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for event ${event.id}:`, status);
      });

    return () => {
      console.log(`📡 Cleaning up subscription for event ${event.id}`);
      supabase.removeChannel(channel);
    };
  }, [event]);

  const loadAttendeeCount = async () => {
    try {
      // Simple count query for internal use only
      const { count, error } = await supabase
        .from('user_event_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('interaction_type', 'attend');

      if (error) {
        setAttendeeCount(0);
      } else {
        setAttendeeCount(count || 0);
      }
    } catch (error) {
      setAttendeeCount(0);
    }
  };

  const loadInteractionStatus = async () => {
    if (!user) {
      console.log(`❌ No user found for loadInteractionStatus`);
      // Set default states for unauthenticated users
      setIsBookmarked(false);
      setIsAttending(false);
      // Still load attendee count for unauthenticated users
      await loadAttendeeCount();
      return;
    }

    console.log(`🔄 Loading interactions for event ${event.id}, user ${user.id}`);

    try {
      // Check if bookmarked - use maybeSingle() to handle no results gracefully
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from('user_event_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('interaction_type', 'bookmark')
        .maybeSingle();

      if (bookmarkError) {
        console.error('Error checking bookmark (table may not exist yet):', bookmarkError);
        // If table doesn't exist, default to false
        setIsBookmarked(false);
      } else {
        console.log(`Bookmark status for event ${event.id}:`, !!bookmarkData);
        setIsBookmarked(!!bookmarkData);
      }

      // Check if attending - use maybeSingle() to handle no results gracefully
      const { data: attendData, error: attendError } = await supabase
        .from('user_event_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('interaction_type', 'attend')
        .maybeSingle();

      if (attendError) {
        console.error('Error checking attendance (table may not exist yet):', attendError);
        // If table doesn't exist, default to false
        setIsAttending(false);
      } else {
        console.log(`Attendance status for event ${event.id}:`, !!attendData);
        setIsAttending(!!attendData);
      }

      // Get total attendee count - load this regardless of user auth status
      await loadAttendeeCount();

      // Notify parent of initial state
      onStateChange?.(event.id, !!bookmarkData, !!attendData);
    } catch (error) {
      console.error('Error loading interaction status:', error);
    }
  };

  const handleClick = async () => {
    try {
      // Note: Click tracking works for both authenticated and unauthenticated users
      await fetch(`/api/events/${event.id}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'click' })
      });
      setShowDetails(true);
    } catch (error) {
      console.error('Error tracking click:', error);
      setShowDetails(true);
    }
  };

  const handleViewOnMap = () => {
    router.push(`/map?event=${event.id}`);
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please login to bookmark events');
      return;
    }

    setLoading(true);
    console.log(`Toggling bookmark for event ${event.id}, current state: ${isBookmarked}`);
    
    try {
      if (isBookmarked) {
        // Remove bookmark - use API DELETE method
        const response = await fetch(`/api/events/${event.id}/interact`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'bookmark' })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('API delete failed:', errorData);
          throw new Error('Failed to remove bookmark');
        }

        setIsBookmarked(false);
        onStateChange?.(event.id, false, isAttending);
        toast.success('Event removed from bookmarks');
      } else {
        // Add bookmark - use API route
        const response = await fetch(`/api/events/${event.id}/interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'bookmark' })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('API post failed:', errorData);
          throw new Error('Failed to add bookmark');
        }

        setIsBookmarked(true);
        onStateChange?.(event.id, true, isAttending);
        toast.success('Event bookmarked');
      }
      onBookmarkUpdate?.();
    } catch (error) {
      console.error('Error updating bookmark:', error);
      toast.error('Failed to update bookmark');
    } finally {
      setLoading(false);
    }
  };

  const handleAttend = async () => {
    if (!user) {
      toast.error('Please login to mark attendance');
      return;
    }

    setLoading(true);
    console.log(`Toggling attendance for event ${event.id}, current state: ${isAttending}`);
    
    try {
      if (isAttending) {
        // Remove attendance - use API DELETE method
        const response = await fetch(`/api/events/${event.id}/interact`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'attend' })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('API delete failed:', errorData);
          throw new Error('Failed to remove attendance');
        }

        setIsAttending(false);
        onStateChange?.(event.id, isBookmarked, false);
        toast.success('No longer attending');
        
        // Update internal count for consistency
        setTimeout(() => loadAttendeeCount(), 150);
      } else {
        // Add attendance - use API route
        const response = await fetch(`/api/events/${event.id}/interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'attend' })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('API post failed:', errorData);
          throw new Error('Failed to mark attendance');
        }

        setIsAttending(true);
        onStateChange?.(event.id, isBookmarked, true);
        toast.success('Marked as attending');
        
        // Update internal count for consistency
        setTimeout(() => loadAttendeeCount(), 150);
      }
      onBookmarkUpdate?.(); // This might be used by parent components
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/map?event=${event.id}`;
      
      // Always copy to clipboard first
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Event link copied to clipboard!');
      
      // Track share interaction
      await fetch(`/api/events/${event.id}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'share' })
      });

      // Then try native share if available
      if (navigator.share) {
        setTimeout(async () => {
          try {
            await navigator.share({
              title: event.title,
              text: event.description,
              url: shareUrl,
            });
          } catch (shareError) {
            // User cancelled share, which is fine
            console.log('Share cancelled or failed:', shareError);
          }
        }, 100); // Small delay to ensure toast shows first
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to copy event link');
    }
  };

  const getTimeDisplay = () => {
    const startTime = new Date(event.start_time);
    const now = new Date();
    
    if (startTime.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(startTime, { addSuffix: true });
    } else {
      return format(startTime, 'MMM d, h:mm a');
    }
  };

  return (
    <>
      <div 
        ref={cardRef}
        className="w-full p-3 md:p-4 rounded hover:bg-gray-900/30 transition-all duration-300 hover:scale-[1.02] transform"
      >
        {event.image_url && (
          <div className="relative w-full h-32 md:h-40 mb-3 rounded overflow-hidden">
            <img 
              src={event.image_url} 
              alt={event.title}
              className="absolute inset-0 w-full h-full object-contain bg-black/50"
            />
          </div>
        )}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold line-clamp-2 text-white flex-1">{event.title}</h3>
          <div className="flex items-center gap-1 ml-2">
            {/* Recommendation Score */}
            {recommendationScore && recommendationScore > 0.6 && (
              <div 
                className={`px-1 py-0.5 rounded text-xs ${
                  recommendationScore > 0.8 
                    ? 'bg-[#B1810B]/20 text-[#B1810B]' 
                    : recommendationScore > 0.7 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}
                title={`Recommended for you (${Math.round(recommendationScore * 100)}% match)`}
              >
                {recommendationScore > 0.8 ? '⭐' : '👍'}
              </div>
            )}
            
            {/* Quality Indicator - Minimalistic dot */}
            {qualityScore > 0.8 && !(event.is_spam || spamProbability > 0.6) && (
              <div 
                className="w-2 h-2 bg-green-400 rounded-full"
                title={`High quality content (${Math.round(qualityScore * 100)}% quality)`}
              />
            )}
          </div>
        </div>

        <div className="text-xs text-gray-400 mb-3 space-y-1">
          <div>{getTimeDisplay()}</div>
          <button 
            onClick={handleViewOnMap}
            className="text-[#B1810B] hover:text-[#D4940D] flex items-center gap-1 transition-colors duration-200"
          >
            <MapPin className="w-3 h-3" />
            <span className="text-xs">View on Map</span>
          </button>
        </div>

        <p className="text-gray-300 line-clamp-2 mb-3 text-xs">{event.description}</p>
        
        {/* Tags section */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {event.tags.slice(0, 4).map((tag) => renderTagWithConfidence(tag))}
            {event.tags.length > 4 && (
              <Badge
                variant="outline"
                className="text-xs border-0 h-5 px-2 bg-gray-500/10 text-gray-400 border-gray-500/20"
              >
                +{event.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="flex justify-center items-center">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Eye className="w-3 h-3" />
            <span>{event.view_count}</span>
          </div>
          <div className="flex gap-1 ml-auto">
            {/* Bookmark Button - Hidden on mobile */}
            <Button
              onClick={handleBookmark}
              variant="ghost"
              size="sm"
              disabled={loading}
              className={`p-2 transition-all duration-200 hidden md:flex ${
                isBookmarked 
                  ? 'text-[#B1810B] bg-[#B1810B]/20 hover:bg-[#B1810B]/30' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-[#B1810B]'
              }`}
            >
              <Bookmark className={`w-3 h-3 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>

            {/* Attend Button - Hidden on mobile */}
            <Button
              onClick={handleAttend}
              variant="ghost"
              size="sm"
              disabled={loading}
              className={`p-2 transition-all duration-200 hidden md:flex ${
                isAttending 
                  ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-green-400'
              }`}
            >
              <UserCheck className={`w-3 h-3 ${isAttending ? 'fill-current' : ''}`} />
            </Button>

            {/* Share Button */}
            <Button
              onClick={handleShare}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:bg-gray-800 hover:text-blue-400 transition-all duration-200 p-2"
            >
              <Share className="w-3 h-3" />
            </Button>

            {showMapButton && (
              <Button 
                onClick={handleViewOnMap}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-gray-800 transition-all duration-200 p-2"
              >
                <MapPin className="w-3 h-3 mr-1" />
                <span className="text-xs hidden sm:inline">Map</span>
              </Button>
            )}
            <Button 
              onClick={handleClick} 
              variant="ghost"
              size="sm"
              className="text-[#B1810B] bg-[#B1810B]/10 hover:bg-[#B1810B]/20 hover:text-[#D4940D] transition-colors duration-200 p-2"
            >
              <span className="text-xs">Details</span>
            </Button>
          </div>
        </div>
      </div>

      <EventDetailsSheet
        event={event}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        externalBookmarkState={isBookmarked}
        externalAttendState={isAttending}
        onStateChange={(eventId, newBookmarkState, newAttendState) => {
          // Sync state changes from details sheet back to card
          setIsBookmarked(newBookmarkState);
          setIsAttending(newAttendState);
          // Also notify parent component if needed
          onStateChange?.(eventId, newBookmarkState, newAttendState);
        }}
      />
    </>
  );
} 