const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app=express();
const PORT=3000;
const sqlite3=require('sqlite3').verbose();
const db=new sqlite3.Database('./database.db');
// This line serves all files in the 'public' folder

// Ensure database schema exists: create tables if missing
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      author TEXT,
      isbn TEXT,
      category TEXT,
      image TEXT,
      year INTEGER,
      total_copies INTEGER DEFAULT 1,
      available_copies INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      join_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      member_id INTEGER,
      borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME,
      return_date DATETIME,
      status TEXT DEFAULT 'active',
      FOREIGN KEY(book_id) REFERENCES books(id),
      FOREIGN KEY(member_id) REFERENCES members(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS deleted_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT,
      title TEXT,
      author TEXT,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      book_id INTEGER,
      member_id INTEGER,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});
app.use(bodyParser.json());

app.use(cors());
app.use (express.static("public"));
app.post("/test-json",(req,res)=>{
    console.log(req.body);
    res.json({"resives" : req.body});
});
// ============================================
// DASHBOARD API
// ============================================
app.get('/api/dashboard', (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as total FROM books', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalBooks = row.total;
    
    db.get('SELECT COUNT(*) as total FROM members', (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalMembers = row.total;
      
      db.get('SELECT COUNT(*) as total FROM transactions WHERE status = "active"', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.activeTransactions = row.total;
        res.json(stats);
      });
    });
  });
  
});
// ============================================
// BOOKS API
// ============================================
app.get('/api/books', (req, res) => {
  db.all('SELECT * FROM books ORDER BY title', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.post('/api/books', (req, res) => {
      const { title, author, isbn, category, image, year, total_copies } = req.body;
      db.run(`INSERT INTO books (title, author, isbn, category, image, year, total_copies, available_copies) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [title, author, isbn, category, image, year, total_copies, total_copies],
              function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const newBookId = this.lastID;
        // Log activity
        try {
          db.run('INSERT INTO activity_log (type, book_id, message) VALUES (?, ?, ?)', ['add_book', newBookId, `Added book: ${title}`]);
        } catch (e) {
          console.error('Activity log error:', e.message);
        }
        res.json({ id: newBookId, message: 'Book added successfully' });
      }
    );
});
app.get('/api/books/:id', (req, res) => {
    const bookId = req.params.id;
    db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Book not found' });
      res.json(row);
    });

});
app.put('/api/books/:id', (req, res) => {
    const bookId = req.params.id;
    const { title, author, isbn, category, image, year, total_copies, available_copies } = req.body;
    db.run(`UPDATE books SET title = ?, author = ?, isbn = ?, category = ?, image = ?, year = ?, total_copies = ?, available_copies = ? WHERE id = ?`,
      [title, author, isbn, category, image, year, total_copies, available_copies, bookId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Book updated successfully' });
      }
    );
});
app.delete('/api/books/:id', (req, res) => {
  const bookId = req.params.id;
  // First get book details so we can remember it in deleted_books
  db.get('SELECT isbn, title, author FROM books WHERE id = ?', [bookId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const isbn = row && row.isbn ? row.isbn : null;
    const title = row && row.title ? row.title : null;
    const author = row && row.author ? row.author : null;

    db.run('INSERT INTO deleted_books (isbn, title, author) VALUES (?, ?, ?)', [isbn, title, author], (insErr) => {
      // ignore insert errors (e.g., duplicates), proceed to delete
      db.run('DELETE FROM books WHERE id = ?', [bookId], function(delErr) {
        if (delErr) return res.status(500).json({ error: delErr.message });
        res.json({ message: 'Book deleted successfully' });
      });
    });
  });
});
// ============================================
// MEMBERS API
// ============================================
app.get("/api/members",(req,res)=>{
    db.all('SELECT * FROM members ORDER BY name', (err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows);
    });
});
app.get("/api/members/:id",(req,res)=>{
    const memberId = req.params.id;
    db.get('SELECT * FROM members WHERE id = ?', [memberId], (err,row)=>{
        if(err) return res.status(500).json({error:err.message});
        if(!row) return res.status(404).json({error:'Member not found'});
        res.json(row);
    });
});
app.post("/api/members",(req,res)=>{
    const {name,email,phone,address}=req.body;
    if(!name){
        return res.status(400).json({error:"Name is required"});
    }
  db.run(`insert into members (name,email,phone,address) values (?,?,?,?)`,
    [name,email,phone,address],
    function(err){
      if(err) return res.status(500).json({error:err.message});
      const newMemberId = this.lastID;
      // Log activity
      try {
        db.run('INSERT INTO activity_log (type, member_id, message) VALUES (?, ?, ?)', ['add_member', newMemberId, `Added member: ${name}`]);
      } catch (e) {
        console.error('Activity log error:', e.message);
      }
      res.json({id:newMemberId,message:"Member added successfully"});
    });       
      

});
app.put("/api/members/:id",(req,res)=>{
    const memberId = req.params.id;
    const {name,email,phone,address}=req.body;
    db.run(`UPDATE members SET name=?, email=?, phone=?, address=? WHERE id=?`,
        [name,email,phone,address,memberId],
        function(err){
            if(err) return res.status(500).json({error:err.message});
            res.json({message:"Member updated successfully"});
        });
});
app.delete("/api/members/:id",(req,res)=>{
    db.run('DELETE FROM members WHERE id = ?', [req.params.id], function(err){
        if(err) return res.status(500).json({error:err.message});
        res.json({message:"Member deleted successfully"});
    });
});

// ============================================
// TRANSACTIONS API
// ============================================
app.get("/api/transactions",(req,res)=>{
    const query = `
        SELECT t.*, b.title, b.author, m.name as member_name
        FROM transactions t
        JOIN books b ON t.book_id = b.id
        JOIN members m ON t.member_id = m.id
        ORDER BY t.borrow_date DESC
    `;
    db.all(query, (err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows);
    });
});

app.get("/api/transactions/active",(req,res)=>{
    const query = `
        SELECT t.*, b.title, b.author, m.name as member_name
        FROM transactions t
        JOIN books b ON t.book_id = b.id
        JOIN members m ON t.member_id = m.id
        WHERE t.status = 'active'
        ORDER BY t.due_date ASC
    `;
    db.all(query, (err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows);
    });
});

// Recent activity (uses activity_log table)
app.get('/api/recent-activity', (req, res) => {
  const q = `
    SELECT a.*, b.title as book_title, m.name as member_name
    FROM activity_log a
    LEFT JOIN books b ON a.book_id = b.id
    LEFT JOIN members m ON a.member_id = m.id
    ORDER BY a.created_at DESC
    LIMIT 10
  `;

  db.all(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/transactions/issue",(req,res)=>{
    const {book_id, member_id} = req.body;
    
    // Check if book is available
    db.get('SELECT available_copies FROM books WHERE id = ?', [book_id], (err, book)=>{
        if(err) return res.status(500).json({error:err.message});
        if(!book || book.available_copies <= 0){
            return res.status(400).json({error:'Book not available'});
        }
        
        // Calculate due date (14 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        
        db.run(
          'INSERT INTO transactions (book_id, member_id, due_date, status) VALUES (?, ?, ?, ?)',
          [book_id, member_id, dueDate.toISOString(), 'active'],
          function(err){
            if(err) return res.status(500).json({error:err.message});
            const newTxnId = this.lastID;

            // Decrease available copies
            db.run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id], (err)=>{
              if(err) return res.status(500).json({error:err.message});

              // Fetch book title and member name for logging
              db.get('SELECT title FROM books WHERE id = ?', [book_id], (bErr, bRow) => {
                if (bErr) console.error('Book lookup error for activity log:', bErr.message);
                db.get('SELECT name FROM members WHERE id = ?', [member_id], (mErr, mRow) => {
                if (mErr) console.error('Member lookup error for activity log:', mErr.message);
                const title = (bRow && bRow.title) ? bRow.title : 'Unknown';
                const memberName = (mRow && mRow.name) ? mRow.name : 'Unknown';
                const msg = `Issued "${title}" to ${memberName}`;
                try {
                  db.run('INSERT INTO activity_log (type, book_id, member_id, message) VALUES (?, ?, ?, ?)', ['issue', book_id, member_id, msg]);
                } catch(e){ console.error('Activity log error:', e.message); }
                return res.json({id:newTxnId, message:'Book issued successfully'});
                });
              });
            });
          }
        );
    });
});

app.post("/api/transactions/return/:id",(req,res)=>{
    // Get book_id from transaction
  db.get('SELECT book_id, member_id FROM transactions WHERE id = ?', [req.params.id], (err, row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(404).json({error:'Transaction not found'});
        
    const bookId = row.book_id;
    const memberId = row.member_id;
        
    // Update transaction status
    db.run(
      'UPDATE transactions SET status = "returned", return_date = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id],
      (err)=>{
        if(err) return res.status(500).json({error:err.message});
                
        // Increase available copies
        db.run('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [bookId], (err)=>{
          if(err) return res.status(500).json({error:err.message});
          // Log activity
          db.get('SELECT title FROM books WHERE id = ?', [bookId], (bErr, bRow) => {
            if (bErr) console.error('Book lookup error for activity log:', bErr.message);
            db.get('SELECT name FROM members WHERE id = ?', [memberId], (mErr, mRow) => {
            if (mErr) console.error('Member lookup error for activity log:', mErr.message);
            const title = (bRow && bRow.title) ? bRow.title : 'Unknown';
            const memberName = (mRow && mRow.name) ? mRow.name : 'Unknown';
            const msg = `Returned "${title}" by ${memberName}`;
            try{ db.run('INSERT INTO activity_log (type, book_id, member_id, message) VALUES (?, ?, ?, ?)', ['return', bookId, memberId, msg]); } catch(e){ console.error('Activity log error:', e.message); }
            res.json({message:'Book returned successfully'});
            });
          });
        });
      }
    );
  });
});

// Remove this (folder name is wrong case):
// app.use(express.static('PUBLIC'));

// Keep this one (correct):
app.use(express.static('public'));


app.listen(PORT,()=>{
    console.log(`Server is running on http://localhost:${PORT}`);
})
