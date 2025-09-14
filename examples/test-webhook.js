#!/usr/bin/env node

// Test script to verify your n8n webhook is working
// Usage: node test-webhook.js YOUR_WEBHOOK_URL

import fetch from 'node-fetch';

const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.error('Usage: node test-webhook.js <webhook-url>');
  console.error('Example: node test-webhook.js https://your-n8n.com/webhook/claude-mcp-chat-logger');
  process.exit(1);
}

const testPayload = {
  session_id: `test-${Date.now()}`,
  model: 'claude-sonnet-4',
  tools_used: ['test'],
  user_message: 'This is a test message to verify the webhook integration.',
  assistant_message: 'This is a test response from Claude to verify the GitHub logging is working correctly.',
  project: 'webhook-test'
};

console.log('Testing webhook:', webhookUrl);
console.log('Payload:', JSON.stringify(testPayload, null, 2));

try {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testPayload)
  });

  console.log('\nResponse Status:', response.status, response.statusText);
  
  if (response.headers.get('content-type')?.includes('application/json')) {
    const result = await response.json();
    console.log('Response Body:', JSON.stringify(result, null, 2));
    
    if (result.ok) {
      console.log('\n✅ Webhook test successful!');
      console.log('GitHub URLs generated:');
      if (result.latest_url) console.log('- Latest:', result.latest_url);
      if (result.dated_url) console.log('- Dated:', result.dated_url);
      if (result.project_latest_url) console.log('- Project Latest:', result.project_latest_url);
    } else {
      console.log('\n❌ Webhook responded but may have issues');
    }
  } else {
    const text = await response.text();
    console.log('Response Body (text):', text);
  }

} catch (error) {
  console.error('\n❌ Webhook test failed:', error.message);
  console.error('\nPossible issues:');
  console.error('- Webhook URL is incorrect');
  console.error('- n8n workflow is not active');
  console.error('- Network connectivity issues');
  console.error('- n8n instance is not accessible');
}
