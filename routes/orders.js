const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { v4: uuidv4 } = require('uuid');

// Get all orders
router.get('/', (req, res) => {
  db.all(`
    SELECT o.*, c.name as customer_name, c.phone_number 
    FROM orders o 
    LEFT JOIN customers c ON o.customer_id = c.id 
    ORDER BY o.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get order by ID
router.get('/:id', (req, res) => {
  const orderId = req.params.id;
  
  db.get(`
    SELECT o.*, c.name as customer_name, c.phone_number, c.address 
    FROM orders o 
    LEFT JOIN customers c ON o.customer_id = c.id 
    WHERE o.id = ?
  `, [orderId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(row);
  });
});

// Create new order
router.post('/', (req, res) => {
  const { customer_id, items, notes, total_amount } = req.body;
  const orderNumber = 'ORD-' + Date.now();

  db.run(`
    INSERT INTO orders (order_number, customer_id, items, notes, total_amount, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `, [orderNumber, customer_id, JSON.stringify(items), notes, total_amount], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      id: this.lastID,
      order_number: orderNumber,
      message: 'Order created successfully'
    });
  });
});

// Update order status
router.patch('/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  db.run(`
    UPDATE orders 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [status, orderId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    
    res.json({ message: 'Order status updated successfully' });
  });
});

module.exports = router;