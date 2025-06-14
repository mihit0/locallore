'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Event, EventCategory } from '@/types'
import { CreateEventModal } from './CreateEventModal'
import { EditEventModal } from './EditEventModal'
import { formatEasternDateTime } from '@/lib/date'
import { EventDetailsSheet } from './EventDetailsSheet'

// Initialize Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

interface MapComponentProps {
  isCreatingEvent: boolean
  onCancelEventCreation: () => void
}

// Category color mapping
const categoryColors: Record<EventCategory, string> = {
  Food: '#EF4444', // Red
  Study: '#3B82F6', // Blue
  Club: '#8B5CF6', // Purple
  Social: '#10B981', // Green
  Academic: '#F59E0B', // Orange
  Other: '#6B7280', // Gray
}

// Category icons (emoji for now, can be replaced with actual icons)
const categoryIcons = {
  Food: '🍕',
  Study: '📚',
  Club: '🎯',
  Social: '🎉',
  Academic: '🎓',
  Other: '⭐'
} as const

export default function MapComponent({ isCreatingEvent, onCancelEventCreation }: MapComponentProps) {
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [events, setEvents] = useState<Event[]>([])

  // Load active events from database
  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('end_time', new Date().toISOString()) // Only get active events
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading events:', error)
        return
      }

      setEvents(data)
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
          loadEvents() // Reload events when changes occur
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // Display events on map
  useEffect(() => {
    if (!map.current || events.length === 0) return

    // Remove existing markers
    const markers = document.getElementsByClassName('mapboxgl-marker')
    while (markers[0]) {
      markers[0].remove()
    }

    // Add markers for each event
    events.forEach(event => {
      const timeRemaining = getTimeRemaining(event.end_time)
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="p-3">
            <div class="flex items-center gap-2 mb-2">
              <span>${categoryIcons[event.category]}</span>
              <h3 class="font-semibold">${event.title}</h3>
            </div>
            <p class="text-sm mb-2">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
            <div class="text-sm text-gray-600">
              <p>Starts: ${formatEasternDateTime(event.start_time)}</p>
              <p>Ends: ${formatEasternDateTime(event.end_time)}</p>
              <p class="mt-1">Time remaining: ${timeRemaining}</p>
            </div>
            <button 
              class="mt-2 text-sm text-blue-600 hover:underline"
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
      markerEl.style.backgroundColor = categoryColors[event.category]
      markerEl.style.border = '2px solid white'
      markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
      markerEl.style.cursor = 'pointer'
      markerEl.innerHTML = `<span style="font-size: 14px; line-height: 20px;">${categoryIcons[event.category]}</span>`

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([event.longitude, event.latitude])
        .setPopup(popup)
        .addTo(map.current!)
    })

    // Add event listener for view details button clicks
    const handleViewEventDetails = (event: CustomEvent<string>) => {
      const eventId = event.detail
      const eventToView = events.find(e => e.id === eventId)
      if (eventToView) {
        setSelectedEvent(eventToView)
        setShowEventDetails(true)
      }
    }

    document.addEventListener('viewEventDetails', handleViewEventDetails as EventListener)

    return () => {
      document.removeEventListener('viewEventDetails', handleViewEventDetails as EventListener)
    }
  }, [events, map.current, user])

  // Handle map click when in event creation mode
  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!isCreatingEvent) return
    
    const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat]
    setSelectedCoordinates(coordinates)
    setShowCreateModal(true)
  }

  useEffect(() => {
    if (!mapContainer.current) return
    if (map.current) return

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
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

    // Add click handler when in creation mode
    if (isCreatingEvent && map.current) {
      map.current.getCanvas().style.cursor = 'crosshair'
      map.current.on('click', handleMapClick)
    } else {
      if (map.current) {
        map.current.getCanvas().style.cursor = ''
        map.current.off('click', handleMapClick)
      }
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
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
        className="w-full h-full"
        style={{ minHeight: '100%' }}
      />
      {isCreatingEvent && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg">
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