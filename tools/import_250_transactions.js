const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.resolve(__dirname, '..', 'database.db');

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

(async function main(){
  console.log('Transactions Importer starting — target: 50 active + 200 returned = 250 total');
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
    // Clear existing transactions first
    await runAsync('DELETE FROM transactions', []);
    console.log('Cleared existing transactions');

    // Restore available_copies for all books
    await runAsync('UPDATE books SET available_copies = total_copies', []);
    console.log('Restored available_copies for all books');

    // fetch all books and members
    const books = await allAsync('SELECT id FROM books', []);
    const members = await allAsync('SELECT id FROM members', []);

    if (!books.length || !members.length) {
      console.error('Not enough books or members to create transactions');
      db.close();
      return;
    }

    console.log(`Found ${books.length} books and ${members.length} members`);

    let created = 0;
    const TARGET_ACTIVE = 50;
    const TARGET_RETURNED = 200;
    const TOTAL_TARGET = TARGET_ACTIVE + TARGET_RETURNED;

    // Create 200 RETURNED transactions (past transactions)
    console.log('Creating 200 returned transactions...');
    while (created < TARGET_RETURNED) {
      const bookIdx = Math.floor(Math.random() * books.length);
      const memberIdx = Math.floor(Math.random() * members.length);
      const bookId = books[bookIdx].id;
      const memberId = members[memberIdx].id;

      // Borrow date: 30-60 days ago
      const borrowDate = new Date();
      borrowDate.setDate(borrowDate.getDate() - Math.floor(Math.random() * 30) - 30);
      
      // Due date: 14 days after borrow date
      const dueDate = new Date(borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      // Return date: 1-7 days after due date (returned late)
      const returnDate = new Date(dueDate.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000));

      try {
        await runAsync(
          `INSERT INTO transactions (book_id, member_id, borrow_date, due_date, return_date, status) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [bookId, memberId, borrowDate.toISOString(), dueDate.toISOString(), returnDate.toISOString(), 'returned']
        );

        created++;
        if (created % 50 === 0) console.log(`  Created ${created} returned transactions...`);
      } catch (err) {
        console.error('Insert error:', err.message);
      }
    }
    console.log('Returned transactions complete:', created);

    // Create 50 ACTIVE transactions (current transactions)
    console.log('Creating 50 active transactions...');
    let activeCreated = 0;
    while (activeCreated < TARGET_ACTIVE) {
      const bookIdx = Math.floor(Math.random() * books.length);
      const memberIdx = Math.floor(Math.random() * members.length);
      const bookId = books[bookIdx].id;
      const memberId = members[memberIdx].id;

      // Borrow date: last 2-7 days
      const borrowDate = new Date();
      borrowDate.setDate(borrowDate.getDate() - Math.floor(Math.random() * 5) - 2);
      
      // Due date: 14 days from borrow date
      const dueDate = new Date(borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      try {
        await runAsync(
          `INSERT INTO transactions (book_id, member_id, borrow_date, due_date, status) 
           VALUES (?, ?, ?, ?, ?)`,
          [bookId, memberId, borrowDate.toISOString(), dueDate.toISOString(), 'active']
        );

        // decrement available_copies
        await runAsync('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [bookId]);

        activeCreated++;
        created++;
        if (activeCreated % 10 === 0) console.log(`  Created ${activeCreated} active transactions...`);
      } catch (err) {
        console.error('Insert error:', err.message);
      }
    }

    console.log('');
    console.log('✅ Transactions importer finished successfully!');
    console.log(`   - Active transactions: ${TARGET_ACTIVE}`);
    console.log(`   - Returned transactions: ${TARGET_RETURNED}`);
    console.log(`   - Total transactions: ${TOTAL_TARGET}`);
    
  } catch (err) {
    console.error('❌ Importer failed:', err);
  } finally {
    db.close();
  }
})();
