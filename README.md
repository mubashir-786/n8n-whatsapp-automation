# WhatsApp N8N Order Automation

A complete WhatsApp automation system for order processing using n8n workflows, Node.js, and WhatsApp Business API.

## 🚀 Features

- **WhatsApp Integration**: Full WhatsApp Business API integration
- **n8n Workflows**: Visual workflow automation for order processing
- **Order Management**: Complete order lifecycle management
- **Customer Management**: Automatic customer data collection
- **Real-time Processing**: Instant message processing and responses
- **Menu System**: Dynamic menu display and ordering
- **Order Tracking**: Real-time order status tracking
- **Database Storage**: SQLite database for orders and customers

## 📋 Prerequisites

- Node.js 16+ installed
- WhatsApp Business API access
- Facebook Developer Account
- n8n installed globally

## ⚙️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Install n8n Globally

```bash
npm install n8n -g
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Fill in your WhatsApp Business API credentials:
- `WHATSAPP_ACCESS_TOKEN`: Your access token from Facebook Developer Console
- `WHATSAPP_PHONE_NUMBER_ID`: Your WhatsApp Business phone number ID
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: A secure token for webhook verification

### 4. Start the Application

```bash
# Start the Node.js server
npm start

# In another terminal, start n8n
n8n start
```

### 5. Configure WhatsApp Webhook

1. Go to Facebook Developer Console
2. Navigate to your WhatsApp app
3. Set webhook URL: `http://your-domain.com/webhook/whatsapp`
4. Set verify token: Use the same token from your `.env` file
5. Subscribe to message events

### 6. Import n8n Workflows

1. Open n8n at `http://localhost:5678`
2. Import the workflow from `n8n-workflows/whatsapp-order-automation.json`
3. Configure the webhook nodes with your server URL

## 📱 Customer Commands

Customers can interact with your WhatsApp bot using these commands:

- `MENU` - Display the restaurant menu
- `HELP` - Show help information
- `TRACK` - Track current order status
- `1x2, 3x1` - Order items (item ID x quantity)
- `CONFIRM` - Confirm pending order
- `CANCEL` - Cancel pending order

## 🔄 Order Flow

1. **Customer sends message** → Webhook receives message
2. **Message processing** → System identifies command/order
3. **Menu request** → Display available items
4. **Order placement** → Parse items and quantities
5. **Order confirmation** → Customer confirms order
6. **Order processing** → System creates order record
7. **Status updates** → Automatic notifications sent

## 🗄️ Database Schema

### Customers Table
- `id` - Primary key
- `phone_number` - WhatsApp number (unique)
- `name` - Customer name
- `email` - Customer email
- `address` - Delivery address

### Orders Table
- `id` - Primary key
- `order_number` - Unique order identifier
- `customer_id` - Foreign key to customers
- `status` - Order status (pending, confirmed, preparing, ready, delivered, cancelled)
- `items` - JSON array of ordered items
- `total_amount` - Order total
- `created_at` - Order timestamp

### Products Table
- `id` - Primary key
- `name` - Product name
- `description` - Product description
- `price` - Product price
- `stock_quantity` - Available stock
- `sku` - Product SKU

## 🔌 API Endpoints

### Orders
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get specific order
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/phone/:phone` - Get customer by phone
- `POST /api/customers` - Create/update customer

### Webhooks
- `GET /webhook/whatsapp` - Webhook verification
- `POST /webhook/whatsapp` - Process incoming messages

## 🎯 n8n Workflow Nodes

The included workflow contains:

1. **Webhook Trigger** - Receives WhatsApp messages
2. **Message Router** - Routes messages based on content
3. **Menu Handler** - Displays product menu
4. **Order Parser** - Processes order messages
5. **Order Creator** - Creates order records
6. **Status Tracker** - Handles order tracking
7. **Response Sender** - Sends WhatsApp responses

## 🔧 Customization

### Adding New Products

Update the products table in SQLite or use the admin interface:

```sql
INSERT INTO products (name, description, price, stock_quantity, sku)
VALUES ('New Item', 'Description', 9.99, 50, 'ITEM-001');
```

### Custom Message Templates

Edit `services/whatsappService.js` to customize message templates:

```javascript
async sendOrderConfirmation(to, orderDetails) {
  const message = `
🎉 *Order Confirmed!*
📋 Order: ${orderDetails.orderNumber}
💰 Total: $${orderDetails.total}
  `.trim();
  
  return this.sendMessage(to, message);
}
```

### Adding New Commands

Extend `services/orderProcessor.js` to handle new commands:

```javascript
async processIncomingMessage(phoneNumber, messageText, messageType) {
  const normalizedMessage = messageText.toLowerCase().trim();
  
  if (normalizedMessage === 'your-command') {
    await this.handleYourCommand(phoneNumber);
  }
  // ... existing commands
}
```

## 🔍 Monitoring & Logs

- Server logs: Console output shows message processing
- Database logs: SQLite queries and results
- n8n logs: Workflow execution details in n8n interface
- WhatsApp API logs: Facebook Developer Console

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Check webhook URL configuration
   - Verify SSL certificate if using HTTPS
   - Confirm webhook token matches

2. **n8n workflow not triggering**
   - Ensure n8n webhook URL is correct
   - Check workflow is active
   - Verify node connections

3. **Database errors**
   - Check database permissions
   - Verify SQLite file path
   - Review table schema

4. **WhatsApp API errors**
   - Validate access token
   - Check phone number ID
   - Review API rate limits

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📞 Support

For support and questions:
- Create GitHub issue
- Check documentation
- Review n8n community resources