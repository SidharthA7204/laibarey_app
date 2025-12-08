const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

(async function(){
  console.log('Backfilling activity_log from transactions and members...');

  function allAsync(sql, params){
    return new Promise((res, rej)=> db.all(sql, params, (e,r)=> e?rej(e):res(r)));
  }
  function runAsync(sql, params){
    return new Promise((res, rej)=> db.run(sql, params, function(e){ e?rej(e):res(this); }));
  }

  try{
    const txns = await allAsync(`SELECT t.*, b.title, m.name as member_name FROM transactions t JOIN books b ON t.book_id=b.id JOIN members m ON t.member_id=m.id`, []);
    console.log('Found', txns.length, 'transactions');
    let inserted = 0;
    for(const t of txns){
      // insert issue activity at borrow_date
      const issueMsg = `Issued "${t.title}" to ${t.member_name}`;
      await runAsync('INSERT INTO activity_log (type, book_id, member_id, message, created_at) VALUES (?, ?, ?, ?, ?)', ['issue', t.book_id, t.member_id, issueMsg, t.borrow_date]);
      inserted++;
      if(t.status === 'returned' && t.return_date){
        const returnMsg = `Returned "${t.title}" by ${t.member_name}`;
        await runAsync('INSERT INTO activity_log (type, book_id, member_id, message, created_at) VALUES (?, ?, ?, ?, ?)', ['return', t.book_id, t.member_id, returnMsg, t.return_date]);
        inserted++;
      }
    }

    // backfill members as add_member using join_date
    const members = await allAsync('SELECT id, name, join_date FROM members WHERE join_date IS NOT NULL', []);
    console.log('Found', members.length, 'members');
    for(const m of members){
      const msg = `Added member: ${m.name}`;
      await runAsync('INSERT INTO activity_log (type, member_id, message, created_at) VALUES (?, ?, ?, ?)', ['add_member', m.id, msg, m.join_date]);
      inserted++;
    }

    console.log('Inserted', inserted, 'activity rows');
  }catch(err){
    console.error('Backfill failed', err.message);
  }finally{
    db.close();
  }
})();
