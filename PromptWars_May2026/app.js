/* ═══════════════════════════════════════════
   team collaborator - Kekron Mekron Inc — app.js
   ═══════════════════════════════════════════ */

// ── Constants ──
const COLUMNS = [
  { id: 'backlog',  title: 'Backlog',     color: '#6366f1' },
  { id: 'todo',     title: 'To Do',       color: '#3b82f6' },
  { id: 'progress', title: 'In Progress', color: '#f59e0b' },
  { id: 'review',   title: 'Review',      color: '#8b5cf6' },
  { id: 'done',     title: 'Done',        color: '#22c55e' },
];

const PRIORITY_COLORS = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e'
};

const AVATAR_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#3b82f6','#14b8a6','#f59e0b','#ef4444','#22c55e'
];

// ── State ──
let state = loadState();
let activeChannel = 'general';
let activeFilters = { assignee: '', priority: '', label: '', search: '' };
let editingTaskId = null;

function defaultState() {
  return {
    members: [
      { id: 'm1', name: 'Alex Chen',     color: AVATAR_COLORS[0], role: 'Frontend Dev' },
      { id: 'm2', name: 'Sara Patel',    color: AVATAR_COLORS[1], role: 'Backend Dev' },
      { id: 'm3', name: 'Jordan Lee',    color: AVATAR_COLORS[4], role: 'Designer' },
      { id: 'm4', name: 'Maya Rodriguez',color: AVATAR_COLORS[3], role: 'Product Owner' },
    ],
    tasks: [
      { id: 't1', title: 'Set up authentication flow',    desc: 'Implement OAuth2 with Google and GitHub providers.',            column: 'done',     priority: 'high',     points: 5, assignee: 'm1', label: 'feature', due: '2026-05-01' },
      { id: 't2', title: 'Design dashboard wireframes',   desc: 'Create low-fi wireframes for the main dashboard view.',         column: 'done',     priority: 'medium',   points: 3, assignee: 'm3', label: 'design',  due: '2026-05-02' },
      { id: 't3', title: 'API rate limiting middleware',   desc: 'Add rate limiting to all public API endpoints.',                column: 'review',   priority: 'high',     points: 5, assignee: 'm2', label: 'infra',   due: '2026-05-05' },
      { id: 't4', title: 'Fix login redirect loop',       desc: 'Users get stuck in redirect when session expires.',              column: 'progress', priority: 'critical', points: 3, assignee: 'm1', label: 'bug',     due: '2026-05-03' },
      { id: 't5', title: 'User profile page',             desc: 'Build profile page with avatar upload and settings.',            column: 'progress', priority: 'medium',   points: 5, assignee: 'm3', label: 'feature', due: '2026-05-07' },
      { id: 't6', title: 'Write API documentation',       desc: 'Document all REST endpoints using OpenAPI spec.',                column: 'todo',     priority: 'medium',   points: 3, assignee: 'm2', label: '',        due: '2026-05-08' },
      { id: 't7', title: 'Add notification system',       desc: 'In-app notifications for task assignments and mentions.',        column: 'todo',     priority: 'high',     points: 8, assignee: 'm1', label: 'feature', due: '2026-05-10' },
      { id: 't8', title: 'Database indexing optimization', desc: 'Analyze slow queries and add appropriate indexes.',              column: 'backlog',  priority: 'medium',   points: 5, assignee: '',   label: 'infra',   due: '' },
      { id: 't9', title: 'Mobile responsive layout',      desc: 'Ensure all pages render correctly on tablet and mobile.',        column: 'backlog',  priority: 'low',      points: 8, assignee: '',   label: 'design',  due: '' },
      { id: 't10',title: 'Set up CI/CD pipeline',         desc: 'Configure GitHub Actions for build, test, and deploy.',          column: 'backlog',  priority: 'high',     points: 5, assignee: 'm2', label: 'infra',   due: '2026-05-12' },
    ],
    sprints: [{ id: 's1', name: 'Sprint 1', startDate: '2026-04-28', endDate: '2026-05-11' }],
    activeSprint: 's1',
    chat: {
      general: [
        { sender: 'm1', text: 'Hey team! Sprint 1 is looking solid 🚀', time: '2026-05-02T09:00:00' },
        { sender: 'm4', text: 'Great progress everyone. Let\'s keep the momentum going!', time: '2026-05-02T09:05:00' },
        { sender: 'm2', text: 'Rate limiting PR is ready for review', time: '2026-05-02T09:15:00' },
        { sender: 'm3', text: 'Profile page wireframes are uploaded to Figma 🎨', time: '2026-05-02T09:30:00' },
      ],
      blockers: [
        { sender: 'm1', text: 'Blocked on the redirect loop — needs backend fix for session refresh', time: '2026-05-02T09:10:00' },
        { sender: 'm2', text: 'I\'ll push a fix for the session handler today', time: '2026-05-02T09:20:00' },
      ],
      ideas: [
        { sender: 'm3', text: 'What about adding a dark/light theme toggle?', time: '2026-05-02T09:25:00' },
        { sender: 'm4', text: 'Love it! Let\'s add it to the backlog for Sprint 2', time: '2026-05-02T09:28:00' },
      ],
      agent: [
        { sender: 'agent', text: 'Hello! I am your AI assistant. I can summarize your tasks for the day or tell you about recent team chats. How can I help?', time: new Date().toISOString() }
      ]
    },
    nextId: 11,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem('scrumflow_state');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return defaultState();
}

function saveState() {
  localStorage.setItem('scrumflow_state', JSON.stringify(state));
}

// ── Helpers ──
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function uid() { return 't' + (state.nextId++); }
function getMember(id) { return state.members.find(m => m.id === id); }
function initials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase(); }

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T23:59:59') < new Date();
}

