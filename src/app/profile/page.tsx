'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Event } from '@/types/event'
import { formatEasternDateTime } from '@/lib/date'
import { EventCard } from '@/components/EventCard'
import { LogOut, Home, Map, Trophy, Calendar, Eye } from 'lucide-react'
import { EditEventModal } from '@/components/map/EditEventModal'

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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

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

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event)
    setShowEditModal(true)
  }

  const handleEditSuccess = async () => {
    // Reload events after edit
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user?.id)
      .order('start_time', { ascending: true })

    if (eventsData) {
      setEvents(eventsData)
    }
    setShowEditModal(false)
    setSelectedEvent(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-[#000000] to-[#B1810B] p-4 flex items-center justify-center">
        <div className="text-lg text-white">Loading your profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-[#000000] to-[#B1810B] p-4 flex items-center justify-center">
        <div className="text-lg text-white">Loading profile data...</div>
      </div>
    )
  }

  const activeEvents = events.filter(event => new Date(event.end_time) > new Date())
  const pastEvents = events.filter(event => new Date(event.end_time) <= new Date())
  const totalViews = events.reduce((sum, event) => sum + event.view_count, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-[#000000] to-[#B1810B]">
      <div className="max-w-6xl mx-auto p-4 pt-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Your Profile</h1>
          <div className="flex gap-4">
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Link href="/" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Link href="/map" className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                Map
              </Link>
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-2 bg-white/10 border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-gray-300">Display Name</p>
                <p className="text-xl">{profile.display_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Purdue Email</p>
                <p className="text-xl flex items-center gap-2">
                  {profile.purdue_email}
                  {profile.is_verified && (
                    <span className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/30">
                      Verified
                    </span>
                  )}
                </p>
              </div>
              {profile.graduation_year && (
                <div>
                  <p className="text-sm text-gray-300">Expected Graduation</p>
                  <p className="text-xl">{profile.graduation_year}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-300">Member Since</p>
                <p className="text-xl">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Event Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 text-[#B1810B]">
                  <Calendar className="w-5 h-5" />
                  <p className="text-sm">Active Events</p>
                </div>
                <p className="text-3xl font-semibold mt-1">{activeEvents.length}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 text-[#B1810B]">
                  <Trophy className="w-5 h-5" />
                  <p className="text-sm">Total Events</p>
                </div>
                <p className="text-3xl font-semibold mt-1">{events.length}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 text-[#B1810B]">
                  <Eye className="w-5 h-5" />
                  <p className="text-sm">Total Views</p>
                </div>
                <p className="text-3xl font-semibold mt-1">{totalViews}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {activeEvents.length > 0 && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Active Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeEvents.map(event => (
                  <div key={event.id} className="relative">
                    <EventCard event={event} showMapButton />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                      onClick={() => handleEditEvent(event)}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {pastEvents.length > 0 && (
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Past Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastEvents.map(event => (
                  <div key={event.id} className="relative">
                    <EventCard event={event} showMapButton />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                      onClick={() => handleEditEvent(event)}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <EditEventModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedEvent(null)
        }}
        event={selectedEvent}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}