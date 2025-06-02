'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import MapComponent from '@/components/map/MapComponent'
import { useState } from 'react'

export default function MapPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)

  const handleCreateEvent = () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    setIsCreatingEvent(!isCreatingEvent)
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost">← Back to Home</Button>
        </Link>
        <h1 className="text-xl font-semibold">Purdue Events Map</h1>
        <Button 
          onClick={handleCreateEvent}
          variant={isCreatingEvent ? "secondary" : "default"}
        >
          {isCreatingEvent ? "Cancel" : user ? "Create Event" : "Sign in to Create Event"}
        </Button>
      </div>
      
      <div className="flex-1 relative w-full h-[calc(100vh-4rem)]">
        <MapComponent 
          isCreatingEvent={isCreatingEvent}
          onCancelEventCreation={() => setIsCreatingEvent(false)}
        />
      </div>
    </div>
  )
}