const http = require('http');

function get(path){
  return new Promise((resolve,reject)=>{
    http.get({hostname:'localhost', port:3000, path, agent:false}, (res)=>{
      let data = '';
      res.on('data', c=> data+=c);
      res.on('end', ()=>{
        try{ resolve({status: res.statusCode, body: JSON.parse(data)}); }
        catch(e){ resolve({status: res.statusCode, body: data}); }
      });
    }).on('error', err=> reject(err));
  })
}

(async ()=>{
  try{
    console.log('Checking /api/dashboard');
    const dash = await get('/api/dashboard');
    console.log('dashboard status:', dash.status, 'body keys:', Object.keys(dash.body));

    console.log('\nChecking /api/books (first 3)');
    const books = await get('/api/books');
    console.log('books status:', books.status, 'count:', Array.isArray(books.body)?books.body.length:0);
    if(Array.isArray(books.body)) console.log('first book:', books.body[0]);

    console.log('\nChecking /api/members (first 3)');
    const members = await get('/api/members');
    console.log('members status:', members.status, 'count:', Array.isArray(members.body)?members.body.length:0);
    if(Array.isArray(members.body)) console.log('first member:', members.body[0]);

    console.log('\nChecking /api/transactions (count)');
    const tx = await get('/api/transactions');
    console.log('transactions status:', tx.status, 'count:', Array.isArray(tx.body)?tx.body.length:0);
    if(Array.isArray(tx.body)) console.log('first transaction sample:', tx.body[0]);

  }catch(err){
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();
