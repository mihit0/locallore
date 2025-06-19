'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import MapComponent with SSR disabled to prevent window access issues
const MapComponent = dynamic(
  () => import('@/components/map/MapComponent'), 
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="text-white">Loading map...</div>
      </div>
    )
  }
)

function MapPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)

  useEffect(() => {
    // Check if there's an event parameter in the URL (for shared links)
    const eventId = searchParams.get('event')
    if (eventId) {
      setHighlightedEventId(eventId)
    }
  }, [searchParams])

  const handleCreateEvent = () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    setIsCreatingEvent(!isCreatingEvent)
  }

  return (
    <div className="h-screen flex flex-col fixed inset-0 overflow-hidden" data-map-page>
      <div className="bg-black border-b border-white/20 p-4 flex justify-between items-center flex-shrink-0 z-10">
        <Link href="/">
          <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">← Back to Home</Button>
        </Link>
        <h1 className="text-sm sm:text-lg md:text-xl font-semibold text-white">Purdue Events Map</h1>
        <Button 
          onClick={handleCreateEvent}
          variant="ghost"
          className={isCreatingEvent ? "text-gray-300 hover:bg-gray-800 hover:text-white" : "text-[#B1810B] hover:bg-[#B1810B]/20 hover:text-[#D4940D]"}
        >
          {isCreatingEvent ? "Cancel" : user ? "Create Event" : "Sign in to Create Event"}
        </Button>
      </div>
      
      <div className="flex-1 relative w-full overflow-hidden">
        <MapComponent 
          isCreatingEvent={isCreatingEvent}
          onCancelEventCreation={() => setIsCreatingEvent(false)}
          highlightedEventId={highlightedEventId}
        />
      </div>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex flex-col fixed inset-0 overflow-hidden" data-map-page>
        <div className="bg-black border-b border-white/20 p-4 flex justify-between items-center flex-shrink-0 z-10">
          <Link href="/">
            <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">← Back to Home</Button>
          </Link>
          <h1 className="text-sm sm:text-lg md:text-xl font-semibold text-white">Purdue Events Map</h1>
          <Button variant="ghost" className="text-gray-300 hover:bg-gray-800 hover:text-white">
            Loading...
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
          <div className="text-white">Loading map...</div>
        </div>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  )
}