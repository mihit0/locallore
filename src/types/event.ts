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
  category: string;
  tags: string[];
  image_url?: string;
  view_count: number;
  created_at: string;
  creator?: {
    display_name: string;
    graduation_year?: number;
  };
};

export type UserPreferences = {
  id: string;
  user_id: string;
  preferences: string[];
  updated_at: string;
};

export type Interaction = {
  id: string;
  user_id: string;
  event_id: string;
  interaction_type: 'view' | 'click' | 'bookmark' | 'share' | 'attend';
  timestamp: string;
  metadata?: Record<string, any>;
};

export type PredefinedTag = {
  id: number;
  tag: string;
  category: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
};

// Common tag categories for organization
export const TAG_CATEGORIES = {
  Academic: ['Academic', 'Study', 'Research', 'Graduate', 'Undergraduate', 'Engineering'],
  Professional: ['Career', 'Internship', 'Leadership', 'Networking', 'Tech'],
  Social: ['Social', 'Club', 'Coffee', 'Cultural', 'Food', 'Pizza', 'Volunteer'],
  Entertainment: ['Dance', 'Music', 'Games', 'Sports', 'Arts'],
  General: ['Free', 'Other', 'Boiler Gold Rush']
} as const;

// Predefined colors for tags by category
export const TAG_COLORS = {
  Academic: '#ef4444',
  Professional: '#8b5cf6', 
  Social: '#10b981',
  Entertainment: '#f97316',
  General: '#6b7280'
} as const; 