import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { type, metadata = {} } = await request.json();
    const { id: eventId } = await params;

    console.log('Interaction API called with:', { type, eventId });

    // Validate interaction type
    const validTypes = ['view', 'click', 'bookmark', 'share', 'attend'];
    if (!validTypes.includes(type)) {
      console.error('Invalid interaction type:', type);
      return Response.json({ error: 'Invalid interaction type' }, { status: 400 });
    }

    // Get user ID from session using server client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // For view interactions, always increment the view count regardless of auth status
    if (type === 'view') {
      const { error: viewError } = await supabase.rpc('increment_view_count', {
        event_id: eventId
      });

      if (viewError) {
        console.error('Error incrementing view count:', viewError);
      }
    }

    // If user is not authenticated, only allow view interactions
    if (authError || !user?.id) {
      if (type === 'view') {
        // View interactions are allowed for unauthenticated users
        console.log('View interaction processed for unauthenticated user');
        return Response.json({ success: true });
      } else {
        // Other interactions require authentication
        console.log('Auth required for interaction type:', type);
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    const userId = user.id;
    console.log('User ID:', userId);

    // Track interaction for authenticated users
    console.log('Attempting to save interaction:', { userId, eventId, type });
    
    // Use upsert for all interactions to handle duplicates gracefully
    const { data: upsertData, error: upsertError } = await supabase
      .from('user_event_interactions')
      .upsert({
        user_id: userId,
        event_id: eventId,
        interaction_type: type
      }, {
        onConflict: 'user_id,event_id,interaction_type'
      })
      .select();

    if (upsertError) {
      console.error('Error upserting interaction:', upsertError);
      // Don't fail the request for interaction tracking errors, just log them
      if (upsertError.code === '23505') {
        console.log('Duplicate interaction ignored');
        return Response.json({ success: true });
      }
      return Response.json({ error: 'Failed to save interaction', details: upsertError }, { status: 500 });
    }

    console.log('Successfully tracked interaction:', upsertData);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error processing interaction:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { type } = await request.json();
    const { id: eventId } = await params;

    console.log('Interaction DELETE API called with:', { type, eventId });

    // Validate interaction type
    const validTypes = ['bookmark', 'attend'];
    if (!validTypes.includes(type)) {
      console.error('Invalid interaction type for deletion:', type);
      return Response.json({ error: 'Invalid interaction type' }, { status: 400 });
    }

    // Get user ID from session using server client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user?.id) {
      console.log('Auth required for interaction deletion');
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    console.log('Attempting to delete interaction:', { userId, eventId, type });

    // Delete the interaction
    const { error: deleteError } = await supabase
      .from('user_event_interactions')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('interaction_type', type);

    if (deleteError) {
      console.error('Error deleting interaction:', deleteError);
      return Response.json({ error: 'Failed to delete interaction', details: deleteError }, { status: 500 });
    }

    console.log('Successfully deleted interaction');
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error processing interaction deletion:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
} 