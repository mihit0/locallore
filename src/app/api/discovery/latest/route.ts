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

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:user_id (
          display_name,
          graduation_year
        )
      `)
      .gt('end_time', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching latest events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (error) {
    console.error('Error in latest events route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 