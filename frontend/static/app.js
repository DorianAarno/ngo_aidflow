'use strict';

// All user/API-sourced text is assigned via .textContent (not innerHTML).
// The safeText() helper coerces values to strings for textContent assignments.
// DOM nodes are built with createElement/appendChild throughout.

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const API = '';  // same-origin

const CITY_CENTERS = {
  Bhopal:             [23.2599, 77.4126],
  Delhi:              [28.6139, 77.2090],
  Mumbai:             [19.0760, 72.8777],
  Bengaluru:          [12.9716, 77.5946],
  Hyderabad:          [17.3850, 78.4867],
  Chennai:            [13.0827, 80.2707],
  Kolkata:            [22.5726, 88.3639],
  Ahmedabad:          [23.0225, 72.5714],
  Pune:               [18.5204, 73.8567],
  Jaipur:             [26.9124, 75.7873],
  Lucknow:            [26.8467, 80.9462],
  Surat:              [21.1702, 72.8311],
  Nagpur:             [21.1458, 79.0882],
  Indore:             [22.7196, 75.8577],
  Patna:              [25.5941, 85.1376],
  Vadodara:           [22.3072, 73.1812],
  Coimbatore:         [11.0168, 76.9558],
  Visakhapatnam:      [17.6868, 83.2185],
  Kochi:              [ 9.9312, 76.2673],
  Chandigarh:         [30.7333, 76.7794],
  Bhubaneswar:        [20.2961, 85.8245],
  Raipur:             [21.2514, 81.6296],
  Guwahati:           [26.1445, 91.7362],
  Thiruvananthapuram: [8.5241,  76.9366],
  Dehradun:           [30.3165, 78.0322],
};

const STATUS_MAP = {
  1: { label: 'Pending',   cls: 'status-pending',   color: '#D4572A' },
  2: { label: 'Ongoing',   cls: 'status-ongoing',   color: '#2D6A4F' },
  3: { label: 'Completed', cls: 'status-completed', color: '#2563A8' },
};

const AVATAR_COLORS = [
  '#2D6A4F', '#2563A8', '#6B3FA0', '#D4572A', '#F2A726',
  '#52B788', '#C47F0D', '#E63946', '#457B9D', '#1D3557',
];

// ─── STATE ────────────────────────────────────────────────────────────────────

let currentCity = localStorage.getItem('aidflow_city') || 'Bhopal';
let mapInstance = null;
let detailMapInst = null;
let mapMarkersLayer = null;
let allProblemsPage = 1;
let currentDetailComplaint = null;

// ─── UTILITY ──────────────────────────────────────────────────────────────────

function safeText(v) { return (v === null || v === undefined) ? '' : String(v); }

