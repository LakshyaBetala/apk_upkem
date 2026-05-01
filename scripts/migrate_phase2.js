const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

try {
  // Add expo_push_token to users
  try {
    db.exec(`ALTER TABLE users ADD COLUMN expo_push_token TEXT;`);
    console.log('Added expo_push_token to users.');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('Column expo_push_token already exists.');
    } else {
      throw e;
    }
  }

  // Add courier_name to orders
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN courier_name TEXT;`);
    console.log('Added courier_name to orders.');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('Column courier_name already exists.');
    } else {
      throw e;
    }
  }

  // Add tracking_id to orders
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN tracking_id TEXT;`);
    console.log('Added tracking_id to orders.');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('Column tracking_id already exists.');
    } else {
      throw e;
    }
  }

  console.log('Phase 2 Migration Complete!');
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
