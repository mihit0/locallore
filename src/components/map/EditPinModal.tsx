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
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface EditPinModalProps {
  isOpen: boolean
  onClose: () => void
  pin: {
    id: string
    description: string
    user_id: string
  } | null
  onSuccess: () => void
}

export function EditPinModal({ isOpen, onClose, pin, onSuccess }: EditPinModalProps) {
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Set initial description when pin changes
  useEffect(() => {
    if (pin) {
      setDescription(pin.description)
    }
  }, [pin])

  const handleSubmit = async () => {
    if (!pin) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('pins')
        .update({ description: description.trim() })
        .eq('id', pin.id)

      if (error) throw error

      toast.success("Pin updated successfully!")
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating pin:', error)
      toast.error("Failed to update pin. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!pin) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pin.id)

      if (error) throw error

      toast.success("Pin deleted successfully!")
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deleting pin:', error)
      toast.error("Failed to delete pin. Please try again.")
    } finally {
      setIsSubmitting(false)
      setShowDeleteConfirm(false)
    }
  }

  const isValidDescription = description.trim().length >= 50

  if (!pin) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Pin</DialogTitle>
          <DialogDescription>
            Update your memory about this location.
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
        <DialogFooter className="flex justify-between items-center">
          <div>
            {!showDeleteConfirm ? (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
              >
                Delete Pin
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  Confirm Delete
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isValidDescription || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 