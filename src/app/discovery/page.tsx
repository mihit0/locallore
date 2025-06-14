"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/hooks/useAuth";
import { EventCard } from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Event } from "@/types/event";
import { Compass, TrendingUp, Clock } from "lucide-react";

export default function DiscoveryPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState(user ? "for-you" : "popular");

  const { ref, inView } = useInView({
    threshold: 0,
  });

  const fetchEvents = async (tab: string, pageNum: number) => {
    try {
      setLoading(true);
      const endpoint = `/api/discovery/${tab}?page=${pageNum}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (pageNum === 1) {
        setEvents(data.events);
      } else {
        setEvents((prev) => [...prev, ...data.events]);
      }
      
      setHasMore(data.events.length === 20);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchEvents(activeTab, 1);
  }, [activeTab]);

  useEffect(() => {
    if (inView && !loading && hasMore) {
      setPage((prev) => {
        const nextPage = prev + 1;
        fetchEvents(activeTab, nextPage);
        return nextPage;
      });
    }
  }, [inView, loading, hasMore, activeTab]);

  return (
    <div className="min-h-screen bg-[#000000] bg-[radial-gradient(#B1810B_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Discover Events</h1>
          <p className="text-gray-400">Find what's happening on campus right now</p>
        </div>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-3 gap-4 bg-transparent p-0">
            {user && (
              <TabsTrigger 
                value="for-you" 
                className="data-[state=active]:bg-[#B1810B] data-[state=active]:text-white border-2 border-[#B1810B] text-[#B1810B] rounded-full flex items-center gap-2 hover:bg-[#B1810B]/10"
              >
                <Compass className="w-4 h-4" />
                For You
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="popular" 
              className="data-[state=active]:bg-[#B1810B] data-[state=active]:text-white border-2 border-[#B1810B] text-[#B1810B] rounded-full flex items-center gap-2 hover:bg-[#B1810B]/10"
            >
              <TrendingUp className="w-4 h-4" />
              Popular
            </TabsTrigger>
            <TabsTrigger 
              value="latest" 
              className="data-[state=active]:bg-[#B1810B] data-[state=active]:text-white border-2 border-[#B1810B] text-[#B1810B] rounded-full flex items-center gap-2 hover:bg-[#B1810B]/10"
            >
              <Clock className="w-4 h-4" />
              Latest
            </TabsTrigger>
          </TabsList>

          {user && (
            <TabsContent value="for-you" className="mt-6 space-y-4">
              {loading && page === 1 ? (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {Array(3).fill(0).map((_, i) => <EventCardSkeleton key={i} />)}
                </div>
              ) : events.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                  {hasMore && <div ref={ref} className="h-10" />}
                </>
              ) : (
                <div className="text-center py-8 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                  <p className="text-gray-400">No events found. Check back later!</p>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="popular" className="mt-6 space-y-4">
            {loading && page === 1 ? (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Array(3).fill(0).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : events.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
                {hasMore && <div ref={ref} className="h-10" />}
              </>
            ) : (
              <div className="text-center py-8 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                <p className="text-gray-400">No events found. Check back later!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="latest" className="mt-6 space-y-4">
            {loading && page === 1 ? (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Array(3).fill(0).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : events.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
                {hasMore && <div ref={ref} className="h-10" />}
              </>
            ) : (
              <div className="text-center py-8 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                <p className="text-gray-400">No events found. Check back later!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const EventCardSkeleton = () => (
  <div className="w-full p-4 border border-white/10 rounded-lg shadow-sm space-y-3 bg-white/5 backdrop-blur-sm">
    <Skeleton className="h-6 w-3/4 bg-white/10" />
    <Skeleton className="h-4 w-1/4 bg-white/10" />
    <Skeleton className="h-4 w-1/2 bg-white/10" />
    <Skeleton className="h-16 w-full bg-white/10" />
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-1/4 bg-white/10" />
      <Skeleton className="h-8 w-24 bg-white/10" />
    </div>
  </div>
); 