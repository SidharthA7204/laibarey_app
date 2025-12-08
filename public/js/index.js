const API_BASE = 'http://localhost:3000/api';

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
  loadRecentActivity();
  loadBooksForDropdown();
  loadMembersForDropdown();
});

// ============================================
// LOAD DASHBOARD STATISTICS
// ============================================
async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_BASE}/dashboard`);
    const data = await response.json();
    
    document.getElementById('total-books').textContent = data.totalBooks || 0;
    document.getElementById('total-members').textContent = data.totalMembers || 0;
    document.getElementById('active-transactions').textContent = data.activeTransactions || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// ============================================
// LOAD RECENT ACTIVITY
// ============================================
async function loadRecentActivity() {
  try {
    const response = await fetch(`${API_BASE}/recent-activity`);
    const activities = await response.json();
    
    const container = document.getElementById('recent-activity');
    
    if (activities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <p>No recent activity</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = activities.map(activity => {
      const borrowDate = new Date(activity.borrow_date).toLocaleDateString();
      const dueDate = new Date(activity.due_date);
      const today = new Date();
      const isOverdue = dueDate < today;
      
      return `
        <div class="activity-item">
          <div class="activity-icon">📚</div>
          <div class="activity-info">
            <h4>${activity.title}</h4>
            <p>${activity.member_name} • ${borrowDate}</p>
          </div>
          <span class="activity-status ${isOverdue ? 'overdue' : 'active'}">
            ${isOverdue ? 'Overdue' : 'Active'}
          </span>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading activity:', error);
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
function showAddBookModal() {
  document.getElementById('add-book-modal').classList.add('active');
}

function showAddMemberModal() {
  document.getElementById('add-member-modal').classList.add('active');
}

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
// ADD BOOK FORM HANDLER
// ============================================
document.getElementById('add-book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const bookData = {
    title: formData.get('title'),
    author: formData.get('author'),
    isbn: formData.get('isbn'),
    category: formData.get('category'),
    year: parseInt(formData.get('year')) || null,
    total_copies: parseInt(formData.get('total_copies'))
  };
  
  try {
    const response = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Book added successfully!');
      closeModal('add-book-modal');
      e.target.reset();
      loadDashboardStats();
      loadBooksForDropdown();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error adding book:', error);
    alert('Failed to add book');
  }
});

// ============================================
// ADD MEMBER FORM HANDLER
// ============================================
document.getElementById('add-member-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const memberData = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    address: formData.get('address')
  };
  
  try {
    const response = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(memberData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Member registered successfully!');
      closeModal('add-member-modal');
      e.target.reset();
      loadDashboardStats();
      loadMembersForDropdown();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error adding member:', error);
    alert('Failed to register member');
  }
});

// ============================================
// ISSUE BOOK FORM HANDLER
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
      loadDashboardStats();
      loadRecentActivity();
      loadBooksForDropdown();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error issuing book:', error);
    alert('Failed to issue book');
  }
});