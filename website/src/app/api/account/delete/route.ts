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

export async function DELETE(req: Request) {
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

    // Retrieve profile to fetch Stripe customer ID before deletion
    const { data: profile, error: dbError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // Ignore row-not-found errors
      console.error('❌ Error fetching profile for deletion:', dbError.message);
    }

    // Cancel any active subscriptions on Stripe immediately
    if (profile?.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active',
        });
        for (const sub of subscriptions.data) {
          await stripe.subscriptions.cancel(sub.id);
          console.log(`☁️ [Delete Account] Cancelled subscription ${sub.id}`);
        }
      } catch (stripeErr: any) {
        console.error('⚠️ Failed to cancel Stripe subscriptions on account deletion:', stripeErr.message);
      }
    }

    // Delete user from Supabase Auth (cascades automatically to public.profiles)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('❌ Supabase Admin deleteUser failed:', deleteError.message);
      return new NextResponse(`Delete Error: ${deleteError.message}`, { status: 500 });
    }

    console.log(`👤 [Delete Account] Successfully deleted user ID ${user.id} (${user.email})`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Account deletion failed:', err.message);
    return new NextResponse(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
