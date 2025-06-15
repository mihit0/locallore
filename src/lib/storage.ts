import { supabase } from '@/lib/supabase'

export const deleteEventImage = async (imageUrl: string) => {
  if (!imageUrl.includes('supabase') || !imageUrl.includes('event-images')) return
  
  try {
    // Extract the file path from the URL
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const filePath = `events/${fileName}`
    
    const { error } = await supabase.storage
      .from('event-images')
      .remove([filePath])
    
    if (error) {
      console.error('Error deleting image:', error)
    }
  } catch (error) {
    console.error('Error parsing image URL for deletion:', error)
  }
}

export const uploadEventImage = async (file: File): Promise<string> => {
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

  return data.publicUrl
} 