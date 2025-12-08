// tools/import_100_members.js
// Run: node tools/import_100_members.js
// Fetches members from RandomUser API and stores up to TARGET_COUNT in the local SQLite database.

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.resolve(__dirname, '..', 'database.db');
const TARGET_COUNT = 100;

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

(async function main(){
  console.log('Members Importer starting — target:', TARGET_COUNT);
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found at', DB_PATH);
    process.exit(1);
  }

  const db = new sqlite3.Database(DB_PATH);

  // helper to run a single-row get as Promise
  function getAsync(sql, params){
    return new Promise((resolve, reject)=>{
      db.get(sql, params, (err,row)=>{ if(err) reject(err); else resolve(row); });
    });
  }
  function runAsync(sql, params){
    return new Promise((resolve, reject)=>{
      db.run(sql, params, function(err){ if(err) reject(err); else resolve(this); });
    });
  }

  try{
    // count current number of members
    const row = await getAsync('SELECT COUNT(*) AS c FROM members', []);
    let have = row ? row.c : 0;
    console.log('Currently in DB:', have);
    if (have >= TARGET_COUNT) {
      console.log('Target already satisfied. Exiting.');
      db.close();
      return;
    }

    // fetch in batches from RandomUser API
    const batchSize = 50; // API allows up to 5000, but 50 per batch is reasonable
    while (have < TARGET_COUNT) {
      const toFetch = Math.min(batchSize, TARGET_COUNT - have);
      console.log(`Fetching ${toFetch} members from RandomUser API...`);
      
      const url = `https://randomuser.me/api/?results=${toFetch}&nat=us`;
      let data;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
      } catch (err) {
        console.error('Fetch error:', err.message);
        await sleep(1000);
        continue;
      }

      const users = data.results || [];
      if (!users.length) {
        console.log('No users returned; stopping.');
        break;
      }

      for (const u of users) {
        if (have >= TARGET_COUNT) break;

        const name = `${u.name.first} ${u.name.last}`;
        const email = u.email || null;
        const phone = u.phone || u.cell || null;
        const address = u.location ? 
          `${u.location.street?.number || ''} ${u.location.street?.name || ''}, ${u.location.city}, ${u.location.state} ${u.location.postcode}`.trim() 
          : null;

        // check if already exists (by email)
        if (email) {
          const exists = await getAsync('SELECT id FROM members WHERE email = ? LIMIT 1', [email]);
          if (exists) continue;
        }

        // insert
        try {
          await runAsync(
            `INSERT INTO members (name, email, phone, address) VALUES (?, ?, ?, ?)`,
            [name, email, phone, address]
          );
          have++;
          if (have % 20 === 0) console.log('Inserted so far:', have);
        } catch (err) {
          console.error('Insert error:', err.message);
        }
      }

      // polite delay
      await sleep(300);
    }

    console.log('Members importer finished. Total in DB:', have);
  } catch (err) {
    console.error('Importer failed:', err);
  } finally {
    db.close();
  }
})();
