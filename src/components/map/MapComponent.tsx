'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { CreatePinModal } from './CreatePinModal'
import { EditPinModal } from './EditPinModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

// Initialize Mapbox
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

interface MapComponentProps {
  isCreatingPin: boolean
  onCancelPinCreation: () => void
}

interface Pin {
  id: string
  latitude: number
  longitude: number
  description: string
  user_id: string
}

export default function MapComponent({ isCreatingPin, onCancelPinCreation }: MapComponentProps) {
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [pins, setPins] = useState<Pin[]>([])

  // Load pins from database
  useEffect(() => {
    async function loadPins() {
      const { data, error } = await supabase
        .from('pins')
        .select('*')

      if (error) {
        console.error('Error loading pins:', error)
        return
      }

      setPins(data)
    }

    loadPins()
  }, [])

  // Display pins on map
  useEffect(() => {
    if (!map.current || pins.length === 0) return

    // Remove existing markers
    const markers = document.getElementsByClassName('mapboxgl-marker')
    while (markers[0]) {
      markers[0].remove()
    }

    // Add markers for each pin
    pins.forEach(pin => {
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="p-2">
            <p class="text-sm mb-2">${pin.description.substring(0, 100)}...</p>
            ${user && user.id === pin.user_id ? `
              <button 
                class="text-sm text-blue-600 hover:underline"
                onclick="document.dispatchEvent(new CustomEvent('editPin', { detail: '${pin.id}' }))"
              >
                Edit Pin
              </button>
            ` : ''}
          </div>
        `)

      const marker = new mapboxgl.Marker()
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(popup)
        .addTo(map.current!)
    })

    // Add event listener for edit button clicks
    const handleEditPin = (event: CustomEvent<string>) => {
      const pinId = event.detail
      const pin = pins.find(p => p.id === pinId)
      if (pin) {
        setSelectedPin(pin)
        setShowEditModal(true)
      }
    }

    document.addEventListener('editPin', handleEditPin as EventListener)

    return () => {
      document.removeEventListener('editPin', handleEditPin as EventListener)
    }
  }, [pins, map.current, user])

  // Handle map click when in pin creation mode
  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!isCreatingPin) return
    
    const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat]
    setSelectedCoordinates(coordinates)
    setShowCreateModal(true)
  }

  useEffect(() => {
    console.log('MapComponent mounted')
    console.log('Mapbox token:', mapboxgl.accessToken)
    
    if (!mapContainer.current) {
      console.log('No map container')
      return
    }

    if (map.current) {
      console.log('Map already exists')
      return
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-122.4194, 37.7749],
        zoom: 12
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

      console.log('Map initialized successfully')
    } catch (error) {
      console.error('Error initializing map:', error)
    }

    // Add click handler when in creation mode
    if (isCreatingPin && map.current) {
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
        console.log('Map cleaned up')
      }
    }
  }, [isCreatingPin])

  const handleCreateModalClose = () => {
    setShowCreateModal(false)
    setSelectedCoordinates(null)
    onCancelPinCreation()
  }

  const handleEditModalClose = () => {
    setShowEditModal(false)
    setSelectedPin(null)
  }

  const handlePinUpdated = async () => {
    // Reload pins after creation/update/deletion
    const { data, error } = await supabase
      .from('pins')
      .select('*')

    if (error) {
      console.error('Error reloading pins:', error)
      return
    }

    setPins(data)
  }

  return (
    <>
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ minHeight: '100%' }}
      />
      {isCreatingPin && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg">
          Click anywhere on the map to create a pin
        </div>
      )}
      <CreatePinModal 
        isOpen={showCreateModal}
        onClose={handleCreateModalClose}
        coordinates={selectedCoordinates}
        onSuccess={handlePinUpdated}
      />
      <EditPinModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        pin={selectedPin}
        onSuccess={handlePinUpdated}
      />
    </>
  )
} 