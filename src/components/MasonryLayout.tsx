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

  useEffect(() => {
    // Reset columns
    const newColumns: Event[][] = [[], [], []];
    
    // Distribute events across columns
    events.forEach((event, index) => {
      const columnIndex = index % 3;
      newColumns[columnIndex].push(event);
    });
    
    setColumns(newColumns);
  }, [events]);

  return (
    <div ref={containerRef} className="flex gap-4 items-start">
      {columns.map((columnEvents, columnIndex) => (
        <div key={columnIndex} className="flex-1 space-y-4">
          {columnEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ))}
    </div>
  );
} 