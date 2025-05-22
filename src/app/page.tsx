'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-6xl font-bold text-gray-900">LocalLore</h1>
        <p className="text-xl text-gray-600">"Love local. Remember deeply."</p>
        
        <div className="flex gap-4 justify-center pt-8">
          <Button asChild size="lg">
            <Link href="/map">Full Map</Link>
          </Button>
          
          {user ? (
            <Button asChild variant="outline" size="lg">
              <Link href="/profile">My Profile</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}