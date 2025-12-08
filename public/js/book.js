const API_BASE = 'http://localhost:3000/api';
let allBooks = [];

// Load books on page load
document.addEventListener('DOMContentLoaded', () => {
  loadBooks();
  
  // Search functionality
  document.getElementById('search-input').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredBooks = allBooks.filter(book => 
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm) ||
      (book.category && book.category.toLowerCase().includes(searchTerm))
    );
    displayBooks(filteredBooks);
  });
});

// ============================================
// LOAD BOOKS (local DB)
// ============================================
async function loadBooks() {
  try {
    const response = await fetch(`${API_BASE}/books`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allBooks = data || [];
    displayBooks(allBooks);
  } catch (err) {
    console.error('Error loading books from local API:', err);
    // fall back to empty list
    allBooks = [];
    displayBooks(allBooks);
  }
}

// loadMoreBooks is not applicable when loading from local DB (server returns stored collection)
async function loadMoreBooks() {
  alert('Using local stored collection: all stored books are loaded from server.');
}

// ============================================
// DISPLAY BOOKS
// ============================================
function displayBooks(books) {
  const tbody = document.getElementById('books-table-body');
  document.getElementById('book-count').textContent = books.length;
  
  if (books.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="padding: 60px;">
          <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <p>No books found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = books.map(book => {
    let availabilityClass = 'available';
    let availabilityText = `${book.available_copies}/${book.total_copies} available`;
    
    if (book.available_copies === 0) {
      availabilityClass = 'unavailable';
      availabilityText = 'Unavailable';
    } else if (book.available_copies <= book.total_copies * 0.3) {
      availabilityClass = 'limited';
    }
    
    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div class="book-icon-cell">
              <img src="${book.image ? book.image : 'https://via.placeholder.com/48x64?text=No+Cover'}" alt="cover" style="width:48px;height:64px;object-fit:cover;border-radius:4px;">
            </div>
            <strong>${book.title}</strong>
          </div>
        </td>
        <td>${book.author}</td>
        <td>${book.category || '-'}</td>
        <td>${book.year || '-'}</td>
        <td>${book.isbn || '-'}</td>
        <td>
          <span class="availability-badge ${availabilityClass}">
            ${availabilityText}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary btn-icon" onclick="editBook(${book.id})" title="Edit">
            ✏️
          </button>
          <button class="btn btn-danger btn-icon" onclick="deleteBook(${book.id}, '${book.title}')" title="Delete">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function showAddBookModal() {
  document.getElementById('add-book-modal').classList.add('active');
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
// ADD BOOK
// ============================================
document.getElementById('add-book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const bookData = {
    title: formData.get('title'),
    author: formData.get('author'),
    isbn: formData.get('isbn'),
    category: formData.get('category'),
    image: formData.get('image') || null,
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
      loadBooks();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error adding book:', error);
    alert('Failed to add book');
  }
});

// ============================================
// EDIT BOOK
// ============================================
async function editBook(id) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`);
    const book = await response.json();
    
    // Fill form with book data
    document.getElementById('edit-book-id').value = book.id;
    document.getElementById('edit-title').value = book.title;
    document.getElementById('edit-author').value = book.author;
    document.getElementById('edit-isbn').value = book.isbn || '';
    // populate image field if available
    if (document.getElementById('edit-image')) document.getElementById('edit-image').value = book.image || '';
    document.getElementById('edit-category').value = book.category || '';
    document.getElementById('edit-year').value = book.year || '';
    document.getElementById('edit-total-copies').value = book.total_copies;
    
    // Show modal
    document.getElementById('edit-book-modal').classList.add('active');
  } catch (error) {
    console.error('Error loading book:', error);
    alert('Failed to load book details');
  }
}

// ============================================
// UPDATE BOOK
// ============================================
document.getElementById('edit-book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const id = formData.get('id');
  const bookData = {
    title: formData.get('title'),
    author: formData.get('author'),
    isbn: formData.get('isbn'),
    category: formData.get('category'),
    image: formData.get('image') || null,
    year: parseInt(formData.get('year')) || null,
    total_copies: parseInt(formData.get('total_copies'))
  };
  
  try {
    const response = await fetch(`${API_BASE}/books/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Book updated successfully!');
      closeModal('edit-book-modal');
      loadBooks();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error updating book:', error);
    alert('Failed to update book');
  }
});

// ============================================
// DELETE BOOK
// ============================================
async function deleteBook(id, title) {
  if (!confirm(`Are you sure you want to delete "${title}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/books/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Book deleted successfully!');
      loadBooks();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    alert('Failed to delete book');
  }
}