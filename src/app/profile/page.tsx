'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Event } from '@/types/event'
// import { formatEasternDateTime } from '@/lib/date'
import { EventCard } from '@/components/EventCard'
import { LogOut, Home, Map, Trophy, Calendar, Eye, Edit, Trash2 } from 'lucide-react'
import { EditEventModal } from '@/components/map/EditEventModal'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    graduation_year: ''
  })

  // Add graduation year options
  const currentYear = new Date().getFullYear()
  const graduationYears = Array.from({length: 11}, (_, i) => currentYear + i)

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

  const validateForm = () => {
    if (editForm.display_name && (editForm.display_name.length < 2 || editForm.display_name.length > 50)) {
      toast.error("Display name must be between 2 and 50 characters")
      return false
    }
    return true
  }

  const handleEditProfile = async () => {
    try {
      if (!editForm.display_name && !editForm.graduation_year) {
        toast.error("Please make some changes before saving.")
        return
      }

      if (!validateForm()) {
        return
      }

      const updates = {
        display_name: editForm.display_name || profile?.display_name,
        graduation_year: editForm.graduation_year ? parseInt(editForm.graduation_year) : profile?.graduation_year
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user?.id)
        .select()
        .single()

      if (error) {
        if (error.message.includes('valid_graduation_year')) {
          toast.error("Graduation year must be between current year and 10 years in the future")
          return
        }
        if (error.message.includes('display_name_length')) {
          toast.error("Display name must be between 2 and 50 characters")
          return
        }
        throw error
      }

      setProfile(data)
      setIsEditingProfile(false)
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error("Failed to update profile. Please try again.")
    }
  }

  const handleDeleteAccount = async () => {
    try {
      // First delete all user data
      const { error: deleteError } = await supabase
        .rpc('delete_user_account')

      if (deleteError) throw deleteError

      // Sign out the user
      await supabase.auth.signOut()
      router.push('/')
      
      toast.success("Account deleted successfully.")
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error("Failed to delete account. Please try again.")
    }
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Profile Information</CardTitle>
              <div className="flex gap-2">
                <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 text-white border-white/20">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Make changes to your profile information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                          id="display_name"
                          placeholder={profile?.display_name}
                          value={editForm.display_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                          className="bg-white/10 border-white/20"
                          maxLength={50}
                        />
                        <p className="text-xs text-gray-400">2-50 characters</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="graduation_year">Graduation Year</Label>
                        <Select
                          value={editForm.graduation_year}
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, graduation_year: value }))}>
                          <SelectTrigger className="bg-white/10 border-white/20">
                            <SelectValue placeholder="Select graduation year" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 text-white border-white/20">
                            {graduationYears.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditingProfile(false)}
                        className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleEditProfile}>
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 text-white border-white/20">
                    <DialogHeader>
                      <DialogTitle>Delete Account</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Are you sure you want to delete your account? This action cannot be undone.
                        All your events and data will be permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsConfirmingDelete(false)}
                        className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteAccount}>
                        Delete Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
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