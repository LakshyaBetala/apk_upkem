import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const users = db.prepare('SELECT id, phone, store_name, is_approved, role, credit_balance, credit_limit, created_at FROM users').all();
    const products = db.prepare('SELECT * FROM products').all();
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    
    // Join order items
    const populatedOrders = orders.map(order => {
      const items = db.prepare(`
        SELECT oi.*, p.name, p.company, p.category 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
      `).all(order.id);
      
      // format items to match frontend expectations
      const formattedItems = items.map(item => ({
        id: item.product_id,
        name: item.name,
        company: item.company,
        category: item.category,
        quantity: item.quantity,
        price: item.price_at_time
      }));

      return {
        ...order,
        items: formattedItems
      };
    });

    return NextResponse.json({
      users,
      products,
      orders: populatedOrders
    });
  } catch (err) {
    console.error('DB Read Error:', err);
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { collection, item, action } = body;

    if (collection === 'orders' && action === 'create') {
      const insertOrder = db.prepare(`
        INSERT INTO orders (id, user_phone, store_name, status, total, date)
        VALUES (@id, @phone, @store, @status, @total, @date)
      `);
      
      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
        VALUES (@order_id, @product_id, @quantity, @price_at_time)
      `);
      
      const updateUserCredit = db.prepare(`
        UPDATE users SET credit_balance = credit_balance + @total WHERE phone = @phone OR store_name = @store
      `);

      const createOrderTransaction = db.transaction((orderData) => {
        insertOrder.run({
          id: orderData.id,
          phone: orderData.phone,
          store: orderData.store,
          status: 'Placed',
          total: orderData.total,
          date: orderData.date
        });

        for (const i of orderData.items) {
          insertOrderItem.run({
            order_id: orderData.id,
            product_id: i.id,
            quantity: i.quantity,
            price_at_time: i.price
          });
        }

        updateUserCredit.run({ total: orderData.total, phone: orderData.phone, store: orderData.store });
      });

      createOrderTransaction(item);
      return NextResponse.json({ success: true });
    } 
    else if (collection === 'orders' && action === 'update_status') {
      const getOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(item.id);
      if (!getOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

      const updateOrder = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
      const refundCredit = db.prepare('UPDATE users SET credit_balance = MAX(0, credit_balance - ?) WHERE phone = ? OR store_name = ?');
      const deductStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      
      const getItems = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(item.id);

      const updateStatusTransaction = db.transaction(() => {
        // Stock reduction when accepted
        if (item.status === 'Accepted' && getOrder.status === 'Placed') {
          for (const i of getItems) {
            deductStock.run(i.quantity, i.product_id);
          }
        }
        
        // Credit refund when rejected
        if (item.status === 'Rejected' && getOrder.status === 'Placed') {
          refundCredit.run(getOrder.total, getOrder.user_phone, getOrder.store_name);
        }

        updateOrder.run(item.status, item.id);
      });

      updateStatusTransaction();
      return NextResponse.json({ success: true });
    }
    else if (action === 'raw_override') {
      // Powerful sync override from dashboard - Re-implementing for SQLite
      // Note: Only users updates are implemented from the old codebase raw_override
      if (body.db && body.db.users) {
        const updateApprove = db.prepare('UPDATE users SET is_approved = ? WHERE phone = ?');
        const overrideTransaction = db.transaction((users) => {
          for (const u of users) {
            updateApprove.run(u.is_approved ? 1 : 0, u.phone);
          }
        });
        overrideTransaction(body.db.users);
        return NextResponse.json({ success: true });
      }
    }
    else if (action === 'add_product') {
      const insertProduct = db.prepare(`
        INSERT INTO products (name, company, category, body_system, price, stock)
        VALUES (@name, @company, @category, @body_system, @price, @stock)
      `);
      insertProduct.run({
        name: item.name,
        company: item.company,
        category: item.category,
        body_system: item.body_system || 'General',
        price: item.price,
        stock: item.stock
      });
      return NextResponse.json({ success: true });
    }
    else if (action === 'update_stock') {
      const { productId, changeAmount } = body;
      db.prepare('UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?').run(changeAmount, productId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('DB Write Error:', err);
    return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
  }
}
