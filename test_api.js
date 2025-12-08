const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/transactions',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response length:', data.length);
    const parsed = JSON.parse(data);
    console.log('Parsed count:', parsed.length);
    console.log('First item:', parsed[0]);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
