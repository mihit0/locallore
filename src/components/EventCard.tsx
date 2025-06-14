"use client";

import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Event } from '@/types/event';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MapPin } from 'lucide-react';
import { EventDetailsSheet } from '@/components/map/EventDetailsSheet';
import { useRouter } from 'next/navigation';

const CATEGORY_COLORS = {
  Food: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Study: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Club: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Social: 'bg-green-500/20 text-green-400 border-green-500/30',
  Academic: 'bg-red-500/20 text-red-400 border-red-500/30',
  Other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
} as const;

interface EventCardProps {
  event: Event;
  showMapButton?: boolean;
}

export function EventCard({ event, showMapButton = false }: EventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);
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

    return () => observer.disconnect();
  }, [event.id]);

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
          <h3 className="text-lg font-semibold line-clamp-2 text-white">{event.title}</h3>
          <Badge variant="outline" className={`${CATEGORY_COLORS[event.category]} backdrop-blur-sm text-xs border-0`}>
            {event.category}
          </Badge>
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

        <p className="text-gray-300 line-clamp-2 mb-4 text-xs">{event.description}</p>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Eye className="w-3 h-3" />
            <span>{event.view_count}</span>
            {event.creator && (
              <span>• by {event.creator.display_name} '{event.creator.graduation_year?.toString().slice(-2)}</span>
            )}
          </div>
          <div className="flex gap-2">
            {showMapButton && (
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
              className="bg-[#B1810B] text-white hover:bg-[#8B6B09] transition-colors duration-200 p-2"
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