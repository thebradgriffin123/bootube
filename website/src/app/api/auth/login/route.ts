import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new NextResponse('Missing email or password', { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new NextResponse('Invalid email or password', { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return new NextResponse(err.message || 'Internal Server Error', { status: 500 });
  }
}
