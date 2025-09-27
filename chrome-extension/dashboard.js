function $(id){ return document.getElementById(id); }
// Load parsers only if not already loaded
if (!window.parsers) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('parsers.js');
  script.onload = () => {
    console.log('Parsers loaded successfully');
  };
  script.onerror = () => {
    console.error('Failed to load parsers.js');
  };
  document.head.appendChild(script);
}

async function getToken() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('oauthToken', async ({ oauthToken }) => {
      if (oauthToken?.accessToken) {
        // validate token
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${oauthToken.accessToken}` }
          });
          if (res.ok) return resolve(oauthToken.accessToken);
        } catch (_) {}
      }
      chrome.identity.getAuthToken({ interactive: true }, (t) => {
        if (chrome.runtime.lastError || !t) return reject(chrome.runtime.lastError || new Error('No token'));
        resolve(t);
      });
    });
  });
}

async function gmailThreads(token, query, pageToken) {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/threads');
  url.searchParams.set('maxResults', '50');
  if (query) url.searchParams.set('q', query);
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Gmail threads failed');
  return res.json();
}

async function gmailThreadsAll(token, query, max=200){
  const all = [];
  let next = undefined;
  do {
    const data = await gmailThreads(token, query, next);
    if (Array.isArray(data.threads)) all.push(...data.threads);
    next = data.nextPageToken;
  } while (next && all.length < max);
  return all;
}

async function gmailThreadDetail(token, id){
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Gmail thread detail failed');
  return res.json();
}

function parseAppFromSnippet(snippet) {
  const clean = snippet.replace(/<[^>]+>/g, '');
  const companyMatch = clean.match(/at\s+([A-Z][\w&\-. ]{1,40})/i);
  const roleMatch = clean.match(/(Designer|Engineer|Developer|Manager|Intern|Researcher|Product|Marketing)[\w \-]*/i);
  return {
    company: companyMatch ? companyMatch[1].trim() : 'Unknown',
    role: roleMatch ? roleMatch[0].trim() : 'Unknown',
  };
}

function render(list, stats) {
  if (!list.length) {
    const noDataEl = document.getElementById('noData');
    if (noDataEl) noDataEl.style.display = 'block';
    // Clear all columns
    ['applied', 'viewed', 'interview', 'offer', 'rejected', 'ghost'].forEach(status => {
      const column = document.getElementById(`${status}Column`);
      const count = document.getElementById(`${status}Count`);
      if (column) column.innerHTML = '';
      if (count) count.textContent = '0';
    });
  } else {
    const noDataEl = document.getElementById('noData');
    if (noDataEl) noDataEl.style.display = 'none';
    
    // Group applications by status
    const grouped = {
      applied: list.filter(item => (item.status || 'applied').toLowerCase() === 'applied'),
      viewed: list.filter(item => (item.status || 'applied').toLowerCase() === 'viewed'),
      interview: list.filter(item => (item.status || 'applied').toLowerCase() === 'interview'),
      offer: list.filter(item => (item.status || 'applied').toLowerCase() === 'offer'),
      rejected: list.filter(item => (item.status || 'applied').toLowerCase() === 'rejected'),
      ghost: list.filter(item => (item.status || 'applied').toLowerCase() === 'ghost')
    };
    
    // Render each column
    Object.keys(grouped).forEach(status => {
      const column = document.getElementById(`${status}Column`);
      const count = document.getElementById(`${status}Count`);
      const items = grouped[status];
      
      if (count) count.textContent = items.length;
      
      if (items.length === 0) {
        if (column) column.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 20px; font-size: 14px;">No applications</div>';
      } else {
        if (column) column.innerHTML = items.map(item => createJobCard(item)).join('');
      }
    });
  }
  
  // Update header stats
  const totalAppliedEl = document.getElementById('totalApplied');
  if (totalAppliedEl) totalAppliedEl.textContent = list.length;
  
  try { renderTrendChartFrom(list); } catch (_) {}
}

function createJobCard(item) {
  const link = `https://mail.google.com/mail/u/0/#inbox/${item.id}`;
  const status = (item.status || 'applied').toLowerCase();
  const applicationDate = new Date(item.applicationDate || Date.now());
  const dateStr = applicationDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: applicationDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
  
  return `
    <div class="job-card" data-id="${item.id}" draggable="true">
      <div class="job-title">${item.position || item.role || 'Position'}</div>
      <div class="job-company">${item.company || 'Company'}</div>
      <div class="job-date">Applied ${dateStr}</div>
      <div class="job-actions">
        <a href="${link}" target="_blank" class="job-link">View Email</a>
        <button class="job-menu" data-id="${item.id}">⋮</button>
      </div>
    </div>
  `;
}

// Modal handlers
function showModal(title, html){
  const modalTitleEl = document.getElementById('modalTitle');
  const modalBodyEl = document.getElementById('modalBody');
  const modalEl = document.getElementById('modal');
  
  if (modalTitleEl) modalTitleEl.textContent = title;
  if (modalBodyEl) modalBodyEl.innerHTML = html;
  if (modalEl) {
    modalEl.style.display = 'flex';
    modalEl.classList.remove('hidden');
  }
}
function hideModal(){
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t && t.id === 'modalClose') hideModal();
  if (t && t.id === 'modal') hideModal();
  if (t && t.classList && t.classList.contains('open-detail')){
    e.preventDefault();
    const id = t.getAttribute('data-id');
    chrome.storage.local.get('applications', ({ applications = [] }) => {
      const app = applications.find(a => a.id === id);
      if (!app) return;
      const body = `
        <div style="display:grid; grid-template-columns:140px 1fr; gap:10px;">
          <div class="muted">Company</div><div>${app.company || 'Unknown'}</div>
          <div class="muted">Role</div><div>${app.position || app.role || 'Undefined'}</div>
          <div class="muted">Status</div><div>${app.status || 'applied'}</div>
          <div class="muted">Platform</div><div>${app.platform || 'other'}</div>
          <div class="muted">Email</div><div>${(app.emailSubject||'')}</div>
          <div class="muted">Snippet</div><div>${app.snippet || ''}</div>
          <div class="muted">Timeline</div><div>${(app.statusHistory || []).map(h => `${h.status} at ${new Date(h.at).toLocaleDateString()}`).join('<br>')}</div>
          <div class="muted">Open in Gmail</div><div><a target="_blank" href="https://mail.google.com/mail/u/0/#inbox/${id}">Open thread</a></div>
        </div>
      `;
      showModal('Application Detail', body);
    });
  }
  // Handle job card clicks
  if (t && t.closest('.job-card')) {
    const jobCard = t.closest('.job-card');
    const id = jobCard.getAttribute('data-id');
    chrome.storage.local.get('applications', ({ applications = [] }) => {
      const app = applications.find(a => a.id === id);
      if (!app) return;
      const body = `
        <div style="display:grid; grid-template-columns:140px 1fr; gap:10px;">
          <div class="muted">Company</div><div>${app.company || 'Unknown'}</div>
          <div class="muted">Role</div><div>${app.position || app.role || 'Undefined'}</div>
          <div class="muted">Status</div><div>${app.status || 'applied'}</div>
          <div class="muted">Platform</div><div>${app.platform || 'other'}</div>
          <div class="muted">Email</div><div>${(app.emailSubject||'')}</div>
          <div class="muted">Snippet</div><div>${app.snippet || ''}</div>
          <div class="muted">Timeline</div><div>${(app.statusHistory || []).map(h => `${h.status} at ${new Date(h.at).toLocaleDateString()}`).join('<br>')}</div>
          <div class="muted">Open in Gmail</div><div><a target="_blank" href="https://mail.google.com/mail/u/0/#inbox/${id}">Open thread</a></div>
        </div>
      `;
      showModal('Application Detail', body);
    });
  }
});

