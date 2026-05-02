const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

const userColumns = [
  'drug_license TEXT',
  'gst_number TEXT',
  'registration_number TEXT',
  'address TEXT',
  'email TEXT',
  'user_type TEXT'
];

const productColumns = [
  'price_ptr REAL',
  'mrp REAL',
  'packing TEXT',
  'description TEXT',
  'composition TEXT'
];

try {
  // Add columns to users
  userColumns.forEach(colDef => {
    try {
      const colName = colDef.split(' ')[0];
      db.exec(`ALTER TABLE users ADD COLUMN ${colDef};`);
      console.log(`Added ${colName} to users.`);
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log(`Column ${colDef.split(' ')[0]} already exists in users.`);
      } else {
        throw e;
      }
    }
  });

  // Add columns to products
  productColumns.forEach(colDef => {
    try {
      const colName = colDef.split(' ')[0];
      db.exec(`ALTER TABLE products ADD COLUMN ${colDef};`);
      console.log(`Added ${colName} to products.`);
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log(`Column ${colDef.split(' ')[0]} already exists in products.`);
      } else {
        throw e;
      }
    }
  });

  // Create Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_phone TEXT NOT NULL,
      device_info TEXT,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_phone) REFERENCES users(phone)
    );
  `);
  console.log('Created sessions table.');

  // Create Invoices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_phone TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'Unpaid',
      due_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(user_phone) REFERENCES users(phone)
    );
  `);
  console.log('Created invoices table.');

  console.log('B2B Migration Complete!');
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
