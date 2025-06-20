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
import { TagSelector } from "@/components/TagSelector"
import { CreateEventModalProps } from "@/types"
import { localToEastern, getCurrentEasternTime, getMaxEasternTime } from "@/lib/date"
import { ImageUpload } from "@/components/ui/ImageUpload"
import { deleteEventImage } from "@/lib/storage"
import { useMLAutoTag, useMLQualityCheck } from "@/lib/hooks/useML"
import { useEffect, useCallback, useRef } from "react"

export function CreateEventModal({ isOpen, onClose, coordinates, onSuccess }: CreateEventModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [contactInfo, setContactInfo] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [tagConfidences, setTagConfidences] = useState<Record<string, number>>({})
  const [apiCallCount, setApiCallCount] = useState(0)
  const [lastInputTime, setLastInputTime] = useState(0)
  
  // ML hooks
  const { autoTag, isLoading: isTagging, error: taggingError } = useMLAutoTag()
  const { checkQuality } = useMLQualityCheck()
  const autoTagTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-tagging with optimized calling strategy
  const triggerAutoTag = useCallback(async () => {
    if (title.trim() && description.trim() && apiCallCount < 2) {
      console.log(`🏷️ API call ${apiCallCount + 1}/2 for:`, { title: title.trim(), description: description.trim() });
      const result = await autoTag(title.trim(), description.trim())
      console.log('🏷️ Auto-tag result:', result);
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

  // Debug log when suggested tags change
  useEffect(() => {
    console.log('🏷️ Suggested tags updated:', suggestedTags, 'API calls:', apiCallCount);
  }, [suggestedTags, apiCallCount])

  const handleSubmit = async () => {
    if (!user || !coordinates) return

    setIsSubmitting(true)
    
    // Optional quality check for analytics (no blocking)
    const qualityResult = await checkQuality(title.trim(), description.trim())

    try {
      // First, create the event
      const { data: eventData, error: eventError } = await supabase.from('events').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        latitude: coordinates[1],
        longitude: coordinates[0],
        start_time: localToEastern(startTime),
        end_time: localToEastern(endTime),
        category: tags.length > 0 ? tags[0] : 'Other',
        tags: tags,
        contact_info: contactInfo.trim() || null,
        image_url: imageUrl.trim() || null,
        view_count: 0
      }).select().single()

      if (eventError) throw eventError

      // Store quality score in database if we have it
      if (qualityResult && eventData) {
        try {
          await supabase.from('event_quality_scores').upsert({
            event_id: eventData.id,
            quality_score: qualityResult.qualityScore,
            spam_probability: qualityResult.spamProbability,
            is_spam: qualityResult.isSpam
          })
        } catch (qualityError) {
          console.warn('Failed to store quality score:', qualityError)
          // Don't fail the event creation if quality score storage fails
        }
      }

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
    setTags([])
    setContactInfo("")
    setImageUrl("")
    setSuggestedTags([])
    setTagConfidences({})
  }

  const handleImageUpload = (url: string) => {
    setImageUrl(url)
  }

  const handleImageRemove = () => {
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
        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:bg-gray-800 hover:text-white w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValidForm() || isSubmitting}
            className="bg-[#B1810B] text-white hover:bg-[#8B6B09] disabled:bg-gray-700 disabled:text-gray-400 w-full sm:w-auto"
          >
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 