// Drag and drop functionality
let draggedElement = null;

document.addEventListener('dragstart', (e) => {
  if (e.target.classList.contains('job-card')) {
    draggedElement = e.target;
    e.target.style.opacity = '0.5';
  }
});

document.addEventListener('dragend', (e) => {
  if (e.target.classList.contains('job-card')) {
    e.target.style.opacity = '1';
    draggedElement = null;
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  const targetColumn = e.target.closest('.kanban-column');
  if (targetColumn) {
    targetColumn.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  }
});

document.addEventListener('dragleave', (e) => {
  const targetColumn = e.target.closest('.kanban-column');
  if (targetColumn) {
    targetColumn.style.backgroundColor = '';
  }
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  const targetColumn = e.target.closest('.kanban-column');
  if (targetColumn && draggedElement) {
    const newStatus = targetColumn.getAttribute('data-status');
    const itemId = draggedElement.getAttribute('data-id');
    
    // Update the application status
    chrome.storage.local.get('applications', ({ applications = [] }) => {
      const appIndex = applications.findIndex(a => a.id === itemId);
      if (appIndex !== -1) {
        applications[appIndex].status = newStatus;
        if (!applications[appIndex].statusHistory) applications[appIndex].statusHistory = [];
        applications[appIndex].statusHistory.push({ 
          status: newStatus, 
          at: new Date().toISOString() 
        });
        
        chrome.storage.local.set({ applications }, () => {
          // Re-render the dashboard
          const stats = {
            applied: applications.length,
            viewed: applications.filter(x => (x.status || 'applied').toLowerCase() === 'viewed').length,
            interview: applications.filter(x => (x.status || 'applied').toLowerCase() === 'interview').length,
            offer: applications.filter(x => (x.status || 'applied').toLowerCase() === 'offer').length,
            rejected: applications.filter(x => (x.status || 'applied').toLowerCase() === 'rejected').length,
            ghost: applications.filter(x => (x.status || 'applied').toLowerCase() === 'ghost').length,
          };
          render(applications, stats);
        });
      }
    });
  }
  
  // Reset column background
  if (targetColumn) {
    targetColumn.style.backgroundColor = '';
  }
});

// Persist status change and append timeline
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t && t.classList && t.classList.contains('status-select')){
    const id = t.getAttribute('data-id');
    const val = t.value;
    chrome.storage.local.get('applications', ({ applications = [] }) => {
      const idx = applications.findIndex(a => a.id === id);
      if (idx === -1) return;
      applications[idx].status = val;
      if (!applications[idx].statusHistory) applications[idx].statusHistory = [];
      applications[idx].statusHistory.push({ status: val, at: new Date().toISOString() });
      chrome.storage.local.set({ applications }, () => {
        render(applications, {
          applied: applications.length, // Total applications
          viewed: applications.filter(x => (x.status || 'applied').toLowerCase() === 'viewed').length,
          interview: applications.filter(x => (x.status || 'applied').toLowerCase() === 'interview').length,
          offer: applications.filter(x => (x.status || 'applied').toLowerCase() === 'offer').length,
          rejected: applications.filter(x => (x.status || 'applied').toLowerCase() === 'rejected').length,
          ghost: applications.filter(x => (x.status || 'applied').toLowerCase() === 'ghost').length,
        });
      });
    });
  }
});

