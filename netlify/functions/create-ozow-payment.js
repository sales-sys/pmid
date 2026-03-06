const crypto = require('crypto');

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function buildHash(payload, privateKey) {
  const concatenated = [
    payload.SiteCode,
    payload.CountryCode,
    payload.CurrencyCode,
    payload.Amount,
    payload.TransactionReference,
    payload.BankReference,
    payload.Optional1,
    payload.Optional2,
    payload.Optional3,
    payload.Optional4,
    payload.Optional5,
    payload.IsTest
  ].join('') + privateKey;

  return crypto.createHash('sha512').update(concatenated).digest('hex');
}

function buildBankReference(prefix = 'MID') {
  const safePrefix = String(prefix)
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toUpperCase()
    .slice(0, 6) || 'MID';

  const stamp = Date.now().toString().slice(-10);
  return `${safePrefix}-${stamp}`.slice(0, 20);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      OZOW_SITE_CODE,
      OZOW_PRIVATE_KEY,
      OZOW_API_URL,
      OZOW_IS_TEST,
      OZOW_SUCCESS_URL,
      OZOW_CANCEL_URL,
      OZOW_ERROR_URL,
      OZOW_NOTIFY_URL,
      OZOW_BANK_REFERENCE_PREFIX
    } = process.env;

    if (!OZOW_SITE_CODE || !OZOW_PRIVATE_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: 'Ozow is not configured. Set OZOW_SITE_CODE and OZOW_PRIVATE_KEY in Netlify environment variables.'
        })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const totalAmount = Number(body.totalAmount || 0);
    const customer = body.customer || {};

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Invalid amount' })
      };
    }

    const baseSiteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.SITE_URL || 'https://example.com';
    const transactionReference = `PMID-${Date.now()}`;
    const bankReference = buildBankReference(OZOW_BANK_REFERENCE_PREFIX);
    const amount = totalAmount.toFixed(2);
    const isTest = String(OZOW_IS_TEST || 'true').toLowerCase();

    const payload = {
      SiteCode: OZOW_SITE_CODE,
      CountryCode: 'ZA',
      CurrencyCode: 'ZAR',
      Amount: amount,
      TransactionReference: transactionReference,
      BankReference: bankReference,
      CancelUrl: OZOW_CANCEL_URL || `${baseSiteUrl}/index.html?payment=cancelled`,
      ErrorUrl: OZOW_ERROR_URL || `${baseSiteUrl}/index.html?payment=error`,
      SuccessUrl: OZOW_SUCCESS_URL || `${baseSiteUrl}/index.html?payment=success`,
      IsTest: isTest,
      NotifyUrl: OZOW_NOTIFY_URL || `${baseSiteUrl}/.netlify/functions/ozow-notify`,
      Optional1: customer.name || '',
      Optional2: customer.email || '',
      Optional3: customer.phone || '',
      Optional4: '',
      Optional5: ''
    };

    payload.HashCheck = buildHash(payload, OZOW_PRIVATE_KEY);

    const paymentBaseUrl = OZOW_API_URL || 'https://pay.ozow.com';
    const paymentUrl = `${paymentBaseUrl}?${new URLSearchParams(payload).toString()}`;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        paymentUrl,
        transactionReference,
        amount
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: `Failed to initiate payment: ${error.message}` })
    };
  }
};