// ── Render Board ──
function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';

  const filteredTasks = getFilteredTasks();

  COLUMNS.forEach(col => {
    const tasks = filteredTasks.filter(t => t.column === col.id);
    const colEl = document.createElement('div');
    colEl.className = 'column';
    colEl.dataset.column = col.id;
    colEl.innerHTML = `
      <div class="column-header">
        <div class="column-title-group">
          <div class="column-dot" style="background:${col.color}"></div>
          <span class="column-title">${col.title}</span>
          <span class="column-count">${tasks.length}</span>
        </div>
      </div>
      <div class="column-cards" data-column="${col.id}"></div>
      <button class="add-card-btn" data-column="${col.id}">+ Add Task</button>
    `;

    const cardsContainer = colEl.querySelector('.column-cards');
    tasks.forEach(task => cardsContainer.appendChild(createCard(task)));

    // Drag-and-drop on column
    cardsContainer.addEventListener('dragover', onDragOver);
    cardsContainer.addEventListener('dragenter', onDragEnter);
    cardsContainer.addEventListener('dragleave', onDragLeave);
    cardsContainer.addEventListener('drop', onDrop);

    // Add-card button
    colEl.querySelector('.add-card-btn').addEventListener('click', () => openModal(null, col.id));

    board.appendChild(colEl);
  });

  updateMetrics();
}

function createCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.draggable = true;
  card.dataset.id = task.id;

  const member = getMember(task.assignee);
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const dueFmt = formatDate(task.due);
  const overdue = isOverdue(task.due) && task.column !== 'done';

  let labelsHtml = '';
  if (task.label) {
    labelsHtml = `<div class="card-labels"><span class="card-label ${task.label}">${task.label}</span></div>`;
  }

  let avatarHtml = '';
  if (member) {
    avatarHtml = `<div class="card-avatar" style="background:${member.color}" title="${member.name}">${initials(member.name)}</div>`;
  }

  card.innerHTML = `
    <div class="card-priority-bar" style="background:${priorityColor}"></div>
    ${labelsHtml}
    <div class="card-title">${escHtml(task.title)}</div>
    <div class="card-footer">
      <div class="card-meta">
        <span class="card-points">${task.points} pts</span>
        ${dueFmt ? `<span class="card-due ${overdue ? 'overdue' : ''}">${dueFmt}</span>` : ''}
      </div>
      ${avatarHtml}
    </div>
  `;

  card.addEventListener('dragstart', onDragStart);
  card.addEventListener('dragend', onDragEnd);
  card.addEventListener('click', () => openModal(task.id));

  return card;
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Filters ──
function getFilteredTasks() {
  return state.tasks.filter(t => {
    if (activeFilters.assignee && t.assignee !== activeFilters.assignee) return false;
    if (activeFilters.priority && t.priority !== activeFilters.priority) return false;
    if (activeFilters.label && t.label !== activeFilters.label) return false;
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.desc || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// ── Metrics ──
function updateMetrics() {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.column === 'done').length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const points = state.tasks.reduce((s, t) => s + (t.points || 0), 0);

  $('#progress-fill').style.width = pct + '%';
  $('#progress-pct').textContent = pct + '%';
  $('#total-tasks').textContent = total;
  $('#total-points').textContent = points;
}

// ── Drag & Drop ──
let draggedId = null;

function onDragStart(e) {
  draggedId = e.target.dataset.id;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedId);
}
function onDragEnd(e) {
  e.target.classList.remove('dragging');
  $$('.column-cards').forEach(c => c.classList.remove('drag-over'));
  draggedId = null;
}
function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function onDragEnter(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const col = e.currentTarget.dataset.column;
  if (draggedId && col) {
    const task = state.tasks.find(t => t.id === draggedId);
    if (task) { task.column = col; saveState(); renderBoard(); }
  }
}

// ── Task Modal ──
function openModal(taskId, defaultColumn) {
  editingTaskId = taskId || null;
  const modal = $('#task-modal');
  const task = taskId ? state.tasks.find(t => t.id === taskId) : null;

  $('#modal-title').textContent = task ? 'Edit Task' : 'New Task';
  $('#task-id').value = task ? task.id : '';
  $('#task-title').value = task ? task.title : '';
  $('#task-desc').value = task ? (task.desc || '') : '';
  $('#task-priority').value = task ? task.priority : 'medium';
  $('#task-points').value = task ? task.points : '3';
  $('#task-due').value = task ? (task.due || '') : '';
  $('#task-label').value = task ? (task.label || '') : '';

  // Populate assignee dropdown
  const sel = $('#task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>';
  state.members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id; opt.textContent = m.name;
    sel.appendChild(opt);
  });
  sel.value = task ? (task.assignee || '') : '';

  $('#task-delete').classList.toggle('hidden', !task);

  // Store default column for new tasks
  modal.dataset.defaultColumn = defaultColumn || 'backlog';
  modal.classList.add('open');
  setTimeout(() => $('#task-title').focus(), 200);
}

function closeModal() {
  $('#task-modal').classList.remove('open');
  editingTaskId = null;
}

function saveTask() {
  const title = $('#task-title').value.trim();
  if (!title) { $('#task-title').focus(); return; }

  const data = {
    title,
    desc: $('#task-desc').value.trim(),
    priority: $('#task-priority').value,
    points: parseInt($('#task-points').value, 10),
    assignee: $('#task-assignee').value,
    due: $('#task-due').value,
    label: $('#task-label').value,
  };

  if (editingTaskId) {
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (task) Object.assign(task, data);
  } else {
    state.tasks.push({
      id: uid(),
      column: $('#task-modal').dataset.defaultColumn || 'backlog',
      ...data,
    });
  }

  saveState();
  closeModal();
  renderBoard();
}

function deleteTask() {
  if (!editingTaskId) return;
  state.tasks = state.tasks.filter(t => t.id !== editingTaskId);
  saveState();
  closeModal();
  renderBoard();
}

