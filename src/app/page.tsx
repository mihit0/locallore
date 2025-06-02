'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#B1810B] to-black text-white">
      <div className="text-center space-y-6 max-w-3xl px-4">
        <h1 className="text-6xl font-bold">LocalLore</h1>
        <p className="text-2xl font-light">Discover what's happening at Purdue, right now.</p>
        
        <div className="space-y-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">Campus Events</h3>
              <p className="text-gray-300">Find club meetings, study groups, food trucks, and more happening around you.</p>
            </div>
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">Real-Time Updates</h3>
              <p className="text-gray-300">See what's happening right now and what's coming up in the next few hours.</p>
            </div>
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">Purdue Community</h3>
              <p className="text-gray-300">Connect with fellow Boilermakers and discover campus activities.</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 justify-center pt-8">
          <Button 
            asChild 
            size="lg" 
            className="bg-white text-black hover:bg-gray-100"
          >
            <Link href="/map">View Events Map</Link>
          </Button>
          
          {user ? (
            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white/10 bg-white/5"
            >
              <Link href="/profile">My Profile</Link>
            </Button>
          ) : (
            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white/10 bg-white/5"
            >
              <Link href="/auth/login">Join with @purdue.edu</Link>
            </Button>
          )}
        </div>

        {!user && (
          <p className="text-sm text-gray-300 mt-4">
            Only @purdue.edu email addresses can create and manage events.
          </p>
        )}
      </div>
    </main>
  )
}