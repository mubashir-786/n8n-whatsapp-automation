const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  async sendMessage(to, message) {
    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      const response = await axios.post(url, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Message sent successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error sending message:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendTemplate(to, templateName, languageCode = 'en') {
    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      const response = await axios.post(url, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode }
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Template sent successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error sending template:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendOrderConfirmation(to, orderDetails) {
    const message = `
🎉 *Order Confirmed!*

📋 Order Number: ${orderDetails.orderNumber}
💰 Total: $${orderDetails.total}

📦 Items:
${orderDetails.items.map(item => `• ${item.name} x${item.quantity} - $${item.price}`).join('\n')}

⏰ Estimated delivery: 30-45 minutes

Thank you for your order! We'll keep you updated on your order status.

Reply HELP for assistance or TRACK to check your order status.
    `.trim();

    return this.sendMessage(to, message);
  }

  async sendMenu(to) {
    const db = require('../database/init');
    
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM products WHERE active = 1', (err, products) => {
        if (err) {
          reject(err);
          return;
        }

        const menuMessage = `
🍽️ *${process.env.BUSINESS_NAME} Menu*

${products.map((product, index) => 
  `${index + 1}. *${product.name}* - $${product.price}\n   ${product.description}`
).join('\n\n')}

💬 To order, reply with item numbers and quantities:
Example: "1x2, 3x1" (2 Pizza Margherita, 1 Caesar Salad)

📞 Need help? Reply HELP
        `.trim();

        this.sendMessage(to, menuMessage)
          .then(resolve)
          .catch(reject);
      });
    });
  }
}

module.exports = new WhatsAppService();