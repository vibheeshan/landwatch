// ========================================
// LAND LITIGATION LOOKUP SYSTEM
// Application Logic — Enhanced
// ========================================

let currentPage = 'search';
let currentAdmin = null;
let currentAuditFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSearch();
  initModal();
  initAdmin();
  initAuditFilters();
  initUserAuth();
  renderOnlineUsers();
});

// ========================================
// NAVIGATION
// ========================================
function initNavigation() {
  document.querySelectorAll('.nav-links a[data-page]').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); navigateTo(link.dataset.page); });
  });
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('open');
  });
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-links a[data-page]').forEach(l => l.classList.remove('active'));
  const active = document.querySelector(`.nav-links a[data-page="${page}"]`);
  if (active) active.classList.add('active');
  document.getElementById('nav-links').classList.remove('open');

  ['page-search', 'stats-bar', 'online-users-bar', 'results-panel', 'no-results', 'page-alerts', 'page-admin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  switch (page) {
    case 'search':
      document.getElementById('page-search').classList.remove('hidden');
      document.getElementById('stats-bar').classList.remove('hidden');
      document.getElementById('online-users-bar').classList.remove('hidden');
      if (document.getElementById('results-content').innerHTML)
        document.getElementById('results-panel').classList.remove('hidden');
      break;
    case 'alerts':
      document.getElementById('page-alerts').classList.remove('hidden');
      renderAlerts();
      break;
    case 'admin':
      document.getElementById('page-admin').classList.remove('hidden');
      break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// USER AUTH (Login / Register)
// ========================================
function initUserAuth() {
  document.getElementById('user-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const user = authenticateUser(email, password);
    if (user) {
      DB.currentUser = user;
      user.loginHistory.unshift({ timestamp: new Date().toISOString(), ip: '192.168.1.' + Math.floor(Math.random() * 254) });
      addAuditLog(user.name, 'login', `${user.role === 'lawyer' ? 'Lawyer' : 'Public user'} login${user.barCouncilId ? ' (Bar ID: ' + user.barCouncilId + ')' : ''}`, 'Portal');
      showToast('success', 'Welcome!', `Logged in as ${user.name} (${user.role === 'lawyer' ? 'Advocate' : 'Public User'})`);
      updateUserUI();
      closeUserLogin();
      renderOnlineUsers();
    } else {
      showToast('error', 'Login Failed', 'Invalid email or password.');
    }
  });

  document.getElementById('user-register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const role = document.getElementById('reg-role').value;
    const barId = document.getElementById('reg-bar-id').value.trim();
    const spec = document.getElementById('reg-specialization').value.trim();

    const user = registerUser(name, email, phone, password, role, barId, spec);
    if (user) {
      DB.currentUser = user;
      addAuditLog(user.name, 'login', `New ${role === 'lawyer' ? 'Lawyer' : 'Public'} registration & login`, 'Portal');
      showToast('success', 'Account Created!', `Welcome, ${user.name}! Your account has been created.`);
      updateUserUI();
      closeUserLogin();
      renderOnlineUsers();
    } else {
      showToast('error', 'Registration Failed', 'An account with this email already exists.');
    }
  });
}