async function syncAndRender() {
  try {
    const loadingEl = document.getElementById('loading');
    const progressTextEl = document.getElementById('progressText');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (progressTextEl) progressTextEl.textContent = 'Authorizing…';
    const token = await getToken();
    if (!token) {
      throw new Error('No valid token found');
    }
    const queryInput = document.getElementById('query');
    const query = queryInput ? queryInput.value.trim() : '';
    if (progressTextEl) progressTextEl.textContent = 'Fetching threads…';
    const threads = await gmailThreadsAll(token, query || 'subject:(application OR applied)', 250);
    console.log('Fetched threads:', threads.length);
    
    // Ensure parsers are loaded
    if (!window.parsers) {
      console.log('Parsers not loaded, waiting...');
      await new Promise((resolve) => {
        const checkParsers = () => {
          if (window.parsers) {
            console.log('Parsers loaded successfully');
            resolve();
          } else {
            setTimeout(checkParsers, 100);
          }
        };
        checkParsers();
      });
    }
    const items = [];
    let processed = 0;
    for (const t of threads){
      processed++;
      if (processed % 5 === 0) {
        if (progressTextEl) progressTextEl.textContent = `Parsing ${processed}/${threads.length}…`;
      }
      let from = '';
      let subject = '';
      let emailDate = new Date().toISOString(); // Default to current time
      try {
        const detail = await gmailThreadDetail(token, t.id);
        const headers = (detail.messages?.[0]?.payload?.headers) || [];
        from = headers.find(h=>h.name==='From')?.value || '';
        subject = headers.find(h=>h.name==='Subject')?.value || '';
        
        // Get the actual email date from headers
        const dateHeader = headers.find(h=>h.name==='Date')?.value;
        if (dateHeader) {
          emailDate = new Date(dateHeader).toISOString();
        }
      } catch (e) {
        // Fallback: continue with snippet only
        console.warn('Thread detail fetch failed, using snippet only for id', t.id);
      }
      const email = { id: t.id, from, subject, body: t.snippet || '', date: emailDate };
      let app = null;
      if (window.parsers){
        for (const p of window.parsers){ if (p.canParse(email)) { app = await p.parse(email); if (app) break; } }
      }
      if (!app){
        const fallback = parseAppFromSnippet(t.snippet || '');
        app = { id: t.id, company: fallback.company || '', role: fallback.role || '', status: 'applied', snippet: (t.snippet || '').replace(/</g,'&lt;').replace(/>/g,'&gt;'), applicationDate: emailDate, statusHistory: [{ status: 'applied', at: emailDate }] };
      } else {
        app.snippet = (t.snippet || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        app.applicationDate = app.applicationDate || emailDate;
        if (!app.statusHistory) app.statusHistory = [{ status: app.status || 'applied', at: emailDate }];
      }
      items.push(app);
    }
    // Auto-mark ghost status for applications older than 30 days with no progress
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    items.forEach(item => {
      const lastUpdate = item.statusHistory && item.statusHistory.length > 0 
        ? new Date(item.statusHistory[item.statusHistory.length - 1].at)
        : new Date(item.applicationDate || Date.now());
      
      if (lastUpdate < thirtyDaysAgo && 
          !['offer', 'rejected', 'ghost'].includes((item.status || 'applied').toLowerCase())) {
        console.log(`👻 Auto-marking as ghost: ${item.company} - ${item.role} (last update: ${lastUpdate.toISOString()})`);
        item.status = 'ghost';
        if (!item.statusHistory) item.statusHistory = [];
        item.statusHistory.push({ status: 'ghost', at: new Date().toISOString() });
      }
    });

    // Re-parse with enhanced status detection for existing items
    items.forEach(item => {
      if (item.snippet && window.parsers) {
        const email = { 
          id: item.id, 
          from: item.from || '', 
          subject: item.emailSubject || '', 
          body: item.snippet, 
          date: item.applicationDate || new Date().toISOString() 
        };
        
        for (const parser of window.parsers) {
          if (parser.canParse(email)) {
            const newStatus = parser.determineStatus ? parser.determineStatus(email) : 'applied';
            if (newStatus !== 'applied' && newStatus !== item.status) {
              item.status = newStatus;
              if (!item.statusHistory) item.statusHistory = [];
              item.statusHistory.push({ status: newStatus, at: new Date().toISOString() });
            }
            break;
          }
        }
      }
    });

    const stats = {
      applied: items.filter(x => (x.status || 'applied').toLowerCase() === 'applied').length,
      viewed: items.filter(x => (x.status || 'applied').toLowerCase() === 'viewed').length,
      interview: items.filter(x => (x.status || 'applied').toLowerCase() === 'interview').length,
      offer: items.filter(x => (x.status || 'applied').toLowerCase() === 'offer').length,
      rejected: items.filter(x => (x.status || 'applied').toLowerCase() === 'rejected').length,
      ghost: items.filter(x => (x.status || 'applied').toLowerCase() === 'ghost').length,
    };
    
    console.log('📊 Sync Results:');
    console.log('Total items:', items.length);
    console.log('Status breakdown:', stats);
    console.log('Viewing status details:');
    items.forEach((item, index) => {
      if (index < 10) { // Log first 10 items for debugging
        console.log(`${index + 1}. ${item.company} - ${item.position || item.role} (${item.status})`);
        console.log(`   Company: "${item.company}", Position: "${item.position || item.role}", Platform: "${item.platform || 'unknown'}"`);
      }
    });
    
    // Force UI update
    console.log('🎨 Rendering dashboard...');
    render(items, stats);
    try { 
      renderPlatformChart(items); 
      renderStatusChart(items); 
      console.log('📈 Charts rendered successfully');
    } catch (e) {
      console.error('❌ Chart rendering failed:', e);
    }
    
    // Save to storage
    chrome.storage.local.set({ applications: items }, () => {
      console.log('💾 Applications saved to storage');
    });
  } catch (e) {
    console.error('Sync failed:', e);
    alert(`Sync failed: ${e && e.message ? e.message : e}`);
  }
  finally {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

// Trends chart
let trendChart;
function renderTrendChartFrom(items){
  if (!window.Chart || !items || !items.length) return;
  const byMonth = new Map();
  const getKey = (date) => {
    const d = new Date(date || Date.now());
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  };
  // Build last 6 months keys
  const periodSel = document.getElementById('trendPeriod');
  const period = periodSel ? periodSel.value : '6m';
  const labels = [];
  const now = new Date();
  const months = period === '12m' ? 12 : 6;
  for (let i=months-1;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  labels.forEach(k => byMonth.set(k, { applied:0, interview:0, offer:0 }));
  // Count by applicationDate and status
  for (const it of items){
    const key = getKey(it.applicationDate);
    if (!byMonth.has(key)) continue;
    const bucket = byMonth.get(key);
    bucket.applied += 1;
    const s = (it.status||'applied').toLowerCase();
    if (s==='interview') bucket.interview += 1;
    if (s==='offer') bucket.offer += 1;
  }
  const applied = labels.map(k => byMonth.get(k).applied);
  const interview = labels.map(k => byMonth.get(k).interview);
  const offer = labels.map(k => byMonth.get(k).offer);
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Applied', data: applied, borderColor: '#fb923c', backgroundColor: 'rgba(251,146,60,0.2)', tension: 0.3 },
        { label: 'Interview', data: interview, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.2)', tension: 0.3 },
        { label: 'Offer', data: offer, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.2)', tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, ticks: { precision:0 } } }
    }
  });
}

// Platform breakdown
let platformChart;
function renderPlatformChart(items){
  if (!window.Chart || !items) return;
  const counts = new Map();
  for (const it of items){
    const p = (it.platform || 'other').toLowerCase();
    counts.set(p, (counts.get(p) || 0) + 1);
  }
  const labels = Array.from(counts.keys());
  const data = labels.map(l => counts.get(l));
  const ctx = document.getElementById('platformChart');
  if (!ctx) return;
  if (platformChart) platformChart.destroy();
  platformChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'By Platform', data, backgroundColor: ['#99f6e4','#a5b4fc','#fecaca','#fde68a','#bfdbfe'] }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision:0 } } } }
  });
  $('platformTotal').textContent = `${data.reduce((a,b)=>a+b,0)} total`;
}

