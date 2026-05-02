import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // In a real application, you would generate a random 4 or 6 digit OTP
    // and send it via an SMS gateway (like Twilio, MSG91, etc.)
    // Here we use a mock OTP "1234"
    const mockOtp = '1234';
    
    console.log(`[MOCK SMS] Sending OTP ${mockOtp} to ${phone}`);

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('OTP Generation Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
