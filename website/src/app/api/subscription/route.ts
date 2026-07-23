import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

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
    let { data: profile, error: dbError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (dbError && dbError.code === 'PGRST116') {
      // Profile row is missing. Create it using supabaseAdmin!
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          subscription_status: 'free',
          custom_filter_words: [],
          blur_screen_enabled: false,
          buffer_timer_seconds: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating missing profile in subscription check:', insertError.message);
        return new NextResponse('Internal Server Error', { status: 500 });
      }
      profile = newProfile;
      dbError = null;
    } else if (dbError) {
      console.error('❌ Error fetching profile:', dbError.message);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    let isPremium = profile?.subscription_status === 'active';
    let customerId = profile?.stripe_customer_id;

    // SELF-HEALING: If database profile says they are not premium, or missing Stripe ID,
    // check Stripe directly by their email to see if they have an active subscription!
    if ((!isPremium || !customerId) && user.email) {
      try {
        const stripeCustomers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });

        if (stripeCustomers.data.length > 0) {
          const stripeCustomer = stripeCustomers.data[0];
          const activeSubscriptions = await stripe.subscriptions.list({
            customer: stripeCustomer.id,
            status: 'active',
            limit: 1,
          });

          if (activeSubscriptions.data.length > 0) {
            // Customer has an active subscription in Stripe! Sync database immediately.
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .upsert({
                id: user.id,
                subscription_status: 'active',
                stripe_customer_id: stripeCustomer.id,
                updated_at: new Date().toISOString(),
              });

            if (!updateError) {
              console.log(`✅ Self-healed subscription for user ${user.email} (ID: ${user.id})`);
              isPremium = true;
              customerId = stripeCustomer.id;
            } else {
              console.error('❌ Failed to self-heal subscription database update:', updateError.message);
            }
          }
        }
      } catch (stripeErr: any) {
        console.error('⚠️ Stripe self-healing lookup failed:', stripeErr.message);
      }
    }

    if (!isPremium || !customerId) {
      return NextResponse.json({ plan: 'free' });
    }

    // Query active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
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
