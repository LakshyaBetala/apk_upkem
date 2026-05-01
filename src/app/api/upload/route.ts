import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as XLSX from 'xlsx';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'products' or 'users'

    if (!file || !type) {
      return NextResponse.json({ error: 'File and type are required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    let added = 0;

    if (type === 'products') {
      const insertProduct = db.prepare(`
        INSERT INTO products (name, company, category, body_system, price, stock)
        VALUES (@name, @company, @category, @body_system, @price, @stock)
      `);
      
      const bulkInsert = db.transaction((items) => {
        for (const item of items) {
          insertProduct.run({
            name: item.name || 'Unknown Item',
            company: item.company || 'Unknown',
            category: item.category || 'General',
            body_system: item.body_system || 'General',
            price: Number(item.price) || 0,
            stock: Number(item.stock) || 0
          });
          added++;
        }
      });
      bulkInsert(data);
    } 
    else if (type === 'users') {
      const insertUser = db.prepare(`
        INSERT INTO users (phone, store_name, is_approved, credit_balance, credit_limit, role, password_hash)
        VALUES (@phone, @store_name, @is_approved, @credit_balance, @credit_limit, @role, @password_hash)
      `);

      const defaultPassword = bcrypt.hashSync('123456', 10);

      const bulkInsert = db.transaction((items) => {
        for (const item of items) {
          // ensure phone is string
          const phone = item.phone ? item.phone.toString() : null;
          if (!phone) continue;

          // Check if exists
          const existing = db.prepare('SELECT 1 FROM users WHERE phone = ?').get(phone);
          if (!existing) {
             insertUser.run({
              phone: phone,
              store_name: item.store_name || 'Unknown Store',
              is_approved: String(item.is_approved).toLowerCase() === 'true' ? 1 : 0,
              credit_balance: Number(item.credit_balance) || 0,
              credit_limit: Number(item.credit_limit) || 0,
              role: item.role || 'client',
              password_hash: defaultPassword
            });
            added++;
          }
        }
      });
      bulkInsert(data);
    } else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, added });
  } catch (err) {
    console.error('Upload Error:', err);
    return NextResponse.json({ error: 'Failed to process Excel upload' }, { status: 500 });
  }
}
