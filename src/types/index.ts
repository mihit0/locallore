export interface User {
    id: string
    display_name: string
    purdue_email: string
    graduation_year?: number
    created_at: string
    updated_at: string
    is_verified: boolean
  }
  
  export type EventCategory = 'Food' | 'Study' | 'Club' | 'Social' | 'Academic' | 'Other'
  
  export interface Event {
    id: string
    user_id: string
    title: string
    description: string
    latitude: number
    longitude: number
    start_time: string
    end_time: string
    category: EventCategory
    contact_info?: string | null
    image_url?: string | null
    view_count: number
    created_at: string
  }
  
  export interface EventFormData {
    title: string
    description: string
    start_time: string
    end_time: string
    category: EventCategory
    contact_info?: string
    image_url?: string
  }

  export interface CreateEventModalProps {
    isOpen: boolean
    onClose: () => void
    coordinates: [number, number] | null
    onSuccess: () => void
  }

  export interface EditEventModalProps {
    isOpen: boolean
    onClose: () => void
    event: Event | null
    onSuccess: () => void
  }