import Database from 'better-sqlite3';
import path from 'path';

// Path to the SQLite database file
const dbPath = path.resolve(process.cwd(), 'database.sqlite');

// Initialize the database connection
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Function to initialize the schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      store_name TEXT NOT NULL,
      is_approved BOOLEAN DEFAULT 0,
      role TEXT DEFAULT 'client',
      password_hash TEXT,
      credit_balance REAL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      category TEXT NOT NULL,
      body_system TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_phone TEXT NOT NULL,
      store_name TEXT NOT NULL,
      status TEXT DEFAULT 'Placed',
      total REAL NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_phone) REFERENCES users(phone)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price_at_time REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);
}

export default db;
