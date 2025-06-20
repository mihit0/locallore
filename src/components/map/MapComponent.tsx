'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
// import { Button } from '@/components/ui/button'
import { Event, TAG_CATEGORIES, TAG_COLORS } from '@/types/event'
import { CreateEventModal } from './CreateEventModal'
import { EditEventModal } from './EditEventModal'
import { formatEasternDateTime } from '@/lib/date'
import { EventDetailsSheet } from './EventDetailsSheet'
import { useRouter, useSearchParams } from 'next/navigation'
import { mapCache } from '@/lib/mapCache'

// Initialize Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

interface MapComponentProps {
  isCreatingEvent: boolean
  onCancelEventCreation: () => void
  highlightedEventId?: string | null
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

// Category icons (emoji for now, can be replaced with actual icons)
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

export default function MapComponent({ isCreatingEvent, onCancelEventCreation, highlightedEventId }: MapComponentProps) {
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')

  // Load active events from database (always fetch fresh)
  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:user_id (
            display_name,
            graduation_year
          )
        `)
        .gte('end_time', new Date().toISOString()) // Only get active events
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading events:', error)
        return
      }

      console.log('Events loaded:', data?.length || 0, 'events')
      const events = data || [];
      setEvents(events);
      
      // Cache events with a short duration (2 minutes) for performance
      mapCache.setCachedEvents(events);

      // If there's an event ID in the URL, select and show that event
      if (eventId && data) {
        const event = data.find(e => e.id === eventId)
        if (event) {
          // Center map on the event location first
          if (map.current) {
            map.current.flyTo({
              center: [event.longitude, event.latitude],
              zoom: 17,
              essential: true
            })
            
            // After map flies to location, show popup for the specific event
            setTimeout(() => {
              const markers = document.getElementsByClassName('custom-marker')
              for (let i = 0; i < markers.length; i++) {
                const markerEl = markers[i] as HTMLElement
                if (markerEl.getAttribute('data-event-id') === event.id) {
                  // Trigger click on the marker to show popup
                  markerEl.click()
                  break
                }
              }
            }, 800)
          }
        }
      }
    }

    loadEvents()
    // Set up real-time subscription for events
    const channel = supabase
      .channel('events_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'events' 
        }, 
        () => {
          // Clear cache and reload events when changes occur
          mapCache.clearCache();
          loadEvents();
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId])

  // Display events on map (recreate markers when events change)
  useEffect(() => {
    if (!map.current || events.length === 0) return

    // Always clear existing markers when events change
    mapCache.clearCachedMarkers();
    const markers = document.getElementsByClassName('mapboxgl-marker')
    while (markers[0]) {
      markers[0].remove()
    }

    console.log('Creating markers for', events.length, 'events');
    const newMarkers: mapboxgl.Marker[] = [];

    // Add markers for each event
    events.forEach(event => {
      const timeRemaining = getTimeRemaining(event.end_time)
      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: false,
        className: 'mapbox-popup-black'
      })
        .setHTML(`
          <div class="p-4 bg-black text-white rounded max-w-xs">
            <div class="flex items-center gap-2 mb-3">
              <span>${getCategoryIcon(event.category)}</span>
              <h3 class="font-semibold text-white">${event.title}</h3>
            </div>
            <p class="text-sm mb-3 text-gray-300">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
            <div class="w-full h-px bg-white/20 mb-3"></div>
            <div class="text-xs text-gray-400 space-y-1">
              <p>Starts: ${formatEasternDateTime(event.start_time)}</p>
              <p>Ends: ${formatEasternDateTime(event.end_time)}</p>
              <p class="mt-2">Time remaining: ${timeRemaining}</p>
            </div>
            <button 
              class="mt-3 w-full text-sm bg-[#B1810B] hover:bg-[#8B6B09] text-white py-2 px-3 rounded transition-colors duration-200"
              onclick="document.dispatchEvent(new CustomEvent('viewEventDetails', { detail: '${event.id}' }))"
            >
              View Details
            </button>
          </div>
        `)

      // Create a custom marker element with category color
      const markerEl = document.createElement('div')
      markerEl.className = 'custom-marker'
      markerEl.style.width = '24px'
      markerEl.style.height = '24px'
      markerEl.style.borderRadius = '50%'
      markerEl.style.backgroundColor = getTagColor(event.category)
      markerEl.style.border = '2px solid white'
      markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
      markerEl.style.cursor = 'pointer'
      markerEl.innerHTML = `<span style="font-size: 14px; line-height: 20px;">${getCategoryIcon(event.category)}</span>`

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([event.longitude, event.latitude])
        .setPopup(popup)
        .addTo(map.current!)
      
      // Store event ID on marker element for reference
      markerEl.setAttribute('data-event-id', event.id)
      
      // Add to markers array for caching
      newMarkers.push(marker);
    })

    // Cache the new markers
    mapCache.setCachedMarkers(newMarkers);

    // Add event listener for view details button clicks
    const handleViewEventDetails = async (event: CustomEvent<string>) => {
      const eventId = event.detail
      const eventToView = events.find(e => e.id === eventId)
      if (eventToView) {
        try {
          await fetch(`/api/events/${eventId}/interact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'view' })
          });
        } catch (error) {
          console.error('Error tracking view:', error);
        }
        setSelectedEvent(eventToView)
        setShowEventDetails(true)
      }
    }

    document.addEventListener('viewEventDetails', handleViewEventDetails as unknown as EventListener)

    return () => {
      document.removeEventListener('viewEventDetails', handleViewEventDetails as unknown as EventListener)
    }
  }, [events, map.current, user])

  // Handle map click when in event creation mode
  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!isCreatingEvent) return
    
    const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat]
    setSelectedCoordinates(coordinates)
    setShowCreateModal(true)
  }

  // Initialize map once and handle click events separately
  useEffect(() => {
    if (!mapContainer.current) return
    if (map.current) return

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-86.9189, 40.4284], // Purdue University coordinates
        zoom: 15
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }),
        'top-right'
      )
    } catch (error) {
      console.error('Error initializing map:', error)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Handle event creation mode changes
  useEffect(() => {
    if (!map.current) return

    if (isCreatingEvent) {
      map.current.getCanvas().style.cursor = 'crosshair'
      map.current.on('click', handleMapClick)
    } else {
      map.current.getCanvas().style.cursor = ''
      map.current.off('click', handleMapClick)
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick)
      }
    }
  }, [isCreatingEvent])

  const handleCreateModalClose = () => {
    setShowCreateModal(false)
    setSelectedCoordinates(null)
    onCancelEventCreation()
  }

  const handleEditModalClose = () => {
    setShowEditModal(false)
    setSelectedEvent(null)
  }

  const handleEventUpdated = async () => {
    // Reload events after creation/update/deletion
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('end_time', new Date().toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error reloading events:', error)
      return
    }

    setEvents(data)
  }

  // Helper function to calculate time remaining
  const getTimeRemaining = (endTimeString: string) => {
    const now = new Date()
    const endTime = new Date(endTimeString)
    const diff = endTime.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days !== 1 ? 's' : ''}`
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    
    return `${minutes}m`
  }

  return (
    <>
      <div 
        ref={mapContainer} 
        className="w-full h-full absolute inset-0"
        style={{ 
          touchAction: 'pan-x pan-y'
        }}
      />
      {isCreatingEvent && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm">
          Click anywhere on the map to create an event
        </div>
      )}
      <CreateEventModal 
        isOpen={showCreateModal}
        onClose={handleCreateModalClose}
        coordinates={selectedCoordinates}
        onSuccess={handleEventUpdated}
      />
      <EditEventModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        event={selectedEvent}
        onSuccess={handleEventUpdated}
      />
      <EventDetailsSheet
        isOpen={showEventDetails}
        onClose={() => setShowEventDetails(false)}
        event={selectedEvent}
        onEdit={() => {
          setShowEventDetails(false)
          setShowEditModal(true)
        }}
      />
    </>
  )
}