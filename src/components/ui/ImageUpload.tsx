'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  onImageUpload: (url: string) => void
  onImageRemove: () => void
  currentImageUrl?: string
}

export function ImageUpload({ onImageUpload, onImageRemove, currentImageUrl }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    try {
      // Delete old image if replacing
      if (currentImageUrl) {
        const { deleteEventImage } = await import('@/lib/storage')
        await deleteEventImage(currentImageUrl)
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `events/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath)

      onImageUpload(data.publicUrl)
      toast.success('Image uploaded successfully!')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }, [onImageUpload, currentImageUrl])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  })

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Delete from storage immediately
    if (currentImageUrl) {
      const { deleteEventImage } = await import('@/lib/storage')
      await deleteEventImage(currentImageUrl)
    }
    
    onImageRemove()
  }

  return (
    <div className="space-y-3">
      {currentImageUrl ? (
        <div className="relative group">
          <img 
            src={currentImageUrl} 
            alt="Event" 
            className="w-full h-32 md:h-40 object-cover rounded border border-white/20"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1.5 shadow-lg backdrop-blur-sm border border-red-400/30 transition-all duration-200 z-10"
            type="button"
            style={{ pointerEvents: 'auto' }}
          >
            <X className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      ) : null}
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 md:p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-[#B1810B] bg-[#B1810B]/10' 
            : currentImageUrl 
              ? 'border-white/10 bg-gray-900/50 hover:border-white/20' 
              : 'border-white/20 hover:border-white/40'
        } ${currentImageUrl ? 'opacity-75 hover:opacity-100' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-[#B1810B]"></div>
          ) : (
            <ImageIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
          )}
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-gray-400">
              {uploading ? 'Uploading...' : 
               isDragActive ? 'Drop the image here' : 
               currentImageUrl ? 'Change image' :
               'Drag & drop an image, or tap to select'}
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
          </div>
        </div>
      </div>
    </div>
  )
} 