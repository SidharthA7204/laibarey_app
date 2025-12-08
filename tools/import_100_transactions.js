// tools/import_100_transactions.js
// Run: node tools/import_100_transactions.js
// Creates 100+ transactions by randomly pairing books with members.

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.resolve(__dirname, '..', 'database.db');
const TARGET_COUNT = 100;

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

(async function main(){
  console.log('Transactions Importer starting — target:', TARGET_COUNT);
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found at', DB_PATH);
    process.exit(1);
  }

  const db = new sqlite3.Database(DB_PATH);

  // helper to run queries as Promise
  function allAsync(sql, params){
    return new Promise((resolve, reject)=>{
      db.all(sql, params, (err,rows)=>{ if(err) reject(err); else resolve(rows); });
    });
  }
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
    // count current transactions
    const txnRow = await getAsync('SELECT COUNT(*) AS c FROM transactions', []);
    let have = txnRow ? txnRow.c : 0;
    console.log('Currently in DB:', have);

    // fetch all books and members
    const books = await allAsync('SELECT id FROM books WHERE available_copies > 0', []);
    const members = await allAsync('SELECT id FROM members', []);

    if (!books.length || !members.length) {
      console.error('Not enough books or members to create transactions');
      db.close();
      return;
    }

    console.log(`Found ${books.length} books and ${members.length} members`);

    // create transactions until target reached
    while (have < TARGET_COUNT) {
      const bookIdx = Math.floor(Math.random() * books.length);
      const memberIdx = Math.floor(Math.random() * members.length);
      const bookId = books[bookIdx].id;
      const memberId = members[memberIdx].id;

      // calculate due date (14 days from now)
      const borrowDate = new Date();
      const dueDate = new Date(borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      try {
        await runAsync(
          `INSERT INTO transactions (book_id, member_id, borrow_date, due_date, status) VALUES (?, ?, ?, ?, ?)`,
          [bookId, memberId, borrowDate.toISOString(), dueDate.toISOString(), 'active']
        );

        // decrement available_copies
        await runAsync('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [bookId]);

        have++;
        if (have % 20 === 0) console.log('Created so far:', have);
      } catch (err) {
        console.error('Insert error:', err.message);
        // continue to next iteration
      }
    }

    console.log('Transactions importer finished. Total in DB:', have);
  } catch (err) {
    console.error('Importer failed:', err);
  } finally {
    db.close();
  }
})();