// ── Chat ──
function renderChat() {
  const container = $('#chat-messages');
  const messages = state.chat[activeChannel] || [];
  container.innerHTML = '';

  messages.forEach(msg => {
    let member;
    let isAi = msg.sender === 'agent';
    
    if (isAi) {
      member = { name: 'AI Agent', color: 'transparent', isAi: true };
    } else {
      member = getMember(msg.sender);
    }
    if (!member) return;
    
    const el = document.createElement('div');
    el.className = `chat-msg ${isAi ? 'ai' : ''}`;
    
    const avatarHtml = isAi ? '✨' : initials(member.name);
    
    el.innerHTML = `
      <div class="chat-msg-avatar" style="background:${member.color}">${avatarHtml}</div>
      <div class="chat-msg-body">
        <div class="chat-msg-header">
          <span class="chat-msg-name">${escHtml(member.name)}</span>
          <span class="chat-msg-time">${formatTime(msg.time)}</span>
        </div>
        <div class="chat-msg-text" style="white-space: pre-wrap;">${escHtml(msg.text)}</div>
      </div>
    `;
    container.appendChild(el);
  });

  if (document.querySelector('.typing-indicator')) {
    const el = document.createElement('div');
    el.className = 'chat-msg ai';
    el.innerHTML = `
      <div class="chat-msg-avatar" style="background:transparent">✨</div>
      <div class="chat-msg-body">
        <div class="chat-msg-header"><span class="chat-msg-name">AI Agent</span></div>
        <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
      </div>
    `;
    container.appendChild(el);
  }

  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Default sender is first member (simulating current user)
  const sender = state.members[0]?.id || 'm1';
  if (!state.chat[activeChannel]) state.chat[activeChannel] = [];
  
  state.chat[activeChannel].push({
    sender,
    text,
    time: new Date().toISOString(),
  });

  input.value = '';
  saveState();
  renderChat();
  
  if (activeChannel === 'agent') {
    handleGeminiRequest(text);
  }
}

async function handleGeminiRequest(userText) {
  // Show typing indicator
  const container = $('#chat-messages');
  const typingHtml = `
    <div class="chat-msg ai" id="ai-typing-indicator">
      <div class="chat-msg-avatar" style="background:transparent">✨</div>
      <div class="chat-msg-body">
        <div class="chat-msg-header"><span class="chat-msg-name">AI Agent</span></div>
        <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', typingHtml);
  container.scrollTop = container.scrollHeight;

  try {
    // Gather context for the AI
    const currentMember = state.members[0] || {};
    const myTasks = state.tasks.filter(t => t.assignee === currentMember.id).map(t =>
      `- ${t.title} (Status: ${t.column}, Priority: ${t.priority})`
    );

    let chatContext = '';
    ['general', 'blockers'].forEach(ch => {
      chatContext += `\n#${ch} channel:\n`;
      const recent = (state.chat[ch] || []).slice(-5);
      recent.forEach(m => {
        const senderName = getMember(m.sender)?.name || 'Unknown';
        chatContext += `${senderName}: ${m.text}\n`;
      });
    });

    // Call backend proxy — API key is stored securely server-side via Secret Manager
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: userText,
        userName: currentMember.name || 'User',
        tasks: myTasks.join('\n') || 'No tasks currently assigned.',
        chatContext
      })
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const data = await response.json();

    state.chat.agent.push({
      sender: 'agent',
      text: data.reply || "I'm sorry, I couldn't generate a response.",
      time: new Date().toISOString()
    });

  } catch (error) {
    state.chat.agent.push({
      sender: 'agent',
      text: `Error: ${error.message}`,
      time: new Date().toISOString()
    });
  }

  saveState();
  renderChat();
}

function toggleChat() {
  const panel = $('#chat-panel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) renderChat();
}

// ── Team Panel ──
function renderTeam() {
  const list = $('#team-list');
  list.innerHTML = '';
  state.members.forEach(m => {
    const row = document.createElement('div');
    row.className = 'team-member-row';
    row.innerHTML = `
      <div class="member-avatar" style="background:${m.color}">${initials(m.name)}</div>
      <div class="member-info">
        <div class="member-name">${escHtml(m.name)}</div>
        <div class="member-role">${escHtml(m.role || 'Team Member')}</div>
      </div>
    `;
    list.appendChild(row);
  });
}

function openTeamPanel() {
  renderTeam();
  $('#team-overlay').classList.add('open');
  $('#team-panel').classList.add('open');
}
function closeTeamPanel() {
  $('#team-overlay').classList.remove('open');
  $('#team-panel').classList.remove('open');
}

function addMember() {
  const nameInput = $('#new-member-name');
  const name = nameInput.value.trim();
  if (!name) return;
  const color = AVATAR_COLORS[state.members.length % AVATAR_COLORS.length];
  state.members.push({ id: 'm' + Date.now(), name, color, role: 'Team Member' });
  nameInput.value = '';
  saveState();
  renderTeam();
}

// ── Filter Dropdown Logic ──
let activeFilterDropdown = null;

function showFilterDropdown(type, btnEl) {
  closeFilterDropdown();

  const items = getFilterItems(type);
  const dd = document.createElement('div');
  dd.className = 'filter-dropdown';
  dd.style.cssText = `
    position: absolute; z-index: 500;
    background: var(--bg-secondary); border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md); padding: 6px 0;
    box-shadow: var(--shadow-elevated); min-width: 160px;
  `;

  items.forEach(item => {
    const opt = document.createElement('div');
    opt.textContent = item.label;
    opt.style.cssText = `
      padding: 8px 16px; font-size: 13px; cursor: pointer;
      color: var(--text-secondary); transition: background 0.15s;
    `;
    opt.addEventListener('mouseenter', () => opt.style.background = 'var(--bg-hover)');
    opt.addEventListener('mouseleave', () => opt.style.background = 'none');
    opt.addEventListener('click', () => {
      activeFilters[type] = item.value;
      closeFilterDropdown();
      updateFilterButtons();
      renderBoard();
    });
    dd.appendChild(opt);
  });

  const rect = btnEl.getBoundingClientRect();
  dd.style.top = (rect.bottom + 4) + 'px';
  dd.style.left = rect.left + 'px';
  document.body.appendChild(dd);
  activeFilterDropdown = dd;

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', closeFilterDropdown, { once: true });
  }, 0);
}

