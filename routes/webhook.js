const express = require('express');
const router = express.Router();
const WhatsAppService = require('../services/whatsappService');
const OrderProcessor = require('../services/orderProcessor');
const db = require('../database/init');

// WhatsApp webhook verification
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ WhatsApp webhook verification failed');
    res.sendStatus(403);
  }
});

// WhatsApp webhook for incoming messages
router.post('/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]) {
      const change = body.entry[0].changes[0];
      
      if (change.field === 'messages' && change.value.messages) {
        const message = change.value.messages[0];
        const phoneNumber = message.from;
        const messageText = message.text ? message.text.body : '';
        const messageType = message.type;

        console.log(`📱 Received message from ${phoneNumber}: ${messageText}`);

        // Store message in database
        db.run(
          'INSERT INTO messages (phone_number, message_type, content, direction) VALUES (?, ?, ?, ?)',
          [phoneNumber, messageType, messageText, 'incoming']
        );

        // Process the message
        await OrderProcessor.processIncomingMessage(phoneNumber, messageText, messageType);

        // Trigger n8n webhook (optional)
        await triggerN8nWebhook({
          phoneNumber,
          messageText,
          messageType,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.sendStatus(500);
  }
});

// Function to trigger n8n webhook
async function triggerN8nWebhook(data) {
  try {
    const axios = require('axios');
    const n8nWebhookUrl = `${process.env.N8N_PROTOCOL}://${process.env.N8N_HOST}:${process.env.N8N_PORT}/webhook/whatsapp-message`;
    
    await axios.post(n8nWebhookUrl, data);
    console.log('✅ n8n webhook triggered');
  } catch (error) {
    console.log('⚠️  n8n webhook not available:', error.message);
  }
}

module.exports = router;