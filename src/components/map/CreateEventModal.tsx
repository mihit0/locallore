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
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EventCategory, CreateEventModalProps } from "@/types"
import { localToEastern, getCurrentEasternTime, getMaxEasternTime } from "@/lib/date"

export function CreateEventModal({ isOpen, onClose, coordinates, onSuccess }: CreateEventModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [category, setCategory] = useState<EventCategory>("Other")
  const [contactInfo, setContactInfo] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories: EventCategory[] = ['Food', 'Study', 'Club', 'Social', 'Academic', 'Other']

  const handleSubmit = async () => {
    if (!user || !coordinates) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        latitude: coordinates[1],
        longitude: coordinates[0],
        start_time: localToEastern(startTime),
        end_time: localToEastern(endTime),
        category,
        contact_info: contactInfo.trim() || null,
        image_url: imageUrl.trim() || null,
        view_count: 0
      })

      if (error) throw error

      toast.success("Event created successfully!")

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error("Failed to create event. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStartTime("")
    setEndTime("")
    setCategory("Other")
    setContactInfo("")
    setImageUrl("")
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-black text-white border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Event</DialogTitle>
          <DialogDescription className="text-gray-300">
            Share an event happening at this location on Purdue campus. All times must be entered in Eastern Time (ET).
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-white">Start Time (Enter in ET)</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                  className="bg-gray-900 border-white/20 text-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">ET</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white">End Time (Enter in ET)</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime || new Date().toISOString().slice(0, 16)}
                  className="bg-gray-900 border-white/20 text-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">ET</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-white">Category</label>
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
            <Input
              placeholder="Image URL (optional)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="bg-gray-900 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:bg-gray-800 hover:text-white">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValidForm() || isSubmitting}
            className="bg-[#B1810B] text-white hover:bg-[#8B6B09] disabled:bg-gray-700 disabled:text-gray-400"
          >
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 