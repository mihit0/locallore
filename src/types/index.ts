export interface User {
    id: string
    username: string
    created_at: string
    updated_at: string
  }
  
  export interface Pin {
    id: string
    user_id: string
    latitude: number
    longitude: number
    description: string
    created_at: string
    updated_at: string
  }