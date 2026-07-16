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

    const origin = req.headers.get('origin') || 'https://bootube.app';
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      console.error('❌ STRIPE_PRICE_ID environment variable is missing.');
      return new NextResponse('Internal Server Error: Price ID configuration missing.', { status: 500 });
    }

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      client_reference_id: user.id,
      success_url: `${origin}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('❌ Stripe Checkout Session creation failed:', err.message);
    return new NextResponse(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
