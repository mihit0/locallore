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
import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { TagSelector } from "@/components/TagSelector"
import { EditEventModalProps } from "@/types"
import { localToEastern, easternToLocal, getCurrentEasternTime, getMaxEasternTime } from "@/lib/date"
import { ImageUpload } from "@/components/ui/ImageUpload"
import { deleteEventImage } from "@/lib/storage"
import { useMLAutoTag, useMLQualityCheck } from "@/lib/hooks/useML"

export function EditEventModal({ isOpen, onClose, event, onSuccess }: EditEventModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [contactInfo, setContactInfo] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [originalImageUrl, setOriginalImageUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [tagConfidences, setTagConfidences] = useState<Record<string, number>>({})
  const [apiCallCount, setApiCallCount] = useState(0)
  const [lastInputTime, setLastInputTime] = useState(0)
  
  // ML hooks
  const { autoTag, isLoading: isTagging, error: taggingError } = useMLAutoTag()
  const { checkQuality } = useMLQualityCheck()
  const autoTagTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description)
      setStartTime(easternToLocal(event.start_time))
      setEndTime(easternToLocal(event.end_time))
      setTags(event.tags || [])
      setContactInfo(event.contact_info || "")
      setImageUrl(event.image_url || "")
      setOriginalImageUrl(event.image_url || "")
    }
  }, [event])

  // Auto-tagging with optimized calling strategy
  const triggerAutoTag = useCallback(async () => {
    if (title.trim() && description.trim() && apiCallCount < 2) {
      console.log(`🏷️ API call ${apiCallCount + 1}/2 for:`, { title: title.trim(), description: description.trim() });
      const result = await autoTag(title.trim(), description.trim())
      setSuggestedTags(result.tags)
      setTagConfidences(result.confidences)
      setApiCallCount(prev => prev + 1)
    }
  }, [title, description, autoTag, apiCallCount])

  useEffect(() => {
    const currentTime = Date.now()
    setLastInputTime(currentTime)
    
    if (autoTagTimeoutRef.current) {
      clearTimeout(autoTagTimeoutRef.current)
    }

    if (title.trim() && description.trim()) {
      console.log('🏷️ Setting 3-second auto-tag timeout...');
      autoTagTimeoutRef.current = setTimeout(triggerAutoTag, 3000) // 3-second delay
    } else {
      // Clear suggestions and reset API call count when fields are empty
      setSuggestedTags([])
      setTagConfidences({})
      setApiCallCount(0)
    }

    return () => {
      if (autoTagTimeoutRef.current) {
        clearTimeout(autoTagTimeoutRef.current)
      }
    }
  }, [title, description, triggerAutoTag])

  // Reset API call count when user makes changes after the initial calls
  useEffect(() => {
    if (apiCallCount >= 2) {
      const checkForUserInput = () => {
        const timeSinceLastInput = Date.now() - lastInputTime
        if (timeSinceLastInput < 100) { // User made a change recently
          console.log('🏷️ User made changes, resetting API call count');
          setApiCallCount(0)
        }
      }
      
      const interval = setInterval(checkForUserInput, 500)
      return () => clearInterval(interval)
    }
  }, [apiCallCount, lastInputTime])

  const handleSubmit = async () => {
    if (!user || !event) return

    setIsSubmitting(true)
    
    // Optional quality check for analytics (no blocking)
    const qualityResult = await checkQuality(title.trim(), description.trim())
    
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: title.trim(),
          description: description.trim(),
          start_time: localToEastern(startTime),
          end_time: localToEastern(endTime),
          category: tags.length > 0 ? tags[0] : 'Other',
          tags: tags,
          contact_info: contactInfo.trim() || null,
          image_url: imageUrl.trim() || null,
        })
        .eq('id', event.id)
        .eq('user_id', user.id) // Ensure user owns the event

      if (error) throw error

      // Store quality score in database if we have it
      if (qualityResult) {
        try {
          await supabase.from('event_quality_scores').upsert({
            event_id: event.id,
            quality_score: qualityResult.qualityScore,
            spam_probability: qualityResult.spamProbability,
            is_spam: qualityResult.isSpam
          })
        } catch (qualityError) {
          console.warn('Failed to store quality score:', qualityError)
          // Don't fail the event update if quality score storage fails
        }
      }

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

  const handleImageUpload = (url: string) => {
    setImageUrl(url)
  }

  const handleImageRemove = () => {
    if (originalImageUrl && originalImageUrl !== imageUrl) {
      // Delete the new image if it was uploaded but user removed it
      deleteEventImage(imageUrl)
    }
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

  if (!event) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-black text-white border border-white/20 max-h-[90vh] overflow-y-auto">
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          .tag-container {
            transition: all 0.3s ease-in-out;
          }
        `}</style>
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
            <label className="text-sm font-medium text-white mb-2 block">
              Event Tags
              {isTagging && (
                <span className="ml-2 text-xs text-[#B1810B] animate-pulse">
                  ...
                </span>
              )}
              {taggingError && (
                <span className="ml-2 text-xs text-yellow-400">
                  ⚠️ {taggingError}
                </span>
              )}
            </label>
            
            <TagSelector
              selectedTags={tags}
              onTagsChange={setTags}
              suggestedTags={suggestedTags}
              tagConfidences={tagConfidences}
            />
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
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
              currentImageUrl={imageUrl}
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="bg-red-900/20 border-red-500/30 text-red-400 hover:bg-red-900/40 hover:text-red-300"
          >
            Delete Event
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-gray-900 border-white/20 text-white hover:bg-gray-800">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isValidForm() || isSubmitting}
              className="bg-[#B1810B] hover:bg-[#B1810B]/80 text-black font-medium"
            >
              {isSubmitting ? "Updating..." : "Update Event"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 