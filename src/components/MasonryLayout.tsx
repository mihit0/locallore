"use client";

import { useEffect, useRef, useState } from 'react';
import { Event } from '@/types/event';
import { EventCard } from '@/components/EventCard';

interface MasonryLayoutProps {
  events: Event[];
  mlScores?: Record<string, {
    recommendationScore?: number;
    qualityScore?: number;
    spamProbability?: number;
  }>;
}

export function MasonryLayout({ events, mlScores = {} }: MasonryLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<Event[][]>([[], [], []]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Determine number of columns based on screen size
    const numColumns = isMobile ? 2 : 3;
    const newColumns: Event[][] = Array(numColumns).fill(null).map(() => []);
    
    // Distribute events across columns
    events.forEach((event, index) => {
      const columnIndex = index % numColumns;
      newColumns[columnIndex].push(event);
    });
    
    setColumns(newColumns);
  }, [events, isMobile]);

  return (
    <div ref={containerRef} className="flex gap-3 md:gap-4 items-start justify-center">
      {columns.map((columnEvents, columnIndex) => (
        <div key={columnIndex} className="flex-1 space-y-2 md:space-y-4 max-w-[calc(50%-0.375rem)] md:max-w-none">
          {columnEvents.map((event) => {
            const eventScores = mlScores[event.id] || {};
            return (
              <EventCard 
                key={event.id} 
                event={event} 
                recommendationScore={eventScores.recommendationScore}
                qualityScore={eventScores.qualityScore}
                spamProbability={eventScores.spamProbability}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
} 