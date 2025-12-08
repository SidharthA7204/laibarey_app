const http = require('http');

http.get('http://localhost:3000/api/recent-activity', res => {
  let data='';
  res.on('data', c=> data+=c);
  res.on('end', ()=>{
    try{ const parsed = JSON.parse(data); console.log('Recent activity count:', parsed.length); console.log(parsed.slice(0,5)); }
    catch(e){ console.error('Parse error', e.message); console.log(data); }
  });
}).on('error', e=> console.error('Request failed', e.message));
