import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Event } from "@/types"
import { formatEasternDateTime } from "@/lib/date"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"

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

export function EventDetailsSheet({ event, isOpen, onClose, onEdit }: EventDetailsSheetProps) {
  const { user } = useAuth()

  if (!event) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{categoryIcons[event.category]}</span>
              <SheetTitle className="text-2xl">{event.title}</SheetTitle>
            </div>
            {user && user.id === event.user_id && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                Edit Event
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              {event.category}
            </span>
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

          {event.contact_info && (
            <div>
              <h3 className="text-sm font-medium mb-2">Contact Information</h3>
              <p className="text-sm text-gray-600">{event.contact_info}</p>
            </div>
          )}

          {event.image_url && (
            <div>
              <h3 className="text-sm font-medium mb-2">Event Image</h3>
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: '300px' }}
              />
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