const WhatsAppService = require('./whatsappService');
const db = require('../database/init');

class OrderProcessor {
  constructor() {
    this.customerSessions = new Map(); // Store customer session data
  }

  async processIncomingMessage(phoneNumber, messageText, messageType) {
    const normalizedMessage = messageText.toLowerCase().trim();

    try {
      // Handle different message types
      if (normalizedMessage === 'menu' || normalizedMessage === 'start') {
        await this.handleMenuRequest(phoneNumber);
      } else if (normalizedMessage === 'help') {
        await this.handleHelpRequest(phoneNumber);
      } else if (normalizedMessage.startsWith('track')) {
        await this.handleTrackingRequest(phoneNumber);
      } else if (this.isOrderMessage(normalizedMessage)) {
        await this.handleOrderMessage(phoneNumber, normalizedMessage);
      } else if (normalizedMessage === 'confirm' || normalizedMessage === 'yes') {
        await this.handleOrderConfirmation(phoneNumber);
      } else if (normalizedMessage === 'cancel' || normalizedMessage === 'no') {
        await this.handleOrderCancellation(phoneNumber);
      } else {
        await this.handleUnknownMessage(phoneNumber);
      }

      // Mark message as processed
      db.run(
        'UPDATE messages SET processed = 1 WHERE phone_number = ? AND content = ? AND processed = 0',
        [phoneNumber, messageText]
      );
    } catch (error) {
      console.error('❌ Error processing message:', error);
      await WhatsAppService.sendMessage(
        phoneNumber, 
        'Sorry, there was an error processing your request. Please try again or contact support.'
      );
    }
  }

  async handleMenuRequest(phoneNumber) {
    await this.ensureCustomerExists(phoneNumber);
    await WhatsAppService.sendMenu(phoneNumber);
  }

  async handleHelpRequest(phoneNumber) {
    const helpMessage = `
🤖 *How to Order*

1️⃣ Type MENU to see our menu
2️⃣ Order by typing item numbers: "1x2, 3x1"
3️⃣ Confirm your order when asked
4️⃣ Track with TRACK command

📞 Contact: ${process.env.BUSINESS_PHONE}
📧 Email: ${process.env.BUSINESS_EMAIL}

Type MENU to get started!
    `.trim();

    await WhatsAppService.sendMessage(phoneNumber, helpMessage);
  }

  async handleTrackingRequest(phoneNumber) {
    db.get(`
      SELECT o.*, c.phone_number 
      FROM orders o 
      JOIN customers c ON o.customer_id = c.id 
      WHERE c.phone_number = ? 
      ORDER BY o.created_at DESC 
      LIMIT 1
    `, [phoneNumber], async (err, order) => {
      if (err || !order) {
        await WhatsAppService.sendMessage(
          phoneNumber, 
          'No recent orders found. Type MENU to place an order!'
        );
        return;
      }

      const statusEmoji = {
        'pending': '⏳',
        'confirmed': '✅',
        'preparing': '👨‍🍳',
        'ready': '🎯',
        'delivered': '🚚',
        'cancelled': '❌'
      };

      const trackingMessage = `
📦 *Order Status*

📋 Order: ${order.order_number}
${statusEmoji[order.status]} Status: ${order.status.toUpperCase()}
💰 Total: $${order.total_amount}

${order.status === 'preparing' ? '⏰ Estimated time: 20-30 minutes' : ''}
${order.status === 'ready' ? '🎉 Your order is ready for pickup/delivery!' : ''}
      `.trim();

      await WhatsAppService.sendMessage(phoneNumber, trackingMessage);
    });
  }

  isOrderMessage(message) {
    // Check if message contains order pattern like "1x2, 3x1" or "1,2,3"
    const orderPattern = /\d+[x×]\d+|\d+[,\s]+\d+/;
    return orderPattern.test(message);
  }

