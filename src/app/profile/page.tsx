'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Event } from '@/types'

interface UserProfile {
  username: string
  display_name: string
  purdue_email: string
  graduation_year?: number
  created_at: string
  is_verified: boolean
}

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      console.log('No user found, redirecting to login')
      router.push('/auth/login')
      return
    }

    console.log('Current user:', {
      id: user.id,
      email: user.email,
      emailConfirmed: user.email_confirmed_at
    })

    const userId = user.id

    async function loadProfile() {
      try {
        // First verify the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push('/auth/login')
          return
        }

        if (!session) {
          console.error('No active session')
          router.push('/auth/login')
          return
        }

        console.log('Active session found:', {
          userId: session.user.id,
          email: session.user.email
        })

        // Load user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('username, display_name, purdue_email, graduation_year, created_at, is_verified')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error('Error loading profile:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          })
          return
        }

        if (profileData) {
          console.log('Profile data loaded:', profileData)
          setProfile(profileData)
        } else {
          console.error('No profile data found for user:', userId)
        }

        // Load user's events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .order('start_time', { ascending: true })

        if (eventsError) {
          console.error('Error loading events:', {
            message: eventsError.message,
            details: eventsError.details,
            hint: eventsError.hint,
            code: eventsError.code
          })
          return
        }

        if (eventsData) {
          setEvents(eventsData)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, router])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-lg">Loading your profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-lg">Loading profile data...</div>
      </div>
    )
  }

  const activeEvents = events.filter(event => new Date(event.end_time) > new Date())
  const pastEvents = events.filter(event => new Date(event.end_time) <= new Date())
  const totalViews = events.reduce((sum, event) => sum + event.view_count, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/map">View Map</Link>
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Display Name</p>
              <p className="text-lg">{profile.display_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Purdue Email</p>
              <p className="text-lg flex items-center gap-2">
                {profile.purdue_email}
                {profile.is_verified && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Verified</span>
                )}
              </p>
            </div>
            {profile.graduation_year && (
              <div>
                <p className="text-sm text-gray-500">Expected Graduation</p>
                <p className="text-lg">{profile.graduation_year}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-lg">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Statistics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Active Events</p>
              <p className="text-2xl font-semibold">{activeEvents.length}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Events Created</p>
              <p className="text-2xl font-semibold">{events.length}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Event Views</p>
              <p className="text-2xl font-semibold">{totalViews}</p>
            </div>
          </CardContent>
        </Card>

        {activeEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeEvents.map(event => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {event.category}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Starts: {new Date(event.start_time).toLocaleString()}</p>
                      <p>Ends: {new Date(event.end_time).toLocaleString()}</p>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      {event.view_count} views
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {pastEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Past Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pastEvents.map(event => (
                  <div key={event.id} className="p-4 border rounded-lg opacity-75">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        {event.category}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Started: {new Date(event.start_time).toLocaleString()}</p>
                      <p>Ended: {new Date(event.end_time).toLocaleString()}</p>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      {event.view_count} views
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}