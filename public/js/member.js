const API_BASE = 'http://localhost:3000/api';
let allMembers = [];

// Load members on page load
document.addEventListener('DOMContentLoaded', () => {
  loadMembers();
  
  // Search functionality
  document.getElementById('search-input').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredMembers = allMembers.filter(member => 
      member.name.toLowerCase().includes(searchTerm) ||
      (member.email && member.email.toLowerCase().includes(searchTerm)) ||
      (member.phone && member.phone.toLowerCase().includes(searchTerm))
    );
    displayMembers(filteredMembers);
  });
});

// ============================================
// LOAD MEMBERS
// ============================================
async function loadMembers() {
  try {
    const response = await fetch(`${API_BASE}/members`);
    allMembers = await response.json();
    displayMembers(allMembers);
  } catch (error) {
    console.error('Error loading members:', error);
  }
}

// ============================================
// DISPLAY MEMBERS
// ============================================
function displayMembers(members) {
  const tbody = document.getElementById('members-table-body');
  document.getElementById('member-count').textContent = members.length;
  
  if (members.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding: 60px;">
          <div class="empty-state">
            <div class="empty-state-icon">👥</div>
            <p>No members found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = members.map(member => {
    const joinDate = new Date(member.join_date).toLocaleDateString();
    const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div class="member-avatar">${initials}</div>
            <strong>${member.name}</strong>
          </div>
        </td>
        <td>
          ${member.email || '-'}<br>
          <span class="text-muted">${member.phone || '-'}</span>
        </td>
        <td>${member.address || '-'}</td>
        <td>${joinDate}</td>
        <td>
          <button class="btn btn-secondary btn-icon" onclick="editMember(${member.id})" title="Edit">
            ✏️
          </button>
          <button class="btn btn-danger btn-icon" onclick="deleteMember(${member.id}, '${member.name}')" title="Delete">
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
function showAddMemberModal() {
  document.getElementById('add-member-modal').classList.add('active');
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
// ADD MEMBER
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
      loadMembers();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error adding member:', error);
    alert('Failed to register member');
  }
});

// ============================================
// EDIT MEMBER
// ============================================
async function editMember(id) {
  try {
    const response = await fetch(`${API_BASE}/members/${id}`);
    const member = await response.json();
    
    // Fill form with member data
    document.getElementById('edit-member-id').value = member.id;
    document.getElementById('edit-name').value = member.name;
    document.getElementById('edit-email').value = member.email || '';
    document.getElementById('edit-phone').value = member.phone || '';
    document.getElementById('edit-address').value = member.address || '';
    
    // Show modal
    document.getElementById('edit-member-modal').classList.add('active');
  } catch (error) {
    console.error('Error loading member:', error);
    alert('Failed to load member details');
  }
}

// ============================================
// UPDATE MEMBER
// ============================================
document.getElementById('edit-member-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const id = formData.get('id');
  const memberData = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    address: formData.get('address')
  };
  
  try {
    const response = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(memberData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Member updated successfully!');
      closeModal('edit-member-modal');
      loadMembers();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error updating member:', error);
    alert('Failed to update member');
  }
});

// ============================================
// DELETE MEMBER
// ============================================
async function deleteMember(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/members/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Member deleted successfully!');
      loadMembers();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error deleting member:', error);
    alert('Failed to delete member');
  }
}

// ============================================
// IMPORT MEMBERS FROM ONLINE API
// ============================================
function importMembersPrompt() {
  const input = prompt('How many members do you want to import? (e.g. 100)', '100');
  if (!input) return;
  const count = parseInt(input, 10);
  if (isNaN(count) || count <= 0) {
    alert('Please enter a valid positive number');
    return;
  }
  if (!confirm(`Import ${count} members from RandomUser API? This will create ${count} members.`)) return;
  importMembers(count).catch(err => {
    console.error('Import failed:', err);
    alert('Import failed (see console)');
  });
}

async function importMembers(count, batchSize = 50) {
  // Uses https://randomuser.me API to fetch fake users and POST them to our /api/members endpoint.
  // Be careful with very large numbers; this function is conservative and does sequential batches.
  let imported = 0;
  let failed = 0;

  function formatAddress(loc) {
    if (!loc) return '';
    const street = loc.street ? `${loc.street.number} ${loc.street.name}` : '';
    const parts = [street, loc.city, loc.state, loc.country, loc.postcode].filter(Boolean);
    return parts.join(', ');
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  while (imported + failed < count) {
    const toFetch = Math.min(batchSize, count - (imported + failed));
    const url = `https://randomuser.me/api/?results=${toFetch}&nat=us`;
    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      console.error('Failed to fetch users:', err);
      // backoff a bit then retry
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    const users = data.results || [];
    for (const u of users) {
      const memberData = {
        name: `${capitalize(u.name.first)} ${capitalize(u.name.last)}`,
        email: u.email,
        phone: u.phone || u.cell || '',
        address: formatAddress(u.location)
      };

      try {
        const resp = await fetch(`${API_BASE}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memberData)
        });
        if (!resp.ok) {
          failed++;
          const txt = await resp.text();
          console.error('Server error adding member:', txt);
        } else {
          imported++;
        }
      } catch (err) {
        failed++;
        console.error('Network error adding member:', err);
      }
    }

    // Small delay to be polite to the API/server
    await new Promise(r => setTimeout(r, 200));
    // update UI counts occasionally
    document.getElementById('member-count').textContent = (allMembers.length + imported).toString();
  }

  // Reload members list after import
  await loadMembers();
  alert(`Import finished — success: ${imported}, failed: ${failed}`);
}