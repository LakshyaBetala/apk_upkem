const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
console.log(`Connecting to database at ${dbPath}`);

const db = new Database(dbPath, { verbose: console.log });

try {
  db.exec('BEGIN TRANSACTION');

  console.log("Adding per_user_limit to schemes...");
  try {
    db.prepare("ALTER TABLE schemes ADD COLUMN per_user_limit INTEGER DEFAULT 1").run();
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('Column per_user_limit already exists in schemes.');
    } else {
      throw err;
    }
  }

  console.log("Adding scheme_code to orders...");
  try {
    db.prepare("ALTER TABLE orders ADD COLUMN scheme_code TEXT").run();
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('Column scheme_code already exists in orders.');
    } else {
      throw err;
    }
  }

  db.exec('COMMIT');
  console.log('Migration completed successfully.');
} catch (error) {
  db.exec('ROLLBACK');
  console.error('Migration failed:', error);
}

db.close();
