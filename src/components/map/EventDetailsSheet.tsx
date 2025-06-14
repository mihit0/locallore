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
import { MapPin } from "lucide-react"
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
  Food: 'bg-amber-100 text-amber-800 border-amber-200',
  Study: 'bg-blue-100 text-blue-800 border-blue-200',
  Club: 'bg-purple-100 text-purple-800 border-purple-200',
  Social: 'bg-green-100 text-green-800 border-green-200',
  Academic: 'bg-red-100 text-red-800 border-red-200',
  Other: 'bg-gray-100 text-gray-800 border-gray-200'
} as const

export function EventDetailsSheet({ event, isOpen, onClose, onEdit }: EventDetailsSheetProps) {
  const { user } = useAuth()
  const router = useRouter()

  if (!event) return null

  const handleViewOnMap = () => {
    router.push(`/map?event=${event.id}`)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-gradient-to-b from-white to-gray-50">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{categoryIcons[event.category]}</span>
              <SheetTitle className="text-2xl text-[#000000]">{event.title}</SheetTitle>
            </div>
            {user && user.id === event.user_id && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                Edit Event
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={CATEGORY_COLORS[event.category]}>
              {event.category}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Description</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Time</h3>
            <div className="text-sm text-gray-600">
              <p>Starts: {formatEasternDateTime(event.start_time)}</p>
              <p>Ends: {formatEasternDateTime(event.end_time)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Location</h3>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50"
              onClick={handleViewOnMap}
            >
              <MapPin className="w-4 h-4" />
              View on Map
            </Button>
          </div>

          {event.contact_info && (
            <div>
              <h3 className="text-sm font-medium mb-2">Contact Information</h3>
              <p className="text-sm text-gray-600">{event.contact_info}</p>
            </div>
          )}

          {event.image_url && (
            <div>
              <h3 className="text-sm font-medium mb-2">Event Image</h3>
              <div className="relative w-full h-64 overflow-hidden rounded-lg bg-gray-100">
                <img 
                  src={event.image_url} 
                  alt={event.title}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="text-sm text-gray-400">
            {event.view_count} views
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 