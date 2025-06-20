import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple rule-based recommendation logic when ML API fails
const getRuleBasedRecommendations = async (supabase: any, userId: string, preferences: string[], interactedEventIds: string[], limit: number, offset: number) => {
  console.log(`📊 Using simple randomized recommendations for user ${userId}`);
  
  // Get ALL upcoming events
  const { data: allEvents } = await supabase
    .from('events')
    .select(`
      *,
      creator:user_id (
        display_name,
        graduation_year
      )
    `)
    .gt('end_time', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (!allEvents || allEvents.length === 0) {
    return { data: [], error: null };
  }

  // Take half the events and randomize them
  const halfCount = Math.ceil(allEvents.length / 2);
  const shuffledEvents = [...allEvents]
    .sort(() => Math.random() - 0.5) // Randomize order
    .slice(0, halfCount); // Take half

  // Apply pagination
  const paginatedEvents = shuffledEvents.slice(offset, offset + limit);

  console.log(`🎯 Found ${paginatedEvents.length} randomized events for user ${userId} (${halfCount} total available)`);

  return { data: paginatedEvents, error: null };
};

// Validate if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// ML API integration for recommendations
async function getMLRecommendations(userId: string, preferences: string[] = []) {
  try {
    const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';
    
    // Get all events data for the ML model
    const supabase = await createClient();
    
    // Get all current events
    const { data: allEvents } = await supabase
      .from('events')
      .select('id, title, description, category, tags, latitude, longitude, start_time, end_time, user_id')
      .gt('end_time', new Date().toISOString())
      .order('created_at', { ascending: false });

    // Get all user interactions
    const { data: allInteractions } = await supabase
      .from('user_event_interactions')
      .select('user_id, event_id, interaction_type, created_at');

    // Get all users with their preferences (for collaborative filtering)
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, preferences');

    console.log(`📊 Sending ML API: ${allEvents?.length || 0} events, ${allInteractions?.length || 0} interactions, ${allUsers?.length || 0} users`);

    // Create a promise that will timeout after 2 seconds
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('ML API timeout')), 2000)
    );

    const apiPromise = fetch(`${ML_API_URL}/recommend-events`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        preferences: preferences || [],
        limit: 20,
        // Send all the data the ML model needs
        events: allEvents || [],
        interactions: allInteractions || [],
        users: allUsers || []
      }),
    });

    // Race between API call and timeout
    const response = await Promise.race([apiPromise, timeoutPromise]);

    if (!response.ok) {
      console.warn(`ML API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.warn('ML API error details:', errorText);
      return null;
    }

    const data = await response.json();
    console.log(`🤖 ML API returned ${data.recommended_events?.length || 0} recommendations`);
    
    // Validate that recommendations have proper UUIDs
    const validRecommendations = (data.recommended_events || []).filter((rec: any) => {
      if (!rec.event_id || typeof rec.event_id !== 'string') {
        console.warn(`Invalid event_id format: ${rec.event_id}`);
        return false;
      }
      
      if (!isValidUUID(rec.event_id)) {
        console.warn(`Invalid UUID format: ${rec.event_id}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Filtered to ${validRecommendations.length} valid recommendations`);
    return validRecommendations;
  } catch (error) {
    if (error instanceof Error && error.message === 'ML API timeout') {
      console.log('⏰ ML API timeout after 2s, will use rule-based fallback');
    } else {
      console.warn('ML API error, will use rule-based fallback:', error);
    }
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Get current user (more secure than getSession)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's interaction history
    const { data: interactions } = await supabase
      .from('user_event_interactions')
      .select('event_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get user's profile preferences first
    const { data: userProfile } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    // Get categories from interacted events as secondary preferences
    const interactedEventIds = interactions?.map(i => i.event_id) || [];
    const { data: interactedEvents } = await supabase
      .from('events')
      .select('category')
      .in('id', interactedEventIds);

    // Count category preferences from interactions
    const categoryPreferences = (interactedEvents || []).reduce((acc: Record<string, number>, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {});

    // Get preferred categories (combine profile + interaction preferences)
    const interactionPreferences = Object.entries(categoryPreferences)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category);
    
    const preferredCategories = [
      ...(userProfile?.preferences || []),  // User's explicit preferences first
      ...interactionPreferences             // Then interaction-based preferences
    ].filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates

    // Try ML recommendations first
    const mlRecommendations = await getMLRecommendations(user.id, preferredCategories);
    
    let events;
    let error = null;

    if (mlRecommendations && mlRecommendations.length > 0) {
      // Use ML-powered recommendations
      console.log(`🤖 Using ML recommendations for user ${user.id}`);
      
      // Extract valid event IDs
      const validEventIds = mlRecommendations.map((r: any) => r.event_id);

      try {
        // Get actual event data from Supabase based on ML recommendations
        const { data: mlEvents, error: mlError } = await supabase
          .from('events')
          .select(`
            *,
            creator:user_id (
              display_name,
              graduation_year
            )
          `)
          .in('id', validEventIds)
          .gt('end_time', new Date().toISOString())
          .range(offset, offset + limit - 1);

        events = mlEvents || [];
        error = mlError;
        
        if (mlError) {
          console.error('Error fetching ML recommended events:', mlError);
          throw mlError;
        }
      } catch (mlError) {
        console.error('Error fetching personalized events:', mlError);
        // Fall through to rule-based recommendations
        events = [];
      }

      // If we don't have enough ML events, supplement with rule-based
      if (events.length < limit) {
        const remainingLimit = limit - events.length;
        const { data: fallbackEvents } = await supabase
          .from('events')
          .select(`
            *,
            creator:user_id (
              display_name,
              graduation_year
            )
          `)
          .gt('end_time', new Date().toISOString())
          .not('id', 'in', events.map((e: any) => e.id))
          .order('view_count', { ascending: false })
          .limit(remainingLimit);

        if (fallbackEvents) {
          events.push(...fallbackEvents);
        }
      }
    } else {
      // Use rule-based recommendations
      const result = await getRuleBasedRecommendations(supabase, user.id, preferredCategories, interactedEventIds, limit, offset);
      events = result.data || [];
      error = result.error;
    }

    if (error) {
      console.error('Error fetching personalized events:', error);
      return NextResponse.json({ 
        events: [], 
        error: 'Failed to fetch events',
        fallback: true 
      }, { status: 500 });
    }

    // If not enough events from preferred categories, fetch more events
    if (events.length < limit) {
      const remainingLimit = limit - events.length;
      const { data: additionalEvents } = await supabase
        .from('events')
        .select(`
          *,
          creator:user_id (
            display_name,
            graduation_year
          )
        `)
        .gt('end_time', new Date().toISOString())
        .not('id', 'in', events.map((e: any) => e.id))
        .order('view_count', { ascending: false })
        .limit(remainingLimit);

      if (additionalEvents) {
        events.push(...additionalEvents);
      }
    }

    return NextResponse.json({ events: events || [] });
  } catch (error: any) {
    console.error('Error in for-you events route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 