// Status flow breakdown
let statusChart;
function renderStatusChart(items){
  if (!window.Chart || !items) return;
  const counts = new Map();
  for (const it of items){
    const s = (it.status || 'applied').toLowerCase();
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  const labels = Array.from(counts.keys());
  const data = labels.map(l => counts.get(l));
  const colors = {
    applied: '#fb923c',      // orange
    viewed: '#17a2b8',       // teal
    interview: '#3b82f6',     // blue
    offer: '#8b5cf6',         // purple
    rejected: '#ef4444',      // red
    ghost: '#6b7280'          // gray
  };
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: { 
      labels, 
      datasets: [{ 
        label: 'By Status', 
        data, 
        backgroundColor: labels.map(l => colors[l] || '#6b7280'),
        borderWidth: 0
      }] 
    },
    options: { 
      plugins: { 
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} (${((ctx.parsed/data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } }
      }
    }
  });
  $('statusTotal').textContent = `${data.reduce((a,b)=>a+b,0)} total`;
}

document.addEventListener('change', (e) => {
  if (e.target && (e.target.id === 'trendPeriod')){
    chrome.storage.local.get('applications', ({ applications = [] }) => {
      renderTrendChartFrom(applications);
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard loaded, setting up event listeners...');
  
  // Wait for elements to be available
  const syncBtn = document.getElementById('sync');
  const queryInput = document.getElementById('query');
  
  if (syncBtn) {
    syncBtn.addEventListener('click', syncAndRender);
    console.log('Sync button event listener added');
  } else {
    console.error('Sync button not found');
  }
  
  if (queryInput) {
    queryInput.addEventListener('keypress', (e) => { 
      if (e.key === 'Enter') syncAndRender(); 
    });
    console.log('Query input event listener added');
  } else {
    console.error('Query input not found');
  }
  
  // Load existing data first
  chrome.storage.local.get('applications', ({ applications = [] }) => {
    console.log('Found applications in storage:', applications.length);
    if (applications.length > 0) {
      const stats = {
        applied: applications.length,
        viewed: applications.filter(x => (x.status || 'applied').toLowerCase() === 'viewed').length,
        interview: applications.filter(x => (x.status || 'applied').toLowerCase() === 'interview').length,
        offer: applications.filter(x => (x.status || 'applied').toLowerCase() === 'offer').length,
        rejected: applications.filter(x => (x.status || 'applied').toLowerCase() === 'rejected').length,
        ghost: applications.filter(x => (x.status || 'applied').toLowerCase() === 'ghost').length,
      };
      console.log('Rendering existing data with stats:', stats);
      render(applications, stats);
      try { renderPlatformChart(applications); renderStatusChart(applications); } catch (_) {}
    } else {
      console.log('No existing data found, will sync on demand');
    }
  });
});


