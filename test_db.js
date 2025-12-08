const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.all('SELECT COUNT(*) as count FROM transactions', (err, rows) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Transaction count:', rows[0].count);
  }
  
  db.all('SELECT COUNT(*) as count FROM books', (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('Books count:', rows[0].count);
    }
    
    db.all('SELECT COUNT(*) as count FROM members', (err, rows) => {
      if (err) {
        console.error('Error:', err.message);
      } else {
        console.log('Members count:', rows[0].count);
      }
      
      // Show first transaction
      db.all('SELECT t.id, b.title, m.name FROM transactions t JOIN books b ON t.book_id = b.id JOIN members m ON t.member_id = m.id LIMIT 1', (err, rows) => {
        if (err) {
          console.error('Error:', err.message);
        } else {
          console.log('First transaction:', rows[0] || 'None');
        }
        db.close();
      });
    });
  });
});
