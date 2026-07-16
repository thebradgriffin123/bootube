import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock_key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock_key';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: Request) {
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

    const { enabled } = await req.json();

    if (enabled === undefined) {
      return new NextResponse('Missing enabled parameter', { status: 400 });
    }

    // Persist autopilot settings in site_settings
    const { error: dbErr } = await supabaseAdmin
      .from('site_settings')
      .upsert({
        key: 'autopilot',
        value: { enabled: !!enabled },
      });

    if (dbErr) {
      console.error('❌ Failed to update autopilot settings:', dbErr.message);
      return new NextResponse(`Database error: ${dbErr.message}`, { status: 500 });
    }

    return NextResponse.json({ success: true, enabled: !!enabled });
  } catch (err: any) {
    console.error('❌ Autopilot config exception:', err.message);
    return new NextResponse(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
