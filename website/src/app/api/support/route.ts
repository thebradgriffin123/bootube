import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey || 're_mock');

export async function POST(req: Request) {
  try {
    const { ticketId, name, email, platform, description } = await req.json();

    if (!name || !email || !platform || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!resendApiKey || resendApiKey === 're_mock') {
      return NextResponse.json({ success: true, sentViaEmail: false });
    }

    await resend.emails.send({
      from: 'BooTube Support <onboarding@resend.dev>',
      to: 'support@mythic-makers.com',
      replyTo: email,
      subject: `BooTube Support Request [${ticketId}] - ${String(platform).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #06b6d4;">New Support Ticket #${ticketId}</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Platform:</strong> ${String(platform).toUpperCase()}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p><strong>Issue Description:</strong></p>
          <p style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 8px;">${description}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, sentViaEmail: true });
  } catch (err: any) {
    console.error('Support API error:', err?.message || err);
    return NextResponse.json({ success: true, sentViaEmail: false });
  }
}
