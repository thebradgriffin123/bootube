import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock_key'
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;
        const userId = subscription.metadata?.userId;

        const updateData: any = {
          subscription_status: status === 'active' || status === 'trialing' ? 'active' : status,
          updated_at: new Date().toISOString(),
          stripe_customer_id: customerId,
        };

        if (userId) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('stripe_customer_id', customerId);
          if (error) throw error;
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = subscription.metadata?.userId;

        const updateData: any = {
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        };

        if (userId) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('stripe_customer_id', customerId);
          if (error) throw error;
        }
        break;
      }
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const customerId = checkoutSession.customer as string;
        const userId = checkoutSession.client_reference_id;

        if (userId) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
          if (error) throw error;
        }
        break;
      }
    }
  } catch (err: any) {
    console.error(`❌ DB Sync Error for webhook event ${event.type}:`, err.message);
    return new NextResponse('Webhook handler failed', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