  async handleOrderMessage(phoneNumber, message) {
    try {
      const items = this.parseOrderMessage(message);
      const orderSummary = await this.calculateOrder(items);
      
      // Store order in session
      this.customerSessions.set(phoneNumber, {
        items: orderSummary.items,
        total: orderSummary.total,
        timestamp: Date.now()
      });

      const confirmationMessage = `
🛒 *Order Summary*

${orderSummary.items.map(item => 
  `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
).join('\n')}

💰 *Total: $${orderSummary.total.toFixed(2)}*

Reply CONFIRM to place order or CANCEL to cancel.
      `.trim();

      await WhatsAppService.sendMessage(phoneNumber, confirmationMessage);
    } catch (error) {
      await WhatsAppService.sendMessage(
        phoneNumber,
        'Sorry, I couldn\'t understand your order. Please try again with format like "1x2, 3x1" or type MENU to see options.'
      );
    }
  }

  parseOrderMessage(message) {
    const items = [];
    
    // Handle patterns like "1x2, 3x1" or "1×2, 3×1"
    const itemMatches = message.match(/(\d+)[x×](\d+)/g);
    
    if (itemMatches) {
      itemMatches.forEach(match => {
        const [, itemId, quantity] = match.match(/(\d+)[x×](\d+)/);
        items.push({
          id: parseInt(itemId),
          quantity: parseInt(quantity)
        });
      });
    }
    
    return items;
  }

  async calculateOrder(items) {
    return new Promise((resolve, reject) => {
      const placeholders = items.map(() => '?').join(',');
      const itemIds = items.map(item => item.id);
      
      db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, itemIds, (err, products) => {
        if (err) {
          reject(err);
          return;
        }

        const orderItems = [];
        let total = 0;

        items.forEach(orderItem => {
          const product = products.find(p => p.id === orderItem.id);
          if (product) {
            const itemTotal = product.price * orderItem.quantity;
            orderItems.push({
              id: product.id,
              name: product.name,
              price: product.price,
              quantity: orderItem.quantity,
              total: itemTotal
            });
            total += itemTotal;
          }
        });

        resolve({ items: orderItems, total });
      });
    });
  }

  async handleOrderConfirmation(phoneNumber) {
    const session = this.customerSessions.get(phoneNumber);
    
    if (!session) {
      await WhatsAppService.sendMessage(
        phoneNumber,
        'No pending order found. Type MENU to start a new order.'
      );
      return;
    }

    try {
      // Get or create customer
      const customer = await this.ensureCustomerExists(phoneNumber);
      
      // Create order
      const orderNumber = 'ORD-' + Date.now();
      
      db.run(`
        INSERT INTO orders (order_number, customer_id, items, total_amount, status)
        VALUES (?, ?, ?, ?, 'confirmed')
      `, [orderNumber, customer.id, JSON.stringify(session.items), session.total], async function(err) {
        if (err) {
          console.error('Error creating order:', err);
          await WhatsAppService.sendMessage(
            phoneNumber,
            'Sorry, there was an error processing your order. Please try again.'
          );
          return;
        }

        // Clear session
        this.customerSessions.delete(phoneNumber);

        // Send confirmation
        await WhatsAppService.sendOrderConfirmation(phoneNumber, {
          orderNumber,
          items: session.items,
          total: session.total.toFixed(2)
        });
      }.bind(this));
    } catch (error) {
      console.error('Error confirming order:', error);
      await WhatsAppService.sendMessage(
        phoneNumber,
        'Sorry, there was an error confirming your order. Please try again.'
      );
    }
  }

  async handleOrderCancellation(phoneNumber) {
    this.customerSessions.delete(phoneNumber);
    await WhatsAppService.sendMessage(
      phoneNumber,
      '❌ Order cancelled. Type MENU to start a new order anytime!'
    );
  }

  async handleUnknownMessage(phoneNumber) {
    await WhatsAppService.sendMessage(
      phoneNumber,
      `I didn't understand that. Here are your options:

📋 MENU - View our menu
🛒 Order format: "1x2, 3x1" (item number x quantity)
📦 TRACK - Check order status
❓ HELP - Get help

What would you like to do?`
    );
  }

  async ensureCustomerExists(phoneNumber) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM customers WHERE phone_number = ?', [phoneNumber], (err, customer) => {
        if (err) {
          reject(err);
          return;
        }

        if (customer) {
          resolve(customer);
        } else {
          // Create new customer
          db.run(
            'INSERT INTO customers (phone_number) VALUES (?)',
            [phoneNumber],
            function(err) {
              if (err) {
                reject(err);
                return;
              }
              resolve({ id: this.lastID, phone_number: phoneNumber });
            }
          );
        }
      });
    });
  }
}

module.exports = new OrderProcessor();