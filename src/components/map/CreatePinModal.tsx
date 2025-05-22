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
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"

interface CreatePinModalProps {
  isOpen: boolean
  onClose: () => void
  coordinates: [number, number] | null
  onSuccess: () => void
}

export function CreatePinModal({ isOpen, onClose, coordinates, onSuccess }: CreatePinModalProps) {
  const { user } = useAuth()
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!user || !coordinates) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('pins').insert({
        user_id: user.id,
        latitude: coordinates[1],
        longitude: coordinates[0],
        description: description.trim()
      })

      if (error) throw error

      toast.success("Pin created successfully!")

      onSuccess()
      onClose()
      setDescription("")
    } catch (error) {
      console.error('Error creating pin:', error)
      toast.error("Failed to create pin. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValidDescription = description.trim().length >= 50

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Pin</DialogTitle>
          <DialogDescription>
            Share your memory about this location. What makes it special?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Describe your memory... (minimum 50 characters)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[150px]"
          />
          {!isValidDescription && (
            <p className="text-sm text-muted-foreground">
              {50 - description.trim().length} more characters needed
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValidDescription || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Pin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 