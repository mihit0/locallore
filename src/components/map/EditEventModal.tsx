'use client'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EventCategory, EditEventModalProps } from "@/types"
import { localToEastern, easternToLocal, getCurrentEasternTime, getMaxEasternTime } from "@/lib/date"
import { ImageUpload } from "@/components/ui/ImageUpload"
import { deleteEventImage } from "@/lib/storage"

export function EditEventModal({ isOpen, onClose, event, onSuccess }: EditEventModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [category, setCategory] = useState<EventCategory>("Other")
  const [contactInfo, setContactInfo] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [originalImageUrl, setOriginalImageUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories: EventCategory[] = ['Food', 'Study', 'Club', 'Social', 'Academic', 'Other']

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description)
      setStartTime(easternToLocal(event.start_time))
      setEndTime(easternToLocal(event.end_time))
      setCategory(event.category)
      setContactInfo(event.contact_info || "")
      setImageUrl(event.image_url || "")
      setOriginalImageUrl(event.image_url || "")
    }
  }, [event])

  const handleSubmit = async () => {
    if (!user || !event) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: title.trim(),
          description: description.trim(),
          start_time: localToEastern(startTime),
          end_time: localToEastern(endTime),
          category,
          contact_info: contactInfo.trim() || null,
          image_url: imageUrl.trim() || null,
        })
        .eq('id', event.id)
        .eq('user_id', user.id) // Ensure user owns the event

      if (error) throw error

      toast.success("Event updated successfully!")

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error("Failed to update event. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !event) return

    if (!confirm("Are you sure you want to delete this event?")) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .eq('user_id', user.id) // Ensure user owns the event

      if (error) throw error

      toast.success("Event deleted successfully!")

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error("Failed to delete event. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValidForm = () => {
    const now = new Date(getCurrentEasternTime())
    const start = new Date(localToEastern(startTime))
    const end = new Date(localToEastern(endTime))
    const maxDate = new Date(getMaxEasternTime())

    return (
      title.trim().length >= 5 &&
      title.trim().length <= 100 &&
      description.trim().length >= 20 &&
      description.trim().length <= 500 &&
      startTime &&
      endTime &&
      start > now &&
      end > start &&
      start <= maxDate
    )
  }

  if (!event) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-black text-white border border-white/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Event</DialogTitle>
          <DialogDescription className="text-gray-300">
            Update your event details. All times must be entered in Eastern Time (ET).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Input
              placeholder="Event Title (5-100 characters)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="bg-gray-900 border-white/20 text-white placeholder:text-gray-400"
            />
            <p className="text-sm text-gray-400 mt-1">
              {title.trim().length}/100 characters
            </p>
          </div>

          <div>
            <Textarea
              placeholder="Event Description (20-500 characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-gray-900 border-white/20 text-white placeholder:text-gray-400"
              maxLength={500}
            />
            <p className="text-sm text-gray-400 mt-1">
              {description.trim().length}/500 characters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">Start Time (Enter in ET)</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                  className="bg-gray-900 border-white/20 text-white pr-8"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">ET</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white mb-2 block">End Time (Enter in ET)</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime || new Date().toISOString().slice(0, 16)}
                  className="bg-gray-900 border-white/20 text-white pr-8"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">ET</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Category</label>
            <Select value={category} onValueChange={(value) => setCategory(value as EventCategory)}>
              <SelectTrigger className="bg-gray-900 border-white/20 text-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20 text-white">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-white hover:bg-gray-800">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              placeholder="Contact Info (optional)"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="bg-gray-900 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-2 block">Event Image (optional)</label>
            <ImageUpload
              onImageUpload={setImageUrl}
              onImageRemove={() => setImageUrl("")}
              currentImageUrl={imageUrl}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
          <Button 
            variant="ghost" 
            onClick={handleDelete}
            disabled={isSubmitting}
            className="text-red-400 hover:bg-red-500/20 hover:text-red-300 w-full sm:w-auto order-2 sm:order-1"
          >
            Delete Event
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:bg-gray-800 hover:text-white w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isValidForm() || isSubmitting}
              className="bg-[#B1810B] text-white hover:bg-[#8B6B09] disabled:bg-gray-700 disabled:text-gray-400 w-full sm:w-auto"
            >
              {isSubmitting ? "Updating..." : "Update Event"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 