export type Event = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  location?: string;
  start_time: string;
  end_time: string;
  contact_info?: string;
  category: 'Food' | 'Study' | 'Club' | 'Social' | 'Academic' | 'Other';
  image_url?: string;
  view_count: number;
  created_at: string;
  creator?: {
    display_name: string;
    graduation_year?: number;
  };
}; 