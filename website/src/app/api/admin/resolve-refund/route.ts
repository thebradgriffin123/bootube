import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

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

    const { requestId, decision, adminNotes } = await req.json();

    if (!requestId || !decision) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Fetch the target refund request
    const { data: refundRequest, error: queryError } = await supabaseAdmin
      .from('refund_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (queryError || !refundRequest) {
      console.error('❌ Request not found:', queryError?.message);
      return new NextResponse('Refund request not found', { status: 404 });
    }

    // Retrieve user profile to find Stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', refundRequest.user_id)
      .single();

    if (decision === 'approved') {
      let stripeRefundSuccess = false;

      if (profile?.stripe_customer_id) {
        try {
          // List user invoices to find the latest charge ID
          const invoices = await stripe.invoices.list({
            customer: profile.stripe_customer_id,
            limit: 1,
          });

          if (invoices.data.length > 0) {
            const chargeId = (invoices.data[0] as any).charge as string;
            if (chargeId) {
              await stripe.refunds.create({ charge: chargeId });
              stripeRefundSuccess = true;
            }
          }
        } catch (stripeErr: any) {
          console.error('❌ Stripe refund failed:', stripeErr.message);
          return new NextResponse(`Stripe Refund Failed: ${stripeErr.message}`, { status: 500 });
        }
      }

      // Update request record status to approved
      const { error: updateErr } = await supabaseAdmin
        .from('refund_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes || 'Approved by administrator.',
        })
        .eq('id', requestId);

      if (updateErr) {
        console.error('❌ Failed to update request status:', updateErr.message);
        return new NextResponse('Database update failed', { status: 500 });
      }

      // Send approved confirmation email
      try {
        await resend.emails.send({
          from: 'BooTube <onboarding@resend.dev>',
          to: refundRequest.email,
          subject: 'Refund Approved: BooTube Premium',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
              <h2 style="color: #06b6d4;">Refund Request Approved</h2>
              <p>Hi,</p>
              <p>Your refund request has been approved by our administrator.</p>
              <p>A refund of $3.99 has been initiated back to your original payment card (takes 5-10 business days depending on your bank).</p>
              <p><strong>Admin Notes:</strong> ${adminNotes || 'Your request met our criteria.'}</p>
              <p>We appreciate your feedback and hope we can filter your streams again in the future.</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af;">BooTube, Utah, USA</p>
            </div>
          `,
        });
      } catch (e: any) {
        console.error('❌ Resend failed to send approved email:', e.message);
      }
    } else {
      // Rejecting the request
      const { error: updateErr } = await supabaseAdmin
        .from('refund_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || 'Rejected by administrator.',
        })
        .eq('id', requestId);

      if (updateErr) {
        console.error('❌ Failed to update request status:', updateErr.message);
        return new NextResponse('Database update failed', { status: 500 });
      }

      // Send rejection confirmation email
      try {
        await resend.emails.send({
          from: 'BooTube <onboarding@resend.dev>',
          to: refundRequest.email,
          subject: 'Refund Request Update: BooTube Premium',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
              <h2 style="color: #ef4444;">Refund Request Declined</h2>
              <p>Hi,</p>
              <p>Our claims team has finished reviewing your refund request.</p>
              <p>Unfortunately, your request does not meet our refund eligibility criteria at this time.</p>
              <p><strong>Reasoning:</strong> ${adminNotes || 'No specific explanation was provided.'}</p>
              <p>If you have any questions or feel this was in error, please contact our support team.</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af;">BooTube, Utah, USA</p>
            </div>
          `,
        });
      } catch (e: any) {
        console.error('❌ Resend failed to send rejected email:', e.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Resolve refund exception:', err.message);
    return new NextResponse(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
