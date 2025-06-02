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
        start_time: startTime,
        end_time: endTime,
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
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)
    const maxDate = new Date()
    maxDate.setDate(now.getDate() + 7)

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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Share an event happening at this location on Purdue campus.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Input
              placeholder="Event Title (5-100 characters)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {title.trim().length}/100 characters
            </p>
          </div>

          <div>
            <Textarea
              placeholder="Event Description (20-500 characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {description.trim().length}/500 characters
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Time</label>
              <div className="flex flex-col gap-2">
                <Input
                  type="date"
                  value={startTime.split('T')[0]}
                  onChange={(e) => {
                    const date = e.target.value
                    const time = startTime.split('T')[1] || '00:00'
                    setStartTime(`${date}T${time}`)
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                <Input
                  type="time"
                  value={startTime.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = startTime.split('T')[0] || new Date().toISOString().split('T')[0]
                    setStartTime(`${date}T${e.target.value}`)
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">End Time</label>
              <div className="flex flex-col gap-2">
                <Input
                  type="date"
                  value={endTime.split('T')[0]}
                  onChange={(e) => {
                    const date = e.target.value
                    const time = endTime.split('T')[1] || '00:00'
                    setEndTime(`${date}T${time}`)
                  }}
                  min={startTime.split('T')[0] || new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="time"
                  value={endTime.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = endTime.split('T')[0] || startTime.split('T')[0] || new Date().toISOString().split('T')[0]
                    setEndTime(`${date}T${e.target.value}`)
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={(value) => setCategory(value as EventCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
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
            />
          </div>

          <div>
            <Input
              placeholder="Image URL (optional)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValidForm() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 