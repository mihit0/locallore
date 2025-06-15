'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#B1810B] to-black text-white">
      <div className="text-center space-y-4 md:space-y-6 max-w-3xl px-4">
        <h1 className="text-4xl md:text-6xl font-bold">LocalLore</h1>
        <p className="text-lg md:text-2xl font-light">Discover what's happening at Purdue, right now.</p>
        
        <div className="space-y-4 md:space-y-6 mt-6 md:mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 text-center">
            <div className="p-2 md:p-4">
              <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Campus Events</h3>
              <p className="text-sm md:text-base text-gray-300 hidden md:block">Find club meetings, study groups, food trucks, and more happening around you.</p>
              <p className="text-xs text-gray-300 md:hidden">Find club meetings, study groups, and more.</p>
            </div>
            <div className="p-2 md:p-4">
              <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Real-Time Updates</h3>
              <p className="text-sm md:text-base text-gray-300 hidden md:block">See what's happening right now and what's coming up in the next few hours.</p>
              <p className="text-xs text-gray-300 md:hidden">See what's happening right now.</p>
            </div>
            <div className="p-2 md:p-4">
              <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Purdue Community</h3>
              <p className="text-sm md:text-base text-gray-300 hidden md:block">Connect with fellow Boilermakers and discover campus activities.</p>
              <p className="text-xs text-gray-300 md:hidden">Connect with fellow Boilermakers.</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-6 md:pt-8">
          <Button 
            asChild 
            size="default" 
            className="bg-white text-black hover:bg-gray-100 text-sm md:text-base"
          >
            <Link href="/map">View Events Map</Link>
          </Button>
          
          {user ? (
            <Button 
              asChild 
              variant="outline" 
              size="default"
              className="border-white text-white hover:bg-white/10 bg-white/5 text-sm md:text-base"
            >
              <Link href="/profile">My Profile</Link>
            </Button>
          ) : (
            <Button 
              asChild 
              variant="outline" 
              size="default"
              className="border-white text-white hover:bg-white/10 bg-white/5 text-sm md:text-base"
            >
              <Link href="/auth/login">Join with @purdue.edu</Link>
            </Button>
          )}
        </div>

        {!user && (
          <p className="text-xs md:text-sm text-gray-300 mt-3 md:mt-4">
            Only @purdue.edu email addresses can create and manage events.
          </p>
        )}
      </div>
    </main>
  )
}