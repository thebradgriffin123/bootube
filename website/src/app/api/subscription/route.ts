import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock_key';

export async function GET(req: Request) {
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

    // Retrieve user settings from profiles
    const { data: profile, error: dbError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (dbError) {
      console.error('❌ Error fetching profile:', dbError.message);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    const isPremium = profile?.subscription_status === 'active';

    if (!isPremium || !profile?.stripe_customer_id) {
      return NextResponse.json({ plan: 'free' });
    }

    // Query active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ 
        plan: 'premium',
        nextPayment: 'N/A',
        amount: '$3.99/mo',
        autoRenew: false 
      });
    }

    const sub = subscriptions.data[0] as any;
    const currentPeriodEnd = sub.current_period_end;
    const nextPaymentDate = new Date(currentPeriodEnd * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const item = sub.items.data[0] as any;
    const amount = item?.price?.unit_amount ? (item.price.unit_amount / 100).toFixed(2) : '3.99';
    const currency = item?.price?.currency ? item.price.currency.toUpperCase() : 'USD';
    const interval = item?.price?.recurring?.interval ? `/${item.price.recurring.interval}` : '/mo';

    return NextResponse.json({
      plan: 'premium',
      nextPayment: nextPaymentDate,
      amount: `$${amount} ${currency}${interval}`,
      autoRenew: !sub.cancel_at_period_end,
    });
  } catch (err: any) {
    console.error('❌ Stripe subscription status retrieval failed:', err.message);
    return new NextResponse(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
