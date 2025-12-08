// Wrapper copy of transaction.js to match HTML reference (transactions.html -> js/transactions.js)
// This file mirrors the main `transaction.js` implementation.

const API_BASE = 'http://localhost:3000/api';
let allTransactions = [];

// Load transactions on page load
document.addEventListener('DOMContentLoaded', () => {
  loadTransactions();
  loadBooksForDropdown();
  loadMembersForDropdown();
});

// ============================================
// LOAD TRANSACTIONS
// ============================================
async function loadTransactions() {
  try {
    console.log('Fetching from:', `${API_BASE}/transactions`);
    const response = await fetch(`${API_BASE}/transactions`);
    console.log('Response status:', response.status);
    allTransactions = await response.json();
    console.log('Loaded transactions:', allTransactions.length);
    displayTransactions();
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

// ============================================
// DISPLAY TRANSACTIONS
// ============================================
function displayTransactions() {
  // Separate active and returned transactions
  const activeTransactions = allTransactions.filter(t => t.status === 'active');
  const historyTransactions = allTransactions.filter(t => t.status === 'returned');
  
  // Update counts
  document.getElementById('active-count').textContent = activeTransactions.length;
  document.getElementById('history-count').textContent = historyTransactions.length;
  
  // Display active transactions
  const activeBody = document.getElementById('active-transactions-body');
  if (activeTransactions.length === 0) {
    activeBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 60px;">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>No active transactions</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    activeBody.innerHTML = activeTransactions.map(transaction => {
      const borrowDate = new Date(transaction.borrow_date).toLocaleDateString();
      const dueDate = new Date(transaction.due_date);
      const dueDateStr = dueDate.toLocaleDateString();
      const today = new Date();
      const isOverdue = dueDate < today;
      
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="book-icon-cell">📚</div>
              <div>
                <strong>${transaction.title}</strong><br>
                <span class="text-muted">${transaction.author}</span>
              </div>
            </div>
          </td>
          <td>${transaction.member_name}</td>
          <td>${borrowDate}</td>
          <td>${dueDateStr}</td>
          <td>
            <span class="status-badge ${isOverdue ? 'overdue' : 'active'}">
              ${isOverdue ? 'Overdue' : 'Active'}
            </span>
          </td>
          <td>
            <button class="btn btn-success" onclick="returnBook(${transaction.id}, '${transaction.title}')">
              Return Book
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // Display history transactions
  const historyBody = document.getElementById('history-transactions-body');
  if (historyTransactions.length === 0) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding: 60px;">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>No transaction history</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    historyBody.innerHTML = historyTransactions.map(transaction => {
      const borrowDate = new Date(transaction.borrow_date).toLocaleDateString();
      const returnDate = new Date(transaction.return_date).toLocaleDateString();
      
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="book-icon-cell">📚</div>
              <div>
                <strong>${transaction.title}</strong><br>
                <span class="text-muted">${transaction.author}</span>
              </div>
            </div>
          </td>
          <td>${transaction.member_name}</td>
          <td>${borrowDate}</td>
          <td>${returnDate}</td>
          <td>
            <span class="status-badge returned">Returned</span>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tab) {
  // Update tab styles
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  // Show/hide content
  if (tab === 'active') {
    document.getElementById('active-tab').style.display = 'block';
    document.getElementById('history-tab').style.display = 'none';
  } else {
    document.getElementById('active-tab').style.display = 'none';
    document.getElementById('history-tab').style.display = 'block';
  }
}

// ============================================
// LOAD BOOKS FOR DROPDOWN
// ============================================
async function loadBooksForDropdown() {
  try {
    const response = await fetch(`${API_BASE}/books`);
    const books = await response.json();
    
    const select = document.getElementById('book-select');
    const availableBooks = books.filter(book => book.available_copies > 0);
    
    select.innerHTML = '<option value="">Choose a book...</option>' +
      availableBooks.map(book => 
        `<option value="${book.id}">${book.title} by ${book.author} (${book.available_copies} available)</option>`
      ).join('');
  } catch (error) {
    console.error('Error loading books:', error);
  }
}

// ============================================
// LOAD MEMBERS FOR DROPDOWN
// ============================================
async function loadMembersForDropdown() {
  try {
    const response = await fetch(`${API_BASE}/members`);
    const members = await response.json();
    
    const select = document.getElementById('member-select');
    select.innerHTML = '<option value="">Choose a member...</option>' +
      members.map(member => 
        `<option value="${member.id}">${member.name}</option>`
      ).join('');
  } catch (error) {
    console.error('Error loading members:', error);
  }
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function showIssueBookModal() {
  document.getElementById('issue-book-modal').classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// ============================================
// ISSUE BOOK
// ============================================
document.getElementById('issue-book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const issueData = {
    book_id: parseInt(formData.get('book_id')),
    member_id: parseInt(formData.get('member_id'))
  };
  
  try {
    const response = await fetch(`${API_BASE}/transactions/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(issueData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Book issued successfully!');
      closeModal('issue-book-modal');
      e.target.reset();
      loadTransactions();
      loadBooksForDropdown();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error issuing book:', error);
    alert('Failed to issue book');
  }
});

// ============================================
// RETURN BOOK
// ============================================
async function returnBook(transactionId, bookTitle) {
  if (!confirm(`Mark "${bookTitle}" as returned?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/transactions/return/${transactionId}`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Book returned successfully!');
      loadTransactions();
      loadBooksForDropdown();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error returning book:', error);
    alert('Failed to return book');
  }
}
