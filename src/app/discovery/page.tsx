"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { EventCard } from "@/components/EventCard";
import { MasonryLayout } from "@/components/MasonryLayout";
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
  const [isMobile, setIsMobile] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-full overflow-x-hidden">
        <div className="text-center mb-4 md:mb-6 space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Discover Events</h1>
          <p className="text-xs md:text-sm text-gray-400">
            Find what's happening on campus right now
          </p>
        </div>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-3 gap-2 md:gap-3 bg-transparent p-0 mb-4 md:mb-6">
            {user && (
              <TabsTrigger 
                value="for-you" 
                className="data-[state=active]:bg-[#B1810B] data-[state=active]:text-white text-gray-300 bg-transparent hover:bg-gray-900 rounded flex items-center gap-1 md:gap-2 font-medium py-2 px-2 md:px-4 transition-all duration-200 border-0"
              >
                <Compass className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">For You</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="popular" 
              className="data-[state=active]:bg-[#B1810B] data-[state=active]:text-white text-gray-300 bg-transparent hover:bg-gray-900 rounded flex items-center gap-1 md:gap-2 font-medium py-2 px-2 md:px-4 transition-all duration-200 border-0"
            >
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-xs md:text-sm">Popular</span>
            </TabsTrigger>
            <TabsTrigger 
              value="latest" 
              className="data-[state=active]:bg-[#B1810B] data-[state=active]:text-white text-gray-300 bg-transparent hover:bg-gray-900 rounded flex items-center gap-1 md:gap-2 font-medium py-2 px-2 md:px-4 transition-all duration-200 border-0"
            >
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-xs md:text-sm">Latest</span>
            </TabsTrigger>
          </TabsList>

          {user && (
            <TabsContent value="for-you" className="mt-4 space-y-4">
              {loading && page === 1 ? (
                <SkeletonGrid isMobile={isMobile} />
              ) : events.length > 0 ? (
                <>
                  <MasonryLayout events={events} />
                  {hasMore && <div ref={ref} className="h-10" />}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No events found. Check back later!</p>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="popular" className="mt-4 space-y-4">
            {loading && page === 1 ? (
              <SkeletonGrid isMobile={isMobile} />
            ) : events.length > 0 ? (
              <>
                <MasonryLayout events={events} />
                {hasMore && <div ref={ref} className="h-10" />}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No events found. Check back later!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="latest" className="mt-4 space-y-4">
            {loading && page === 1 ? (
              <SkeletonGrid isMobile={isMobile} />
            ) : events.length > 0 ? (
              <>
                <MasonryLayout events={events} />
                {hasMore && <div ref={ref} className="h-10" />}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No events found. Check back later!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}

const EventCardSkeleton = () => (
  <div className="w-full p-3 md:p-4 rounded space-y-3">
    <Skeleton className="h-5 w-3/4 bg-gray-800" />
    <Skeleton className="h-3 w-1/4 bg-gray-800" />
    <Skeleton className="h-3 w-1/2 bg-gray-800" />
    <Skeleton className="h-12 w-full bg-gray-800" />
    <div className="flex justify-between items-center">
      <Skeleton className="h-3 w-1/4 bg-gray-800" />
      <Skeleton className="h-6 w-20 bg-gray-800" />
    </div>
  </div>
);

const SkeletonGrid = ({ isMobile }: { isMobile: boolean }) => (
  <div className="flex gap-3 md:gap-4 items-start justify-center">
    {Array(isMobile ? 2 : 3).fill(0).map((_, colIndex) => (
      <div key={colIndex} className="flex-1 space-y-2 md:space-y-4 max-w-[calc(50%-0.375rem)] md:max-w-none">
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    ))}
  </div>
); 