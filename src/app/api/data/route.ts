import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data.json');

// Helper to reliably read db
const readDB = () => {
  const fileConfig = fs.readFileSync(dataFilePath, 'utf8');
  return JSON.parse(fileConfig);
};

// Helper to reliably write db
const writeDB = (data: any) => {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
};

export async function GET() {
  try {
    const data = readDB();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { collection, item, action } = body;
    
    const db = readDB();

    if (collection === 'orders' && action === 'create') {
      db.orders.unshift(item); // Add newest order to start
      
      // Also deduct from the mobile user's available credit balance:
      const matchedUserIndex = db.users.findIndex((u: any) => u.store_name === item.store || u.phone === item.phone);
      if (matchedUserIndex !== -1) {
         db.users[matchedUserIndex].credit_balance += item.total;
      }
    } 
    else if (collection === 'orders' && action === 'update_status') {
      const order = db.orders.find((o: any) => o.id === item.id);
      if (order) {
        // Phase 16: Mathematical physical inventory constraint bridging
        if (item.status === 'Accepted' && order.status === 'Placed') {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((orderedItem: any) => {
              const productIndex = db.products.findIndex((p: any) => p.id === orderedItem.id);
              if (productIndex !== -1) {
                 db.products[productIndex].stock -= orderedItem.quantity;
              }
            });
          }
        }
        
        // Handling Rejection
        if (item.status === 'Rejected' && order.status === 'Placed') {
           // Refund the credit utilization since the order was killed
           const matchedUserIndex = db.users.findIndex((u: any) => u.store_name === order.store);
           if (matchedUserIndex !== -1) {
              db.users[matchedUserIndex].credit_balance = Math.max(0, db.users[matchedUserIndex].credit_balance - order.total);
           }
        }

        order.status = item.status;
      }
    }
    else if (action === 'raw_override') {
      // Powerful sync override from dashboard
      if (body.db) {
         writeDB(body.db);
         return NextResponse.json({ success: true });
      }
    }
    else if (action === 'add_product') {
      const newId = db.products.length > 0 ? Math.max(...db.products.map((p: any) => p.id)) + 1 : 1;
      const newProduct = {
        id: newId,
        ...item
      };
      db.products.push(newProduct);
    }
    else if (action === 'update_stock') {
      const { productId, changeAmount } = body;
      const productIndex = db.products.findIndex((p: any) => p.id === productId);
      if (productIndex !== -1) {
        db.products[productIndex].stock = Math.max(0, db.products[productIndex].stock + changeAmount);
      }
    }

    writeDB(db);
    return NextResponse.json({ success: true, db });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
  }
}
