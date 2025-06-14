import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { type } = await request.json();
    const eventId = params.id;
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Track interaction for logged-in users
    if (userId) {
      const { error: interactionError } = await supabase
        .from('user_event_interactions')
        .upsert({
          user_id: userId,
          event_id: eventId,
          interaction_type: type,
        }, {
          onConflict: 'user_id,event_id,interaction_type'
        });

      if (interactionError) {
        console.error('Error tracking interaction:', interactionError);
      }
    }

    // Increment view count for all users
    if (type === 'view') {
      const { error: viewError } = await supabase.rpc('increment_view_count', {
        event_id: eventId
      });

      if (viewError) {
        console.error('Error incrementing view count:', viewError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in event interaction route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 