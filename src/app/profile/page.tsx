'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Event } from '@/types/event'
// import { formatEasternDateTime } from '@/lib/date'
import { EventCard } from '@/components/EventCard'
import { ProfileEventCard } from '@/components/ProfileEventCard'
import { LogOut, Home, Map, Trophy, Calendar, Eye, Edit, Trash2 } from 'lucide-react'
import { EditEventModal } from '@/components/map/EditEventModal'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPreferences } from '@/components/UserPreferences'
import { BookmarkedEvents } from '@/components/BookmarkedEvents'

interface UserProfile {
  username: string
  display_name: string
  purdue_email: string
  graduation_year?: number
  created_at: string
  is_verified: boolean
  preferences?: string[]
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false)
  const [eventsPage, setEventsPage] = useState(1)
  const [hasMoreEvents, setHasMoreEvents] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    graduation_year: ''
  })
  const [userPreferences, setUserPreferences] = useState<string[]>([]);

  // Intersection observer for infinite scroll
  const { ref: eventsRef, inView: eventsInView } = useInView({
    threshold: 0,
  });

  const EVENTS_PER_PAGE = 10;

  // Add graduation year options
  const currentYear = new Date().getFullYear()
  const graduationYears = Array.from({length: 11}, (_, i) => currentYear + i)

  useEffect(() => {
    // Wait for auth loading to complete before checking user
    if (authLoading) {
      return
    }
    
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
          .select('username, display_name, purdue_email, graduation_year, created_at, is_verified, preferences')
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
          setUserPreferences(profileData.preferences || [])
        } else {
          console.error('No profile data found for user:', userId)
        }

        // Load user's events with pagination
        await loadUserEvents(userId, 1, true);
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, router, authLoading])

  // Load more events when scrolling
  useEffect(() => {
    if (eventsInView && !loading && !loadingMoreEvents && hasMoreEvents && user?.id) {
      const nextPage = eventsPage + 1;
      setEventsPage(nextPage);
      loadUserEvents(user.id, nextPage, false);
    }
  }, [eventsInView, loading, loadingMoreEvents, hasMoreEvents, eventsPage, user?.id])

  // Function to load user events (needs to be accessible outside loadProfile)
  const loadUserEvents = async (userId: string, pageNum: number, reset: boolean = false) => {
    if (reset) {
      setLoadingMoreEvents(false);
    } else {
      setLoadingMoreEvents(true);
    }

    try {
      const offset = (pageNum - 1) * EVENTS_PER_PAGE;
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .range(offset, offset + EVENTS_PER_PAGE - 1);

      if (eventsError) {
        console.error('Error loading events:', {
          message: eventsError.message,
          details: eventsError.details,
          hint: eventsError.hint,
          code: eventsError.code
        });
        return;
      }

      if (eventsData) {
        setHasMoreEvents(eventsData.length === EVENTS_PER_PAGE);
        
        if (reset) {
          setEvents(eventsData);
        } else {
          setEvents(prev => [...prev, ...eventsData]);
        }
      }
    } catch (error) {
      console.error('Error loading user events:', error);
    } finally {
      setLoadingMoreEvents(false);
    }
  };

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
    // Reload events after edit - reset pagination
    if (user?.id) {
      setEventsPage(1);
      setHasMoreEvents(true);
      await loadUserEvents(user.id, 1, true);
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

  // Show loading while auth is being checked or profile is being loaded
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-lg text-white font-medium">Loading your profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-lg text-white font-medium">Loading profile data...</div>
      </div>
    )
  }

  const activeEvents = events.filter(event => new Date(event.end_time) > new Date())
  const pastEvents = events.filter(event => new Date(event.end_time) <= new Date())
  const totalViews = events.reduce((sum, event) => sum + event.view_count, 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-4 pt-6 space-y-8">
        <div className="flex justify-between items-center pb-4">
          <h1 className="text-4xl font-bold text-white">Your Profile</h1>
          <div className="flex gap-3">
            <Button 
              asChild 
              variant="ghost"
              size="default"
              className="text-gray-300 hover:bg-gray-900 hover:text-white transition-all duration-200"
            >
              <Link href="/" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="text-sm">Home</span>
              </Link>
            </Button>
            <Button 
              asChild 
              variant="ghost"
              size="default"
              className="text-gray-300 hover:bg-gray-900 hover:text-white transition-all duration-200"
            >
              <Link href="/map" className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                <span className="text-sm">Map</span>
              </Link>
            </Button>
            <Button 
              variant="ghost"
              size="default"
              onClick={handleLogout}
              className="text-gray-300 hover:bg-gray-900 hover:text-white transition-all duration-200 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </Button>
          </div>
        </div>
        
        <div className="w-full h-px bg-white/20"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Profile Information</h2>
              <div className="flex gap-2">
                <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 hover:bg-gray-900 hover:text-white transition-all duration-200"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      <span className="text-sm">Edit</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/90 backdrop-blur-sm text-white border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">Edit Profile</DialogTitle>
                      <DialogDescription className="text-gray-400 text-sm">
                        Make changes to your profile information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="display_name" className="text-white text-sm">Display Name</Label>
                        <Input
                          id="display_name"
                          placeholder={profile?.display_name}
                          value={editForm.display_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                          className="bg-gray-900 border-gray-700 text-white placeholder-gray-500 text-sm"
                          maxLength={50}
                        />
                        <p className="text-xs text-gray-500">2-50 characters</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="graduation_year" className="text-white text-sm">Graduation Year</Label>
                        <Select
                          value={editForm.graduation_year}
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, graduation_year: value }))}>
                          <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm">
                            <SelectValue placeholder="Select graduation year" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 backdrop-blur-sm text-white border-gray-700">
                            {graduationYears.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          variant="ghost"
                          onClick={() => setIsEditingProfile(false)}
                          className="text-gray-300 hover:bg-gray-900 flex-1 sm:flex-initial"
                        >
                          <span className="text-sm">Cancel</span>
                        </Button>
                        <Button 
                          onClick={handleEditProfile}
                          className="bg-[#B1810B] text-white hover:bg-[#8B6B09] transition-colors duration-200 flex-1 sm:flex-initial"
                        >
                          <span className="text-sm">Save Changes</span>
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:bg-red-900/20 w-full sm:w-auto mt-2 sm:mt-0"
                        onClick={() => {
                          setIsEditingProfile(false)
                          setIsConfirmingDelete(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        <span className="text-sm">Delete Account</span>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span className="text-sm">Delete</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/90 backdrop-blur-sm text-white border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">Delete Account</DialogTitle>
                      <DialogDescription className="text-gray-400 text-sm">
                        Are you sure you want to delete your account? This action cannot be undone.
                        All your events and data will be permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button 
                        variant="ghost"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="text-gray-300 hover:bg-gray-900"
                      >
                        <span className="text-sm">Cancel</span>
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteAccount}>
                        <span className="text-sm">Delete Account</span>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Display Name</p>
                <p className="text-base font-medium">{profile.display_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Purdue Email</p>
                <p className="text-base font-medium flex items-center gap-2">
                  {profile.purdue_email}
                  {profile.is_verified && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
                      Verified
                    </span>
                  )}
                </p>
              </div>
              {profile.graduation_year && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Expected Graduation</p>
                  <p className="text-base font-medium">{profile.graduation_year}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1">Member Since</p>
                <p className="text-base font-medium">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Statistics</h2>
            <div className="space-y-4">
              <div className="p-4 hover:bg-gray-900/50 transition-all duration-200 rounded">
                <div className="flex items-center gap-2 text-[#B1810B] mb-1">
                  <Calendar className="w-4 h-4" />
                  <p className="text-xs font-medium">Active Events</p>
                </div>
                <p className="text-2xl font-bold">{activeEvents.length}</p>
              </div>
              <div className="p-4 hover:bg-gray-900/50 transition-all duration-200 rounded">
                <div className="flex items-center gap-2 text-[#B1810B] mb-1">
                  <Trophy className="w-4 h-4" />
                  <p className="text-xs font-medium">Total Events</p>
                </div>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <div className="p-4 hover:bg-gray-900/50 transition-all duration-200 rounded">
                <div className="flex items-center gap-2 text-[#B1810B] mb-1">
                  <Eye className="w-4 h-4" />
                  <p className="text-xs font-medium">Total Views</p>
                </div>
                <p className="text-2xl font-bold">{totalViews}</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Preferences Section */}
        <div className="space-y-6">
          <UserPreferences />
        </div>

        {/* Bookmarked Events Section */}
        <div className="space-y-6">
          <BookmarkedEvents userId={user?.id || ''} />
        </div>



        {activeEvents.length > 0 && (
          <div className="space-y-4">
            <div className="w-full h-px bg-white/20"></div>
            <h2 className="text-2xl font-semibold text-white">Active Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeEvents.map(event => (
                <ProfileEventCard 
                  key={event.id} 
                  event={event} 
                  showMapButton 
                  onEdit={handleEditEvent}
                />
              ))}
            </div>
            
            {/* Infinite scroll trigger for more events */}
            {hasMoreEvents && (
              <div ref={eventsRef} className="py-4">
                {loadingMoreEvents && (
                  <div className="flex justify-center">
                    <div className="animate-pulse text-gray-400">
                      Loading more events...
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!hasMoreEvents && events.length > EVENTS_PER_PAGE && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No more events to load</p>
              </div>
            )}
          </div>
        )}

        {pastEvents.length > 0 && (
          <div className="space-y-4">
            <div className="w-full h-px bg-white/20"></div>
            <h2 className="text-2xl font-semibold text-white">Past Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastEvents.map(event => (
                <ProfileEventCard 
                  key={event.id} 
                  event={event} 
                  showMapButton 
                  onEdit={handleEditEvent}
                />
              ))}
            </div>
          </div>
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