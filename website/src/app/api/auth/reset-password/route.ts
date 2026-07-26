import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return new NextResponse('Missing email', { status: 400 });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(req.url).origin}/reset-password`,
    });

    if (error) {
      return new NextResponse(error.message, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return new NextResponse(err.message || 'Internal Server Error', { status: 500 });
  }
}
