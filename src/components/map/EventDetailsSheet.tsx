"use client";

import {
  Sheet,
  SheetContent,
  // SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Event, TAG_CATEGORIES, TAG_COLORS } from "@/types/event"
import { formatEasternDateTime } from "@/lib/date"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, X, Eye, Bookmark, Share, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface EventDetailsSheetProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
  externalBookmarkState?: boolean
  externalAttendState?: boolean
  onStateChange?: (eventId: string, isBookmarked: boolean, isAttending: boolean) => void
}

// Get tag color helper function
const getTagColor = (tag: string): string => {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if ((tags as readonly string[]).includes(tag)) {
      return TAG_COLORS[category as keyof typeof TAG_COLORS];
    }
  }
  return TAG_COLORS.General;
};

// Category icons helper function
const getCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    Food: '🍕',
    Study: '📚',
    Club: '🎯',
    Social: '🎉',
    Academic: '🎓',
    Sports: '⚽',
    Music: '🎵',
    Tech: '💻',
    Arts: '🎨',
    Career: '💼',
    Other: '⭐'
  };
  return iconMap[category] || '⭐';
};

export function EventDetailsSheet({ event, isOpen, onClose, onEdit, externalBookmarkState, externalAttendState, onStateChange }: EventDetailsSheetProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isBookmarked, setIsBookmarked] = useState(externalBookmarkState ?? false)
  const [isAttending, setIsAttending] = useState(externalAttendState ?? false)
  const [attendeeCount, setAttendeeCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (externalBookmarkState !== undefined) {
      setIsBookmarked(externalBookmarkState)
    }
    if (externalAttendState !== undefined) {
      setIsAttending(externalAttendState)
    }
  }, [externalBookmarkState, externalAttendState])

  useEffect(() => {
    if (event && isOpen) {
      loadInteractionStatus()
    }
  }, [event, user, isOpen])

  // Real-time subscription to update attendee count when others interact
  useEffect(() => {
    if (!event || !isOpen) return

    const channel = supabase
      .channel(`event-details-${event.id}-interactions`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_event_interactions',
          filter: `event_id=eq.${event.id}`
        },
        (payload) => {
          console.log(`🔄 Real-time update for event details ${event.id}:`, payload)
          // Reload interaction status to get updated counts
          setTimeout(() => loadInteractionStatus(), 500)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event, isOpen])

  const loadInteractionStatus = async () => {
    if (!user || !event) {
      console.log(`❌ No user or event found for loadInteractionStatus`, { user: !!user, event: !!event });
      return;
    }

    console.log(`🔄 Loading interactions for event ${event.id} in details sheet, user ${user.id}`)

    try {
      // Check if bookmarked - use maybeSingle() to handle no results gracefully
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from('user_event_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('interaction_type', 'bookmark')
        .maybeSingle()

      if (bookmarkError) {
        console.error('Error checking bookmark:', bookmarkError)
        setIsBookmarked(false)
      } else {
        setIsBookmarked(!!bookmarkData)
      }

      // Check if attending - use maybeSingle() to handle no results gracefully
      const { data: attendData, error: attendError } = await supabase
        .from('user_event_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .eq('interaction_type', 'attend')
        .maybeSingle()

      if (attendError) {
        console.error('Error checking attendance:', attendError)
        setIsAttending(false)
      } else {
        setIsAttending(!!attendData)
      }

      // Get total attendee count - use select with count for reliability
      const { data: attendeesData, error: countError } = await supabase
        .from('user_event_interactions')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('interaction_type', 'attend')

      if (countError) {
        console.error('Error getting attendee count:', countError)
        setAttendeeCount(0)
      } else {
        const count = attendeesData?.length || 0
        console.log(`🔢 EventDetailsSheet: Attendee count for event ${event.id}: ${count}`, {
          attendeesData: attendeesData?.map(a => a.user_id),
          totalFound: attendeesData?.length
        })
        setAttendeeCount(count)
      }

      // Notify parent of initial state
      onStateChange?.(event.id, !!bookmarkData, !!attendData)
    } catch (error) {
      console.error('Error loading interaction status:', error)
    }
  }

  const handleBookmark = async () => {
    if (!user || !event) {
      toast.error('Please login to bookmark events')
      return
    }

    setLoading(true)
    console.log(`Toggling bookmark for event ${event.id} in details sheet, current state: ${isBookmarked}`)
    
    try {
      if (isBookmarked) {
        // Remove bookmark - use API DELETE method
        const response = await fetch(`/api/events/${event.id}/interact`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'bookmark' })
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('API delete failed:', errorData)
          throw new Error('Failed to remove bookmark')
        }

        setIsBookmarked(false)
        onStateChange?.(event.id, false, isAttending)
        toast.success('Event removed from bookmarks')
      } else {
        // Add bookmark - use API route
        const response = await fetch(`/api/events/${event.id}/interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'bookmark' })
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('API post failed:', errorData)
          throw new Error('Failed to add bookmark')
        }

        setIsBookmarked(true)
        onStateChange?.(event.id, true, isAttending)
        toast.success('Event bookmarked')
      }
    } catch (error) {
      console.error('Error updating bookmark:', error)
      toast.error('Failed to update bookmark')
    } finally {
      setLoading(false)
    }
  }

  const handleAttend = async () => {
    if (!user || !event) {
      toast.error('Please login to mark attendance')
      return
    }

    setLoading(true)
    console.log(`Toggling attendance for event ${event.id} in details sheet, current state: ${isAttending}`)
    
    try {
      if (isAttending) {
        // Remove attendance - use API DELETE method
        const response = await fetch(`/api/events/${event.id}/interact`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'attend' })
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('API delete failed:', errorData)
          throw new Error('Failed to remove attendance')
        }

        setIsAttending(false)
        onStateChange?.(event.id, isBookmarked, false)
        toast.success('No longer attending')
        
        // Reload attendee count to get accurate total (with delay to avoid race conditions)
        setTimeout(() => loadInteractionStatus(), 150)
      } else {
        // Add attendance - use API route
        const response = await fetch(`/api/events/${event.id}/interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'attend' })
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('API post failed:', errorData)
          throw new Error('Failed to mark attendance')
        }

        setIsAttending(true)
        onStateChange?.(event.id, isBookmarked, true)
        toast.success('Marked as attending')
        
        // Reload attendee count to get accurate total (with delay to avoid race conditions)
        setTimeout(() => loadInteractionStatus(), 150)
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast.error('Failed to update attendance')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!event) return

    try {
      const shareUrl = `${window.location.origin}/map?event=${event.id}`
      
      // Always copy to clipboard first
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Event link copied to clipboard!')
      
      // Track share interaction
      await fetch(`/api/events/${event.id}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'share' })
      })

      // Then try native share if available
      if (navigator.share) {
        setTimeout(async () => {
          try {
            await navigator.share({
              title: event.title,
              text: event.description,
              url: shareUrl,
            })
          } catch (shareError) {
            // User cancelled share, which is fine
            console.log('Share cancelled or failed:', shareError)
          }
        }, 100) // Small delay to ensure toast shows first
      }
    } catch (error) {
      console.error('Error sharing:', error)
      toast.error('Failed to copy event link')
    }
  }

  if (!event) return null

  const isEventActive = () => {
    const now = new Date()
    const endTime = new Date(event.end_time)
    return endTime > now
  }

  const handleViewOnMap = () => {
    onClose() // Close the sheet first
    router.push(`/map?event=${event.id}`)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-black border-l border-white/20">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryIcon(event.category || 'Other')}</span>
              <SheetTitle className="text-2xl text-white">{event.title}</SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              {user && user.id === event.user_id && onEdit && (
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:bg-gray-800 hover:text-white"
                  onClick={onEdit}
                >
                  Edit Event
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-300 hover:bg-gray-800 hover:text-white"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>


          {/* Interaction Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              disabled={loading}
              className={`flex items-center gap-2 transition-all duration-200 hover:scale-105 ${
                isBookmarked 
                  ? 'text-[#B1810B] bg-[#B1810B]/10 hover:bg-[#B1810B]/20' 
                  : 'text-gray-400 hover:text-[#B1810B] hover:bg-[#B1810B]/10'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              <span className="text-xs">Bookmark</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleAttend}
              disabled={loading}
              className={`flex items-center gap-2 transition-all duration-200 hover:scale-105 ${
                isAttending 
                  ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' 
                  : 'text-gray-400 hover:text-green-400 hover:bg-green-400/10'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-xs">
                {isAttending ? 'Attending' : 'Attend'}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-200 hover:scale-105"
            >
              <Share className="w-4 h-4" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2 text-white">Description</h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{event.description}</p>
          </div>

          <div className="w-full h-px bg-white/20"></div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-white">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {event.tags && event.tags.length > 0 ? (
                event.tags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs border-0 px-3 py-1 backdrop-blur-sm"
                    style={{
                      backgroundColor: `${getTagColor(tag)}20`,
                      color: getTagColor(tag),
                      borderColor: `${getTagColor(tag)}30`
                    }}
                  >
                    {tag}
                  </Badge>
                ))
              ) : event.category ? (
                <Badge 
                  variant="outline" 
                  className="text-xs border-0 px-3 py-1 backdrop-blur-sm"
                  style={{
                    backgroundColor: `${getTagColor(event.category)}20`,
                    color: getTagColor(event.category),
                    borderColor: `${getTagColor(event.category)}30`
                  }}
                >
                  {event.category}
                </Badge>
              ) : (
                <p className="text-sm text-gray-300">No tags</p>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-white/20"></div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-white">Time</h3>
            <div className="text-sm text-gray-300">
              <p>Starts: {formatEasternDateTime(event.start_time)}</p>
              <p>Ends: {formatEasternDateTime(event.end_time)}</p>
            </div>
          </div>

          <div className="w-full h-px bg-white/20"></div>

          {isEventActive() && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-white">Location</h3>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white border border-white/20"
                onClick={handleViewOnMap}
              >
                <MapPin className="w-4 h-4" />
                View on Map
              </Button>
            </div>
          )}

          {event.contact_info && (
            <>
              <div className="w-full h-px bg-white/20"></div>
              <div>
                <h3 className="text-sm font-medium mb-2 text-white">Contact Information</h3>
                <p className="text-sm text-gray-300">{event.contact_info}</p>
              </div>
            </>
          )}

          {event.image_url && (
            <>
              <div className="w-full h-px bg-white/20"></div>
              <div>
                <h3 className="text-sm font-medium mb-2 text-white">Event Image</h3>
                <div className="relative w-full h-64 overflow-hidden rounded bg-gray-900 border border-white/20">
                  <img 
                    src={event.image_url} 
                    alt={event.title}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>
              </div>
            </>
          )}

          <div className="w-full h-px bg-white/20"></div>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Eye className="w-3 h-3" />
            <span>{event.view_count}</span>
            {event.creator && (
              <>
                <span>•</span>
                <span className="hidden md:inline">by </span>
                <span>{event.creator.display_name}</span>
                <span className="hidden md:inline">
                  {event.creator.graduation_year && ` '${event.creator.graduation_year.toString().slice(-2)}`}
                </span>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 