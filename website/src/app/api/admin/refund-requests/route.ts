import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock_key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock_key';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized: Missing bearer token', { status: 401 });
    }

    const token = authHeader.substring(7);

    // Create RLS client to verify credentials
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new NextResponse(`Unauthorized: ${authError?.message || 'Invalid session'}`, { status: 401 });
    }

    // Security Gate: Verify admin identity
    if (user.email !== 'brad.griffin@mythic-makers.com') {
      return new NextResponse('Forbidden: Access denied', { status: 403 });
    }

    // Fetch refund requests ordered by created_at DESC
    const { data: requests, error: queryError } = await supabaseAdmin
      .from('refund_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('❌ Failed to fetch refund requests:', queryError.message);
      return new NextResponse(`Internal Server Error: ${queryError.message}`, { status: 500 });
    }

    // Fetch autopilot status
    let autopilotEnabled = false;
    try {
      const { data: autopilot } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'autopilot')
        .single();
      autopilotEnabled = autopilot?.value?.enabled || false;
    } catch (e: any) {
      console.error('❌ Failed to read autopilot setting:', e.message);
    }

    return NextResponse.json({ requests, autopilot: autopilotEnabled });
  } catch (err: any) {
    console.error('❌ GET refund requests exception:', err.message);
    return new NextResponse(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
