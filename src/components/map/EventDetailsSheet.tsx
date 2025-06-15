import {
  Sheet,
  SheetContent,
  // SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Event } from "@/types"
import { formatEasternDateTime } from "@/lib/date"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface EventDetailsSheetProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
}

// Category icons (emoji for now, can be replaced with actual icons)
const categoryIcons = {
  Food: '🍕',
  Study: '📚',
  Club: '🎯',
  Social: '🎉',
  Academic: '🎓',
  Other: '⭐'
} as const

const CATEGORY_COLORS = {
  Food: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Study: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Club: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Social: 'bg-green-500/20 text-green-400 border-green-500/30',
  Academic: 'bg-red-500/20 text-red-400 border-red-500/30',
  Other: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
} as const

export function EventDetailsSheet({ event, isOpen, onClose, onEdit }: EventDetailsSheetProps) {
  const { user } = useAuth()
  const router = useRouter()

  if (!event) return null

  const handleViewOnMap = () => {
    onClose() // Close the sheet first
    router.push(`/map?event=${event.id}`)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-black border-l border-white/20">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{categoryIcons[event.category]}</span>
              <SheetTitle className="text-2xl text-white">{event.title}</SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              {user && user.id === event.user_id && onEdit && (
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:bg-gray-800 hover:text-white"
                  onClick={onEdit}
                >
                  Edit Event
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-300 hover:bg-gray-800 hover:text-white"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${CATEGORY_COLORS[event.category]} backdrop-blur-sm text-xs border-0`}>
              {event.category}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2 text-white">Description</h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{event.description}</p>
          </div>

          <div className="w-full h-px bg-white/20"></div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-white">Time</h3>
            <div className="text-sm text-gray-300">
              <p>Starts: {formatEasternDateTime(event.start_time)}</p>
              <p>Ends: {formatEasternDateTime(event.end_time)}</p>
            </div>
          </div>

          <div className="w-full h-px bg-white/20"></div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-white">Location</h3>
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white border border-white/20"
              onClick={handleViewOnMap}
            >
              <MapPin className="w-4 h-4" />
              View on Map
            </Button>
          </div>

          {event.contact_info && (
            <>
              <div className="w-full h-px bg-white/20"></div>
              <div>
                <h3 className="text-sm font-medium mb-2 text-white">Contact Information</h3>
                <p className="text-sm text-gray-300">{event.contact_info}</p>
              </div>
            </>
          )}

          {event.image_url && (
            <>
              <div className="w-full h-px bg-white/20"></div>
              <div>
                <h3 className="text-sm font-medium mb-2 text-white">Event Image</h3>
                <div className="relative w-full h-64 overflow-hidden rounded bg-gray-900 border border-white/20">
                  <img 
                    src={event.image_url} 
                    alt={event.title}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>
              </div>
            </>
          )}

          <div className="w-full h-px bg-white/20"></div>
          
          <div className="text-sm text-gray-400">
            {event.view_count} views
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 