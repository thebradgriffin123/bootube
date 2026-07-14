import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock_key';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized: Missing bearer token', { status: 401 });
  }

  const token = authHeader.substring(7);

  // Create a client with the user's specific JWT token so it respects RLS
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Fetch user information to verify the JWT
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return new NextResponse(`Unauthorized: ${authError?.message || 'Invalid session'}`, { status: 401 });
  }

  // Retrieve user settings from profiles
  const { data: profile, error: dbError } = await supabaseClient
    .from('profiles')
    .select('subscription_status, custom_filter_words, blur_screen_enabled, buffer_timer_seconds')
    .eq('id', user.id)
    .single();

  if (dbError) {
    console.error('❌ Error fetching profile:', dbError.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    profile: profile || {
      subscription_status: 'free',
      custom_filter_words: [],
      blur_screen_enabled: false,
      buffer_timer_seconds: 0,
    },
  });
}
