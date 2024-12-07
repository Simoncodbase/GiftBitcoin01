require('dotenv').config();

// Add debug logging
console.log('Environment variables check:', {
  availableEnvVars: Object.keys(process.env).filter(key => key.includes('STRIPE')),
  secretKeyExists: !!process.env.STRIPE_SECRET_KEY_01,
  secretKeyPrefix: process.env.STRIPE_SECRET_KEY_01 ? process.env.STRIPE_SECRET_KEY_01.substring(0, 7) : 'missing'
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_01);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { amount } = JSON.parse(event.body);
    
    if (!amount || amount < 50) {
      throw new Error('Invalid amount');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('Payment intent created successfully');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret
      })
    };
  } catch (error) {
    console.error('Error creating payment intent:', {
      message: error.message,
      stack: error.stack,
      type: error.type
    });
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        type: error.type
      })
    };
  }
};