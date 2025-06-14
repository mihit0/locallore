import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { type } = await request.json();
    
    const supabase = await createClient();

    // Get current user (more secure than getSession)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // If no user session, that's okay for public interactions like view counts
    // We'll still increment view counts for anonymous users
    
    const userId = user?.id;

    // Track interaction for logged-in users
    if (userId) {
      try {
        // Use RPC function to handle user interactions with proper auth context
        const { error: interactionError } = await supabase.rpc('upsert_user_interaction', {
          p_user_id: userId,
          p_event_id: id,
          p_interaction_type: type
        });

        if (interactionError) {
          // Fallback to direct insert if RPC fails
          const { error: fallbackError } = await supabase
            .from('user_event_interactions')
            .upsert({
              user_id: userId,
              event_id: id,
              interaction_type: type,
            }, {
              onConflict: 'user_id,event_id,interaction_type'
            });
            
          if (fallbackError) {
            console.error('Failed to track user interaction:', fallbackError);
          }
        }
      } catch (error) {
        console.error('Unexpected error tracking interaction:', error);
      }
    }

    // Increment view count for all users (including anonymous)
    if (type === 'view') {
      const { error: viewError } = await supabase.rpc('increment_view_count', {
        event_id: id
      });

      if (viewError) {
        console.error('Failed to increment view count:', viewError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in event interaction route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 