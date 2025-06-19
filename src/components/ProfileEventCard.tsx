"use client";

import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Event, TAG_CATEGORIES, TAG_COLORS } from '@/types/event';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MapPin, Edit, UserCheck } from 'lucide-react';
import { EventDetailsSheet } from '@/components/map/EventDetailsSheet';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Get tag color helper function
const getTagColor = (tag: string): string => {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if ((tags as readonly string[]).includes(tag)) {
      return TAG_COLORS[category as keyof typeof TAG_COLORS];
    }
  }
  return TAG_COLORS.General;
};

interface ProfileEventCardProps {
  event: Event;
  showMapButton?: boolean;
  onEdit?: (event: Event) => void;
}

export function ProfileEventCard({ event, showMapButton = false, onEdit }: ProfileEventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          try {
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

    // Load attendance count for this event (creator view)
    loadAttendeeCount();

    return () => observer.disconnect();
  }, [event.id]);

  const loadAttendeeCount = async () => {
    try {
      const { data, error } = await supabase.rpc('get_event_attendance_count', {
        event_uuid: event.id
      });
      
      if (error) {
        setAttendeeCount(0);
      } else {
        setAttendeeCount(data || 0);
      }
    } catch (error) {
      setAttendeeCount(0);
    }
  };

  const handleClick = async () => {
    try {
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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(event);
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

  const isEventActive = () => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    return endTime > now;
  };

  return (
    <>
      <div 
        ref={cardRef}
        className="w-full p-4 rounded hover:bg-gray-900/30 transition-all duration-300 hover:scale-[1.02] transform"
      >
        {event.image_url && (
          <div className="relative w-full h-40 mb-3 rounded overflow-hidden">
            <img 
              src={event.image_url} 
              alt={event.title}
              className="absolute inset-0 w-full h-full object-contain bg-black/50"
            />
          </div>
        )}
        
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <h3 className="text-lg font-semibold line-clamp-2 text-white flex-1">{event.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:bg-gray-800 transition-all duration-200 p-1 flex-shrink-0"
              onClick={handleEdit}
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>
          <Badge 
            variant="outline" 
            className="backdrop-blur-sm text-xs border-0 flex-shrink-0 ml-2"
            style={{
              backgroundColor: `${getTagColor(event.category)}20`,
              color: getTagColor(event.category),
              borderColor: `${getTagColor(event.category)}30`
            }}
          >
            {event.category}
          </Badge>
        </div>

        <div className="text-xs text-gray-400 mb-3 space-y-1">
          <div>{getTimeDisplay()}</div>
          {isEventActive() && (
            <button 
              onClick={handleViewOnMap}
              className="text-[#B1810B] hover:text-[#D4940D] flex items-center gap-1 transition-colors duration-200"
            >
              <MapPin className="w-3 h-3" />
              <span className="text-xs">View on Map</span>
            </button>
          )}
        </div>

        <p className="text-gray-300 line-clamp-2 mb-3 text-xs">{event.description}</p>
        
        {/* Tags section */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {event.tags.slice(0, 4).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs border-0 h-5 px-2"
                style={{
                  backgroundColor: `${getTagColor(tag)}15`,
                  color: getTagColor(tag),
                  borderColor: `${getTagColor(tag)}20`
                }}
              >
                {tag}
              </Badge>
            ))}
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

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Eye className="w-3 h-3" />
            <span>{event.view_count} views</span>
            {attendeeCount > 0 && (
              <>
                <span>•</span>
                <UserCheck className="w-3 h-3" />
                <span>{attendeeCount} attending</span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {showMapButton && isEventActive() && (
              <Button 
                onClick={handleViewOnMap}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-gray-800 transition-all duration-200 p-2"
              >
                <MapPin className="w-3 h-3 mr-1" />
                <span className="text-xs">Map</span>
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
      />
    </>
  );
} 