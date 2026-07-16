import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock_key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock_key';

// Admin supabase client to bypass RLS for write operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized: Missing bearer token', { status: 401 });
    }

    const token = authHeader.substring(7);

    // Create RLS supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new NextResponse(`Unauthorized: ${authError?.message || 'Invalid session'}`, { status: 401 });
    }

    // Fetch user profile and custom list stats
    const { data: profile, error: dbError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, subscription_status, custom_filter_words')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      console.error('❌ Error fetching profile:', dbError?.message);
      return new NextResponse('Profile not found', { status: 404 });
    }

    const { request_type, reason_category, user_explanation } = await req.json();

    if (!request_type || !reason_category) {
      return new NextResponse('Missing request parameters', { status: 400 });
    }

    // Find active Stripe subscriptions
    let stripeSubscriptionId: string | null = null;
    let latestInvoiceId: string | null = null;

    if (profile.stripe_customer_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
        limit: 1,
      });
      if (subscriptions.data.length > 0) {
        stripeSubscriptionId = subscriptions.data[0].id;
        latestInvoiceId = subscriptions.data[0].latest_invoice as string;
      }
    }

    if (request_type === 'cancel_only') {
      // Option A: Just cancel auto-renew
      if (stripeSubscriptionId) {
        await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }

      // Log the cancellation feedback
      const { error: insertErr } = await supabaseAdmin
        .from('refund_requests')
        .insert({
          user_id: user.id,
          email: user.email,
          request_type: 'cancel_only',
          reason_category,
          user_explanation,
          status: 'approved', // Immediately active/approved cancellation
        });

      if (insertErr) {
        console.error('❌ Error logging cancellation request:', insertErr.message);
      }

      // Fire cancellation email
      try {
        await resend.emails.send({
          from: 'BooTube <onboarding@resend.dev>',
          to: user.email || '',
          subject: 'BooTube Membership Cancellation Confirmation',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
              <h2 style="color: #06b6d4;">Auto-Renewal Cancelled</h2>
              <p>Hi,</p>
              <p>We've successfully cancelled the auto-renewal on your BooTube Premium subscription.</p>
              <p>Your premium access will remain active until the end of your current billing period. You will not be charged again.</p>
              <p>Thank you for using BooTube! If you ever change your mind, you can reactivate premium anytime.</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af;">BooTube, Utah, USA</p>
            </div>
          `,
        });
      } catch (e: any) {
        console.error('❌ Resend failed to send cancellation confirmation:', e.message);
      }

      return NextResponse.json({ success: true, option: 'cancel_only' });
    } else {
      // Option B: Cancel immediately & request refund
      if (stripeSubscriptionId) {
        // Cancel Stripe subscription immediately
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      }

      // Demote user profile in Supabase to free
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'free' })
        .eq('id', user.id);

      if (updateErr) {
        console.error('❌ Error demoting profile:', updateErr.message);
      }

      // Trigger Gemini AI Claim Evaluation
      let aiAssessmentObj = null;

      try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey) {
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          const wordCount = Array.isArray(profile.custom_filter_words) 
            ? profile.custom_filter_words.length 
            : 0;

          const promptText = `
You are an expert claims investigator evaluating a refund request for a BooTube ($3.99/mo) premium subscription.
Verify eligibility against the following rules:
- LEGITIMATE CLAIMS (High-Confidence Approve): Technical failure (user reports specific site errors/bugs), double upgrade, accidental purchase requested within 7 days.
- INVALID CLAIMS (Low-Confidence Reject): User used the product heavily (has over 20 custom words), or states "I just don't want it anymore" after a long period of use.

USER TELEMETRY:
- User Email: ${user.email}
- Custom blocked words count: ${wordCount}
- Cancellation feedback category: ${reason_category}
- Detailed user explanation notes: "${user_explanation}"

Respond ONLY with a valid JSON object matching the following structure:
{
  "recommendation": "approve" | "reject",
  "confidence": <number between 0 and 1>,
  "justification": "<one-sentence reasoning explaining why>"
}
`;

          const result = await model.generateContent(promptText);
          const responseText = result.response.text();
          
          // Parse JSON strictly
          const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          aiAssessmentObj = JSON.parse(cleanedText);
        }
      } catch (e: any) {
        console.error('❌ Gemini analysis failed:', e.message);
      }

      // Log request to database
      const { data: requestRecord, error: insertErr } = await supabaseAdmin
        .from('refund_requests')
        .insert({
          user_id: user.id,
          email: user.email,
          request_type: 'cancel_and_refund',
          reason_category,
          user_explanation,
          status: 'pending',
          ai_assessment: aiAssessmentObj,
        })
        .select()
        .single();

      if (insertErr) {
        console.error('❌ Error logging refund request:', insertErr.message);
      }

      // Retrieve Autopilot configuration
      let autopilotEnabled = false;
      try {
        const { data: settings } = await supabaseAdmin
          .from('site_settings')
          .select('value')
          .eq('key', 'autopilot')
          .single();
        if (settings?.value?.enabled) {
          autopilotEnabled = true;
        }
      } catch (e: any) {
        console.error('❌ Failed to retrieve Autopilot settings:', e.message);
      }

      // If autopilot is enabled and AI confidence is high for approval, auto-resolve
      if (autopilotEnabled && aiAssessmentObj?.recommendation === 'approve' && aiAssessmentObj?.confidence > 0.90) {
        let refunded = false;
        try {
          if (latestInvoiceId) {
            const retrieveInvoice = await stripe.invoices.retrieve(latestInvoiceId);
            const chargeId = (retrieveInvoice as any).charge as string;
            if (chargeId) {
              await stripe.refunds.create({ charge: chargeId });
              refunded = true;
            }
          }
        } catch (e: any) {
          console.error('❌ Stripe auto-refund failed:', e.message);
        }

        if (refunded && requestRecord) {
          // Update database request to approved
          await supabaseAdmin
            .from('refund_requests')
            .update({ status: 'approved', admin_notes: 'Auto-resolved by Gemini Autopilot.' })
            .eq('id', requestRecord.id);

          // Fire Refund Approved email
          try {
            await resend.emails.send({
              from: 'BooTube <onboarding@resend.dev>',
              to: user.email || '',
              subject: 'Refund Approved: BooTube Premium',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
                  <h2 style="color: #06b6d4;">Refund Approved & Processed</h2>
                  <p>Hi,</p>
                  <p>Your refund request has been approved and processed. Your payment of $3.99 has been refunded back to your payment card (takes 5-10 business days).</p>
                  <p>Your premium access has been deactivated immediately.</p>
                  <p>We appreciate your feedback and hope to see you back one day!</p>
                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #9ca3af;">BooTube, Utah, USA</p>
                </div>
              `,
            });
          } catch (e: any) {
            console.error('❌ Resend failed to send refund email:', e.message);
          }

          return NextResponse.json({ success: true, option: 'cancel_and_refund', autoResolved: true });
        }
      }

      // Normal Review Path: Queue claim & fire "Under Review" email
      try {
        await resend.emails.send({
          from: 'BooTube <onboarding@resend.dev>',
          to: user.email || '',
          subject: 'Refund Request Received: BooTube Premium',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
              <h2 style="color: #06b6d4;">Refund Request Under Review</h2>
              <p>Hi,</p>
              <p>We've received your refund request for your BooTube Premium subscription cancellation.</p>
              <p>Our claims team is currently reviewing your request against our policy. You will receive another email within 2-3 business days confirming approval or rejection.</p>
              <p>Your premium access has been deactivated immediately.</p>
              <p>Thank you for your patience!</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af;">BooTube, Utah, USA</p>
            </div>
          `,
        });
      } catch (e: any) {
        console.error('❌ Resend failed to send under review email:', e.message);
      }

      return NextResponse.json({ success: true, option: 'cancel_and_refund', autoResolved: false });
    }
  } catch (err: any) {
    console.error('❌ Cancellation route exception:', err.message);
    return new NextResponse(`Internal Server Error: ${err.message}`, { status: 500 });
  }
}
