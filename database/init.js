const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname(process.env.DB_PATH || './database/orders.db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(process.env.DB_PATH || './database/orders.db');

// Initialize database tables
db.serialize(() => {
  // Customers table
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE NOT NULL,
      name TEXT,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      sku TEXT UNIQUE,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      status TEXT DEFAULT 'pending',
      total_amount DECIMAL(10,2) DEFAULT 0,
      items TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    )
  `);

  // Messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      message_type TEXT NOT NULL,
      content TEXT NOT NULL,
      direction TEXT NOT NULL,
      processed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert sample products
  const sampleProducts = [
    ['Pizza Margherita', 'Classic pizza with tomato, mozzarella, and basil', 12.99, 50, 'PIZZA-001'],
    ['Cheeseburger', 'Beef patty with cheese, lettuce, and tomato', 8.99, 30, 'BURGER-001'],
    ['Caesar Salad', 'Fresh romaine lettuce with Caesar dressing', 7.99, 25, 'SALAD-001'],
    ['Pasta Carbonara', 'Creamy pasta with bacon and parmesan', 14.99, 20, 'PASTA-001']
  ];

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (name, description, price, stock_quantity, sku)
    VALUES (?, ?, ?, ?, ?)
  `);

  sampleProducts.forEach(product => {
    insertProduct.run(product);
  });

  insertProduct.finalize();

  console.log('✅ Database initialized successfully');
});

module.exports = db;