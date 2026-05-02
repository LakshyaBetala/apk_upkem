import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      phone, store_name, user_type, drug_license, 
      gst_number, registration_number, address, email 
    } = data;

    if (!phone || !store_name || !user_type) {
      return NextResponse.json({ error: 'Phone, Store Name, and User Type are required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) {
      return NextResponse.json({ error: 'User with this phone number already exists' }, { status: 400 });
    }

    const defaultPassword = bcrypt.hashSync('123456', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (
        phone, store_name, is_approved, role, password_hash, 
        user_type, drug_license, gst_number, registration_number, address, email
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      phone, 
      store_name, 
      0, // is_approved = 0 (Pending Approval)
      'client',
      defaultPassword,
      user_type,
      drug_license || null,
      gst_number || null,
      registration_number || null,
      address || null,
      email || null
    );

    return NextResponse.json({ success: true, message: 'Registration successful. Pending approval.' });
  } catch (err) {
    console.error('Signup Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
