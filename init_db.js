const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./database.db');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ============================================
// DASHBOARD API
// ============================================
app.get('/api/dashboard', (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as total FROM books', (err, row) => {
    stats.totalBooks = row.total;
    
    db.get('SELECT COUNT(*) as total FROM members', (err, row) => {
      stats.totalMembers = row.total;
      
      db.get('SELECT COUNT(*) as total FROM transactions WHERE status = "active"', (err, row) => {
        stats.activeTransactions = row.total;
        res.json(stats);
      });
    });
  });
});

// Recent activity
app.get('/api/recent-activity', (req, res) => {
  const query = `
    SELECT t.*, b.title, b.author, m.name as member_name, t.borrow_date
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN members m ON t.member_id = m.id
    WHERE t.status = 'active'
    ORDER BY t.borrow_date DESC
    LIMIT 5
  `;
  
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
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

app.get('/api/books/:id', (req, res) => {
  db.get('SELECT * FROM books WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/books', (req, res) => {
  const { title, author, isbn, category, image, year, total_copies } = req.body;
  
  db.run(
    'INSERT INTO books (title, author, isbn, category, image, year, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, author, isbn, category, image, year, total_copies, total_copies],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Book added successfully' });
    }
  );
});

app.put('/api/books/:id', (req, res) => {
  const { title, author, isbn, category, image, year, total_copies } = req.body;
  
  db.run(
    'UPDATE books SET title=?, author=?, isbn=?, category=?, image=?, year=?, total_copies=? WHERE id=?',
    [title, author, isbn, category, image, year, total_copies, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Book updated successfully' });
    }
  );
});

app.delete('/api/books/:id', (req, res) => {
  db.run('DELETE FROM books WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Book deleted successfully' });
  });
});

// ============================================
// MEMBERS API
// ============================================
app.get('/api/members', (req, res) => {
  db.all('SELECT * FROM members ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/members/:id', (req, res) => {
  db.get('SELECT * FROM members WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/members', (req, res) => {
  const { name, email, phone, address } = req.body;
  
  db.run(
    'INSERT INTO members (name, email, phone, address) VALUES (?, ?, ?, ?)',
    [name, email, phone, address],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Member added successfully' });
    }
  );
});

app.put('/api/members/:id', (req, res) => {
  const { name, email, phone, address } = req.body;
  
  db.run(
    'UPDATE members SET name=?, email=?, phone=?, address=? WHERE id=?',
    [name, email, phone, address, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Member updated successfully' });
    }
  );
});

app.delete('/api/members/:id', (req, res) => {
  db.run('DELETE FROM members WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Member deleted successfully' });
  });
});

// ============================================
// TRANSACTIONS API
// ============================================
app.get('/api/transactions', (req, res) => {
  const query = `
    SELECT t.*, b.title, b.author, m.name as member_name
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN members m ON t.member_id = m.id
    ORDER BY t.borrow_date DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/transactions/active', (req, res) => {
  const query = `
    SELECT t.*, b.title, b.author, m.name as member_name
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN members m ON t.member_id = m.id
    WHERE t.status = 'active'
    ORDER BY t.due_date ASC
  `;
  
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/transactions/issue', (req, res) => {
  const { book_id, member_id } = req.body;
  
  // Check if book is available
  db.get('SELECT available_copies FROM books WHERE id = ?', [book_id], (err, book) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (!book || book.available_copies <= 0) {
      return res.status(400).json({ error: 'Book not available' });
    }
    
    // Calculate due date (14 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    
    db.run(
      'INSERT INTO transactions (book_id, member_id, due_date) VALUES (?, ?, ?)',
      [book_id, member_id, dueDate.toISOString()],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Decrease available copies
        db.run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID, message: 'Book issued successfully' });
        });
      }
    );
  });
});

app.post('/api/transactions/return/:id', (req, res) => {
  // Get book_id from transaction
  db.get('SELECT book_id FROM transactions WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const bookId = row.book_id;
    
    // Update transaction status
    db.run(
      'UPDATE transactions SET status = "returned", return_date = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Increase available copies
        db.run('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [bookId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Book returned successfully' });
        });
      }
    );
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Library Management System is ready!`);
});