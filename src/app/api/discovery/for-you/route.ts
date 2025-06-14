import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    // Get categories from interacted events
    const interactedEventIds = interactions?.map(i => i.event_id) || [];
    const { data: interactedEvents } = await supabase
      .from('events')
      .select('category')
      .in('id', interactedEventIds);

    // Count category preferences
    const categoryPreferences = (interactedEvents || []).reduce((acc: Record<string, number>, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {});

    // Get preferred categories (sorted by interaction count)
    const preferredCategories = Object.entries(categoryPreferences)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category);

    // Fetch recommended events
    let query = supabase
      .from('events')
      .select(`
        *,
        creator:user_id (
          display_name,
          graduation_year
        )
      `)
      .gt('end_time', new Date().toISOString());

    // If user has preferences, prioritize those categories
    if (preferredCategories.length > 0) {
      query = query.in('category', preferredCategories);
    }

    const { data: events, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching personalized events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
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
        .not('id', 'in', events.map(e => e.id))
        .order('view_count', { ascending: false })
        .limit(remainingLimit);

      if (additionalEvents) {
        events.push(...additionalEvents);
      }
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error('Error in for-you events route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 