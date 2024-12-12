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
    const { amount, currency } = JSON.parse(event.body);

    // Validate the amount as a whole unit
    if (!amount || amount < 1) {
      throw new Error('Invalid amount. Must be at least 1 unit of currency.');
    }

    // Convert amount to smallest currency unit (e.g., 1 USD -> 100 cents)
    const amountInSmallestUnit = amount * 100;

    // Validate and set currency
    const validCurrencies = ['usd', 'eur', 'chf'];
    const chosenCurrency = validCurrencies.includes((currency || '').toLowerCase()) ? currency.toLowerCase() : 'usd';

    // Create the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: chosenCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('Payment intent created successfully:', {
      chosenCurrency, 
      originalAmount: amount, 
      convertedAmount: amountInSmallestUnit
    });

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