function closeFilterDropdown() {
  if (activeFilterDropdown) {
    activeFilterDropdown.remove();
    activeFilterDropdown = null;
  }
}

function getFilterItems(type) {
  const all = { label: '✦ All', value: '' };
  if (type === 'assignee') {
    return [all, ...state.members.map(m => ({ label: m.name, value: m.id }))];
  }
  if (type === 'priority') {
    return [all,
      { label: '🔴 Critical', value: 'critical' },
      { label: '🟠 High',     value: 'high' },
      { label: '🟡 Medium',   value: 'medium' },
      { label: '🟢 Low',      value: 'low' },
    ];
  }
  if (type === 'label') {
    return [all,
      { label: 'Feature', value: 'feature' },
      { label: 'Bug',     value: 'bug' },
      { label: 'Design',  value: 'design' },
      { label: 'Infra',   value: 'infra' },
    ];
  }
  return [all];
}

function updateFilterButtons() {
  const hasFilter = activeFilters.assignee || activeFilters.priority || activeFilters.label;
  $$('.filter-btn').forEach(btn => {
    const f = btn.dataset.filter;
    if (f === 'all') {
      btn.classList.toggle('active', !hasFilter);
    } else {
      btn.classList.toggle('active', !!activeFilters[f]);
    }
  });
}

// ── Event Binding ──
function init() {
  renderBoard();

  // Modal
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#task-save').addEventListener('click', saveTask);
  $('#task-delete').addEventListener('click', deleteTask);
  $('#task-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

  // Chat
  $('#btn-chat').addEventListener('click', toggleChat);
  $('#chat-close').addEventListener('click', toggleChat);
  $('#chat-send').addEventListener('click', sendChatMessage);
  $('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); });

  $$('.channel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.channel-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeChannel = btn.dataset.channel;
      renderChat();
    });
  });

  // Team
  $('#btn-team').addEventListener('click', openTeamPanel);
  $('#team-close').addEventListener('click', closeTeamPanel);
  $('#team-overlay').addEventListener('click', closeTeamPanel);
  $('#add-member-btn').addEventListener('click', addMember);
  $('#new-member-name').addEventListener('keydown', e => { if (e.key === 'Enter') addMember(); });

  // Search
  $('#search-input').addEventListener('input', e => {
    activeFilters.search = e.target.value;
    renderBoard();
  });

  // Filters
  $('#filter-assignee').addEventListener('click', e => showFilterDropdown('assignee', e.currentTarget));
  $('#filter-priority').addEventListener('click', e => showFilterDropdown('priority', e.currentTarget));
  $('#filter-label').addEventListener('click', e => showFilterDropdown('label', e.currentTarget));
  $$('.filter-btn[data-filter="all"]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilters = { assignee: '', priority: '', label: '', search: '' };
      $('#search-input').value = '';
      updateFilterButtons();
      renderBoard();
    });
  });

  // Keyboard shortcut: Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeTeamPanel();
      closeFilterDropdown();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