function getCategoryEmoji(category) {
  if (!category) return '\u{1F4CC}';
  const c = category.toLowerCase();
  if (c.includes('garbage') || c.includes('sweeping') || c.includes('sanit') || c.includes('waste') || c.includes('litter')) return '\uD83D\uDDD1\uFE0F';
  if (c.includes('drain') || c.includes('water') || c.includes('sewage') || c.includes('flood') || c.includes('waterlog')) return '\uD83D\uDCA7';
  if (c.includes('road') || c.includes('pothole') || c.includes('pavement')) return '\uD83D\uDEE3\uFE0F';
  if (c.includes('light') || c.includes('electric') || c.includes('lamp')) return '\uD83D\uDCA1';
  if (c.includes('defecation') || c.includes('toilet') || c.includes('latrine')) return '\u26A0\uFE0F';
  if (c.includes('park') || c.includes('garden') || c.includes('tree')) return '\uD83C\uDF33';
  if (c.includes('animal') || c.includes('stray') || c.includes('dog')) return '\uD83D\uDC15';
  return '\uD83D\uDCCC';
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown time';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return safeText(dateStr);
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  if (sec < 604800) return Math.floor(sec / 86400) + 'd ago';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return safeText(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── DOM HELPERS ──────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = safeText(text);
  return node;
}

function clearEl(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiFetch(url) {
  const res = await fetch(API + url);
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { msg = (await res.json()).detail || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(API + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { msg = (await res.json()).detail || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg, isError) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = safeText(msg);
  t.classList.toggle('error', Boolean(isError));
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3500);
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function openModal(id) {
  const node = document.getElementById(id);
  if (node) node.classList.add('open');
}

function closeModal(id) {
  const node = document.getElementById(id);
  if (node) node.classList.remove('open');
  if (id === 'map-modal' && detailMapInst) { detailMapInst.remove(); detailMapInst = null; }
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}

// ─── CITY ─────────────────────────────────────────────────────────────────────

function setCity(city) {
  currentCity = city;
  localStorage.setItem('aidflow_city', city);
  updateTopbarDate();
  const mt = document.getElementById('map-card-title');
  if (mt) mt.textContent = '\uD83D\uDCCD Active Locations \u2014 ' + city;
  const fl = document.getElementById('forum-city-label');
  if (fl) fl.textContent = city;
  allProblemsPage = 1;
  Promise.all([loadStats(), loadMapMarkers(), loadRecentComplaints(), loadForum()]).catch(function () { showToast('Some data failed to load', true); });
  const pv = document.getElementById('problems-view');
  if (pv && pv.style.display !== 'none') loadAllProblems();
  prefillCityFields(city);
}

function prefillCityFields(city) {
  ['vol-city', 'prob-city', 'ngo-city', 'vmod-city'].forEach(function (id) {
    const e2 = document.getElementById(id);
    if (e2 && !e2.value) e2.value = city;
  });
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────

function updateTopbarDate() {
  const now = new Date();
  const h = now.getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const ge = document.getElementById('topbar-greeting');
  if (ge) ge.textContent = g + ', Aidworker \uD83D\uDC4B';
  const de = document.getElementById('topbar-date');
  if (de) de.textContent = currentCity + ' \u2014 ' + now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function navigateTo(viewId, navEl) {
  document.querySelectorAll('.page-view').forEach(function (v) { v.style.display = 'none'; });
  const view = document.getElementById(viewId);
  if (view) {
    view.style.display = 'block';
    view.classList.remove('page-view');
    void view.offsetWidth;
    view.classList.add('page-view');
  }
  document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
  if (navEl) navEl.classList.add('active');
  if (viewId === 'dashboard-view' && mapInstance) setTimeout(function () { mapInstance.invalidateSize(); }, 150);
  if (viewId === 'problems-view') loadAllProblems();
  if (window.innerWidth < 720) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
  }
}

// ─── MAP ──────────────────────────────────────────────────────────────────────

function initMap() {
  const center = CITY_CENTERS[currentCity] || [23.2599, 77.4126];
  mapInstance = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView(center, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '\u00A9 <a href="https://www.openstreetmap.org/">OpenStreetMap</a>', maxZoom: 18,
  }).addTo(mapInstance);
  mapMarkersLayer = L.layerGroup().addTo(mapInstance);
}

function renderMapMarkers(markers) {
  if (!mapMarkersLayer) return;
  mapMarkersLayer.clearLayers();
  markers.forEach(function (m) {
    if (!m.lat || !m.lng) return;
    const si = STATUS_MAP[m.status_id] || STATUS_MAP[1];
    const circle = L.circleMarker([m.lat, m.lng], {
      radius: 7, fillColor: si.color, color: '#ffffff', weight: 2, fillOpacity: 0.88,
    });
    circle.bindTooltip(safeText(m.title) + '\n' + safeText(m.location), { direction: 'top', offset: [0, -6] });
    (function (data, marker) {
      marker.on('click', function () {
        apiFetch('/api/complaints/' + data.id).then(openMapModal).catch(function () {
          openMapModal({ id: data.id, title: data.title, location: data.location, latitude: data.lat, longitude: data.lng, complaint_status_id: data.status_id, complaint_status: si.label });
        });
      });
    })(m, circle);
    mapMarkersLayer.addLayer(circle);
  });
  const center = CITY_CENTERS[currentCity];
  if (center && mapInstance) mapInstance.setView(center, 12, { animate: true });
}

async function loadMapMarkers() {
  try {
    renderMapMarkers(await apiFetch('/api/complaints/map?city=' + encodeURIComponent(currentCity)));
  } catch (e) { console.warn('map markers:', e); }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

async function loadStats() {
  try {
    const data = await apiFetch('/api/stats?city=' + encodeURIComponent(currentCity));
    const pe = document.getElementById('stat-problems');
    const oe = document.getElementById('stat-ongoing');
    const ce = document.getElementById('stat-completed');
    const se = document.getElementById('stat-problems-sub');
    if (pe) pe.textContent = data.total_problems.toLocaleString('en-IN');
    if (oe) oe.textContent = data.ongoing_projects.toLocaleString('en-IN');
    if (ce) ce.textContent = data.completed_projects.toLocaleString('en-IN');
    if (se) se.textContent = 'in ' + data.city;
    const sel = document.getElementById('city-select');
    if (sel && data.available_cities && data.available_cities.length) {
      clearEl(sel);
      data.available_cities.forEach(function (city) {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = '\uD83D\uDCCD ' + city;
        if (city === currentCity) opt.selected = true;
        sel.appendChild(opt);
      });
    }
  } catch (e) {
    console.warn('stats:', e);
    showToast('Could not load stats \u2014 is the API running?', true);
  }
}

// ─── RECENT COMPLAINTS ────────────────────────────────────────────────────────

function buildProblemCard(item) {
  const si = STATUS_MAP[item.complaint_status_id] || STATUS_MAP[1];
  const emoji = getCategoryEmoji(item.category_name || item.title);
  const card = el('div', 'problem-card');

  const top = el('div', 'prob-top');
  const emojiDiv = el('div', 'prob-emoji', emoji);
  const info = el('div', 'prob-info');
  const titleDiv = el('div', 'prob-title', safeText(item.title) || 'Untitled');
  const locDiv = el('div', 'prob-loc', '\uD83D\uDCCD ' + (safeText(item.location) || safeText(item.city) || '\u2014'));
  info.appendChild(titleDiv);
  info.appendChild(locDiv);
  const badge = el('div', 'prob-status ' + si.cls, si.label);
  top.appendChild(emojiDiv);
  top.appendChild(info);
  top.appendChild(badge);

  const bottom = el('div', 'prob-bottom');
  bottom.appendChild(el('span', 'prob-tag', safeText(item.category_name) || 'Issue'));
  bottom.appendChild(el('span', 'prob-tag', timeAgo(item.created_at)));
  const viewBtn = el('button', 'prob-map-btn', '\uD83D\uDDFA View');
  (function (id) {
    viewBtn.addEventListener('click', function (e) { e.stopPropagation(); openComplaintById(id); });
    card.addEventListener('click', function () { openComplaintById(id); });
  })(item.id);
  bottom.appendChild(viewBtn);

  card.appendChild(top);
  card.appendChild(bottom);
  return card;
}

function renderProblemsList(items) {
  const c = document.getElementById('problems-list');
  if (!c) return;
  clearEl(c);
  if (!items || !items.length) { c.appendChild(el('div', 'loading-text', 'No problems found for this city.')); return; }
  items.forEach(function (item) { c.appendChild(buildProblemCard(item)); });
}

async function loadRecentComplaints() {
  const c = document.getElementById('problems-list');
  if (c) { clearEl(c); c.appendChild(el('div', 'loading-text', 'Loading problems\u2026')); }
  try {
    const data = await apiFetch('/api/complaints?city=' + encodeURIComponent(currentCity) + '&page=1&limit=10');
    renderProblemsList(data.items);
  } catch (e) {
    if (c) { clearEl(c); c.appendChild(el('div', 'loading-text', 'Failed to load problems.')); }
    console.warn('recent complaints:', e);
  }
}

async function openComplaintById(id) {
  try { openMapModal(await apiFetch('/api/complaints/' + id)); }
  catch (e) { showToast('Failed to load complaint details', true); }
}

// ─── ALL PROBLEMS ─────────────────────────────────────────────────────────────

async function loadAllProblems() {
  const c = document.getElementById('all-problems-list');
  const countEl = document.getElementById('problems-count');
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const subEl = document.getElementById('problems-view-sub');
  if (c) { clearEl(c); c.appendChild(el('div', 'loading-text', 'Loading\u2026')); }
  const sv = (document.getElementById('status-filter') || {}).value || 'all';
  const limit = 20;
  try {
    const data = await apiFetch('/api/complaints?city=' + encodeURIComponent(currentCity) + '&page=' + allProblemsPage + '&limit=' + limit + '&status=' + sv);
    if (subEl) subEl.textContent = 'Browse and filter reported civic issues in ' + currentCity + '.';
    if (countEl) countEl.textContent = data.total.toLocaleString('en-IN') + ' total';
    if (!c) return;
    clearEl(c);
    if (!data.items || !data.items.length) {
      c.appendChild(el('div', 'loading-text', 'No problems found matching your filter.'));
      if (pageInfo) pageInfo.textContent = '';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }
    data.items.forEach(function (item) {
      const si = STATUS_MAP[item.complaint_status_id] || STATUS_MAP[1];
      const emoji = getCategoryEmoji(item.category_name || item.title);
      const card = el('div', 'all-problem-card');
      const emojiDiv = el('div', 'apc-emoji', emoji);
      const body = el('div', 'apc-body');
      body.appendChild(el('div', 'apc-title', safeText(item.title) || 'Untitled'));
      body.appendChild(el('div', 'apc-loc', '\uD83D\uDCCD ' + (safeText(item.location) || safeText(item.city) || '\u2014')));
      const meta = el('div', 'apc-meta');
      meta.appendChild(el('span', 'apc-status ' + si.cls, si.label));
      meta.appendChild(el('span', 'apc-date', formatDate(item.created_at)));
      meta.appendChild(el('span', 'apc-votes', '\uD83D\uDC4D ' + (item.voted_count || 0)));
      if (item.category_name) meta.appendChild(el('span', 'prob-tag', safeText(item.category_name)));
      body.appendChild(meta);
      card.appendChild(emojiDiv);
      card.appendChild(body);
      (function (id) { card.addEventListener('click', function () { openComplaintById(id); }); })(item.id);
      c.appendChild(card);
    });
    const totalPages = Math.ceil(data.total / limit);
    if (pageInfo) pageInfo.textContent = 'Page ' + allProblemsPage + ' of ' + totalPages;
    if (prevBtn) prevBtn.disabled = allProblemsPage <= 1;
    if (nextBtn) nextBtn.disabled = allProblemsPage >= totalPages;
  } catch (e) {
    if (c) { clearEl(c); c.appendChild(el('div', 'loading-text', 'Failed to load problems.')); }
    console.warn('all problems:', e);
  }
}

// ─── MAP MODAL ────────────────────────────────────────────────────────────────

function openMapModal(complaint) {
  currentDetailComplaint = complaint;
  const titleEl = document.getElementById('map-modal-title');
  if (titleEl) titleEl.textContent = safeText(complaint.title) || 'Problem Details';

  const infoEl = document.getElementById('problem-info-box');
  if (infoEl) {
    clearEl(infoEl);
    const si = STATUS_MAP[complaint.complaint_status_id] || STATUS_MAP[1];
    infoEl.appendChild(el('div', 'pib-title', safeText(complaint.title)));

    function addRow(key, value) {
      const row = el('div', 'pib-row');
      row.appendChild(el('div', 'pib-key', key));
      const v = el('div', 'pib-val');
      if (typeof value === 'string') v.textContent = value;
      else v.appendChild(value);
      row.appendChild(v);
      infoEl.appendChild(row);
    }

    addRow('Category', getCategoryEmoji(complaint.category_name) + ' ' + (safeText(complaint.category_name) || '\u2014'));
    addRow('Location', safeText(complaint.location) || '\u2014');
    if (complaint.landmark) addRow('Landmark', safeText(complaint.landmark));
    const badge = el('span', 'prob-status ' + si.cls, si.label);
    addRow('Status', badge);
    addRow('Reported', formatDate(complaint.created_at));
    addRow('Votes', '\uD83D\uDC4D ' + (complaint.voted_count || 0));
    if (complaint.full_name) addRow('Reported by', safeText(complaint.full_name));

    if (complaint.complaint_image) {
      const img = document.createElement('img');
      img.src = complaint.complaint_image;
      img.className = 'pib-img';
      img.alt = 'Complaint photo';
      img.addEventListener('error', function () { img.style.display = 'none'; });
      infoEl.appendChild(img);
    }
  }

  openModal('map-modal');

  const lat = complaint.latitude;
  const lng = complaint.longitude;
  setTimeout(function () {
    if (detailMapInst) { detailMapInst.remove(); detailMapInst = null; }
    const mapEl = document.getElementById('map-modal-map');
    if (!mapEl) return;
    if (lat && lng) {
      detailMapInst = L.map('map-modal-map', { zoomControl: true }).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '\u00A9 OSM' }).addTo(detailMapInst);
      const si2 = STATUS_MAP[complaint.complaint_status_id] || STATUS_MAP[1];
      L.circleMarker([lat, lng], { radius: 10, fillColor: si2.color, color: '#ffffff', weight: 3, fillOpacity: 0.95 })
        .addTo(detailMapInst).bindPopup(safeText(complaint.title) || 'Problem').openPopup();
    } else {
      mapEl.textContent = 'No location data available';
      mapEl.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text-muted)';
    }
  }, 180);
}

function openVolunteerFromDetail() {
  const city = currentDetailComplaint ? (currentDetailComplaint.city || currentCity) : currentCity;
  const cityEl = document.getElementById('vmod-city');
  if (cityEl) cityEl.value = city;
  closeModal('map-modal');
  openModal('volunteer-modal');
}

// ─── FORUM ────────────────────────────────────────────────────────────────────

function buildForumItem(post) {
  const color = avatarColor(post.author_name);
  const item = el('div', 'forum-item');

  const avatar = el('div', 'forum-avatar', initials(post.author_name));
  avatar.style.background = color;

  const body = el('div', 'forum-body');
  body.appendChild(el('div', 'forum-name', safeText(post.author_name) || 'Anonymous'));
  body.appendChild(el('div', 'forum-msg', safeText(post.message)));
  body.appendChild(el('div', 'forum-time', timeAgo(post.created_at)));

  const react = el('div', 'forum-react');
  const likeBtn = el('button', 'react-btn');
  if (post.id) likeBtn.id = 'like-btn-' + post.id;
  likeBtn.appendChild(document.createTextNode('\uD83D\uDC4D '));
  const countSpan = el('span', 'like-count', String(post.likes || 0));
  likeBtn.appendChild(countSpan);
  (function (btn, id) { btn.addEventListener('click', function () { likePost(id, btn); }); })(likeBtn, post.id);
  react.appendChild(likeBtn);
  body.appendChild(react);

  item.appendChild(avatar);
  item.appendChild(body);
  return item;
}

function renderForum(posts) {
  const c = document.getElementById('forum-list');
  if (!c) return;
  clearEl(c);
  if (!posts || !posts.length) { c.appendChild(el('div', 'loading-text', 'No posts yet \u2014 be the first to share!')); return; }
  posts.forEach(function (post) { c.appendChild(buildForumItem(post)); });
}

async function loadForum() {
  const c = document.getElementById('forum-list');
  if (c) { clearEl(c); c.appendChild(el('div', 'loading-text', 'Loading forum\u2026')); }
  const fl = document.getElementById('forum-city-label');
  if (fl) fl.textContent = currentCity;
  try {
    const data = await apiFetch('/api/forum?city=' + encodeURIComponent(currentCity) + '&page=1&limit=20');
    renderForum(data.items);
  } catch (e) {
    if (c) { clearEl(c); c.appendChild(el('div', 'loading-text', 'Failed to load forum.')); }
    console.warn('forum:', e);
  }
}

async function postForumMessage() {
  const input = document.getElementById('forum-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message || message.length < 2) { showToast('Please write a message first', true); return; }
  const btn = document.querySelector('.forum-send');
  if (btn) btn.disabled = true;
  try {
    const post = await apiPost('/api/forum', { message, city: currentCity, author_name: 'Anonymous' });
    if (!post.created_at) post.created_at = new Date().toISOString();
    const c = document.getElementById('forum-list');
    if (c) {
      const empty = c.querySelector('.loading-text');
      if (empty) empty.remove();
      c.insertBefore(buildForumItem(post), c.firstChild);
    }
    input.value = '';
    showToast('Message posted!');
  } catch (e) {
    showToast('Failed to post: ' + e.message, true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function likePost(postId, btn) {
  if (!postId || btn.classList.contains('liked')) return;
  try {
    const data = await apiPost('/api/forum/' + postId + '/like', {});
    const countEl = btn.querySelector('.like-count');
    if (countEl) countEl.textContent = String(data.likes);
    btn.classList.add('liked');
  } catch (e) { showToast('Failed to like post', true); }
}

// ─── GEOLOCATION ──────────────────────────────────────────────────────────────

function useMyLocation() {
  if (!navigator.geolocation) { showToast('Geolocation not supported', true); return; }
  const btn = document.querySelector('.loc-btn');
  if (btn) { btn.textContent = '\u23F3 Detecting\u2026'; btn.disabled = true; }
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const latEl = document.getElementById('prob-lat');
      const lngEl = document.getElementById('prob-lng');
      const locEl = document.getElementById('prob-location');
      if (latEl) latEl.value = lat;
      if (lngEl) lngEl.value = lng;
      if (locEl && !locEl.value) locEl.value = lat.toFixed(5) + ', ' + lng.toFixed(5);
      if (btn) { btn.textContent = '\u2705 Location captured'; btn.disabled = false; }
      showToast('Location captured!');
    },
    function (err) {
      showToast('Could not get location: ' + err.message, true);
      if (btn) { btn.textContent = '\uD83D\uDCCD Use my location'; btn.disabled = false; }
    },
    { timeout: 10000 }
  );
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

function validateField(id, errId, message) {
  const e2 = document.getElementById(id);
  const errEl = document.getElementById(errId);
  if (!e2) return true;
  const val = e2.value.trim();
  if (!val) {
    e2.classList.add('error');
    if (errEl) errEl.textContent = message;
    return false;
  }
  e2.classList.remove('error');
  if (errEl) errEl.textContent = '';
  return true;
}

function validateEmail(id, errId) {
  const e2 = document.getElementById(id);
  const errEl = document.getElementById(errId);
  if (!e2) return true;
  const val = e2.value.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  if (!val || !ok) {
    e2.classList.add('error');
    if (errEl) errEl.textContent = 'Please enter a valid email address';
    return false;
  }
  e2.classList.remove('error');
  if (errEl) errEl.textContent = '';
  return true;
}

function readImageAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(new Error('Could not read selected image')); };
    reader.readAsDataURL(file);
  });
}

// ─── FORMS ────────────────────────────────────────────────────────────────────

async function handleProblemSubmit(e) {
  e.preventDefault();
  let v = true;
  v = validateField('prob-title', 'prob-title-err', 'Please enter a title') && v;
  v = validateField('prob-category', 'prob-category-err', 'Please select a category') && v;
  v = validateField('prob-desc', 'prob-desc-err', 'Please describe the problem') && v;
  v = validateField('prob-location', 'prob-location-err', 'Please enter a location') && v;
  v = validateField('prob-city', 'prob-city-err', 'Please enter the city') && v;
  v = validateField('prob-name', 'prob-name-err', 'Please enter your name') && v;
  if (!v) return;
  const btn = document.getElementById('prob-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting\u2026'; }
  try {
    const latRaw = document.getElementById('prob-lat').value;
    const lngRaw = document.getElementById('prob-lng').value;
    const imageInput = document.getElementById('prob-image');
    const imageHelp = document.getElementById('prob-image-help');
    let complaintImage = null;

    if (imageHelp) {
      imageHelp.textContent = 'Add a clear photo to help NGOs understand the issue faster (JPG/PNG/WebP, max 2 MB).';
      imageHelp.style.color = '';
    }

    if (imageInput && imageInput.files && imageInput.files.length) {
      const file = imageInput.files[0];
      const maxBytes = 2 * 1024 * 1024;
      const isImage = /^image\//.test(file.type);

      if (!isImage) {
        throw new Error('Please upload a valid image file');
      }
      if (file.size > maxBytes) {
        throw new Error('Image is too large. Please upload up to 2 MB.');
      }

      complaintImage = await readImageAsDataUrl(file);
      if (imageHelp) imageHelp.textContent = 'Image attached: ' + safeText(file.name);
    }

    await apiPost('/api/complaints', {
      title: document.getElementById('prob-title').value.trim(),
      category: document.getElementById('prob-category').value,
      description: document.getElementById('prob-desc').value.trim(),
      location: document.getElementById('prob-location').value.trim(),
      city: document.getElementById('prob-city').value.trim(),
      submitter_name: document.getElementById('prob-name').value.trim(),
      submitter_phone: document.getElementById('prob-phone').value.trim(),
      latitude: latRaw ? parseFloat(latRaw) : null,
      longitude: lngRaw ? parseFloat(lngRaw) : null,
      landmark: '',
      complaint_image: complaintImage,
    });
    closeModal('problem-modal');
    document.getElementById('problem-form').reset();
    if (imageHelp) {
      imageHelp.textContent = 'Add a clear photo to help NGOs understand the issue faster (JPG/PNG/WebP, max 2 MB).';
      imageHelp.style.color = '';
    }
    showToast('Problem submitted successfully!');
    Promise.all([loadStats(), loadRecentComplaints(), loadMapMarkers()]).catch(function () {});
  } catch (err) {
    showToast('Failed to submit: ' + err.message, true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Problem'; }
  }
}

async function handleVolunteerSubmit(e) {
  e.preventDefault();
  let v = true;
  v = validateField('vol-name', 'vol-name-err', 'Please enter your name') && v;
  v = validateEmail('vol-email', 'vol-email-err') && v;
  v = validateField('vol-phone', 'vol-phone-err', 'Please enter your phone') && v;
  v = validateField('vol-city', 'vol-city-err', 'Please enter your city') && v;
  v = validateField('vol-availability', 'vol-avail-err', 'Please select your availability') && v;
  if (!v) return;
  const btn = document.getElementById('vol-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Registering\u2026'; }
  try {
    const skillsRaw = document.getElementById('vol-skills').value;
    const skills = skillsRaw ? skillsRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
    await apiPost('/api/volunteers', {
      name: document.getElementById('vol-name').value.trim(),
      email: document.getElementById('vol-email').value.trim(),
      phone: document.getElementById('vol-phone').value.trim(),
      city: document.getElementById('vol-city').value.trim(),
      skills, availability: document.getElementById('vol-availability').value,
    });
    document.getElementById('volunteer-form').style.display = 'none';
    const s2 = document.getElementById('volunteer-success');
    if (s2) s2.style.display = 'block';
    showToast('Volunteer registered! \uD83C\uDF89');
  } catch (err) {
    showToast('Registration failed: ' + err.message, true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Complete Registration'; }
  }
}

async function handleVolunteerModalSubmit(e) {
  e.preventDefault();
  let v = true;
  v = validateField('vmod-name', 'vmod-name-err', 'Please enter your name') && v;
  v = validateEmail('vmod-email', 'vmod-email-err') && v;
  v = validateField('vmod-phone', 'vmod-phone-err', 'Please enter your phone') && v;
  v = validateField('vmod-avail', 'vmod-avail-err', 'Please select availability') && v;
  if (!v) return;
  const btn = document.getElementById('vmod-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Registering\u2026'; }
  try {
    await apiPost('/api/volunteers', {
      name: document.getElementById('vmod-name').value.trim(),
      email: document.getElementById('vmod-email').value.trim(),
      phone: document.getElementById('vmod-phone').value.trim(),
      city: document.getElementById('vmod-city').value.trim() || currentCity,
      skills: [], availability: document.getElementById('vmod-avail').value,
    });
    closeModal('volunteer-modal');
    document.getElementById('volunteer-modal-form').reset();
    showToast('You are registered as a volunteer! \uD83D\uDE4B');
  } catch (err) {
    showToast('Registration failed: ' + err.message, true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Register as Volunteer'; }
  }
}

async function handleNGOSubmit(e) {
  e.preventDefault();
  let v = true;
  v = validateField('ngo-name', 'ngo-name-err', 'Please enter the NGO name') && v;
  v = validateField('ngo-reg', 'ngo-reg-err', 'Please enter registration number') && v;
  v = validateEmail('ngo-email', 'ngo-email-err') && v;
  v = validateField('ngo-phone', 'ngo-phone-err', 'Please enter a phone number') && v;
  v = validateField('ngo-city', 'ngo-city-err', 'Please enter the city') && v;
  v = validateField('ngo-address', 'ngo-address-err', 'Please enter an address') && v;
  v = validateField('ngo-desc', 'ngo-desc-err', 'Please provide a description') && v;
  if (!v) return;
  const btn = document.getElementById('ngo-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting\u2026'; }
  try {
    const focusRaw = document.getElementById('ngo-focus').value;
    const focus_areas = focusRaw ? focusRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
    const website = document.getElementById('ngo-website').value.trim();
    await apiPost('/api/ngos', {
      name: document.getElementById('ngo-name').value.trim(),
      registration_number: document.getElementById('ngo-reg').value.trim(),
      email: document.getElementById('ngo-email').value.trim(),
      phone: document.getElementById('ngo-phone').value.trim(),
      city: document.getElementById('ngo-city').value.trim(),
      address: document.getElementById('ngo-address').value.trim(),
      focus_areas, website: website || null,
      description: document.getElementById('ngo-desc').value.trim(),
    });
    document.getElementById('ngo-form').style.display = 'none';
    const s3 = document.getElementById('ngo-success');
    if (s3) s3.style.display = 'block';
    showToast('NGO application submitted for review!');
  } catch (err) {
    showToast('Submission failed: ' + err.message, true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit for Review'; }
  }
}

// ─── KEYBOARD ─────────────────────────────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(function (m) { closeModal(m.id); });
    const sb = document.getElementById('sidebar');
    if (sb && sb.classList.contains('open')) toggleSidebar();
  }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  // Modal overlay click-to-close
  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Pagination buttons
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  if (prevBtn) prevBtn.addEventListener('click', function () { allProblemsPage--; loadAllProblems(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { allProblemsPage++; loadAllProblems(); });
  const sf = document.getElementById('status-filter');
  if (sf) sf.addEventListener('change', function () { allProblemsPage = 1; loadAllProblems(); });
  const pi = document.getElementById('prob-image');
  const pih = document.getElementById('prob-image-help');
  if (pi && pih) {
    pi.addEventListener('change', function () {
      if (pi.files && pi.files[0]) pih.textContent = 'Selected image: ' + safeText(pi.files[0].name);
      else pih.textContent = 'Add a clear photo to help NGOs understand the issue faster (JPG/PNG/WebP, max 2 MB).';
      pih.style.color = '';
    });
  }

  // Bootstrap
  currentCity = localStorage.getItem('aidflow_city') || 'Bhopal';
  updateTopbarDate();
  initMap();
  prefillCityFields(currentCity);

  const mt = document.getElementById('map-card-title');
  if (mt) mt.textContent = '\uD83D\uDCCD Active Locations \u2014 ' + currentCity;
  const fl = document.getElementById('forum-city-label');
  if (fl) fl.textContent = currentCity;

  Promise.all([loadStats(), loadMapMarkers(), loadRecentComplaints(), loadForum()])
    .catch(function (err) {
      console.error('Init error:', err);
      showToast('Some data failed to load. Is the API running?', true);
    });
});
