import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock_key';

export async function POST(req: Request) {
  try {
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

    // Retrieve user settings from profiles to get the stripe customer ID
    const { data: profile, error: dbError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (dbError || !profile?.stripe_customer_id) {
      console.error('❌ Error fetching profile or customer ID is missing:', dbError?.message);
      return new NextResponse('Billing Error: No active subscription or customer ID found.', { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://bootube.app';

    // Create a Stripe Customer Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('❌ Stripe Customer Portal creation failed:', err.message);
    return new NextResponse(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
