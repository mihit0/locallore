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
  Food: 'bg-amber-100 text-amber-800 border-amber-200',
  Study: 'bg-blue-100 text-blue-800 border-blue-200',
  Club: 'bg-purple-100 text-purple-800 border-purple-200',
  Social: 'bg-green-100 text-green-800 border-green-200',
  Academic: 'bg-red-100 text-red-800 border-red-200',
  Other: 'bg-gray-100 text-gray-800 border-gray-200'
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
        className="w-full p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50"
      >
        {event.image_url && (
          <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
            <img 
              src={event.image_url} 
              alt={event.title}
              className="absolute inset-0 w-full h-full object-contain bg-gray-100"
            />
          </div>
        )}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold line-clamp-2 text-[#000000]">{event.title}</h3>
          <Badge variant="outline" className={CATEGORY_COLORS[event.category]}>
            {event.category}
          </Badge>
        </div>

        <div className="text-sm text-gray-600 mb-2">
          <div>{getTimeDisplay()}</div>
          <button 
            onClick={handleViewOnMap}
            className="text-[#B1810B] hover:text-[#8B6B09] flex items-center gap-1"
          >
            <MapPin className="w-4 h-4" />
            View on Map
          </button>
        </div>

        <p className="text-gray-700 line-clamp-2 mb-4">{event.description}</p>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Eye className="w-4 h-4" />
            <span>{event.view_count}</span>
            {event.creator && (
              <span>• by {event.creator.display_name} '{event.creator.graduation_year?.toString().slice(-2)}</span>
            )}
          </div>
          <div className="flex gap-2">
            {showMapButton && (
              <Button 
                onClick={handleViewOnMap}
                variant="outline"
                className="bg-white hover:bg-gray-50"
              >
                <MapPin className="w-4 h-4 mr-1" />
                Map
              </Button>
            )}
            <Button 
              onClick={handleClick} 
              variant="default"
              className="bg-[#B1810B] hover:bg-[#8B6B09] text-white"
            >
              View Details
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