function openUserLogin() {
  document.getElementById('user-login-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeUserLogin() {
  document.getElementById('user-login-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('user-login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('user-register-form').classList.toggle('hidden', tab !== 'register');
  document.getElementById('login-modal-title').textContent = tab === 'login' ? '👤 Login to LandWatch' : '📝 Create Account';
}

function toggleLawyerFields() {
  const isLawyer = document.getElementById('reg-role').value === 'lawyer';
  document.getElementById('lawyer-fields').classList.toggle('hidden', !isLawyer);
}

function updateUserUI() {
  const user = DB.currentUser;
  if (!user) {
    document.getElementById('user-area').classList.remove('hidden');
    document.getElementById('user-logged-in').classList.add('hidden');
    return;
  }
  document.getElementById('user-area').classList.add('hidden');
  document.getElementById('user-logged-in').classList.remove('hidden');
  document.getElementById('user-avatar').textContent = user.avatar;
  document.getElementById('user-name-display').textContent = user.name.split(' ')[0];
  const roleTag = document.getElementById('user-role-tag');
  roleTag.textContent = user.role === 'lawyer' ? 'Advocate' : 'Public';
  roleTag.className = 'user-role-tag ' + (user.role === 'lawyer' ? 'lawyer' : 'public');

  let headerInfo = `<strong>${user.name}</strong><br><span style="font-size:0.78rem;color:var(--text-muted)">${user.email}</span>`;
  if (user.role === 'lawyer') {
    headerInfo += `<br><span style="font-size:0.75rem;color:var(--accent-blue)">Bar ID: ${user.barCouncilId}</span>`;
    headerInfo += `<br><span style="font-size:0.75rem;color:var(--text-muted)">${user.specialization}</span>`;
  }
  document.getElementById('dropdown-header-info').innerHTML = headerInfo;
  document.getElementById('dropdown-my-cases').classList.toggle('hidden', user.role !== 'lawyer');
}

function toggleUserMenu() {
  document.getElementById('user-dropdown').classList.toggle('hidden');
}

function closeUserMenu() {
  document.getElementById('user-dropdown').classList.add('hidden');
}

function logoutUser() {
  const name = DB.currentUser ? DB.currentUser.name : 'User';
  DB.currentUser = null;
  updateUserUI();
  closeUserMenu();
  showToast('info', 'Logged Out', `${name} has been logged out.`);
}

function showMyCases() {
  closeUserMenu();
  if (!DB.currentUser || DB.currentUser.role !== 'lawyer') return;
  const userId = DB.currentUser.id;
  const myCases = DB.courtCases.filter(c =>
    (c.petitionerAdvocate && c.petitionerAdvocate.userId === userId) ||
    (c.respondentAdvocate && c.respondentAdvocate.userId === userId)
  );
  if (myCases.length === 0) {
    showToast('info', 'No Cases', 'No cases linked to your account.');
    return;
  }
  navigateTo('search');
  const resultsPanel = document.getElementById('results-panel');
  const resultsContent = document.getElementById('results-content');
  const resultsCount = document.getElementById('results-count');
  resultsPanel.classList.remove('hidden');
  resultsCount.innerHTML = `Your cases: <strong>${myCases.length}</strong> found`;
  let html = '<div class="cases-section"><h3>⚖️ Your Active Cases</h3><div class="case-cards-grid">';
  myCases.forEach(c => { html += renderCaseCard(c); });
  html += '</div></div>';
  resultsContent.innerHTML = html;
  bindCaseCardClicks();
  resultsPanel.scrollIntoView({ behavior: 'smooth' });
}

// ========================================
// ONLINE USERS
// ========================================
function renderOnlineUsers() {
  const grid = document.getElementById('online-users-grid');
  const count = document.getElementById('online-count');
  const lawyers = DB.users.filter(u => u.role === 'lawyer');
  const publicUsers = DB.users.filter(u => u.role === 'public');
  count.textContent = `${DB.users.length} registered · ${lawyers.length} lawyers · ${publicUsers.length} public`;

  grid.innerHTML = DB.users.map(u => {
    const lastLogin = u.loginHistory.length > 0 ? timeAgo(u.loginHistory[0].timestamp) : 'Never';
    const isOnline = u.loginHistory.length > 0 && (new Date() - new Date(u.loginHistory[0].timestamp)) < 86400000;
    return `
      <div class="online-user-card ${u.role}">
        <div class="ou-avatar ${isOnline ? 'online' : ''}">${u.avatar}</div>
        <div class="ou-info">
          <div class="ou-name">${u.name}</div>
          <div class="ou-role">${u.role === 'lawyer' ? '⚖️ Advocate' : '👤 Public User'}</div>
          ${u.barCouncilId ? `<div class="ou-bar">Bar: ${u.barCouncilId}</div>` : ''}
          <div class="ou-last-login">${isOnline ? '🟢 Active' : '⚪ ' + lastLogin}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const badge = document.getElementById('user-badge');
  const dropdown = document.getElementById('user-dropdown');
  if (badge && dropdown && !badge.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

// ========================================
// SEARCH + AUTOCOMPLETE
// ========================================
function initSearch() {
  document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); performSearch(); });

  // Village autocomplete
  const villageInput = document.getElementById('village-input');
  let acDropdown = document.createElement('div');
  acDropdown.className = 'autocomplete-dropdown';
  acDropdown.id = 'ac-dropdown';
  villageInput.parentElement.style.position = 'relative';
  villageInput.parentElement.appendChild(acDropdown);

  villageInput.addEventListener('input', () => {
    const val = villageInput.value.trim().toLowerCase();
    if (val.length < 1) { acDropdown.classList.remove('visible'); return; }
    const allVillages = [...new Set(DB.landRecords.map(r => r.village))];
    const matches = allVillages.filter(v => v.toLowerCase().includes(val));
    if (matches.length === 0) { acDropdown.classList.remove('visible'); return; }
    acDropdown.innerHTML = matches.map(v => {
      const rec = DB.landRecords.filter(r => r.village === v);
      const surveys = rec.map(r => r.surveyNumber).join(', ');
      return `<div class="ac-item" data-village="${v}">
        <span class="ac-village">📍 ${v}</span>
        <span class="ac-surveys">Surveys: ${surveys}</span>
      </div>`;
    }).join('');
    acDropdown.classList.add('visible');
    acDropdown.querySelectorAll('.ac-item').forEach(item => {
      item.addEventListener('click', () => {
        villageInput.value = item.dataset.village;
        acDropdown.classList.remove('visible');
        document.getElementById('survey-input').focus();
      });
    });
  });

  villageInput.addEventListener('blur', () => { setTimeout(() => acDropdown.classList.remove('visible'), 200); });

  // Ctrl+K shortcut to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      navigateTo('search');
      villageInput.focus();
      villageInput.select();
      showToast('info', '🔍 Search Mode', 'Type a village name to begin...');
    }
  });
}

function fillSearch(village, survey) {
  document.getElementById('village-input').value = village;
  document.getElementById('survey-input').value = survey;
  performSearch();
}

function performSearch() {
  const village = document.getElementById('village-input').value.trim();
  const survey = document.getElementById('survey-input').value.trim();
  if (!village) { showToast('warning', 'Missing Input', 'Please enter a village name.'); return; }

  const userName = DB.currentUser ? DB.currentUser.name : 'System';
  addAuditLog(userName, 'search', `Search: ${village}, Survey ${survey || 'Any'}`, 'Search');

  const resultsPanel = document.getElementById('results-panel');
  const resultsContent = document.getElementById('results-content');
  const noResults = document.getElementById('no-results');
  const resultsCount = document.getElementById('results-count');
  resultsPanel.classList.remove('hidden');
  noResults.classList.add('hidden');
  resultsContent.innerHTML = renderLoadingSkeleton();

  setTimeout(() => {
    const results = searchLandRecords(village, survey);
    if (results.length === 0) {
      resultsPanel.classList.add('hidden');
      noResults.classList.remove('hidden');
      return;
    }
    resultsCount.innerHTML = `Found <strong>${results.length}</strong> record${results.length > 1 ? 's' : ''}`;
    let html = '';
    results.forEach(record => {
      const cases = getCasesForLand(record);
      html += renderLandCard(record);
      html += renderPreviousOwners(record);
      if (cases.length > 0) {
        html += `<div class="cases-section"><h3>⚖️ Linked Court Cases (${cases.length})</h3><div class="case-cards-grid">`;
        cases.forEach(c => { html += renderCaseCard(c); });
        html += '</div></div>';
      } else {
        html += `<div class="no-cases-banner animate-in"><span class="banner-icon">✅</span><div><strong>No Active Litigation</strong><p>This land parcel has no ongoing or past court cases.</p></div></div>`;
      }
    });
    resultsContent.innerHTML = html;
    bindCaseCardClicks();
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 800);
}

function bindCaseCardClicks() {
  document.querySelectorAll('.case-card[data-case-id]').forEach(card => {
    card.addEventListener('click', () => openCaseModal(card.dataset.caseId));
  });
}

function renderLoadingSkeleton() {
  return `<div class="loading-card"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line long"></div></div>
  <div class="loading-card"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line long"></div></div>`;
}

function renderLandCard(record) {
  const isAdmin = currentAdmin !== null;
  return `
    <div class="land-info-card animate-in">
      <div class="land-info-header">
        <h3><span class="icon">🏞️</span> Land Record — ${record.village}, Survey ${record.surveyNumber}</h3>
        <div class="risk-badge ${record.riskScore}"><span class="risk-dot"></span>${getRiskLabel(record.riskScore)}</div>
      </div>
      <div class="land-details-grid">
        <div class="land-detail-item"><div class="label">Land Holder</div><div class="value">${record.landHolder.name}</div></div>
        <div class="land-detail-item"><div class="label">Father's Name</div><div class="value">${record.landHolder.fatherName}</div></div>
        <div class="land-detail-item">
          <div class="label">Aadhaar</div>
          <div class="value masked" id="aadhaar-${record.id}">${record.landHolder.aadhaar}</div>
          <button class="reveal-btn" onclick="toggleReveal('${record.id}', 'aadhaar', this)">👁️ Reveal</button>
        </div>
        <div class="land-detail-item">
          <div class="label">PAN</div>
          <div class="value masked" id="pan-${record.id}">${record.landHolder.pan}</div>
          <button class="reveal-btn" onclick="toggleReveal('${record.id}', 'pan', this)">👁️ Reveal</button>
        </div>
        <div class="land-detail-item"><div class="label">Area</div><div class="value">${record.area}</div></div>
        <div class="land-detail-item"><div class="label">Land Type</div><div class="value">${record.landType}</div></div>
        <div class="land-detail-item"><div class="label">Classification</div><div class="value">${record.classification}</div></div>
        <div class="land-detail-item"><div class="label">Registration No.</div><div class="value" style="font-family:var(--font-mono);font-size:0.85rem">${record.registrationNo}</div></div>
        <div class="land-detail-item"><div class="label">Registered Date</div><div class="value">${formatDate(record.registeredDate)}</div></div>
        <div class="land-detail-item"><div class="label">Market Value</div><div class="value">${record.marketValue}</div></div>
        <div class="land-detail-item"><div class="label">District / State</div><div class="value">${record.district}, ${record.state}</div></div>
        <div class="land-detail-item"><div class="label">Verification</div><div class="value">${record.verified ? '<span style="color:var(--accent-green)">✅ Verified</span>' : '<span style="color:var(--accent-amber)">⚠️ Unverified</span>'}</div></div>
      </div>
    </div>`;
}

function toggleReveal(recordId, type, btn) {
  const record = DB.landRecords.find(r => r.id === recordId);
  if (!record) return;
  const el = document.getElementById(`${type}-${recordId}`);
  if (el.classList.contains('masked')) {
    el.classList.remove('masked');
    el.textContent = type === 'aadhaar' ? record.landHolder.aadhaarFull : record.landHolder.panFull;
    btn.textContent = '🔒 Hide';
    showToast('info', 'Data Revealed', `Sensitive ${type.toUpperCase()} information is now visible.`);
  } else {
    el.classList.add('masked');
    el.textContent = record.landHolder[type];
    btn.textContent = '👁️ Reveal';
  }
}

function renderPreviousOwners(record) {
  if (!record.previousOwners || record.previousOwners.length === 0) return '';
  return `
    <div class="prev-owners-card animate-in">
      <h3><span class="icon">📜</span> Ownership History — Previous Land Owners</h3>
      <div class="ownership-timeline">
        ${record.previousOwners.map((owner, i) => `
          <div class="ownership-item ${i === 0 ? 'latest' : ''}">
            <div class="own-marker">${i + 1}</div>
            <div class="own-details">
              <div class="own-name">${owner.name}</div>
              <div class="own-meta">
                <span>👤 ${owner.relation}</span>
                <span>📅 ${owner.period}</span>
              </div>
              <div class="own-meta">
                <span>📄 ${owner.transferType}</span>
                <span style="font-family:var(--font-mono);font-size:0.78rem">Deed: ${owner.deedNo}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderCaseCard(c) {
  const statusClass = getStatusClass(c.status);
  const statusLabel = getStatusLabel(c.status);
  const finishedTag = c.caseFinished
    ? '<span class="case-finished-tag">✅ CASE DISPOSED</span>'
    : '<span class="case-ongoing-tag">🔴 ONGOING</span>';

  return `
    <div class="case-card animate-in" data-case-id="${c.id}">
      <div class="case-card-header">
        <div><div class="case-number">${c.caseNumber}</div>${finishedTag}</div>
        <div class="case-status ${statusClass}"><span class="status-dot"></span>${statusLabel}</div>
      </div>
      <div class="case-title">${c.title}</div>
      <div class="case-court">🏛️ ${c.court}</div>
      <div class="case-judge-bar">
        <span class="judge-icon">👨‍⚖️</span>
        <span class="judge-name">${c.judge}</span>
        ${c.judgeDetails ? `<span class="judge-desg">(${c.judgeDetails.designation})</span>` : ''}
      </div>
      <div class="case-meta">
        <div class="case-meta-item"><span class="meta-icon">📅</span>Filed: ${formatDate(c.filedDate)}</div>
        <div class="case-meta-item"><span class="meta-icon">⏰</span>Next: ${c.nextHearing ? formatDate(c.nextHearing) : 'Disposed'}</div>
        <div class="case-meta-item"><span class="meta-icon">📂</span>${c.caseType}</div>
      </div>
      <div class="case-advocates-bar">
        <div class="adv-item"><span class="adv-label">Petitioner's Advocate:</span> ${c.petitionerAdvocate ? c.petitionerAdvocate.name : 'N/A'}</div>
        <div class="adv-item"><span class="adv-label">Respondent's Advocate:</span> ${c.respondentAdvocate ? c.respondentAdvocate.name : 'N/A'}</div>
      </div>
      <div class="case-summary">${c.summary}</div>
      <div class="view-details">View Full Details & Timeline →</div>
    </div>`;
}

function getStatusClass(s) { return { pending: 'pending', hearing: 'hearing', disposed: 'disposed', stayed: 'stayed', appealed: 'appealed' }[s] || 'pending'; }
function getStatusLabel(s) { return { pending: 'Pending', hearing: 'Under Hearing', disposed: 'Disposed', stayed: 'Stayed', appealed: 'Under Appeal' }[s] || 'Unknown'; }

// ========================================
// CASE DETAIL MODAL
// ========================================
function initModal() {
  const overlay = document.getElementById('case-modal');
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeUserLogin(); } });
}

function openCaseModal(caseId) {
  const c = getCaseById(caseId);
  if (!c) return;
  const userName = DB.currentUser ? DB.currentUser.name : 'System';
  addAuditLog(userName, 'view', `Case viewed: ${c.caseNumber}`, caseId);

  const statusLabel = getStatusLabel(c.status);
  const statusClass = getStatusClass(c.status);
  document.getElementById('modal-title').innerHTML = `📋 ${c.caseNumber}`;
  const isSubscribed = DB.alertSubscriptions.some(s => s.caseId === caseId);

  document.getElementById('modal-body').innerHTML = `
    <!-- Case Finished Banner -->
    ${c.caseFinished ? `<div class="case-disposed-banner">✅ This case has been <strong>disposed / completed</strong>. No further hearings scheduled.</div>` : `<div class="case-active-banner">🔴 This case is <strong>ongoing</strong>. Next hearing: <strong>${formatDate(c.nextHearing)}</strong></div>`}

    <div class="modal-section">
      <h4>📌 Case Information</h4>
      <div class="case-info-grid">
        <div class="case-info-item"><div class="label">Case Number</div><div class="value" style="font-family:var(--font-mono)">${c.caseNumber}</div></div>
        <div class="case-info-item"><div class="label">Status</div><div class="value"><span class="case-status ${statusClass}"><span class="status-dot"></span>${statusLabel}</span></div></div>
        <div class="case-info-item"><div class="label">Court</div><div class="value">${c.court}</div></div>
        <div class="case-info-item"><div class="label">Case Type</div><div class="value">${c.caseType}</div></div>
        <div class="case-info-item"><div class="label">Filed Date</div><div class="value">${formatDate(c.filedDate)}</div></div>
        <div class="case-info-item"><div class="label">Next Hearing</div><div class="value" style="color:${c.nextHearing ? 'var(--accent-amber)' : 'var(--accent-green)'}">${c.nextHearing ? formatDate(c.nextHearing) : 'Case Disposed'}</div></div>
        <div class="case-info-item"><div class="label">Survey No.</div><div class="value">${c.linkedSurvey}</div></div>
        <div class="case-info-item"><div class="label">Village</div><div class="value">${c.linkedVillage}</div></div>
      </div>
    </div>

    <div class="modal-section">
      <h4>👨‍⚖️ Presiding Judge</h4>
      <div class="judge-detail-card">
        <div class="judge-avatar">👨‍⚖️</div>
        <div class="judge-info">
          <div class="judge-full-name">${c.judge}</div>
          ${c.judgeDetails ? `
            <div class="judge-meta"><span>🏛️ ${c.judgeDetails.designation}</span></div>
            <div class="judge-meta"><span>📍 ${c.judgeDetails.court}</span></div>
            <div class="judge-meta"><span>📅 Appointed: ${c.judgeDetails.appointedYear}</span></div>
          ` : ''}
        </div>
      </div>
    </div>

    <div class="modal-section">
      <h4>👥 Parties & Advocates</h4>
      <div class="parties-grid">
        <div class="party-card petitioner">
          <div class="party-side">PETITIONER</div>
          <div class="party-name">${c.petitioner}</div>
          <div class="party-adv">
            <span class="adv-icon">⚖️</span>
            <div>
              <div class="adv-name">${c.petitionerAdvocate ? c.petitionerAdvocate.name : 'N/A'}</div>
              ${c.petitionerAdvocate ? `<div class="adv-bar">Bar ID: ${c.petitionerAdvocate.barId}</div>` : ''}
            </div>
          </div>
        </div>
        <div class="party-vs">VS</div>
        <div class="party-card respondent">
          <div class="party-side">RESPONDENT</div>
          <div class="party-name">${c.respondent}</div>
          <div class="party-adv">
            <span class="adv-icon">⚖️</span>
            <div>
              <div class="adv-name">${c.respondentAdvocate ? c.respondentAdvocate.name : 'N/A'}</div>
              ${c.respondentAdvocate ? `<div class="adv-bar">Bar ID: ${c.respondentAdvocate.barId}</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-section">
      <h4>📄 Case Summary</h4>
      <p style="color:var(--text-secondary);line-height:1.8;font-size:0.92rem">${c.summary}</p>
    </div>

    <div class="modal-section">
      <h4>📅 Timeline of Events (${c.timeline.length} entries)</h4>
      <div class="timeline">
        ${c.timeline.map(t => `
          <div class="timeline-item ${t.type}">
            <div class="timeline-date">${formatDate(t.date)}</div>
            <div class="timeline-event">${t.event}</div>
            <div class="timeline-detail">${t.detail}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="modal-section">
      <h4>🔔 Alert Subscription</h4>
      ${!c.caseFinished ? `
        <div id="subscribe-area">
          ${isSubscribed ? `
            <button class="btn-subscribe subscribed" disabled>✅ Already Subscribed</button>
            <p style="margin-top:8px;font-size:0.82rem;color:var(--text-muted)">You'll receive updates when status changes.</p>
          ` : `
            <div class="subscribe-form">
              <input type="email" id="sub-email" placeholder="Email" value="${DB.currentUser ? DB.currentUser.email : 'demo@example.com'}">
              <input type="tel" id="sub-phone" placeholder="Phone" value="${DB.currentUser ? DB.currentUser.phone : '+91 98765 43210'}">
              <button class="btn-primary" onclick="subscribeToCaseAlert('${caseId}')">Subscribe</button>
            </div>
          `}
        </div>
      ` : `<p style="color:var(--text-muted);font-size:0.88rem">This case has been disposed. No further alerts needed.</p>`}
    </div>
  `;

  document.getElementById('case-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('case-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function subscribeToCaseAlert(caseId) {
  const email = document.getElementById('sub-email').value.trim();
  const phone = document.getElementById('sub-phone').value.trim();
  if (!email) { showToast('warning', 'Email Required', 'Please enter an email.'); return; }
  const sub = addAlertSubscription(caseId, email, phone);
  if (sub) {
    addAuditLog(DB.currentUser ? DB.currentUser.name : 'System', 'alert', `Alert subscribed: ${sub.caseNumber}`, caseId);
    showToast('success', 'Subscribed!', `Alerts for case ${sub.caseNumber} → ${email}`);
    document.getElementById('subscribe-area').innerHTML = `<button class="btn-subscribe subscribed" disabled>✅ Subscribed</button><p style="margin-top:8px;font-size:0.82rem;color:var(--text-muted)">Alerts → ${email}</p>`;
  }
}

// ========================================
// ALERTS
// ========================================
function renderAlerts() {
  const list = document.getElementById('alert-subscriptions-list');
  const noAlerts = document.getElementById('no-alerts');
  if (DB.alertSubscriptions.length === 0) { list.innerHTML = ''; noAlerts.classList.remove('hidden'); return; }
  noAlerts.classList.add('hidden');
  list.innerHTML = DB.alertSubscriptions.map(sub => {
    const cd = getCaseById(sub.caseId);
    return `<div class="alert-subscription-card animate-in">
      <div class="alert-info"><div class="alert-icon-box">🔔</div><div class="alert-details">
        <h4>${sub.caseNumber}${cd ? ' — ' + cd.title : ''}</h4>
        <p>Status: ${cd ? getStatusLabel(cd.status) : 'Unknown'} · Subscribed: ${formatDate(sub.subscribedAt)} · ${sub.email}</p>
      </div></div>
      <button class="btn-unsubscribe" onclick="unsubscribeAlert('${sub.id}')">Unsubscribe</button>
    </div>`;
  }).join('');
}

function unsubscribeAlert(subId) {
  const sub = DB.alertSubscriptions.find(s => s.id === subId);
  if (sub) {
    addAuditLog(DB.currentUser ? DB.currentUser.name : 'System', 'alert', `Unsubscribed: ${sub.caseNumber}`, sub.caseId);
    removeAlertSubscription(subId);
    showToast('info', 'Unsubscribed', 'Alert removed.');
    renderAlerts();
  }
}

// ========================================
// ADMIN
// ========================================
function initAdmin() {
  document.getElementById('admin-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = authenticateAdmin(document.getElementById('admin-user').value.trim(), document.getElementById('admin-pass').value.trim());
    if (user) {
      currentAdmin = user;
      addAuditLog(user.username, 'login', `Admin login (${user.role})`, 'Admin Panel');
      showToast('success', 'Welcome!', `Logged in as ${user.name}`);
      showAdminDashboard();
    } else {
      showToast('error', 'Login Failed', 'Invalid credentials.');
    }
  });
  document.getElementById('admin-logout-btn').addEventListener('click', () => {
    currentAdmin = null;
    document.getElementById('admin-login-section').classList.remove('hidden');
    document.getElementById('admin-dashboard-section').classList.add('hidden');
    showToast('info', 'Logged Out', 'Admin session ended.');
  });

  // Admin record edit form
  document.getElementById('edit-record-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-rec-id').value;
    const record = DB.landRecords.find(r => r.id === id);
    if (!record) return;

    record.village = document.getElementById('edit-village').value.trim();
    record.surveyNumber = document.getElementById('edit-survey').value.trim();
    record.landHolder.name = document.getElementById('edit-holder').value.trim();
    record.landHolder.fatherName = document.getElementById('edit-father').value.trim();
    record.area = document.getElementById('edit-area').value.trim();
    record.landType = document.getElementById('edit-type').value.trim();
    record.riskScore = document.getElementById('edit-risk').value;
    record.verified = document.getElementById('edit-verified').value === 'true';

    addAuditLog(currentAdmin.username, 'update', `Record ${id} updated: ${record.village}, ${record.surveyNumber}`, id);
    showToast('success', 'Updated', `Record ${id} has been successfully updated.`);
    closeEditModal();
    updateAdminStats();
    renderAdminRecords('all');
    renderAuditLog();
  });
}

function openEditModal(id) {
  const record = DB.landRecords.find(r => r.id === id);
  if (!record) return;

  document.getElementById('edit-rec-id').value = record.id;
  document.getElementById('edit-village').value = record.village;
  document.getElementById('edit-survey').value = record.surveyNumber;
  document.getElementById('edit-holder').value = record.landHolder.name;
  document.getElementById('edit-father').value = record.landHolder.fatherName;
  document.getElementById('edit-area').value = record.area;
  document.getElementById('edit-type').value = record.landType;
  document.getElementById('edit-risk').value = record.riskScore;
  document.getElementById('edit-verified').value = record.verified ? 'true' : 'false';

  document.getElementById('edit-record-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  document.getElementById('edit-record-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function showAdminDashboard() {
  document.getElementById('admin-login-section').classList.add('hidden');
  document.getElementById('admin-dashboard-section').classList.remove('hidden');
  updateAdminStats();
  renderAdminRecords('all');
  renderAdminUsers('all');
  renderAuditLog();
}

function updateAdminStats() {
  const total = DB.landRecords.length;
  const verified = DB.landRecords.filter(r => r.verified).length;
  document.getElementById('admin-total-records').textContent = total;
  document.getElementById('admin-verified').textContent = verified;
  document.getElementById('admin-unverified').textContent = total - verified;
  document.getElementById('admin-active-cases').textContent = DB.courtCases.filter(c => !c.caseFinished).length;
  document.getElementById('admin-total-users').textContent = DB.users.length;
  document.getElementById('admin-total-lawyers').textContent = DB.users.filter(u => u.role === 'lawyer').length;
}

function renderAdminUsers(filter) {
  const tbody = document.getElementById('admin-users-tbody');
  let users = DB.users;
  if (filter === 'public') users = users.filter(u => u.role === 'public');
  if (filter === 'lawyer') users = users.filter(u => u.role === 'lawyer');

  document.querySelectorAll('#filter-all-users,#filter-public-users,#filter-lawyer-users').forEach(b => b.classList.remove('primary'));
  document.getElementById(`filter-${filter === 'all' ? 'all' : filter}-users`).classList.add('primary');

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight:600;color:var(--text-primary)">${u.avatar} ${u.name}</td>
      <td style="font-size:0.82rem">${u.email}</td>
      <td><span class="user-role-tag ${u.role}" style="font-size:0.72rem;padding:2px 8px">${u.role === 'lawyer' ? '⚖️ Advocate' : '👤 Public'}</span></td>
      <td style="font-family:var(--font-mono);font-size:0.8rem">${u.barCouncilId || '—'}</td>
      <td style="font-size:0.82rem">${u.specialization || '—'}</td>
      <td style="font-size:0.8rem;color:var(--text-muted)">${u.loginHistory.length > 0 ? formatDateTime(u.loginHistory[0].timestamp) : 'Never'}</td>
    </tr>
  `).join('');

  document.getElementById('filter-all-users').onclick = () => renderAdminUsers('all');
  document.getElementById('filter-public-users').onclick = () => renderAdminUsers('public');
  document.getElementById('filter-lawyer-users').onclick = () => renderAdminUsers('lawyer');
}

function renderAdminRecords(filter) {
  const tbody = document.getElementById('admin-records-tbody');
  let records = DB.landRecords;
  if (filter === 'verified') records = records.filter(r => r.verified);
  if (filter === 'unverified') records = records.filter(r => !r.verified);

  document.querySelectorAll('#filter-all-btn,#filter-verified-btn,#filter-unverified-btn').forEach(b => b.classList.remove('primary'));
  document.getElementById(`filter-${filter === 'all' ? 'all' : filter === 'verified' ? 'verified' : 'unverified'}-btn`).classList.add('primary');

  tbody.innerHTML = records.map(r => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:0.82rem;color:var(--text-muted)">${r.id}</td>
      <td style="color:var(--text-primary);font-weight:600">${r.village}</td>
      <td style="font-family:var(--font-mono)">${r.surveyNumber}</td>
      <td>${r.landHolder.name}</td>
      <td style="font-size:0.82rem">${r.landType}</td>
      <td><span class="risk-badge ${r.riskScore}"><span class="risk-dot"></span>${getRiskLabel(r.riskScore)}</span></td>
      <td><span class="verify-badge ${r.verified ? 'verified' : 'unverified'}">${r.verified ? '✅ Verified' : '⚠️ Unverified'}</span></td>
      <td style="white-space:nowrap">
        ${!r.verified ? `<button class="btn-sm success" onclick="verifyRecord('${r.id}')">Verify</button>` : ''}
        <button class="btn-sm" onclick="viewRecordDetails('${r.id}')">View</button>
        <button class="btn-edit-rec" onclick="openEditModal('${r.id}')">✏️ Edit</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('filter-all-btn').onclick = () => renderAdminRecords('all');
  document.getElementById('filter-verified-btn').onclick = () => renderAdminRecords('verified');
  document.getElementById('filter-unverified-btn').onclick = () => renderAdminRecords('unverified');
}

function verifyRecord(id) {
  const rec = DB.landRecords.find(r => r.id === id);
  if (rec && currentAdmin) {
    rec.verified = true;
    addAuditLog(currentAdmin.username, 'verify', `Record ${id} verified by ${currentAdmin.name}`, id);
    showToast('success', 'Verified', `${rec.village} Survey ${rec.surveyNumber} verified.`);
    updateAdminStats(); renderAdminRecords('all'); renderAuditLog();
  }
}

function viewRecordDetails(id) {
  const rec = DB.landRecords.find(r => r.id === id);
  if (!rec) return;
  navigateTo('search');
  document.getElementById('village-input').value = rec.village;
  document.getElementById('survey-input').value = rec.surveyNumber;
  performSearch();
}

// ========================================
// AUDIT LOG
// ========================================
function initAuditFilters() {
  document.querySelectorAll('.audit-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.audit-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAuditFilter = btn.dataset.filter;
      renderAuditLog();
    });
  });
}

function renderAuditLog() {
  const container = document.getElementById('audit-entries');
  let logs = currentAuditFilter === 'all' ? DB.auditLogs : DB.auditLogs.filter(l => l.action === currentAuditFilter);
  if (logs.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:var(--space-xl)"><div class="empty-icon" style="font-size:2rem">📝</div><h3 style="font-size:1rem">No Entries</h3></div>`;
    return;
  }
  container.innerHTML = logs.map(log => `
    <div class="audit-entry"><div class="audit-time">${formatDateTime(log.timestamp)}</div>
    <div class="audit-action-badge ${log.action}">${log.action}</div>
    <div class="audit-description">${log.description}</div>
    <div class="audit-user">${log.user}</div></div>
  `).join('');
}

// ========================================
// TOASTS
// ========================================
function showToast(type, title, message) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-icon">${icons[type] || 'ℹ️'}</div><div class="toast-text"><div class="toast-title">${title}</div><div class="toast-msg">${message}</div></div>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => { toast.classList.add('leaving'); setTimeout(() => toast.remove(), 300); }, 4000);
}
