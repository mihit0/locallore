"use client";

import { useEffect, useRef, useState } from 'react';
import { Event } from '@/types/event';
import { EventCard } from '@/components/EventCard';

interface MasonryLayoutProps {
  events: Event[];
}

export function MasonryLayout({ events }: MasonryLayoutProps) {
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
    <div ref={containerRef} className="flex gap-2 md:gap-4 items-start">
      {columns.map((columnEvents, columnIndex) => (
        <div key={columnIndex} className="flex-1 space-y-2 md:space-y-4">
          {columnEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ))}
    </div>
  );
} 