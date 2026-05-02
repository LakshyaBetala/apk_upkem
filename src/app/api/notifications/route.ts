import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { order_id, phone, status, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    // STUB: WhatsApp API Integration
    // To implement a real WhatsApp API, replace this console.log with a fetch call
    // to your provider (e.g., Meta Cloud API, Interakt, Twilio).
    
    console.log('\n=======================================');
    console.log(`📱 [WHATSAPP STUB] Sending message to ${phone}`);
    if (order_id) console.log(`   Order ID: ${order_id}`);
    if (status) console.log(`   Status: ${status}`);
    console.log(`   Message: ${message}`);
    console.log('=======================================\n');

    return NextResponse.json({ success: true, delivered: true });
  } catch (err) {
    console.error('Notification Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
