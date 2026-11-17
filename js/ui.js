/* ============================================================================
   SCREENS  -  Work orders and notifications (supervisor + technician).
   All data comes from js/store.js (window.Data). This file never touches SAP
   or a database directly.
   ============================================================================ */
(function () {
  var D = window.Data;
  var app = document.getElementById('app');
  var SUP = 'N. G. Simpas';          // signed-in supervisor (demo)
  var ME = 'R. Valledor';            // signed-in technician (demo)
  var ui = { wo: { status: 'All statuses', tech: 'All', q: '' }, notif: { status: 'Outstanding', month: 'All months', q: '' }, jobs: { status: 'Open', q: '' }, dash: { month: 'All months' }, pr: { show: 'All', sec: 'All', q: '' }, po: { status: 'All', sec: 'All', q: '' }, bell: false, pra: { rev: '', io: '', err: '' }, prf: { open: false }, prtxt: { sel: '' }, potxt: { sel: '' }, eq: { q: '' }, mp: null, bud: { section: '', year: '', add: { ym: '', amount: '', note: '' } }, ap: { status: 'Pending approval', month: '', group: '', open: '' }, apds: {}, mm: { stock: 'All', q: '', limit: 15 }, modal: null, err: '', toast: '' };

  /* ---------- small helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function parts(s) { var m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2}))?/.exec(s || ''); return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3], t: m[4] || '' } : null; }
  function fmtDT(s) { var p = parts(s); return p ? MON[p.mo] + ' ' + p.d + (p.t ? ' · ' + p.t : '') : '—'; }
  function fmtD(s) { var p = parts(s); return p ? MON[p.mo] + ' ' + p.d + ', ' + p.y : '—'; }
  function fmtFull(s) { var p = parts(s); return p ? MON[p.mo] + ' ' + p.d + ', ' + p.y + (p.t ? ' · ' + p.t : '') : '—'; }
  function dayNum(s) { var p = parts(s); return p ? Math.floor(Date.UTC(p.y, p.mo, p.d) / 86400000) : null; }
  function age(from) { var a = dayNum(from), b = dayNum(D.today()); return a == null ? '—' : Math.max(0, b - a); }
  function initials(n) { return String(n).split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2); }
  function lastDate(w) { var d = w.dates || {}; return d.confirmed || d.ptwClosed || d.ptwIssued || d.execution || d.released || d.notification || ''; }
  var PRI = { 1: 'Very High', 2: 'High', 3: 'Medium', 4: 'Low', 5: 'Outage Work' };
  function prio(p) { return p + ' - ' + PRI[p]; }

  var WS = { 'Created': ['#E5E7EB', '#1F2937'], 'Released / Cleared': ['#DBEAFE', '#1E40AF'], 'PTW In-process': ['#FEF3C7', '#78350F'], 'PTW Issued': ['#CCFBF1', '#115E59'], 'PTW Closed': ['#E0E7FF', '#3730A3'], 'Execution': ['#CFFAFE', '#155E75'], 'In Progress': ['#1D4ED8', '#FFFFFF'], 'Time Confirmed': ['#DCFCE7', '#14532D'], 'Technically Complete': ['#14532D', '#FFFFFF'] };
  var NS = { 'Outstanding': ['#FEF3C7', '#78350F'], 'In process': ['#E0E7FF', '#3730A3'], 'Order assigned': ['#DBEAFE', '#1E40AF'], 'Completed': ['#DCFCE7', '#14532D'], 'Deleted': ['#FEE2E2', '#991B1B'] };
  var GREY = ['#E5E7EB', '#1F2937'];
  function pill(text, col, big) { return '<span class="pill' + (big ? ' big' : '') + '" style="background:' + col[0] + ';color:' + col[1] + '">' + esc(text) + '</span>'; }
  function woPill(w, big, grey) { return pill(statusLabel(w.status), grey ? GREY : (WS[w.status] || GREY), big); }
  function notifPill(n, big) { return pill(n.status, NS[n.status] || GREY, big); }
  function link(href, text, cls) { return '<a href="' + href + '" class="mono" style="font-weight:500' + (cls || '') + '">' + esc(text) + '</a>'; }

  /* ---------- notification bell (upper right): supervisors see decisions, superintendents see requests waiting for approval ---------- */
  function praBellItems(withRead) {
    var a = D.account(), out = [], SUP = { 'Approved': 'Request approved', 'Returned to requestor': 'Request returned', 'PR Created': 'PR created', 'Converted to PO': 'PO created' }, sub = function (id, tx) { return '<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(id) + (tx ? ' · ' + esc(tx) : '') + '</div>'; };
    D.prApprovals().filter(function (r) { return D.inScope(r.sec); }).forEach(function (r) {
      var key = r.id + '|' + r.status, t = '';
      var seen = D.praSeen(key); if (seen && !withRead) return;
      if (a.level === 'superintendent' && r.status === 'Pending approval') t = '<b>For your approval</b>' + sub(r.id, r.text);
      else if (a.level === 'logistics' && r.status === 'For PR conversion') t = '<b>For PR conversion</b>' + sub(r.id, r.text);
      else if (a.level === 'supervisor' && SUP[r.status]) t = '<b>' + SUP[r.status] + '</b>' + sub(r.id, r.text);
      if (t) out.push({ id: key, kind: 'pra', text: t, when: r.date, read: seen });
    });
    return out;
  }
  function bellItems() { return bellItems0().concat(praBellItems()); }
  function bellItems0() {
    var a = D.account();
    if (a.level === 'logistics') return [];
    if (a.level === 'superintendent') return D.approvalAlerts().map(function (r) { return { id: r.id, kind: 'ap', text: '<b>Manpower request for your approval</b><div class="small muted">' + esc(r.id) + ' · ' + esc(r.activity) + '</div>', when: r.when }; });
    if (a.role === 'supervisor') return D.manpowerNotices().map(function (r) { return { id: r.id, kind: 'mp', text: '<b>Manpower request ' + (r.status === 'Rejected' ? 'rejected' : 'approved') + '</b><div class="small muted">' + esc(r.id) + ' · ' + esc(r.activity) + '</div>', when: r.decidedWhen }; });
    return [];
  }
  function bellHtml() {
    var a = D.account(); if (!(a.role === 'supervisor' || a.level === 'superintendent')) return '';
    var items = bellItems(), n = items.length;
    var icon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
    var rd = praBellItems(true).filter(function (x) { return x.read; }).sort(function (x, y) { return String(y.when).localeCompare(String(x.when)); });
    var shown = items.concat(rd).slice(0, 10);
    var rel = function (w) { var d = age(w); return d === '—' ? '' : d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago'; };
    var row = function (i) { var unread = !i.read; return '<button type="button" data-act="bell-item" data-kind="' + i.kind + '" data-id="' + esc(i.id) + '" style="display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:' + (unread ? '#F5F9FF' : 'transparent') + ';padding:10px 14px;cursor:pointer;font:inherit;font-size:13px' + (unread ? '' : ';opacity:.65') + '"><span aria-hidden="true" style="flex:none;width:8px;height:8px;border-radius:50%;margin-top:5px;background:' + (unread ? '#2563EB' : 'transparent') + '"></span><span style="flex:1;min-width:0">' + i.text + '<span class="small muted" style="display:block;margin-top:2px">' + rel(i.when) + '</span></span></button>'; };
    var list = (n ? '' : '<div class="muted" style="padding:14px">You\'re all caught up</div>') + shown.map(row).join('');
    var allHref = a.level === 'logistics' ? '#/pr-conversion' : '#/pr-approval';
    var foot = '<div style="padding:10px 14px;text-align:center"><a href="' + allHref + '" data-act="bell-close">View all</a></div>';
    return '<div class="bellwrap"><button type="button" data-act="bell-toggle" aria-label="Notifications' + (n ? ', ' + n + ' new' : '') + '" aria-expanded="' + (ui.bell ? 'true' : 'false') + '" style="position:relative;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center">' + icon +
      (n ? '<span style="position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#DC2626;color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center">' + n + '</span>' : '') + '</button>' +
      (ui.bell ? '<div role="dialog" aria-label="Notifications" style="position:absolute;top:48px;right:0;width:360px;max-width:92vw;max-height:70vh;overflow:auto;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:40"><div class="row between" style="padding:10px 14px;border-bottom:1px solid var(--line)"><b>Notifications</b>' + (n ? '<button type="button" class="btn" data-act="bell-all" style="height:30px;font-size:12px">Mark all as read</button>' : '') + '</div>' + list + foot + '</div>' : '') + '</div>';
  }

  /* ---------- alerts: new requests for approvers, every request and decision for Planning ---------- */
  function alertsBar(active) {
    var ap = D.approvalAlerts(), pl = D.planningAlerts(), h = '';
    var canDesk = typeof Notification !== 'undefined', perm = canDesk ? Notification.permission : 'denied';
    if (ap.length && active !== 'ap') h += '<div class="card" style="border-color:#B45309;background:#FFFBEB" role="status"><div class="row between"><h2>' + ap.length + ' new manpower request' + (ap.length === 1 ? '' : 's') + ' waiting for your approval</h2><a class="btn primary" href="#/approvals" style="text-decoration:none">Open Manpower Approvals</a></div>' +
      ap.slice(0, 5).map(function (r) { return '<div class="note"><b>' + esc(r.id) + ' · ' + esc(r.activity) + '</b> · ' + esc(r.section) + ' · requested by ' + esc(r.by) + ' · ' + fmtFull(r.when) + ' ' + eyeBtn('ap-open', r.id, 'margin-left:8px') + '</div>'; }).join('') + '</div>';
    if (pl.length) h += '<div class="card" style="border-color:#1D4ED8" role="status"><div class="row between"><h2>Planning: manpower request updates</h2><button type="button" class="btn" data-act="pl-read">Mark as read</button></div>' +
      pl.slice(0, 6).map(function (r) { var st = r.status === 'Pending approval' ? 'new request, waiting for approval' : r.status === 'Rejected' ? 'rejected by ' + esc(r.decidedBy || '') : r.status === 'Sent to BPPMS' ? 'approved by ' + esc(r.decidedBy || '') + ' and already emailed to BPPMS' : 'approved by ' + esc(r.decidedBy || '');
        return '<div class="note"><b>' + esc(r.id) + ' · ' + esc(r.activity) + '</b> · ' + esc(r.section) + ' · requested by ' + esc(r.by) + ' — ' + st + '</div>'; }).join('') + (pl.length > 6 ? '<div class="small muted">and ' + (pl.length - 6) + ' more</div>' : '') + '</div>';
    return h;
  }
  function desktopAlerts() {   // pop-up on this PC for alerts not yet shown; the first run for an account only records what already exists
    try {
      var me = D.account().name, key = 'mms.notified.' + me, seen = JSON.parse(localStorage.getItem(key) || 'null'), first = !seen; seen = seen || {};
      var items = [];
      D.approvalAlerts().forEach(function (r) { items.push([r.id + '|new', 'New manpower request ' + r.id, r.activity + ' · ' + r.section + ' · requested by ' + r.by]); });
      D.planningAlerts().forEach(function (r) { items.push([r.id + '|' + r.status, 'Manpower request ' + r.id + ' · ' + r.status, r.activity + ' · ' + r.section]); });
      D.manpowerNotices().forEach(function (r) { items.push([r.id + '|req|' + r.status, 'Your request ' + r.id + ' is ' + (r.status === 'Rejected' ? 'rejected' : 'approved' + (r.status === 'Sent to BPPMS' ? ' and already emailed to BPPMS' : '')), r.activity]); });
      D.inchargeNotices().forEach(function (r) { items.push([r.id + '|inc|' + r.status, 'Assigned to you: ' + r.id + ' approved' + (r.status === 'Sent to BPPMS' ? ' and emailed to BPPMS' : ''), r.activity]); });
      items.forEach(function (it) { if (seen[it[0]]) return; seen[it[0]] = 1; if (!first && typeof Notification !== 'undefined' && Notification.permission === 'granted') { try { new Notification(it[1], { body: it[2], tag: it[0] }); } catch (e) {} } });
      localStorage.setItem(key, JSON.stringify(seen));
    } catch (e) {}
  }

  /* ---------- layout ---------- */
  function shell(active, content) {
    var role = D.role();
    var pendingMp = D.manpowerRequests().filter(function (r) { return r.status === 'Pending approval' && D.canApprove(r.section); }).length;
    var outstanding = D.notifications().filter(function (n) { return n.status === 'Outstanding'; }).length;
    var supNav = '<a href="#/dashboard" class="' + (active === 'dash' ? 'on' : '') + '">Dashboard</a><a href="#/wo" class="' + (active === 'wo' ? 'on' : '') + '">Work Orders</a><a href="#/notifs" class="' + (active === 'notifs' ? 'on' : '') + '">Notifications<span class="badge">' + outstanding + '</span></a>' +
        '<a href="#/prs" class="' + (active === 'prs' ? 'on' : '') + '">Purchase Requests</a><a href="#/pos" class="' + (active === 'pos' ? 'on' : '') + '">Purchase Orders</a><a href="#/materials" class="' + (active === 'mm' ? 'on' : '') + '">Material Master</a><a href="#/equipment" class="' + (active === 'eq' ? 'on' : '') + '">Equipment</a>';
    var mpLink = '<a href="#/manpower" class="' + (active === 'mp' ? 'on' : '') + '">Manpower Request' + (D.manpowerNotices().length ? '<span class="badge">' + D.manpowerNotices().length + '</span>' : '') + '</a>';
    var apLink = '<a href="#/approvals" class="' + (active === 'ap' ? 'on' : '') + '">Manpower Request<span class="badge">' + pendingMp + '</span></a>';
    var head = function (t) { return '<div style="border-top:1px solid rgba(255,255,255,.18);margin:10px 8px 4px;padding-top:10px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.7">' + t + '</div>'; };
    var purchasing = head('Purchasing') + '<a href="#/pr-approval" class="' + (active === 'pra' ? 'on' : '') + '">Purchase Approval</a><a href="#/budget-overview" class="' + (active === 'bo' ? 'on' : '') + '">Budget Overview</a>';
    var nav = D.account().level === 'logistics' ? head('Purchasing') + '<a href="#/pr-conversion" class="' + (active === 'prc' ? 'on' : '') + '">PR Conversion Request</a>'
      : role === 'supervisor' ? supNav + purchasing + head('Requests') + mpLink
      : role === 'superintendent' ? supNav + purchasing + (D.account().level === 'manager' ? '' : head('Requests') + apLink)
      : '<a href="#/jobs" class="' + (active === 'jobs' ? 'on' : '') + '">My Jobs' + (D.inchargeNotices().length ? '<span class="badge">' + D.inchargeNotices().length + '</span>' : '') + '</a>';
    return '<div class="shell"><nav class="side" aria-label="Main menu"><div class="brand"><div class="logo">MPC</div><div><b>MMS</b><span>Maintenance Management System</span></div></div>' +
      '<div class="nav">' + nav + '</div><div class="grow"></div>' +
      '<div class="who"><label for="role">Viewing as</label><select id="role" data-account>' + (function () { var cur = D.account().name, view = [['Rito M. Valledor', 'Technician'], ['Ronnel A. Flores', 'Supervisor'], ['Carolino M. Luna', 'Superintendent'], ['Romel M. Arnaldo', 'Manager'], ['Edgardo M. Gurrea Jr.', 'Logistics']]; return view.map(function (v) { return '<option value="' + esc(v[0]) + '"' + (v[0] === cur ? ' selected' : '') + '>' + esc(v[0]) + ' - ' + v[1] + '</option>'; }).join(''); })() + '</select>' +
      '<button type="button" data-act="reset">Reset demo data</button><span style="color:#9AA3AF;line-height:1.4">Prototype. SAP data is sample data. Entries made here are saved in this browser only.</span></div></nav>' +
      '<main class="main">' + bellHtml() + content + '</main></div>' + (ui.modal ? modalHtml() : '') + (ui.prf.open ? prFormHtml() : '') + (ui.pra.rev ? prReviewHtml() : '') + (ui.toast ? '<div class="toast" role="status">' + esc(ui.toast) + '</div>' : '');
  }
  function backLink(href, text) { return '<a class="back" href="' + href + '">← ' + esc(text) + '</a>'; }


  /* ---------- DASHBOARD (supervisor) ---------- */
  function pie(slices, size, label) {
    var total = slices.reduce(function (s, x) { return s + x.v; }, 0), c = size / 2, r = c - 2, a0 = -Math.PI / 2, out = '';
    if (!total) out = '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#E5E7EB"/>';
    slices.forEach(function (s) {
      if (!s.v) return;
      var f = s.v / total;
      if (f >= 0.9999) { out += '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="' + s.color + '"/>'; return; }
      var a1 = a0 + f * 2 * Math.PI, x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0), x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
      out += '<path d="M' + c + ' ' + c + ' L' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + (f > 0.5 ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Z" fill="' + s.color + '" stroke="#fff" stroke-width="2"/>';
      a0 = a1;
    });
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(label) + '" style="flex:none">' + out + '</svg>';
  }
  function pct(v, total) { return total ? Math.round(v / total * 100) + '%' : '—'; }
  function legend(slices) {
    var total = slices.reduce(function (s, x) { return s + x.v; }, 0);
    return '<ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;flex:1 1 180px">' + slices.map(function (s) {
      return '<li style="display:flex;align-items:center;gap:10px"><i style="width:14px;height:14px;border-radius:3px;background:' + s.color + ';flex:none"></i><span style="flex:1">' + esc(s.label) + '</span><b>' + s.v + '</b><span class="muted" style="width:44px;text-align:right">' + pct(s.v, total) + '</span></li>';
    }).join('') + '</ul>';
  }
  function chartCard(title, big, bigLabel, slices, note, extra) {
    var total = slices.reduce(function (s, x) { return s + x.v; }, 0);
    var desc = title + ': ' + slices.map(function (s) { return s.label + ' ' + s.v + ' (' + pct(s.v, total) + ')'; }).join(', ');
    return '<section class="card tight" aria-label="' + esc(title) + '"><h2>' + esc(title) + '</h2>' +
      '<div><div style="font-size:34px;font-weight:600;line-height:1.1">' + big + '</div><div class="small muted">' + esc(bigLabel) + '</div>' + (extra || '') + '</div>' +
      '<div class="row" style="gap:24px;align-items:center">' + pie(slices, 200, desc) + legend(slices) + '</div>' +
      '<div class="small muted">' + esc(note) + '</div></section>';
  }
  function viewDashboard() {
    var f = ui.dash;
    function ym(s) { return (s || '').slice(0, 7); }
    var wos = D.workOrders().filter(function (w) { return !w.historyOnly; });
    var nots = D.notifications().filter(function (n) { return !n.historyOnly; });
    var months = {}; wos.forEach(function (w) { months[ym((w.dates || {}).released || (w.dates || {}).notification)] = 1; }); nots.forEach(function (n) { months[ym(n.when)] = 1; });
    var mopts = [{ v: 'All months', l: 'All months' }].concat(Object.keys(months).filter(Boolean).sort().reverse().map(function (k) { return { v: k, l: MONFULL[+k.slice(5) - 1] + ' ' + k.slice(0, 4) }; }));
    function inM(x) { return f.month === 'All months' || x === f.month; }
    wos = wos.filter(function (w) { return inM(ym((w.dates || {}).released || (w.dates || {}).notification)); });
    nots = nots.filter(function (n) { return inM(ym(n.when)); });
    // Work order time confirmation: of the work orders whose work is done, how many are time confirmed in SAP
    var confirmed = wos.filter(function (w) { return D.rules.isFinished(w); }).length;
    var awaiting = wos.filter(function (w) { return !D.rules.isFinished(w) && (w.status === 'PTW Closed' || D.rules.isRecorded(w.wo)); }).length;
    var stillOpen = wos.length - confirmed - awaiting;
    var woSlices = [{ label: 'Time confirmed', v: confirmed, color: '#14532D' }, { label: 'Awaiting time confirmation', v: awaiting, color: '#D97706' }];
    var woCard = chartCard('Work Order time confirmation rate', pct(confirmed, confirmed + awaiting), 'of work orders with work done are time confirmed', woSlices,
      'Counts work orders whose PTW is closed or whose work is recorded. ' + stillOpen + ' more work order' + (stillOpen === 1 ? ' is' : 's are') + ' still open and not counted.');
    // Notification completion / conversion
    var nt = nots.filter(function (n) { return n.status !== 'Deleted'; });
    var done = nt.filter(function (n) { return n.status === 'Completed'; }).length;
    var conv = nt.filter(function (n) { return n.status === 'Order assigned'; }).length;
    var notYet = nt.length - done - conv;
    var nSlices = [{ label: 'Completed', v: done, color: '#14532D' }, { label: 'Converted to work order', v: conv, color: '#1D4ED8' }, { label: 'Not yet converted', v: notYet, color: '#9CA3AF' }];
    var nCard = chartCard('Notification completion / conversion rate', pct(conv + done, nt.length), 'of notifications became a work order', nSlices,
      'Completion rate: ' + pct(done, nt.length) + ' of notifications are completed. Deleted notifications are not counted.');
    return shell('dash', '<div class="f"><span class="small muted">Main work center: MECH-BLR</span><h1>Dashboard</h1></div>' +
      '<div class="row">' + sel('Month', 'dash', 'month', mopts, f.month, 220) + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px">' + woCard + nCard + '</div>');
  }

  /* ---------- WORK ORDER LIST (supervisor) ---------- */
  var STATUS_LABEL = { 'Created': 'Released', 'Released / Cleared': 'Released', 'PTW In-process': 'Cleared', 'Execution': 'Cleared', 'In Progress': 'PTW Issued', 'Technically Complete': 'Technically Completed' };
  function statusLabel(s) { return STATUS_LABEL[s] || s; }
  var STATUS_OPTIONS = ['All statuses', 'Released', 'Cleared', 'PTW Issued', 'PTW Closed', 'Time Confirmed', 'Technically Completed'];
  function viewWoList() {
    var all = D.workOrders().filter(function (w) { return !w.historyOnly; });
    var open = all.filter(function (w) { return !D.rules.isFinished(w); });
    var recs = 0; all.forEach(function (w) { var r = D.record(w.wo); if (r && r.brand) recs++; });
    var cards = [
      ['Work Orders not assigned', open.filter(function (w) { return !D.technicianOf(w.wo); }).length],
      ['Closed PTWs w/ No Time Confirmation', all.filter(function (w) { return w.status === 'PTW Closed'; }).length],
      ['Requests for PR', recs],
      ['Work Order Backlogs', open.filter(function (w) { return dayNum(w.due) < dayNum(D.today()); }).length, true]
    ];
    var f = ui.wo, q = f.q.toLowerCase();
    var rows = all.filter(function (w) {
      if (f.status !== 'All statuses' && statusLabel(w.status) !== f.status) return false;
      var t = D.technicianOf(w.wo) || 'Unassigned'; if (f.tech !== 'All' && t !== f.tech) return false;
      return !q || (w.wo + ' ' + w.notif + ' ' + w.title + ' ' + w.kks).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return a.priority - b.priority || a.due.localeCompare(b.due); });
    var techs = D.users().technicians;
    var body = rows.map(function (w) {
      var t = D.technicianOf(w.wo);
      return '<tr><td>' + link('#/wo/' + w.wo, w.wo) + '</td><td>' + (w.notif ? link('#/notif/' + w.notif, w.notif) : '—') + '</td><td class="desc">' + esc(w.title) + '</td><td class="mono">' + esc(w.kks) + '</td><td>' + (D.rules.isFinished(w) ? '—' : age((w.dates || {}).released)) + '</td><td style="white-space:nowrap">' + prio(w.priority) + '</td><td>' + woPill(w) + '</td><td' + (t ? '' : ' class="muted"') + '>' + esc(t || 'Unassigned') + '</td><td style="white-space:nowrap">' + fmtD(w.due) + '</td></tr>';
    }).join('');
    return shell('wo',
      '<div class="f"><span class="small muted">Main work center: MECH-BLR</span><h1>Work Orders</h1></div>' +
      '<div class="cards">' + cards.map(function (c) { return '<div class="stat"><span>' + esc(c[0]) + '</span><b' + (c[2] ? ' class="warn"' : '') + '>' + c[1] + '</b></div>'; }).join('') + '</div>' +
      '<div class="tablecard"><div class="filters">' +
      sel('Status', 'wo', 'status', STATUS_OPTIONS, f.status, 200) + sel('Technician', 'wo', 'tech', ['All'].concat(techs, ['Unassigned']), f.tech, 200) +
      '<div class="f" style="margin-left:auto;min-width:240px;max-width:360px;flex:1 1 280px"><label for="q">Search</label><input id="q" type="search" placeholder="Search" value="' + esc(f.q) + '" data-filter="wo.q"></div></div>' +
      '<div class="scroll"><table><thead><tr><th>Work Order</th><th>Notification</th><th>Description</th><th>KKS</th><th>Backlog Age (days)</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Due</th></tr></thead><tbody>' + (body || '<tr><td colspan="9" class="empty">No work orders match these filters.</td></tr>') + '</tbody></table></div></div>');
  }
  function sel(label, scope, key, options, value, w) {
    return '<div class="f" style="width:' + (w || 200) + 'px"><label for="s-' + scope + key + '">' + label + '</label><select id="s-' + scope + key + '" data-filter="' + scope + '.' + key + '" style="width:100%">' +
      options.map(function (o) { var v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; return '<option value="' + esc(v) + '"' + (v === value ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select></div>';
  }

  /* ---------- WORK ORDER DETAIL (supervisor and technician) ---------- */
  function stepsFor(w) {
    var d = w.dates || {}, st = w.status;
    var labels, whens, cur;
    if (w.ptw) {
      labels = ['Notification', 'Released / Cleared', 'PTW Issued', 'PTW Closed', 'Time Confirmed', 'Technically Complete'];
      whens = [d.notification, d.released, d.ptwIssued, d.ptwClosed, d.confirmed, st === 'Technically Complete' ? d.confirmed : ''];
      cur = { 'Created': 0, 'Released / Cleared': 1, 'PTW In-process': 1, 'PTW Issued': 2, 'In Progress': 2, 'PTW Closed': 3, 'Time Confirmed': 4, 'Technically Complete': 6 }[st];
    } else {
      labels = ['Notification', 'Execution', 'Time Confirmed', 'Technically Complete'];
      whens = [d.notification, d.execution, d.confirmed, st === 'Technically Complete' ? d.confirmed : ''];
      cur = { 'Created': 0, 'Released / Cleared': 1, 'Execution': 1, 'In Progress': 1, 'Time Confirmed': 2, 'Technically Complete': 4 }[st];
    }
    if (cur == null) cur = 1;
    return '<ol class="steps" aria-label="Work order progress">' + labels.map(function (l, i) {
      var cls = i < cur ? 'done' : i === cur ? 'now' : '';
      return '<li class="' + cls + '"><i></i><b>' + esc(l) + '</b><small>' + (whens[i] ? fmtDT(whens[i]) : '—') + '</small>' + (l === 'PTW Issued' && w.ptwIssuedBy ? '<small>Issued by: ' + esc(w.ptwIssuedBy) + '</small>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  function nextSapStep(w) {
    if (w.ptw) return { 'Created': ['Released / Cleared', 'released'], 'Released / Cleared': ['PTW Issued', 'ptwIssued'], 'PTW In-process': ['PTW Issued', 'ptwIssued'], 'PTW Issued': ['PTW Closed', 'ptwClosed'], 'In Progress': ['PTW Closed', 'ptwClosed'], 'PTW Closed': ['Time Confirmed', 'confirmed'] }[w.status];
    return { 'Created': ['Execution', 'execution'], 'Released / Cleared': ['Execution', 'execution'], 'Execution': ['Time Confirmed', 'confirmed'], 'In Progress': ['Time Confirmed', 'confirmed'] }[w.status];
  }
  function viewWoDetail(id) {
    var w = D.workOrder(id); if (!w) return shell(isSup() ? 'wo' : 'jobs', '<div class="card"><h2>Work order not found</h2></div>');
    var sup = isSup(), n = w.notif ? D.notification(w.notif) : null;
    var rec = D.record(w.wo), can = D.rules.canRecord(w), nx = nextSapStep(w);
    var action = '';
    if (!sup) {
      action = '<div class="row" style="justify-content:flex-end;border-top:1px solid var(--line);padding-top:16px">' +
        (rec ? '<b style="color:#14532D">Work done recorded · ' + fmtD(rec.when) + '</b>' :
          (can ? '' : '<span class="hint">' + (D.rules.isFinished(w) ? 'This work order is already time confirmed.' : 'Available after the PTW is closed in SAP') + '</span>') +
          '<button type="button" class="btn primary" data-act="open-record"' + (can ? '' : ' disabled aria-disabled="true"') + '>Record work done</button>') + '</div>';
    }
    var demo = nx ? '<div class="row" style="justify-content:flex-end"><button type="button" class="btn dash" data-act="sim" data-wo="' + w.wo + '" data-to="' + esc(nx[0]) + '" data-key="' + nx[1] + '" style="height:32px;font-size:12px;padding:0 12px">Demo: SAP moves this to “' + esc(nx[0]) + '”</button></div>' : '';
    var head = '<div class="card" style="gap:20px"><div class="row between"><div class="row" style="gap:10px">' + '<span class="mono muted" style="font-size:15px">' + esc(w.wo) + '</span></div>' + woPill(w, true) + '</div>' +
      '<h1>' + esc(w.title) + '</h1>' + stepsFor(w) + action + '</div>';
    var ptwText = !w.ptw ? 'Not required' : (w.dates && w.dates.ptwIssued ? esc(w.ptwNo || '[PTW NO.]') + ' · Issued ' + fmtFull(w.dates.ptwIssued) : 'Not yet issued');
    var assign = D.assignmentOf(w.wo);
    var details = '<section class="card"><h2>Details</h2><dl class="grid"><div><dt>KKS</dt><dd class="mono">' + esc(w.kks) + '</dd></div><div><dt>Priority</dt><dd>' + prio(w.priority) + '</dd></div><div><dt>Equipment</dt><dd>' + esc(w.equipment) + '</dd></div><div><dt>Order type</dt><dd>' + esc(w.orderType) + '</dd></div><div><dt>Permit to work</dt><dd>' + ptwText + '</dd></div>' +
      (!sup ? '<div><dt>Assigned by</dt><dd>' + esc(assign ? assign.by : '—') + '</dd></div>' : '') + '</dl>' +
      (n ? '<div class="longtext"><div class="row between"><h3>Notification Long Text</h3>' + link('#/notif/' + n.n, n.n + ' →') + '</div><span class="small muted">Notified by ' + esc(n.by) + ' · ' + fmtFull(n.when) + '</span><pre>' + esc(n.longText) + '</pre></div>' : '') + '</section>';
    var hist = D.workOrderHistory(w.kks).slice(0, 5);
    var recent = '<section class="card"><div class="row between"><h2>Recent Activities</h2><span class="mono muted small">KKS ' + esc(w.kks) + '</span></div><div class="scroll"><table style="min-width:640px"><thead><tr><th style="padding-left:8px">Date</th><th>Work order</th><th>Description</th><th>Type</th></tr></thead><tbody>' +
      hist.map(function (h) { return '<tr><td style="padding-left:8px;white-space:nowrap" class="muted">' + fmtFull(lastDate(h)) + '</td><td>' + link((sup ? '#/wo/' : '#/job/') + h.wo, h.wo) + '</td><td>' + esc(h.title) + '</td><td style="white-space:nowrap">' + esc(h.orderType) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (sup ? '<div class="row" style="justify-content:flex-end"><span class="small muted">Show more in Maintenance History (coming soon)</span></div>' : '') + '</section>';
    var recCard = rec ? '<section class="card"><div class="row between"><h2>Record work done</h2><span class="small muted">Recorded by ' + esc(rec.by) + ' · ' + fmtD(rec.when) + '</span></div>' +
      '<dl style="margin:0;display:flex;flex-direction:column;gap:16px"><div><dt>Findings</dt><dd>' + esc(rec.findings) + '</dd></div><div><dt>Action taken</dt><dd>' + esc(rec.action) + '</dd></div></dl>' +
      '<dl class="grid"><div><dt>With helper?</dt><dd>' + esc(rec.helper) + '</dd></div><div><dt>Actual start date</dt><dd>' + fmtD(rec.start) + '</dd></div><div><dt>Actual finish date</dt><dd>' + fmtD(rec.finish) + '</dd></div><div><dt>Actual duration (hrs)</dt><dd>' + esc(rec.hrs || '—') + '</dd></div></dl>' +
      '<div class="box"><h3>Recommendation</h3><dl style="margin:0"><div><dt>Notify immediate superior?</dt><dd>' + esc(rec.notify) + '</dd></div></dl><div class="sub"><b>Parts for replacement (Request for PR)</b><dl class="grid"><div><dt>Brand and model</dt><dd>' + esc(rec.brand || '—') + '</dd></div><div><dt>Quantity</dt><dd>' + esc(rec.qty || '—') + '</dd></div></dl><dl style="margin:0"><div><dt>Specifications</dt><dd>' + esc(rec.spec || '—') + '</dd></div></dl></div></div></section>' : '';
    var right = sup ? assignCard('wo', w.wo, D.technicianOf(w.wo), assign) : '';
    return shell(sup ? 'wo' : 'jobs', backLink(sup ? '#/wo' : '#/jobs', sup ? 'Back to Work Orders' : 'Back to My Jobs') + head + demo +
      '<div class="cols"><div class="l">' + details + recent + recCard + '</div>' + (right ? '<aside class="r">' + right + '</aside>' : '') + '</div>');
  }
  function assignCard(kind, id, tech, a) {
    var techs = D.users().technicians;
    var opts = (tech ? '' : '<option value="" selected>Select a technician</option>') + techs.map(function (t) { return '<option value="' + esc(t) + '"' + (t === tech ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
    return '<section class="card tight"><h2>Assigned technician</h2>' +
      (tech ? '<div class="row" style="flex-wrap:nowrap"><div class="avatar">' + esc(initials(tech)) + '</div><div><b>' + esc(tech) + '</b><div class="small muted">Assigned ' + fmtD(a.when) + ', ' + (parts(a.when).t || '') + ' by ' + esc(a.by) + '</div></div></div>' : '<div class="muted">Not assigned yet.</div>') +
      '<div class="sep"><label class="lbl" for="as-' + kind + '">' + (tech ? 'Reassign to' : 'Assign to') + '</label><select id="as-' + kind + '" style="width:100%">' + opts + '</select></div>' +
      '<button type="button" class="btn" data-act="assign-' + kind + '" data-id="' + id + '">' + (tech ? 'Reassign' : 'Assign') + '</button></section>';
  }

  /* ---------- RECORD WORK DONE (pop-up) ---------- */
  function modalHtml() {
    var m = ui.modal;
    if (m.type === 'sent') {
      var sr = D.manpowerRequests().filter(function (x) { return x.id === m.id; })[0]; if (!sr) return '';
      var se = bppmsEmail(sr), cc = D.ccFor(sr, sr.sentBy || supName()), ccTxt = cc.map(function (x) { return esc(x.name) + ' <span class="muted">(' + x.role + (x.email ? ', ' + esc(x.email) : ', email address to be added at go-live') + ')</span>'; }).join('; ');
      var row = function (k, v) { return '<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #E5E7EB"><span style="width:64px;color:#6B7280">' + k + '</span><span style="flex:1">' + v + '</span></div>'; };
      return '<div class="overlay" data-overlay><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ol-title" style="max-width:860px;padding:0;overflow:hidden">' +
        '<div style="background:#0F6CBD;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center"><b id="ol-title">Outlook · Sent Items</b><button type="button" class="btn" style="border:none;background:transparent;color:#fff;font-size:22px;width:44px;padding:0" aria-label="Close" data-act="close-modal">×</button></div>' +
        '<div style="padding:16px;background:#fff"><div style="background:#DCFCE7;color:#14532D;border:1px solid #86EFAC;border-radius:8px;padding:8px 12px;font-weight:600;margin-bottom:10px">✓ Sent to BPPMS · ' + fmtFull(sr.sentWhen) + '. The requester and the in-charge have been notified.</div>' +
        row('From', esc(sr.sentBy || supName()) + (D.emailOf(sr.sentBy || supName()) ? ' &lt;' + esc(D.emailOf(sr.sentBy || supName())) + '&gt;' : '')) + row('To', esc(m.to || D.bppmsTo())) + row('Cc', ccTxt || '—') + row('Subject', '<b>' + esc(se.subject) + '</b>') +
        '<div style="margin-top:12px;max-height:46vh;overflow:auto;border:1px solid #E5E7EB;border-radius:8px;padding:14px">' + se.html + '</div>' +
        '<div class="row" style="justify-content:flex-end;margin-top:12px"><a class="btn" href="' + esc(mailLinks(sr, m.to || D.bppmsTo()).mailto) + '" style="display:inline-flex;align-items:center;text-decoration:none">Open in my Outlook</a><button type="button" class="btn primary" data-act="close-modal">Close</button></div>' +
        '<div class="small muted" style="margin-top:6px">Prototype: this window shows the email as it would be sent. Real sending starts once Outlook is connected at go-live.</div></div></div></div>';
    }
    if (m.type !== 'record') return '';
    function seg(name, label) { return '<div class="field" role="group" aria-labelledby="l-' + name + '"><span id="l-' + name + '" class="lbl">' + label + '</span><div class="seg"><label><input type="radio" name="' + name + '" value="Yes"><span>Yes</span></label><label><input type="radio" name="' + name + '" value="No" checked><span>No</span></label></div></div>'; }
    return '<div class="overlay" data-overlay><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rd-title">' +
      '<div class="row between"><h2 id="rd-title" style="font-size:19px">Record work done</h2><button type="button" class="btn" style="border:none;font-size:22px;width:44px;padding:0" aria-label="Close" data-act="close-modal">×</button></div>' +
      '<div class="field"><label for="f-findings">Findings <span class="req">*</span></label><textarea id="f-findings" rows="4" placeholder="What did you find?"></textarea><button type="button" class="btn dash" style="align-self:flex-start" data-act="note" data-msg="Picture upload is not part of this prototype.">Add picture</button></div>' +
      '<div class="field"><label for="f-action">Action taken <span class="req">*</span></label><textarea id="f-action" rows="4" placeholder="What did you do to fix it?"></textarea></div>' +
      seg('helper', 'With helper?') +
      '<div class="g2"><div class="field"><label for="f-start">Actual start date <span class="req">*</span></label><input id="f-start" type="date" value="' + D.today() + '"></div><div class="field"><label for="f-finish">Actual finish date <span class="req">*</span></label><input id="f-finish" type="date" value="' + D.today() + '"></div><div class="field"><label for="f-hrs">Actual duration (hrs) <span class="req">*</span></label><input id="f-hrs" type="number" min="0" step="0.5"></div></div>' +
      '<div class="box"><h3>Recommendation</h3>' + seg('notify', 'Notify immediate superior?') +
      '<div class="sub"><div><b>Parts for replacement (Request for PR)</b><div class="small muted">Leave empty if no parts are needed.</div></div><div class="g2"><div class="field"><label for="f-brand">Brand and model</label><input id="f-brand" type="text"></div><div class="field"><label for="f-qty">Quantity</label><input id="f-qty" type="number" min="0"></div></div><div class="field"><label for="f-spec">Specifications</label><textarea id="f-spec" rows="2"></textarea></div>' +
      '<div class="row"><button type="button" class="btn dash" data-act="note" data-msg="Picture upload is not part of this prototype.">Attach picture</button></div></div></div>' +
      (ui.err ? '<div class="err" role="alert">' + esc(ui.err) + '</div>' : '') +
      '<div class="row" style="justify-content:flex-end;border-top:1px solid var(--line);padding-top:16px"><button type="button" class="btn" data-act="close-modal">Cancel</button><button type="button" class="btn primary" data-act="submit-record" data-wo="' + esc(m.wo) + '">Submit</button></div></div></div>';
  }

  /* ---------- NOTIFICATIONS LIST (supervisor) ---------- */
  var NFILTER = { 'Outstanding': function (n) { return n.status !== 'Completed' && n.status !== 'Deleted'; }, 'NOCO': function (n) { return n.status === 'Completed'; }, 'Deleted': function (n) { return n.status === 'Deleted'; } };
  function monthKey(n) { var p = parts(n.when); return p.y + '-' + (p.mo < 9 ? '0' : '') + (p.mo + 1); }
  function viewNotifList() {
    var list = D.notifications().filter(function (n) { return !n.historyOnly; });
    var f = ui.notif, q = f.q.toLowerCase();
    var months = {}; list.forEach(function (n) { months[monthKey(n)] = 1; });
    var mopts = [{ v: 'All months', l: 'All months' }].concat(Object.keys(months).sort().reverse().map(function (k) { var y = +k.slice(0, 4), m = +k.slice(5) - 1; return { v: k, l: MONFULL[m] + ' ' + y }; }));
    function inMonth(n) { return f.month === 'All months' || monthKey(n) === f.month; }
    var sopts = Object.keys(NFILTER).map(function (k) { return { v: k, l: k + ' (' + list.filter(function (n) { return NFILTER[k](n) && inMonth(n); }).length + ')' }; });
    var rows = list.filter(function (n) { return NFILTER[f.status](n) && inMonth(n) && (!q || (n.n + ' ' + n.title + ' ' + n.kks).toLowerCase().indexOf(q) >= 0); }).sort(function (a, b) { return b.when.localeCompare(a.when); });
    var cards = [['Outstanding', list.filter(function (n) { return n.status === 'Outstanding'; }).length], ['Converted to work order', list.filter(function (n) { return n.status === 'Order assigned'; }).length], ['Completed', list.filter(function (n) { return n.status === 'Completed'; }).length]];
    var body = rows.map(function (n) {
      var tech = n.wo ? D.technicianOf(n.wo) : D.notifTechnician(n.n);
      var assigned = n.status === 'Deleted' ? '<span style="color:#9CA3AF">—</span>' : (tech ? '<span style="font-weight:500">' + esc(tech) + '</span>' + (!n.wo ? '<div class="small" style="color:#92400E;font-weight:600;margin-top:3px">For assessment</div>' : '') : '<span class="muted">Unassigned</span>');
      return '<tr><td>' + link('#/notif/' + n.n, n.n) + '</td><td class="desc">' + esc(n.title) + '</td><td style="white-space:nowrap">' + assigned + '</td><td class="mono">' + esc(n.kks) + '</td><td><div>' + esc(n.by) + '</div><div class="small muted">' + fmtDT(n.when) + '</div></td><td style="white-space:nowrap">' + prio(n.priority) + '</td><td>' + notifPill(n) + '</td><td>' + (n.wo ? link('#/wo/' + n.wo, n.wo) : '<span style="color:#9CA3AF">—</span>') + '</td></tr>';
    }).join('');
    return shell('notifs', '<div class="f"><span class="small muted">Main work center: MECH-BLR</span><h1>Notifications</h1></div>' +
      '<div class="cards">' + cards.map(function (c) { return '<div class="stat"><span>' + esc(c[0]) + '</span><b>' + c[1] + '</b></div>'; }).join('') + '</div>' +
      '<div class="tablecard"><div class="filters">' + sel('Status', 'notif', 'status', sopts, f.status, 200) + sel('Month', 'notif', 'month', mopts, f.month, 220) +
      '<div class="f" style="margin-left:auto;min-width:240px;max-width:360px;flex:1 1 280px"><label for="q">Search</label><input id="q" type="search" placeholder="Search" value="' + esc(f.q) + '" data-filter="notif.q"></div></div>' +
      '<div class="scroll"><table><thead><tr><th>Notification</th><th>Description</th><th>Assigned To</th><th>KKS</th><th>Notified by</th><th>Priority</th><th>Status</th><th>Linked work order</th></tr></thead><tbody>' + (body || '<tr><td colspan="8" class="empty">No notifications match these filters.</td></tr>') + '</tbody></table></div></div>');
  }

  /* ---------- NOTIFICATION DETAIL (supervisor and technician) ---------- */
  function viewNotif(id) {
    var n = D.notification(id), sup = isSup();
    if (!n) return shell(sup ? 'notifs' : 'jobs', '<div class="card"><h2>Notification not found</h2></div>');
    var labels = ['Outstanding', 'In process', 'Order assigned', 'Completed'];
    var cur = { 'Outstanding': 0, 'In process': 1, 'Order assigned': 2, 'Completed': 3, 'Deleted': -1 }[n.status];
    var steps = '<ol class="steps" aria-label="Notification status">' + labels.map(function (l, i) { return '<li class="' + (i < cur ? 'done' : i === cur ? 'now' : '') + '"><i></i><b>' + l + '</b><small>' + (i === 0 ? fmtDT(n.when) : '—') + '</small></li>'; }).join('') + '</ol>';
    var head = '<div class="card" style="gap:20px"><div class="row between"><span class="mono muted" style="font-size:15px">Notif. ' + esc(n.n) + '</span>' + notifPill(n, true) + '</div><h1>' + esc(n.title) + '</h1>' + steps + '</div>';
    var details = '<section class="card"><h2>Notification details</h2><dl class="grid"><div><dt>Priority</dt><dd>' + prio(n.priority) + '</dd></div><div><dt>KKS</dt><dd class="mono">' + esc(n.kks) + '</dd></div><div><dt>Equipment</dt><dd>' + esc(n.equipment) + '</dd></div><div><dt>Notified by</dt><dd>' + esc(n.by) + '</dd></div><div><dt>Notification date</dt><dd>' + fmtFull(n.when) + '</dd></div>' +
      (n.wo ? '<div><dt>Work order</dt><dd>' + link((sup ? '#/wo/' : '#/job/') + n.wo, n.wo) + '</dd></div>' : '') + '</dl>' +
      (n.longText ? '<div class="longtext"><h3>Notification Long Text</h3><pre>' + esc(n.longText) + '</pre></div>' : '') + '</section>';
    var hist = D.notifHistory(n.kks).slice(0, 5);
    var history = '<section class="card"><div class="row between"><h2>Notification history</h2><span class="mono muted small">KKS ' + esc(n.kks) + '</span></div><div class="scroll"><table style="min-width:560px"><thead><tr><th style="padding-left:8px">Date</th><th>Notification</th><th>Description</th></tr></thead><tbody>' +
      hist.map(function (h) { return '<tr><td style="padding-left:8px;white-space:nowrap" class="muted">' + fmtFull(h.when) + '</td><td>' + link('#/notif/' + h.n, h.n) + '</td><td>' + esc(h.title) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    var rem = D.remarks(n.n);
    var thread = '<section class="card tight"><h2>Assessment</h2><div class="thread">' + (rem.length ? rem.map(function (r) {
      return '<div class="remark"><div class="h"><b>' + esc(r.who) + '</b><span class="small muted">' + esc(r.role) + '</span><span class="small muted t">' + fmtDT(r.when) + '</span></div><span style="line-height:1.5">' + esc(r.text) + '</span></div>';
    }).join('') : '<div class="muted">No remarks yet.</div>') + '</div>' +
      '<div class="sep"><label class="lbl" for="remark-text">Add your assessment or remark</label><textarea id="remark-text" rows="4" placeholder="Add a remark"></textarea><div class="row between"><button type="button" class="btn dash" data-act="note" data-msg="Picture upload is not part of this prototype.">Add picture</button><button type="button" class="btn primary" data-act="add-remark" data-id="' + esc(n.n) + '">Add remark</button></div></div></section>';
    var right = (sup ? assignCard('notif', n.n, D.notifTechnician(n.n), D.notifAssignmentOf(n.n)) : '') + thread;
    return shell(sup ? 'notifs' : 'jobs', backLink(sup ? '#/notifs' : '#/jobs', sup ? 'Back to Notifications' : 'Back to My Jobs') + head + '<div class="cols"><div class="l">' + details + history + '</div><aside class="r">' + right + '</aside></div>');
  }

  /* ---------- MY JOBS (technician) ---------- */
  function viewJobs() {
    var mine = D.workOrders().filter(function (w) { return D.technicianOf(w.wo) === ME; });
    var assess = D.notifications().filter(function (n) { return !n.wo && n.status !== 'Deleted' && n.status !== 'Completed' && D.notifTechnician(n.n) === ME; });
    var open = mine.filter(function (w) { return D.rules.bucket(w) === 'Open'; }), done = mine.filter(function (w) { return D.rules.bucket(w) === 'Completed'; });
    var cards = [['Assigned', open.length], ['Issued PTWs', open.filter(function (w) { return w.status === 'PTW Issued'; }).length], ['Work Order Backlogs', open.filter(function (w) { return dayNum(w.due) < dayNum(D.today()); }).length], ['Work Order Completion Rate', mine.length ? Math.round(done.length / mine.length * 100) + '%' : '0%']];
    var f = ui.jobs, q = f.q.toLowerCase();
    var sopts = [{ v: 'Open', l: 'Open (' + open.length + ')' }, { v: 'Assessment', l: 'Assessment (' + assess.length + ')' }, { v: 'Completed', l: 'Completed (' + done.length + ')' }, { v: 'All', l: 'All (' + (mine.length + assess.length) + ')' }];
    var items = [];
    if (f.status === 'Assessment' || f.status === 'All') assess.forEach(function (n) { items.push({ k: 'n', n: n, p: n.priority }); });
    mine.forEach(function (w) { var b = D.rules.bucket(w); if (f.status === 'All' || f.status === b) items.push({ k: 'w', w: w, p: w.priority }); });
    items = items.filter(function (i) { var t = i.k === 'n' ? i.n.n + ' ' + i.n.title + ' ' + i.n.kks : i.w.wo + ' ' + i.w.notif + ' ' + i.w.title + ' ' + i.w.kks; return !q || t.toLowerCase().indexOf(q) >= 0; });
    var body = items.map(function (i) {
      if (i.k === 'n') { var n = i.n; return '<tr><td><span style="color:#9CA3AF">—</span></td><td>' + link('#/notif/' + n.n, n.n) + '</td><td class="desc">' + esc(n.title) + '</td><td>—</td><td class="mono">' + esc(n.kks) + '</td><td>—</td><td style="white-space:nowrap">' + prio(n.priority) + '</td><td>' + pill('For assessment', GREY) + '</td></tr>'; }
      var w = i.w, rec = D.rules.bucket(w) === 'Completed' && !D.rules.isFinished(w);
      return '<tr><td>' + link('#/job/' + w.wo, w.wo) + '</td><td>' + (w.notif ? link('#/notif/' + w.notif, w.notif) : '—') + '</td><td class="desc">' + esc(w.title) + '</td><td style="white-space:nowrap">' + esc(w.maintType) + '</td><td class="mono">' + esc(w.kks) + '</td><td>' + (D.rules.isFinished(w) ? '—' : age((w.dates || {}).released)) + '</td><td style="white-space:nowrap">' + prio(w.priority) + '</td><td>' + woPill(w, false, true) + (rec ? '<div class="small muted" style="margin-top:4px">Work recorded</div>' : '') + '</td></tr>';
    }).join('');
    return shell('jobs', '<div class="f"><span class="small muted">Signed in as ' + esc(D.account().name) + ' · ' + esc(D.account().position) + '</span><h1>My Jobs</h1></div>' + mpAssigned(D.account().name) +
      '<div class="cards">' + cards.map(function (c) { return '<div class="stat"><span>' + esc(c[0]) + '</span><b' + (c[0] === 'Work Order Backlogs' ? ' class="warn"' : '') + '>' + c[1] + '</b></div>'; }).join('') + '</div>' +
      '<div class="tablecard"><div class="filters">' + sel('Status', 'jobs', 'status', sopts, f.status, 180) +
      '<div class="f" style="margin-left:auto;min-width:240px;max-width:360px;flex:1 1 280px"><label for="q">Search</label><input id="q" type="search" placeholder="Search" value="' + esc(f.q) + '" data-filter="jobs.q"></div></div>' +
      '<div class="scroll"><table style="min-width:1000px"><thead><tr><th>Work Order</th><th>Notification</th><th style="width:100%">Description</th><th>Maint. Type</th><th>KKS</th><th>Backlog Age (days)</th><th>Priority</th><th>Status</th></tr></thead><tbody>' + (body || '<tr><td colspan="8" class="empty">Nothing here.</td></tr>') + '</tbody></table></div></div>');
  }


  /* ---------- PURCHASING + MATERIAL MASTER (supervisor, read-only SAP data) ---------- */
  function amt(n) { return Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function matCell(m) { return m ? link('#/material/' + m, m) : '<span class="small muted" style="font-style:italic">Non-stock</span>'; }
  function poStatus(i) { return i.rec >= i.qty ? 'Fully received' : i.rec > 0 ? 'Partially received' : (dayNum(i.deliv) < dayNum(D.today()) ? 'Overdue' : 'Open'); }
  var PS = { 'Open': ['#DBEAFE', '#1E40AF'], 'Partially received': ['#FEF3C7', '#78350F'], 'Fully received': ['#DCFCE7', '#14532D'], 'Overdue': ['#FEE2E2', '#991B1B'] };
  function poOverall(items) { var s = items.map(poStatus); if (s.every(function (x) { return x === 'Fully received'; })) return 'Fully received'; if (s.indexOf('Overdue') >= 0) return 'Overdue'; if (items.some(function (i) { return i.rec > 0; })) return 'Partially received'; return 'Open'; }
  function searchBox(scope, value) { return '<div class="f" style="margin-left:auto;min-width:240px;max-width:360px;flex:1 1 280px"><label for="q">Search</label><input id="q" type="search" placeholder="Search" value="' + esc(value) + '" data-filter="' + scope + '.q"></div>'; }
  function secOptions(rows, label) { return [{ v: 'All', l: 'All sections (' + rows.length + ')' }].concat(D.sections().map(function (s) { return { v: s, l: s + ' (' + rows.filter(function (r) { return r.sec === s; }).length + ')' }; })); }
  function docBox(href, title, sub, extra) { return '<a href="' + href + '" style="display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid var(--line);border-radius:10px;padding:12px 14px;color:inherit"><span><b class="mono">' + title + '</b>' + (extra || '') + '<div class="small muted">' + sub + '</div></span><span style="color:var(--blue);font-weight:600">Open →</span></a>'; }

  function viewPrList() {
    var all = D.purchaseRequestItems(), f = ui.pr, q = f.q.toLowerCase();
    var shows = { 'All': function () { return true; }, 'Without PO (open PR)': function (d) { return !d.po; }, 'With PO': function (d) { return !!d.po; } };
    var secRows = all.filter(function (d) { return shows[f.show](d); });
    var showRows = all.filter(function (d) { return f.sec === 'All' || d.sec === f.sec; });
    var shopts = Object.keys(shows).map(function (k) { return { v: k, l: (k === 'All' ? 'All PR items' : k) + ' (' + showRows.filter(shows[k]).length + ')' }; });
    var rows = all.filter(function (d) { return shows[f.show](d) && (f.sec === 'All' || d.sec === f.sec) && (!q || (d.pr + ' ' + d.mat + ' ' + d.text + ' ' + d.po).toLowerCase().indexOf(q) >= 0); });
    var body = rows.map(function (d) {
      return '<tr><td style="white-space:nowrap">' + fmtD(d.date) + '</td><td>' + link('#/pr/' + d.pr, d.pr) + '</td><td class="mono">' + d.item + '</td><td>' + (d.po ? link('#/po/' + d.po, d.po) : '<span class="muted small">No PO yet</span>') + '</td><td>' + matCell(d.mat) + '</td><td class="desc">' + esc(d.text) + '</td><td style="text-align:right">' + amt(d.price) + '</td><td style="text-align:right">' + d.qty + '</td><td>' + esc(d.uom) + '</td><td style="text-align:right">' + amt(d.price * d.qty) + '</td><td>PHP</td><td>' + esc(d.sec) + '</td></tr>';
    }).join('');
    return shell('prs', '<div class="f"><span class="small muted">Purchase requisitions from SAP · all sections</span><h1>Purchase Requests</h1></div>' +
      '<div class="tablecard"><div class="filters">' + sel('Show', 'pr', 'show', shopts, f.show, 240) + sel('Section', 'pr', 'sec', secOptions(secRows), f.sec, 220) + searchBox('pr', f.q) + '</div>' +
      '<div class="scroll"><table style="min-width:1200px"><thead><tr><th>Req. date</th><th>Purchase Req.</th><th>Item</th><th>Purchase Order</th><th>Material no.</th><th>Short text</th><th style="text-align:right">Valuation price</th><th style="text-align:right">Qty</th><th>UoM</th><th style="text-align:right">Total price</th><th>Currency</th><th>Section</th></tr></thead><tbody>' + (body || '<tr><td colspan="12" class="empty">No purchase request items match these filters.</td></tr>') + '</tbody></table></div>' +
      '<div class="small muted" style="padding:12px 18px;border-top:1px solid var(--line)">Showing ' + rows.length + ' PR items · “Non-stock” items have no material number · Sample data</div></div>');
  }
  function viewPrDetail(pr) {
    var r = D.purchaseRequest(pr); if (!r) return shell('prs', backLink('#/prs', 'Back to Purchase Requests') + '<div class="card"><h2>Purchase request not found</h2></div>');
    var h = r.header, pos = []; r.items.forEach(function (i) { if (i.po && pos.indexOf(i.po) < 0) pos.push(i.po); });
    var wo = h.wo ? D.workOrder(h.wo) : null;
    var head = '<div class="card" style="gap:12px"><h1>Display Purchase Req. ' + esc(pr) + '</h1></div>';
    var d = function (k, v) { return '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>'; };
    var details = '<section class="card"><h2>Requisition details</h2><dl class="grid">' + d('Created by', esc(h.createdBy || '—')) + d('Changed on', '[CHANGED ON]') + d('Section', esc(r.sec)) + d('Department', '[DEPARTMENT]') + d('Purchase Group', '[PUR. GROUP]') + '</dl></section>';
    var items = '<section class="card"><h2>Items</h2><div class="scroll"><table style="min-width:1000px"><thead><tr><th style="padding-left:8px">Item</th><th>Material no.</th><th>Short text</th><th style="text-align:right">Valuation price</th><th style="text-align:right">Qty</th><th>UoM</th><th style="text-align:right">Total price</th><th>Currency</th><th>Delivery date</th><th>Purchase Order</th></tr></thead><tbody>' +
      r.items.map(function (i) { return '<tr><td style="padding-left:8px" class="mono">' + i.item + '</td><td>' + matCell(i.mat) + '</td><td class="desc">' + esc(i.text) + '</td><td style="text-align:right">' + amt(i.price) + '</td><td style="text-align:right">' + i.qty + '</td><td>' + esc(i.uom) + '</td><td style="text-align:right">' + amt(i.price * i.qty) + '</td><td>PHP</td><td style="white-space:nowrap">' + (i.deliv ? fmtD(i.deliv) : '—') + '</td><td>' + (i.po ? link('#/po/' + i.po, i.po) : '<span class="muted small">No PO yet</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    var cur = r.items.filter(function (i) { return pr + '|' + i.item === ui.prtxt.sel; })[0] || r.items[0];
    var itemText = '<section class="card"><h2>Item text</h2>' + sel('Item', 'prtxt', 'sel', r.items.map(function (i) { return { v: pr + '|' + i.item, l: '[ ' + parseInt(i.item, 10) + ' ] ' + i.text }; }), pr + '|' + cur.item, 460) +
      '<pre style="white-space:pre-wrap;font:inherit;font-size:13px;margin:0;padding:10px 12px;background:var(--bg,#F5F6F8);border:1px solid var(--line);border-radius:6px;min-height:120px">' + (cur.longText ? esc(cur.longText) : '<span class="muted">No long text for this item.</span>') + '</pre></section>';
    var linked = '<section class="card tight"><h2>Linked documents</h2>' + (pos.map(function (p) { var o = D.purchaseOrder(p); return docBox('#/po/' + p, 'PO ' + p, 'Purchase order · ' + fmtD(o.date) + ' · ' + o.items.length + ' item' + (o.items.length === 1 ? '' : 's'), ''); }).join('') || '<div class="muted">No purchase order yet.</div>') +
      (wo ? docBox('#/wo/' + wo.wo, 'WO ' + wo.wo, esc(wo.title), ' ' + pill(wo.status, WS[wo.status] || GREY)) : '') + '</section>';
    return shell('prs', backLink('#/prs', 'Back to Purchase Requests') + head + '<div class="cols"><div class="l">' + items + itemText + details + '</div><aside class="r">' + linked + '</aside></div>');
  }

  function viewPoList() {
    var all = D.purchaseOrderItems().map(function (i) { i.status = poStatus(i); return i; }), f = ui.po, q = f.q.toLowerCase();
    var groups = ['All', 'Open', 'Overdue', 'Partially received', 'Fully received'];
    var secRows = all.filter(function (d) { return f.status === 'All' || d.status === f.status; });
    var stRows = all.filter(function (d) { return f.sec === 'All' || d.sec === f.sec; });
    var stopts = groups.map(function (g) { return { v: g, l: (g === 'All' ? 'All PO items' : g) + ' (' + stRows.filter(function (d) { return g === 'All' || d.status === g; }).length + ')' }; });
    var rows = all.filter(function (d) { return (f.status === 'All' || d.status === f.status) && (f.sec === 'All' || d.sec === f.sec) && (!q || (d.po + ' ' + d.vendor + ' ' + d.mat + ' ' + d.text + ' ' + d.pr).toLowerCase().indexOf(q) >= 0); });
    var body = rows.map(function (d) {
      return '<tr><td style="white-space:nowrap">' + fmtD(d.date) + '</td><td>' + link('#/po/' + d.po, d.po) + '</td><td class="mono">' + d.item + '</td><td>' + esc(d.vendor) + '</td><td>' + matCell(d.mat) + '</td><td class="desc">' + esc(d.text) + '</td><td style="text-align:right">' + amt(d.price) + '</td><td style="text-align:right">' + d.qty + '</td><td>' + esc(d.uom) + '</td><td style="text-align:right">' + amt(d.price * d.qty) + '</td><td>PHP</td></tr>';
    }).join('');
    return shell('pos', '<div class="f"><span class="small muted">Purchase orders from SAP · all sections</span><h1>Purchase Orders</h1></div>' +
      '<div class="tablecard"><div class="filters">' + sel('Delivery status', 'po', 'status', stopts, f.status, 240) + sel('Section', 'po', 'sec', secOptions(secRows), f.sec, 220) + searchBox('po', f.q) + '</div>' +
      '<div class="scroll"><table style="min-width:1100px"><thead><tr><th>PO date</th><th>Purchase Order</th><th>Item</th><th>Vendor</th><th>Material no.</th><th>Short text</th><th style="text-align:right">Net price</th><th style="text-align:right">Qty</th><th>UoM</th><th style="text-align:right">Total price</th><th>Currency</th></tr></thead><tbody>' + (body || '<tr><td colspan="11" class="empty">No purchase order items match these filters.</td></tr>') + '</tbody></table></div>' +
      '<div class="small muted" style="padding:12px 18px;border-top:1px solid var(--line)">Showing ' + rows.length + ' PO items · Sample data</div></div>');
  }
  function viewPoDetail(po) {
    var o = D.purchaseOrder(po); if (!o) return shell('pos', backLink('#/pos', 'Back to Purchase Orders') + '<div class="card"><h2>Purchase order not found</h2></div>');
    var items = o.items.map(function (i) { i.status = poStatus(i); return i; }), overall = poOverall(items);
    var totalRec = items.filter(function (i) { return i.rec >= i.qty; }).length, deliv = items.map(function (i) { return i.deliv; }).sort().pop();
    var head = '<div class="card" style="gap:12px"><h1>Display Purchase Order ' + esc(po) + '</h1></div>';
    var d = function (k, v) { return '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>'; };
    var details = '<section class="card"><h2>Order details</h2><dl class="grid">' + d('Supplier', esc(o.vendor)) + d('Doc. Date', fmtD(o.date)) + '</dl></section>';
    var tbl = '<section class="card"><h2>Items</h2><div class="scroll"><table style="min-width:1100px"><thead><tr><th style="padding-left:8px">Item</th><th>Purchase Req.</th><th>Material no.</th><th>Short text</th><th style="text-align:right">Net price</th><th style="text-align:right">Qty</th><th>UoM</th><th style="text-align:right">Total price</th><th>Currency</th><th>Delivery date</th><th>Received</th><th>Status</th></tr></thead><tbody>' +
      items.map(function (i) { return '<tr><td style="padding-left:8px" class="mono">' + i.item + '</td><td>' + link('#/pr/' + i.pr, i.pr) + '</td><td>' + matCell(i.mat) + '</td><td class="desc">' + esc(i.text) + '</td><td style="text-align:right">' + amt(i.price) + '</td><td style="text-align:right">' + i.qty + '</td><td>' + esc(i.uom) + '</td><td style="text-align:right">' + amt(i.price * i.qty) + '</td><td>PHP</td><td style="white-space:nowrap">' + fmtD(i.deliv) + '</td><td>' + i.rec + '</td><td>' + pill(i.status, PS[i.status]) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    var cur = items.filter(function (i) { return po + '|' + i.item === ui.potxt.sel; })[0] || items[0];
    var itemText = '<section class="card"><h2>Item text</h2>' + sel('Item', 'potxt', 'sel', items.map(function (i) { return { v: po + '|' + i.item, l: '[ ' + parseInt(i.item, 10) + ' ] ' + i.text }; }), po + '|' + cur.item, 460) +
      '<pre style="white-space:pre-wrap;font:inherit;font-size:13px;margin:0;padding:10px 12px;background:var(--bg,#F5F6F8);border:1px solid var(--line);border-radius:6px;min-height:120px">' + (cur.longText ? esc(cur.longText) : '<span class="muted">No long text for this item.</span>') + '</pre></section>';
    var days = dayNum(deliv) - dayNum(D.today());
    var delivery = '<section class="card tight"><h2>Delivery</h2><div><div class="small muted">Expected delivery</div><div style="font-size:20px;font-weight:600">' + fmtD(deliv) + '</div><div class="small muted">' + (days >= 0 ? days + ' day' + (days === 1 ? '' : 's') + ' from today' : Math.abs(days) + ' day' + (days === -1 ? '' : 's') + ' overdue') + ' · ' + totalRec + ' of ' + items.length + ' items received</div></div></section>';
    var prs = []; items.forEach(function (i) { if (prs.indexOf(i.pr) < 0) prs.push(i.pr); });
    var wos = []; prs.forEach(function (p) { var h = (D.purchaseRequest(p) || { header: {} }).header; if (h.wo && wos.indexOf(h.wo) < 0) wos.push(h.wo); });
    var linked = '<section class="card tight"><h2>Linked documents</h2>' + prs.map(function (p) { var r = D.purchaseRequest(p); return docBox('#/pr/' + p, 'PR ' + p, 'Purchase requisition · ' + fmtD(r.date), ' ' + pill(r.header.release || '—', r.header.release === 'Released' ? ['#DCFCE7', '#14532D'] : ['#FEF3C7', '#78350F'])); }).join('') +
      wos.map(function (id) { var w = D.workOrder(id); return w ? docBox('#/wo/' + id, 'WO ' + id, esc(w.title), ' ' + pill(w.status, WS[w.status] || GREY)) : ''; }).join('') + '</section>';
    return shell('pos', backLink('#/pos', 'Back to Purchase Orders') + head + '<div class="cols"><div class="l">' + tbl + itemText + details + '</div><aside class="r">' + delivery + linked + '</aside></div>');
  }

  function viewMaterials() {
    var all = D.materials(), f = ui.mm, q = f.q.toLowerCase();
    var F = { 'All': function () { return true; }, 'In stock': function (d) { return d.stock !== null && d.stock > 0; }, 'Out of stock (0)': function (d) { return d.stock === 0; }, 'No stock record': function (d) { return d.stock === null; } };
    var opts = Object.keys(F).map(function (k) { return { v: k, l: (k === 'All' ? 'All materials' : k) + ' (' + all.filter(F[k]).length + ')' }; });
    var rows = all.filter(function (d) { return F[f.stock](d) && (!q || (d.mat + ' ' + d.text).toLowerCase().indexOf(q) >= 0); });
    var shown = rows.slice(0, f.limit);
    var body = shown.map(function (d) {
      return '<tr><td>' + link('#/material/' + d.mat, d.mat) + '</td><td class="desc">' + esc(d.text) + '</td><td style="text-align:right">' + amt(d.price) + '</td><td>' + esc(d.uom) + '</td></tr>';
    }).join('');
    var asof = D.materialsAsOf(); 
    return shell('mm', '<div class="f"><span class="small muted">Material Master</span><h1>All Materials</h1></div>' +
      '<div class="tablecard"><div class="filters"><div class="f"><h2>Material Search (ZMM60)</h2><span class="small muted">Price per unit from SAP</span></div>' + searchBox('mm', f.q) + '</div>' +
      '<div class="scroll"><table style="min-width:760px"><thead><tr><th>Material number ▲</th><th style="width:100%">Material description</th><th style="text-align:right">Price per unit</th><th>Unit</th></tr></thead><tbody>' + (body || '<tr><td colspan="4" class="empty">No materials match these filters.</td></tr>') + '</tbody></table></div>' +
      '<div class="row between" style="padding:12px 18px;border-top:1px solid var(--line)"><span class="small muted">Showing ' + shown.length + ' of ' + rows.length + ' materials · Prices in PHP · Sample data</span>' + (shown.length < rows.length ? '<button type="button" class="btn" data-act="more-materials">Show more</button>' : '') + '</div></div>');
  }

  var PRF_UOM = ['Piece', 'Set', 'Lot', 'Meter', 'Liter', 'Kilogram', 'Box', 'Can', 'Roll'];
  function prfFresh() { return { open: true, sec: '', type: 'Stock', matq: '', mat: '', short: '', qty: '', uom: '', long: '', unit: '', cur: 'PHP', err: '' }; }
  function prfMat() { var f = ui.prf; return f.mat ? D.materials().filter(function (x) { return x.mat === f.mat; })[0] || null : null; }
  function prfTotal() { var f = ui.prf, m = prfMat(), q = parseFloat(f.qty) || 0, u = f.type === 'Stock' ? (m && m.price) || 0 : parseFloat(f.unit) || 0; return q * u; }
  function prFormHtml() {
    var f = ui.prf, stock = f.type === 'Stock', m = prfMat(), mats = D.materials();
    var fld = function (label, req, inner, right) { return '<div class="field"><label' + (right ? ' class="row between"' : '') + '>' + label + (req ? ' <span class="req">*</span>' : '') + (right || '') + '</label>' + inner + '</div>'; };
    var ro = function (v, ph) { return '<input type="text" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '" readonly tabindex="-1" style="background:#F3F4F6">'; };
    var opt = function (list, cur, ph) { return '<option value=""' + (cur ? '' : ' selected') + '>' + ph + '</option>' + list.map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); };
    var short = stock ? (m ? m.text.slice(0, 40) : '') : f.short;
    var body = fld('Material Type', true, '<select data-prf="type">' + opt(['Stock', 'Non-stock'], f.type, 'Select type') + '</select>');
    if (stock) body += fld('Material Number', true, '<input type="text" list="prf-mats" data-prf="matq" value="' + esc(f.matq) + '" autocomplete="off"><datalist id="prf-mats">' + mats.map(function (x) { return '<option value="' + esc(x.mat + ' - ' + x.text) + '"></option>'; }).join('') + '</datalist>');
    body += fld('Short Description', true, stock ? ro(short) : '<input type="text" data-prf="short" maxlength="40" value="' + esc(f.short) + '">', '<span class="small muted" id="prf-cnt">' + short.length + '/40</span>');
    body += '<div class="g2">' + fld('Qty', true, '<input type="number" min="0" step="any" data-prf="qty" value="' + esc(f.qty) + '">') + fld('UOM', true, stock ? ro(m ? m.uom : '', 'Auto') : '<select data-prf="uom">' + opt(PRF_UOM, f.uom, 'Select UOM') + '</select>') + '</div>';
    body += fld('Long Description', true, stock ? '<textarea rows="4" readonly tabindex="-1" style="background:#F3F4F6">' + esc(m ? m.text : '') + '</textarea>' : '<textarea rows="4" data-prf="long">' + esc(f.long) + '</textarea>');
    body += '<div class="g2">' + (stock ? fld('Unit Price', false, ro(m && m.price != null ? amt(m.price) : '', '0.00')) : fld('Unit Price', true, '<input type="number" min="0" step="any" data-prf="unit" value="' + esc(f.unit) + '" placeholder="0.00">')) +
      fld('Currency', false, stock ? ro('PHP') : '<select data-prf="cur">' + opt(['PHP', 'USD'], f.cur, 'Select') + '</select>') + '</div>';
    body += fld('Total Price', false, '<input type="text" id="prf-total" value="' + (prfTotal() ? amt(prfTotal()) : '') + '" placeholder="0.00" readonly tabindex="-1" style="background:#F3F4F6">');
    return '<div class="overlay" data-overlay style="align-items:center"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="prf-title" style="max-width:520px;gap:0;padding:0;overflow:hidden">' +
      '<div class="row between" style="padding:20px 24px;border-bottom:1px solid var(--line)"><div><h2 id="prf-title" style="font-size:19px">New Purchase Approval</h2></div><button type="button" class="btn" style="border:none;font-size:22px;width:44px;padding:0" aria-label="Close" data-act="prf-close">×</button></div>' +
      '<div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;flex:1">' + body + (f.err ? '<div class="err" role="alert">' + esc(f.err) + '</div>' : '') + '</div>' +
      '<div class="row" style="padding:16px 24px;border-top:1px solid var(--line)"><button type="button" class="btn primary" data-act="prf-submit">Submit request</button><button type="button" class="btn" data-act="prf-clear">Clear</button></div></div></div>';
  }
  function prfSubmit() {
    var f = ui.prf, stock = f.type === 'Stock', m = prfMat(), qty = parseFloat(f.qty), r;
    f.sec = D.account().site || D.requestSections()[0] || '';
    if (stock) {
      if (!m) return 'Pick a material number from the list.';
      if (!(qty > 0)) return 'Enter the quantity.';
      r = { sec: f.sec, type: 'Stock', mat: m.mat, text: m.text.slice(0, 40), long: m.text, qty: qty, uom: m.uom, price: m.price, cur: 'PHP', amount: (m.price || 0) * qty };
    } else {
      var unit = parseFloat(f.unit);
      if (!f.short.trim()) return 'Enter the short description.';
      if (!(qty > 0)) return 'Enter the quantity.';
      if (!f.uom) return 'Select the UOM.';
      if (!f.long.trim()) return 'Enter the long description.';
      if (!(unit > 0)) return 'Enter the unit price.';
      r = { sec: f.sec, type: 'Non-stock', mat: '', text: f.short.trim(), long: f.long.trim(), qty: qty, uom: f.uom, price: unit, cur: f.cur || 'PHP', amount: unit * qty };
    }
    D.addPrApproval(r); ui.prf = { open: false }; say(r.id + ' submitted.'); return '';
  }
  var PRA_STATUS = { 'Pending approval': ['#FEF3C7', '#78350F'], 'Approved': ['#DBEAFE', '#1E40AF'], 'For PR conversion': ['#FFEDD5', '#9A3412'], 'PR Created': ['#E0E7FF', '#3730A3'], 'Converted to PO': ['#DCFCE7', '#14532D'], 'Returned to requestor': ['#FEE2E2', '#991B1B'] };
  function isApprover() { return D.account().level === 'superintendent'; }
  function ioList() { var me = D.account(); return window.SAP.ios.filter(function (x) { return me.scopeAll || me.group === x.group; }); }
  function ioLeft(x) { return x.budget - D.prApprovals().filter(function (r) { return r.io === x.io && ['Approved', 'For PR conversion', 'PR Created', 'Converted to PO'].indexOf(r.status) >= 0; }).reduce(function (s, r) { return s + r.amount; }, 0); }
  function prReviewHtml() {
    var r = D.prApprovals().filter(function (x) { return x.id === ui.pra.rev; })[0]; if (!r) return '';
    var row = function (k, v) { return '<div style="display:flex;gap:16px;padding:6px 0;min-height:33px"><dt style="width:140px;flex:none;line-height:21px" class="muted">' + k + '</dt><dd style="margin:0;flex:1">' + v + '</dd></div>'; };
    var opts = '<option value=""' + (ui.pra.io ? '' : ' selected') + '>Select IO</option>' + ioList().map(function (x) { return '<option value="' + x.io + '"' + (x.io === ui.pra.io ? ' selected' : '') + '>' + x.io + ' - ' + esc(x.desc) + ' (PHP ' + amt(ioLeft(x)) + ' left)</option>'; }).join('');
    var ioSel = '<div class="field"><label for="pra-io">IO <span class="req">*</span></label><select id="pra-io" data-filter="pra.io">' + opts + '</select></div>', mid = '', btns = '', extra = '';
    var bt = function (cls, act, label) { return '<button type="button" class="btn' + cls + '" data-act="' + act + '" data-id="' + esc(r.id) + '">' + label + '</button>'; };
    var stockR = !!r.mat, hideDl = false;
    if (D.account().level === 'logistics') {
      if (ui.pra.pr && r.status === 'For PR conversion') {
        hideDl = true;
        mid = '<div class="field"><label for="pr-no">PR number <span class="req">*</span></label><input type="text" id="pr-no" data-pra="pf.no" value="' + esc(ui.pra.pf.no) + '"></div><div class="field"><label for="pr-item">Item number <span class="req">*</span></label><input type="text" id="pr-item" data-pra="pf.item" value="' + esc(ui.pra.pf.item) + '"></div>';
        btns = bt(' primary', 'pra-pr-send', 'Convert to PR');
      } else {
        extra = (r.io ? row('IO', esc(r.io)) : '') + (r.conv ? row('Reservation #', esc(r.conv.res)) + row('Item #', esc(r.conv.items)) : '') + (r.prNo ? row('PR #', esc(r.prNo)) + row('PR item', esc(r.prItem)) : '');
        if (r.status === 'For PR conversion') btns = bt(' primary', 'pra-pr', 'Convert to PR');
      }
    } else if (!isApprover()) {
      var rem = r.status === 'Returned to requestor' && r.remarks ? row('Remarks', esc(r.remarks)) : '';
      if (ui.pra.edit && ['Pending approval', 'Approved', 'Returned to requestor'].indexOf(r.status) >= 0) {
        var locked = r.status === 'Approved', ef = ui.pra.ef, fl = function (label, inner) { return '<div class="field"><label>' + label + '</label>' + inner + '</div>'; };
        var rd = function (v) { return '<input type="text" value="' + esc(v) + '" readonly tabindex="-1" style="background:#F3F4F6">'; };
        hideDl = true;
        mid = fl('Description', stockR ? rd(r.text) : '<input type="text" maxlength="40" data-pra="ef.text" value="' + esc(ef.text) + '">') +
          '<div class="g2">' + fl('Qty', locked ? rd(ef.qty) : '<input type="number" min="0" step="any" data-pra="ef.qty" value="' + esc(ef.qty) + '">') + fl('UOM', stockR ? rd(r.uom || '') : '<select data-pra="ef.uom">' + PRF_UOM.map(function (u) { return '<option' + (u === ef.uom ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select>') + '</div>' +
          fl('Long description', stockR ? '<textarea rows="3" readonly tabindex="-1" style="background:#F3F4F6">' + esc(r.long || r.text) + '</textarea>' : '<textarea rows="3" data-pra="ef.long">' + esc(ef.long) + '</textarea>') +
          fl('Unit Price', stockR || locked ? rd(amt(ef.price)) : '<input type="number" min="0" step="any" data-pra="ef.price" value="' + esc(ef.price) + '">') +
          fl('Total Price', '<input type="text" id="pra-total" value="' + amt((parseFloat(ef.qty) || 0) * (parseFloat(ef.price) || 0)) + '" readonly tabindex="-1" style="background:#F3F4F6">');
        btns = bt(' primary', 'pra-sedit', r.status === 'Returned to requestor' ? 'Resubmit' : 'Save');
      } else if (ui.pra.pr && r.status === 'Approved' && !stockR) {
        hideDl = true;
        mid = '<div class="field"><label for="pr-no">PR number <span class="req">*</span></label><input type="text" id="pr-no" data-pra="pf.no" value="' + esc(ui.pra.pf.no) + '"></div><div class="field"><label for="pr-item">Item number <span class="req">*</span></label><input type="text" id="pr-item" data-pra="pf.item" value="' + esc(ui.pra.pf.item) + '"></div>';
        btns = bt(' primary', 'pra-pr-send', 'Submit PR details');
      } else if (ui.pra.cp && r.status === 'Approved' && !stockR) {
        hideDl = true;
        mid = '<ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:10px"><li>Create work order</li><li>Copy PR details <button type="button" class="btn" data-act="pra-copy" data-id="' + esc(r.id) + '" style="height:22px;padding:0 10px;margin:-2px 0 -2px 8px;vertical-align:middle;line-height:1;font-size:12px;font-weight:500">Copy PR details</button></li><li>Paste to components</li><li>Save</li></ol>';
        btns = bt(' primary', 'pra-pr-open', 'Enter PR details');
      } else if (ui.pra.conv && r.status === 'Approved' && stockR && !r.conv) {
        hideDl = true;
        mid = '<div class="field"><label for="cv-res">Reservation number <span class="req">*</span></label><input type="text" id="cv-res" data-pra="cv.res" value="' + esc(ui.pra.cvf.res) + '"></div><div class="field"><label for="cv-items">Item number/s <span class="req">*</span></label><input type="text" id="cv-items" data-pra="cv.items" value="' + esc(ui.pra.cvf.items) + '"></div>';
        btns = bt(' primary', 'pra-conv-send', 'Submit request');
      } else {
        extra = (r.io ? row('IO', esc(r.io)) : '') + (r.conv ? row('Reservation #', esc(r.conv.res)) + row('Item #', esc(r.conv.items)) : '') + (r.prNo ? row('PR #', esc(r.prNo)) + row('PR item', esc(r.prItem)) : '') + rem;
        if (r.status === 'Approved' && stockR && !r.conv) btns = bt(' primary', 'pra-conv', 'Request for PR conversion');
        else if (r.status === 'Approved' && !stockR) btns = bt(' primary', 'pra-cp', 'Create PR') + bt('', 'pra-edit', 'Edit');
        else if (['Pending approval', 'Returned to requestor'].indexOf(r.status) >= 0) btns = bt(' primary', 'pra-edit', 'Edit');
      }
    } else if (r.status === 'Pending approval') {
      if (ui.pra.ret) {
        mid = '<div class="field"><label for="pra-rem">Remarks <span class="req">*</span></label><textarea id="pra-rem" rows="3" data-pra="rem">' + esc(ui.pra.rem || '') + '</textarea></div>';
        btns = bt(' primary', 'pra-reject', 'Return to requestor');
      } else {
        mid = ioSel;
        btns = bt(' primary', 'pra-approve', 'Approve') + bt('', 'pra-return', 'Return');
      }
    } else if (r.status === 'Approved') {
      if (ui.pra.edit) { mid = ioSel; btns = bt(' primary', 'pra-save', 'Save') + bt('', 'pra-cancel', 'Cancel approval'); }
      else { extra = row('IO', esc(r.io || '')); btns = bt(' primary', 'pra-edit', 'Edit'); }
    } else {
      extra = (r.io ? row('IO', esc(r.io)) : '') + (r.status === 'Returned to requestor' && r.remarks ? row('Remarks', esc(r.remarks)) : '');
    }
    return '<div class="overlay" data-overlay style="align-items:center"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="pra-title" style="max-width:520px;gap:0;padding:0;overflow:hidden">' +
      '<div class="row between" style="padding:20px 24px;border-bottom:1px solid var(--line)"><h2 id="pra-title" style="font-size:19px">' + esc(r.id) + '</h2><button type="button" class="btn" style="border:none;font-size:22px;width:44px;padding:0" aria-label="Close" data-act="pra-close">×</button></div>' +
      '<div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;flex:1">' + (hideDl ? '' : '<dl style="margin:0">' + row('Material #', esc(r.mat || '')) + row('Description', esc(r.text)) + (r.long ? row('Long description', esc(r.long)) : '') + row('Qty', r.qty ? esc(r.qty + ' ' + (r.uom || '')) : '') + row('Total Amount', 'PHP ' + amt(r.amount)) + row('Requested by', esc(r.by)) + extra + '</dl>') +
      mid + (ui.pra.err ? '<div class="err" role="alert">' + esc(ui.pra.err) + '</div>' : '') + '</div>' +
      (btns ? '<div class="row" style="padding:16px 24px;border-top:1px solid var(--line)">' + btns + '</div>' : '') + '</div></div>';
  }
  function eyeBtn(act, id, extra) { return '<button type="button" class="btn" data-act="' + act + '" data-id="' + esc(id) + '" aria-label="Review" title="Review" style="height:28px;width:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;' + (extra || '') + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button>'; }
  function praAction(r) {
    var stock = !!r.mat;
    if (r.status === 'Pending approval') return 'Superintendent to approve';
    if (r.status === 'For PR conversion') return 'Logistics to convert PR';
    if (r.status === 'Approved') return stock ? 'Supervisor to request PR conversion' : 'Supervisor to create PR';
    if (r.status === 'PR Created') return 'Logistics to convert to PO';
    if (r.status === 'Returned to requestor') return r.remarks || '';
    return '';
  }
  function viewPrConversion() {
    var rows = D.prApprovals().filter(function (r) { return r.conv && ['For PR conversion', 'PR Created', 'Converted to PO'].indexOf(r.status) >= 0; }).sort(function (a, b) { return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); });
    var body = rows.map(function (r) { return '<tr><td class="mono" style="font-weight:600">' + esc(r.id) + '</td><td style="white-space:nowrap">' + fmtD(r.date) + '</td><td>' + esc(r.sec) + '</td><td class="mono">' + esc(r.conv.res) + '</td><td class="mono">' + esc(r.conv.items) + '</td><td class="mono">' + esc(r.mat || '') + '</td><td class="desc">' + esc(r.text) + '</td><td style="text-align:right">' + (r.qty || '') + '</td><td style="text-align:right">' + amt(r.amount) + '</td><td class="mono">' + esc(r.io || '') + '</td><td>' + pill(r.status, PRA_STATUS[r.status] || GREY) + '</td><td>' + eyeBtn('pra-review', r.id) + '</td></tr>'; }).join('');
    return shell('prc', '<div class="f"><span class="small muted">Purchasing</span><h1>PR Conversion Request</h1></div>' +
      '<div class="tablecard"><div class="scroll"><table style="min-width:900px"><thead><tr><th>Control #</th><th>Date</th><th>Section</th><th>Reservation #</th><th>Item #</th><th>Material #</th><th style="width:320px">Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Total Amount</th><th>IO</th><th>Status</th><th></th></tr></thead><tbody>' + (body || '<tr><td colspan="12" class="empty">No requests.</td></tr>') + '</tbody></table></div></div>');
  }
  function viewPrApproval() {
    var reqs = D.prApprovals().filter(function (r) { return D.inScope(r.sec); });
    var count = function (st) { return reqs.filter(function (r) { return r.status === st; }).length; };
    var rows = reqs.slice().sort(function (a, b) { return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); });
    var cards = [['Waiting for Approval', count('Pending approval')], ['Waiting for PR creation/conversion', (count('Approved') + count('For PR conversion'))], ['Waiting for PO', count('PR Created')]];
    var body = rows.map(function (r) { return '<tr><td class="mono" style="font-weight:600">' + esc(r.id) + '</td><td style="white-space:nowrap">' + fmtD(r.date) + '</td><td class="mono">' + esc(r.mat || '') + '</td><td class="desc">' + esc(r.text) + '</td><td style="text-align:right">' + (r.qty || '') + '</td><td style="text-align:right">' + amt(r.amount) + '</td><td class="mono">' + esc(r.io || '') + '</td><td>' + pill(r.status, PRA_STATUS[r.status] || GREY) + '</td><td style="color:#B91C1C;font-size:12px;font-weight:600">' + esc(praAction(r)) + '</td>' + '<td>' + eyeBtn('pra-review', r.id) + '</td></tr>'; }).join('');
    return shell('pra', '<div class="row between" style="align-items:flex-start"><div class="f"><span class="small muted">Purchasing</span><h1>Purchase Approval</h1></div>' + (D.account().level === 'supervisor' ? '<button type="button" class="btn primary" data-act="prf-open" style="height:40px">New request</button>' : '') + '</div>' +
      '<div class="cards">' + cards.map(function (c) { return '<div class="stat"><span>' + esc(c[0]) + '</span><b>' + c[1] + '</b></div>'; }).join('') + '</div>' +
      '<div class="tablecard"><div class="scroll"><table style="min-width:900px"><thead><tr><th>Control #</th><th>Date</th><th>Material #</th><th style="width:320px">Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Total Amount</th><th>IO</th><th>Status</th><th>Action</th>' + '<th></th>' + '</tr></thead><tbody>' + (body || '<tr><td colspan="10" class="empty">No requests.</td></tr>') + '</tbody></table></div></div>');
  }
  function viewEquipment() {
    var seen = {}, all = [], q = ui.eq.q.toLowerCase();
    D.workOrders().concat(D.notifications()).forEach(function (x) { if (x.kks && !seen[x.kks]) { seen[x.kks] = 1; all.push({ kks: x.kks, text: x.equipment || '' }); } });
    all.sort(function (a, b) { return a.kks.localeCompare(b.kks); });
    var rows = all.filter(function (e) { return !q || (e.kks + ' ' + e.text).toLowerCase().indexOf(q) >= 0; });
    var body = rows.map(function (e) { return '<tr><td>' + link('#/equipment/' + e.kks, e.kks) + '</td><td class="desc">' + esc(e.text) + '</td></tr>'; }).join('');
    return shell('eq', '<div class="f"><span class="small muted">Equipment</span><h1>Equipment</h1></div>' +
      '<div class="tablecard"><div class="filters"><div class="f"><h2>Functional Locations (KKS)</h2></div>' + searchBox('eq', ui.eq.q) + '</div>' +
      '<div class="scroll"><table style="min-width:520px"><thead><tr><th>Functional Location</th><th style="width:100%">Description</th></tr></thead><tbody>' + (body || '<tr><td colspan="2" class="empty">No equipment matches this search.</td></tr>') + '</tbody></table></div>' +
      '<div class="small muted" style="padding:12px 18px;border-top:1px solid var(--line)">Showing ' + rows.length + ' of ' + all.length + ' functional locations · Sample data</div></div>');
  }
  function viewEquipmentDetail(kks) {
    var wos = D.workOrderHistory(kks), ns = D.notifHistory(kks);
    if (!wos.length && !ns.length) return shell('eq', backLink('#/equipment', 'Back to Equipment') + '<div class="card"><h2>Equipment not found</h2></div>');
    var desc = (wos[0] || ns[0]).equipment || '';
    var d = function (k, v) { return '<div style="display:flex;gap:16px;padding:6px 0"><dt style="width:200px;flex:none">' + k + '</dt><dd style="margin:0">' + v + '</dd></div>'; };
    var head = '<div class="card" style="gap:12px"><h1>Display Equipment ' + esc(kks) + '</h1><dl style="margin:0">' + d('Functional Location', '<span class="mono">' + esc(kks) + '</span>') + d('Description', esc(desc)) + '</dl></div>';
    var loc = '<section class="card"><h2>Location Data</h2><dl style="margin:0">' + d('MaintPlant', '[MAINT. PLANT]') + d('Location', '[LOCATION]') + d('Room', '[ROOM]') + d('Plant Section', '[PLANT SECTION]') + d('Work center', '[WORK CENTER]') + d('ABC Indic.', '[ABC INDIC.]') + d('Sort Field', '[SORT FIELD]') + '</dl></section>';
    var woTbl = '<section class="card"><h2>Work Orders</h2><div class="scroll"><table style="min-width:640px"><thead><tr><th>Work Order</th><th style="width:100%">Description</th><th>Status</th></tr></thead><tbody>' +
      (wos.map(function (w) { return '<tr><td>' + (w.historyOnly ? '<span class="mono">' + esc(w.wo) + '</span>' : link('#/wo/' + w.wo, w.wo)) + '</td><td class="desc">' + esc(w.title) + '</td><td>' + woPill(w) + '</td></tr>'; }).join('') || '<tr><td colspan="3" class="empty">No work orders for this functional location.</td></tr>') + '</tbody></table></div></section>';
    var nTbl = '<section class="card"><h2>Notifications</h2><div class="scroll"><table style="min-width:640px"><thead><tr><th>Notification</th><th style="width:100%">Description</th><th>Date</th></tr></thead><tbody>' +
      (ns.map(function (n) { return '<tr><td>' + (n.historyOnly ? '<span class="mono">' + esc(n.n) + '</span>' : link('#/notif/' + n.n, n.n)) + '</td><td class="desc">' + esc(n.title) + '</td><td style="white-space:nowrap">' + fmtD(n.when) + '</td></tr>'; }).join('') || '<tr><td colspan="3" class="empty">No notifications for this functional location.</td></tr>') + '</tbody></table></div></section>';
    return shell('eq', backLink('#/equipment', 'Back to Equipment') + head + loc + woTbl + nTbl);
  }
  function viewMaterialDetail(mat) {
    var m = D.materials().filter(function (x) { return x.mat === mat; })[0];
    if (!m) return shell('mm', backLink('#/materials', 'Back to Material Master') + '<div class="card"><h2>Material not found</h2></div>');
    var d = function (k, v) { return '<div style="display:flex;gap:16px;padding:6px 0"><dt style="width:200px;flex:none">' + k + '</dt><dd style="margin:0">' + v + '</dd></div>'; };
    var head = '<div class="card" style="gap:12px"><h1>Display Material ' + esc(m.mat) + '</h1><dl style="margin:0">' + d('Material Number', '<span class="mono">' + esc(m.mat) + '</span>') + d('Material Description', esc(m.text)) + '</dl></div>';
    var general = '<section class="card"><h2>General Data</h2><dl style="margin:0">' + d('Base Unit of Measure', esc(m.uom)) + d('Old Material Number', '[OLD MATERIAL NO.]') + d('Material Group', '[MATERIAL GROUP]') + '</dl></section>';
    var text = '<section class="card"><h2>Basic Data Text</h2><pre style="white-space:pre-wrap;font:inherit;font-size:13px;margin:0;padding:10px 12px;background:var(--bg,#F5F6F8);border:1px solid var(--line);border-radius:6px;min-height:120px"><span class="muted">[BASIC DATA TEXT]</span></pre></section>';
    return shell('mm', backLink('#/materials', 'Back to Material Master') + head + general + text);
  }


  /* ---------- Manpower request (BPPMS) ---------- */
  function php(n) { return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function mySection() { var a = D.account(), rs = D.requestSections(); return /CHP/.test(a.position) && rs.indexOf('MECH-CHP') >= 0 ? 'MECH-CHP' : (rs[0] || D.sections()[0]); }
  function t12(t) { var m = /^(\d{2}):(\d{2})$/.exec(t || ''); if (!m) return '—'; var h = +m[1]; return ((h % 12) || 12) + ':' + m[2] + ' ' + (h < 12 ? 'AM' : 'PM'); }
  function mpNew() {
    var td = D.today();
    return { section: mySection(), activity: '', wo: '', scope: '', priority: '3', start: td, end: td,
      timeStart: D.manpowerStd.start, timeEnd: D.manpowerStd.end,
      addPos: '', addQty: '1', addNote: '', notes: {}, areaNote: '', incharge: '', dayRates: false, dayMarks: {}, markDate: '', markType: 'holiday', qty: {}, err: '', doneId: '' };
  }
  function mpState() { if (!ui.mp) ui.mp = mpNew(); return ui.mp; }
  // MPC organic in-charge is picked from the user accounts, so the request shows on that person's own screen
  function inchargeSelect(id, attr, value, section) {
    var ppl = D.inchargeChoices(section), known = ppl.some(function (p) { return p.name === value; }), secs = [];
    ppl.forEach(function (p) { if (secs.indexOf(p.section) < 0) secs.push(p.section); });
    function opt(p) { return '<option value="' + esc(p.name) + '"' + (p.name === value ? ' selected' : '') + '>' + esc(p.name) + ' · ' + esc(p.position) + '</option>'; }
    return '<select id="' + id + '" ' + attr + ' style="width:100%"><option value="">Select the person in charge</option>' + (value && !known ? '<option value="' + esc(value) + '" selected>' + esc(value) + '</option>' : '') +
      (secs.length > 1 ? secs.map(function (sc) { return '<optgroup label="' + esc(sc) + '">' + ppl.filter(function (p) { return p.section === sc; }).map(opt).join('') + '</optgroup>'; }).join('') : ppl.map(opt).join('')) + '</select>';
  }
  var DAYTYPE = { rest: 'Sunday / rest day (130%)', special: 'Special non-working day (130%)', holiday: 'Regular holiday (200%)' };
  function flagsText(c) { return c.dayFlags.map(function (f) { return fmtD(f.date) + ' · ' + f.label + ' ×' + f.mult.toFixed(2); }).join('; '); }
  // Sunday / holiday rates: dates are detected from the calendar; one button applies the premium rates
  function mpDayRates(m, c, prefix) {
    var h = '', fl = c.dayFlags;
    if (fl.length) h += '<div class="note" style="margin:0"><b>Sunday / holiday rate is charged automatically</b> on ' + fl.length + ' day' + (fl.length === 1 ? '' : 's') + ': ' + esc(fl.map(function (f) { return fmtD(f.date) + ' · ' + f.label + ' ×' + f.mult.toFixed(2); }).join('; ')) + '<div class="small muted" style="margin-top:4px">Sundays and special non-working days 130%, regular holidays 200% (Philippine holiday calendar), on the normal hours and the overtime.</div></div>';
    if (prefix === 'mp') {
      var marks = Object.keys(m.dayMarks || {}).sort();
      h += '<details' + (marks.length ? ' open' : '') + ' style="margin-top:2px"><summary class="hint" style="cursor:pointer">A proclaimed holiday is not listed? Mark the date here</summary><div class="row" style="align-items:flex-end;gap:10px;margin-top:8px">' +
        '<div class="field"><label for="mp-markdate">Date</label><input type="date" id="mp-markdate" data-mp="markDate" value="' + esc(m.markDate) + '"></div>' +
        '<div class="field"><label for="mp-marktype">Day type</label><select id="mp-marktype" data-mp="markType">' + Object.keys(DAYTYPE).map(function (k) { return '<option value="' + k + '"' + (m.markType === k ? ' selected' : '') + '>' + esc(DAYTYPE[k]) + '</option>'; }).join('') + '</select></div>' +
        '<button type="button" class="btn" data-act="mp-mark" style="height:44px">Mark date</button></div>' +
        (marks.length ? '<div class="row" style="margin-top:8px;gap:8px">' + marks.map(function (d) { return '<span class="pill" style="background:#FEF3C7;color:#78350F">' + fmtD(d) + ' · ' + esc(DAYTYPE[m.dayMarks[d]] || '') + ' <button type="button" data-act="mp-unmark" data-d="' + d + '" aria-label="Remove ' + d + '" style="border:0;background:transparent;cursor:pointer;font-weight:700">×</button></span>'; }).join('') + '</div>' : '') + '</details>';
    }
    return h;
  }
  // calendar months a request touches, with the dates that fall in each month (each month is charged to its own budget)
  function monthSpans(start, end) {
    var out = [], d0 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start || ''), d1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end || '');
    if (!d0 || !d1) return out;
    var t0 = Date.UTC(+d0[1], +d0[2] - 1, +d0[3]), t1 = Date.UTC(+d1[1], +d1[2] - 1, +d1[3]);
    for (var t = t0, k = 0; t <= t1 && k < 731; t += 86400000, k++) { var iso = new Date(t).toISOString().slice(0, 10), ym = iso.slice(0, 7), last = out[out.length - 1]; if (last && last.ym === ym) { last.to = iso; last.days++; } else out.push({ ym: ym, from: iso, to: iso, days: 1 }); }
    return out;
  }
  function mpAssigned(name) {
    var list = D.manpowerFor(name); if (!list.length) return '';
    return '<div class="tablecard"><div class="filters"><div class="f"><h2>Manpower requests assigned to you</h2><span class="small muted">You are named as the MPC organic in-charge. Cost is not shown.</span></div></div><div class="scroll"><table style="min-width:820px"><thead><tr><th>Request</th><th>Activity</th><th>Work order</th><th>Dates and time</th><th>BPPMS manpower</th><th>Status</th></tr></thead><tbody>' +
      list.map(function (r) { return '<tr><td class="mono" style="font-weight:600">' + esc(r.id) + '<div class="small muted" style="font-weight:400">' + esc(r.section) + '</div></td><td class="desc">' + esc(r.activity) + '</td><td class="mono">' + esc(r.wo) + '</td><td>' + fmtD(r.start) + ' to ' + fmtD(r.end) + '<div class="small muted">' + t12(r.timeStart) + ' – ' + t12(r.timeEnd) + '</div></td><td>' + esc(headsText(r)) + '</td><td>' + mpPill(r.status) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  }
  function mpSummary() {
    var m = mpState(), c = D.calcManpower(m), ot = c.otHours > 0;
    var otTxt = '';
    if (ot) {
      var cnt = {}; c.otDates.forEach(function (d) { cnt[d.label.split(' (')[0]] = (cnt[d.label.split(' (')[0]] || 0) + 1; });
      otTxt = '<div class="kv"><span class="muted">Overtime</span><b style="text-align:right">' + c.otDates.length + ' day' + (c.otDates.length === 1 ? '' : 's') + ' · ' + fmtH(c.otHours) + '/day<br><span class="small muted" style="font-weight:400">' +
        Object.keys(cnt).map(function (k) { return cnt[k] + ' ' + k.toLowerCase(); }).join(', ') + '</span></b></div>';
    }
    var wd = c.days + ' day' + (c.days === 1 ? '' : 's') + (c.days !== c.calendarDays && c.calendarDays ? ' (of ' + c.calendarDays + ' calendar days)' : '');
    return '<div class="muted" style="font-size:13px">Total plan cost</div><div class="total">' + php(c.total) + '</div>' +
      '<div><div class="kv"><span class="muted">Section</span><b>' + esc(m.section) + '</b></div>' +
      '<div class="kv"><span class="muted">Schedule</span><b style="text-align:right">' + (m.start ? fmtD(m.start) : '—') + ' to ' + (m.end ? fmtD(m.end) : '—') + '</b></div>' +
      '<div class="kv"><span class="muted">Time</span><b>' + t12(m.timeStart) + ' – ' + t12(m.timeEnd) + '</b></div>' +
      '<div class="kv"><span class="muted">Hours detected</span><b>' + esc(c.kind) + '</b></div>' +
      '<div class="kv"><span class="muted">Rate applied</span><b>' + (c.night ? 'Night shift (N/S)' : 'Day') + '</b></div>' +
      '<div class="kv"><span class="muted">Working days</span><b>' + (c.days ? wd : '—') + '</b></div>' +
      '<div class="kv"><span class="muted">Headcount</span><b>' + c.headcount + '</b></div>' +
      (c.premiumDates.length ? '<div class="kv"><span class="muted">Sunday / holiday rates</span><b style="text-align:right">' + c.premiumDates.length + ' day' + (c.premiumDates.length === 1 ? '' : 's') + '<br><span class="small muted" style="font-weight:400">' + esc(flagsText({ dayFlags: c.dayFlags.filter(function (f) { return c.premiumDates.indexOf(f.date) >= 0; }) })) + '</span></b></div>' : '') + otTxt + '</div>' +
      (!c.headcount ? '<div class="hint">Add manpower on the left to see the cost.</div>' : '') +
      (c.noNS.length ? '<div class="note">No night-shift (N/S) rate on the rate sheet for ' + esc(c.noNS.join(', ')) + '. The day rate is used for them.</div>' : '');
  }
  function mpFindPos(txt) { var t = String(txt || '').trim().toLowerCase(), all = D.manpowerPositions(); for (var i = 0; i < all.length; i++) if (all[i].pos.toLowerCase() === t) return i; return -1; }
  // add-on list: pick a position, give a quantity, press Add; added items appear below and can be changed or removed
  function mpItems() {
    var m = mpState(), all = D.manpowerPositions();
    var adder = '<div class="sub"><div class="row" style="align-items:flex-end;gap:12px">' +
      '<div class="field" style="flex:1 1 240px"><label for="mp-addpos">Position</label><input type="text" id="mp-addpos" data-mp="addPos" list="mp-poslist" value="' + esc(m.addPos) + '" placeholder="Click or type to search a position" autocomplete="off" style="width:100%"><datalist id="mp-poslist">' + all.map(function (p) { return '<option value="' + esc(p.pos) + '"></option>'; }).join('') + '</datalist></div>' +
      '<div class="field"><label for="mp-addqty">Quantity</label><input type="number" id="mp-addqty" data-mp="addQty" min="1" max="99" value="' + esc(m.addQty) + '" style="width:90px"></div>' +
      '<button type="button" class="btn primary" data-act="mp-add">+ Add</button></div></div>';
    var items = all.map(function (p, i) { return { p: p, i: i, q: parseInt(m.qty[p.pos], 10) || 0 }; }).filter(function (x) { return x.q > 0; });
    var list = items.length ? '<table style="min-width:360px"><thead><tr><th>Added positions</th><th style="text-align:right">Quantity</th><th></th></tr></thead><tbody>' + items.map(function (x) {
      return '<tr class="mprow"><td class="desc">' + esc(x.p.pos) + '</td><td style="text-align:right"><div class="stepper"><button type="button" data-act="mp-step" data-i="' + x.i + '" data-d="-1" aria-label="Decrease ' + esc(x.p.pos) + '">−</button><input type="number" min="0" max="99" value="' + x.q + '" data-mp="qty" data-i="' + x.i + '" aria-label="Number of ' + esc(x.p.pos) + '"><button type="button" data-act="mp-step" data-i="' + x.i + '" data-d="1" aria-label="Increase ' + esc(x.p.pos) + '">+</button></div></td>' +
        '<td style="text-align:right"><button type="button" class="btn" data-act="mp-remove" data-i="' + x.i + '" style="height:36px;padding:0 12px" aria-label="Remove ' + esc(x.p.pos) + '">Remove</button></td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty" style="padding:16px">No positions added yet.</div>';
    return adder + '<div class="scroll">' + list + '</div>';
  }
  function mpHoursInfo(c, m) {
    if (!m.timeStart || !m.timeEnd || m.timeStart === m.timeEnd) return 'Enter the time start and time end.';
    var std = t12(D.manpowerStd.start) + ' – ' + t12(D.manpowerStd.end), ot = fmtH(c.otHours);
    if (c.kind === 'Night shift') return 'Night shift: it starts at 7:00 PM or later, so the night-shift (N/S) rates apply.' + (c.otHours > 0 ? ' ' + ot + ' after 7:30 AM are overtime.' : '');
    if (c.kind === 'Overtime') return 'Overtime: all ' + ot + ' are outside the normal hours (' + std + '). No day rate is charged, only overtime.';
    if (c.kind === 'Normal + overtime') return 'Normal hours (' + std + ') plus ' + ot + ' overtime outside those hours.';
    if (c.kind === 'Normal (part of the day)') return 'Normal hours, part of the day (paid in proportion to ' + std + ').';
    return 'Normal hours (' + std + '), day rates.';
  }

  function mpPriorityOpts(v) { return [1, 2, 3, 4, 5].map(function (k) { return '<option value="' + k + '"' + (String(v) === String(k) ? ' selected' : '') + '>' + esc(prio(k)) + '</option>'; }).join(''); }
  function mpPill(st, big) { return pill(st, st === 'Approved' ? ['#DCFCE7', '#14532D'] : st === 'Rejected' ? ['#FEE2E2', '#991B1B'] : st === 'Sent to BPPMS' ? ['#DBEAFE', '#1E40AF'] : ['#FEF3C7', '#78350F'], big); }
  function fmtH(h) { var t = Math.round((h || 0) * 60), hh = Math.floor(t / 60), mm = t % 60; return (hh ? hh + (hh === 1 ? ' hr' : ' hrs') : '') + (hh && mm ? ' ' : '') + (mm ? mm + (mm === 1 ? ' min' : ' mins') : '') || '0 hrs'; }
  function supName() { return D.account().name; }   // the signed-in account
  function isSup() { return D.role() === 'supervisor' || D.role() === 'superintendent'; }
  function whoAmI() { return D.account().name; }
  function headsText(r) { return r.calc.lines.map(function (l) { return l.qty + ' × ' + l.pos; }).join(', '); }
  function mpSeg(key, vals, cur) { return '<div class="seg" role="radiogroup">' + vals.map(function (v) { return '<label><input type="radio" name="mp-' + key + '" data-mp="' + key + '" value="' + v + '"' + (cur === v ? ' checked' : '') + '><span>' + v + '</span></label>'; }).join('') + '</div>'; }
  function viewManpower() {
    var m = mpState();
    if (m.doneId) {
      var r = D.manpowerRequests().filter(function (x) { return x.id === m.doneId; })[0];
      if (r) return shell('mp', '<div class="f"><span class="small muted">Manpower Request</span><h1>Request sent</h1></div>' +
        '<div class="card"><div class="row between"><span class="mono" style="font-size:16px;font-weight:600">' + esc(r.id) + '</span>' + mpPill(r.status, true) + '</div><div class="note">' + (r.status === 'Approved' ? 'Requested by the Superintendent, so it is approved on submission. Open Manpower Approvals to email BPPMS. The amount is counted against the ' + esc(r.section) + ' budget.' : 'Sent to the Superintendent for approval. The amount is now counted as pending against the ' + esc(r.section) + ' budget.') + '</div>' +
        '<div class="cols"><div class="l"><dl class="grid"><div><dt>Activity</dt><dd>' + esc(r.activity) + '</dd></div><div><dt>Section</dt><dd>' + esc(r.section) + '</dd></div><div><dt>Priority</dt><dd>' + prio(r.priority) + '</dd></div><div><dt>Work order</dt><dd class="mono">' + esc(r.wo) + '</dd></div><div><dt>Dates</dt><dd>' + fmtD(r.start) + ' to ' + fmtD(r.end) + '</dd></div><div><dt>Time</dt><dd>' + t12(r.timeStart) + ' – ' + t12(r.timeEnd) + '</dd></div><div><dt>Requested by</dt><dd>' + esc(r.by) + ' · ' + fmtFull(r.when) + '</dd></div></dl>' +
        '<div class="longtext"><h3>Scope of works</h3><pre>' + esc(r.scope) + '</pre></div></div><aside class="r"><div class="box">' + (function () { var keep = ui.mp; ui.mp = r; var h = mpSummary(); ui.mp = keep; return h; })() + '</div><div class="box">' + mpBudget(r.section, r.calc.monthly, r.id) + '</div></aside></div>' +
        '<div class="row"><button type="button" class="btn primary" data-act="mp-new">New request</button>' + (r.status === 'Approved' ? '<button type="button" class="btn dash" data-act="mp-go-ap">Go to Manpower Approvals to email BPPMS →</button>' : '<button type="button" class="btn dash" data-act="mp-as-super">See it as the Superintendent →</button>') + '</div></div>' + mpList());
    }
    var notices = D.manpowerNotices(), noticeHtml = '';
    if (isSup()) {
    }
    var c = D.calcManpower(m);
    var wos = D.workOrders().filter(function (w) { return !w.historyOnly && !D.rules.isFinished(w); });
    var woHit = D.workOrder(m.wo);
    var link = '<div class="field" style="grid-column:1/-1"><label for="mp-pick">Link to an open work order (live from SAP)</label><select id="mp-pick" data-mp="pick"><option value="">Select a work order to fill Activity and Work order number</option>' +
      wos.map(function (w) { return '<option value="' + esc(w.wo) + '"' + (w.wo === m.wo ? ' selected' : '') + '>' + esc(w.wo + ' · ' + w.title) + '</option>'; }).join('') + '</select></div>';
    var form = '<div class="f"><span class="small muted">Manpower Request</span><h1>Request BPPMS manpower</h1><span class="hint">Pick a work order or type the details, then tick how many of each position you need. The plan cost updates as you go.</span></div>' +
      '<div id="mp-strip" style="display:flex;flex-direction:column;gap:8px">' + mpStrip() + '</div>' +
      (m.err ? '<div class="note" role="alert" style="background:#FEF2F2;border-color:#FECACA;color:#991B1B">' + esc(m.err) + '</div>' : '') +
      '<div class="cols"><div class="l">' +
      '<section class="card"><h2>1 · Activity</h2><div class="g2">' + link +
      '<div class="field"><label for="mp-section">Section <span class="req">*</span></label><select id="mp-section" data-mp="section">' + D.requestSections().map(function (x) { return '<option' + (x === m.section ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="mp-pri">Urgency / priority <span class="req">*</span></label><select id="mp-pri" data-mp="priority">' + mpPriorityOpts(m.priority) + '</select></div>' +
      '<div class="field" style="grid-column:1/-1"><label for="mp-act">Activity <span class="req">*</span></label><input type="text" id="mp-act" data-mp="activity" value="' + esc(m.activity) + '" placeholder="e.g. U1 ID fan A coupling replacement" style="width:100%"></div>' +
      '<div class="field"><label for="mp-wo">Work order number <span class="req">*</span></label><input type="text" id="mp-wo" class="mono" data-mp="wo" inputmode="numeric" maxlength="10" list="mp-wolist" value="' + esc(m.wo) + '" placeholder="10 digits">' +
      '<datalist id="mp-wolist">' + wos.map(function (w) { return '<option value="' + esc(w.wo) + '">' + esc(w.title) + '</option>'; }).join('') + '</datalist>' +
      '<span class="hint" id="mp-wohint">' + (woHit ? esc(woHit.title) : (m.wo ? 'Not found in the SAP data.' : 'Type the number or use the list above.')) + '</span></div></div>' +
      '<div class="field"><label for="mp-scope">Scope of works <span class="req">*</span></label><textarea id="mp-scope" data-mp="scope" rows="4" placeholder="Describe the work to be done">' + esc(m.scope) + '</textarea></div>' +
      '<div class="field"><label for="mp-inch">MPC organic in-charge <span class="req">*</span></label>' + inchargeSelect('mp-inch', 'data-mp="incharge"', m.incharge, m.section) + '<span class="hint">Only people of this section are listed. The request will show on that person’s screen, and the name goes in the email to BPPMS.</span></div>' +
      '</section>' +
      '<section class="card"><h2>2 · Schedule and hours</h2><div class="g2">' +
      '<div class="field"><label for="mp-start">Start date <span class="req">*</span></label><input type="date" id="mp-start" data-mp="start" value="' + esc(m.start) + '"></div>' +
      '<div class="field"><label for="mp-end">End date <span class="req">*</span></label><input type="date" id="mp-end" data-mp="end" value="' + esc(m.end) + '" min="' + esc(m.start) + '"></div>' +
      '<div class="field"><label for="mp-ts">Time start <span class="req">*</span></label><input type="time" id="mp-ts" data-mp="timeStart" value="' + esc(m.timeStart) + '"></div>' +
      '<div class="field"><label for="mp-te">Time end <span class="req">*</span></label><input type="time" id="mp-te" data-mp="timeEnd" value="' + esc(m.timeEnd) + '"></div>' +
      '<div class="field" style="grid-column:1/-1"><div class="row" style="gap:10px"><span id="mp-kind">' + pill(c.kind, c.night ? ['#E0E7FF', '#3730A3'] : c.kind === 'Normal' ? ['#DCFCE7', '#14532D'] : ['#FEF3C7', '#78350F'], true) + '</span><button type="button" class="btn dash" data-act="mp-std" style="height:32px;font-size:12px;padding:0 12px">Reset to ' + t12(D.manpowerStd.start) + ' – ' + t12(D.manpowerStd.end) + '</button></div><span class="hint" id="mp-rateinfo" style="margin-top:6px">' + esc(mpHoursInfo(c, m)) + '</span></div>' +
      '<div class="field" style="grid-column:1/-1;gap:10px" id="mp-dayrates">' + mpDayRates(m, c, 'mp') + '</div>' +
      '</div></section>' +
      '<section class="card"><div class="f"><h2>3 · Manpower needed</h2><span class="small muted">Choose a position, set the quantity and press Add. Repeat for each position.</span></div>' + mpItems() + '</section>' +
      '</div><aside class="r"><div class="sticky" style="display:flex;flex-direction:column;gap:20px"><div class="card" id="mp-summary">' + mpSummary() + '</div>' +
      '<div class="card"><button type="button" class="btn primary" data-act="mp-submit" style="width:100%">' + (D.role() === 'superintendent' ? 'Submit (approved by you)' : 'Send to Superintendent for approval') + '</button><button type="button" class="btn" data-act="mp-clear" style="width:100%">Clear form</button>' +
      '<div class="note">Plan cost uses the BPPMS rate sheet. The ' + D.manpowerNormalHours + '-hour paid day and the overtime premiums are working assumptions until confirmed with the contract.</div></div></div></aside></div>';
    return shell('mp', noticeHtml + mpAssigned(whoAmI()) + form + mpList());
  }
  function mpList() {
    var list = D.visibleRequests();
    var rows = list.map(function (r) { return '<tr><td class="mono" style="font-weight:500;white-space:nowrap">' + esc(r.id) + '</td><td class="desc">' + esc(r.activity) + '</td><td>' + esc(r.section) + '</td><td class="mono">' + esc(r.wo) + '</td><td style="white-space:nowrap">' + fmtD(r.start) + ' – ' + fmtD(r.end) + '</td><td style="text-align:right" class="mono">' + r.calc.headcount + '</td><td class="mono" style="text-align:right;white-space:nowrap">' + php(r.calc.total) + '</td><td>' + mpPill(r.status) + '</td></tr>'; }).join('');
    return '<div class="tablecard"><div class="filters"><div class="f"><h2>Submitted requests</h2><span class="small muted">Saved in this browser only (prototype)</span></div></div><div class="scroll"><table style="min-width:900px"><thead><tr><th>Request</th><th style="width:100%">Activity</th><th>Section</th><th>Work order</th><th>Dates</th><th style="text-align:right">Heads</th><th style="text-align:right">Plan cost</th><th>Status</th></tr></thead><tbody>' + (rows || '<tr><td colspan="8" class="empty">No manpower requests yet.</td></tr>') + '</tbody></table></div></div>';
  }
  function mpRefresh() {
    var el = document.getElementById('mp-summary'); if (el) el.innerHTML = mpSummary();
    var st = document.getElementById('mp-strip'); if (st) st.innerHTML = mpStrip();
    var be = document.getElementById('mp-budget'); if (be) be.innerHTML = mpBudget(mpState().section, D.calcManpower(mpState()).monthly, '');
    var m = mpState();
    var wh = document.getElementById('mp-wohint'), w = D.workOrder(m.wo); if (wh) wh.textContent = w ? w.title : (m.wo ? 'Not found in the SAP data.' : 'Type the number or use the list above.');
    var c2 = D.calcManpower(m), ri = document.getElementById('mp-rateinfo'); if (ri) ri.textContent = mpHoursInfo(c2, m);
    var dr = document.getElementById('mp-dayrates'); if (dr && document.activeElement && !dr.contains(document.activeElement)) dr.innerHTML = mpDayRates(m, c2, 'mp');
    var kd = document.getElementById('mp-kind'); if (kd) kd.innerHTML = pill(c2.kind, c2.night ? ['#E0E7FF', '#3730A3'] : c2.kind === 'Normal' ? ['#DCFCE7', '#14532D'] : ['#FEF3C7', '#78350F'], true);
  }
  function mpValidate(m) {
    if (!m.activity.trim()) return 'Please enter the Activity.';
    if (!/^\d{10}$/.test(m.wo.trim())) return 'Please enter the 10-digit Work Order number.';
    if (!m.scope.trim()) return 'Please describe the Scope of works.';
    if (!m.incharge.trim()) return 'Please enter the MPC organic in-charge.';
    if (!m.start || !m.end) return 'Please enter the start and end dates.';
    if (m.end < m.start) return 'The end date cannot be before the start date.';
    if (!m.timeStart || !m.timeEnd) return 'Please enter the time start and time end.';
    if (m.timeStart === m.timeEnd) return 'The time start and time end cannot be the same.';
    if (!D.calcManpower(m).headcount) return 'Please add at least one position under Manpower needed.';
    return '';
  }

  /* ---------- section budget helpers + screens ---------- */
  function ymLabel(ym) { return MON[+ym.slice(5) - 1] + ' ' + ym.slice(0, 4); }
  function yearTotals(sec, y) {
    var t = { budget: 0, other: 0, approved: 0, pending: 0 };
    for (var m = 1; m <= 12; m++) { var ym = y + '-' + (m < 10 ? '0' : '') + m, b = D.budgetSet(sec, ym), c = D.committed(sec, ym, ''); t.budget += b.maint; t.other += b.other; t.approved += c.approved; t.pending += c.pending; }
    t.remaining = t.budget - t.approved - t.pending; return t;
  }
  // budget panel for a request: per month budget vs committed vs this request, then the whole year
  // one block per calendar month the request touches: allotted budget, approved (actual used), other pending, this request, what is left
  function budgetCards(sec, start, end, monthly, excludeId) {
    var nm = D.budgetLabel(sec), spans = monthSpans(start, end);
    if (!spans.length) spans = [{ ym: D.today().slice(0, 7), from: D.today(), to: D.today(), days: 1 }];
    var html = spans.map(function (sp) {
      var b = D.budgetOf(sec, sp.ym, excludeId, monthly), cm = D.committed(sec, sp.ym, excludeId), mine = monthly[sp.ym] || 0;
      var actual = b.maint - cm.approved, afterPending = actual - cm.pending, left = afterPending - mine;
      return '<div class="f" style="gap:8px"><b>' + esc(nm) + ' · ' + ymLabel(sp.ym) + (spans.length > 1 ? ' <span class="muted" style="font-weight:400">(' + fmtD(sp.from) + (sp.from === sp.to ? '' : ' to ' + fmtD(sp.to)) + ', ' + sp.days + ' day' + (sp.days === 1 ? '' : 's') + ')</span>' : '') + '</b>' +
        '<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"><div class="stat"><span>Monthly budget (allotted)</span><b style="font-size:22px">' + php(b.maint) + '</b></div><div class="stat"><span>Approved (used)</span><b style="font-size:22px">' + php(cm.approved) + '</b></div><div class="stat"><span>Other pending</span><b style="font-size:22px">' + php(cm.pending) + '</b></div><div class="stat"><span>This request</span><b style="font-size:22px">' + php(mine) + '</b></div><div class="stat"><span>Left after this request</span><b style="font-size:22px" class="' + (left < 0 ? 'warn' : '') + '">' + php(left) + '</b></div></div>' +
        '<div class="hint">Actual left of the allotted budget now: <b>' + php(actual) + '</b> (' + php(b.set) + ' set' + (b.carry > 0 ? ' + ' + php(b.carry) + ' carried over' : '') + ' − ' + php(cm.approved) + ' approved)' + (cm.pending ? ' · after the other pending requests: <b>' + php(afterPending) + '</b>' : '') + (left < 0 ? ' · <b style="color:#B91C1C">Over the monthly budget by ' + php(-left) + '</b>' : '') + '</div></div>';
    }).join('');
    return html + (spans.length > 1 ? '<div class="hint">Each day is charged to the budget of its own month: ' + spans.map(function (sp) { return ymLabel(sp.ym) + ' (' + sp.days + ' day' + (sp.days === 1 ? '' : 's') + ')'; }).join(', ') + '.</div>' : '');
  }
  function mpStrip() { var m = mpState(); return budgetCards(m.section, m.start, m.end, D.calcManpower(m).monthly, ''); }
  function mpBudget(sec, monthly, excludeId) {
    var yms = Object.keys(monthly).sort(), thisY = yms.length ? yms[0].slice(0, 4) : D.today().slice(0, 4);
    var rows = yms.map(function (ym) {
      var b = D.budgetOf(sec, ym, excludeId, monthly), c = D.committed(sec, ym, excludeId), mine = monthly[ym], left = b.maint - c.approved - c.pending - mine;
      return '<div class="sub" style="gap:6px;padding:10px 12px"><div class="row between"><b>' + ymLabel(ym) + '</b><span class="small" style="font-weight:600;color:' + (left < 0 ? '#B91C1C' : '#14532D') + '">' + (left < 0 ? 'Over by ' + php(-left) : 'Left ' + php(left)) + '</span></div>' +
        '<div class="kv small"><span class="muted">Budget set for the month</span><b>' + php(b.set) + '</b></div>' + (b.carry > 0 ? '<div class="kv small"><span class="muted">Carried over from earlier months</span><b>' + php(b.carry) + '</b></div>' : '') + '<div class="kv small"><span class="muted">Already committed</span><b>' + php(c.approved + c.pending) + '</b></div><div class="kv small"><span class="muted">This request</span><b>' + php(mine) + '</b></div></div>';
    }).join('');
    var ys = yearTotals(sec, thisY), mineY = 0; yms.forEach(function (ym) { if (ym.slice(0, 4) === thisY) mineY += monthly[ym]; });
    var other = excludeId ? 0 : mineY, left = ys.remaining - other;
    return '<h3>' + esc(D.budgetLabel(sec)) + ' budget (requested maintenance)</h3>' + (rows || '<div class="hint">Enter dates and manpower to see the effect on the monthly budget.</div>') +
      '<div><div class="kv"><span class="muted">' + thisY + ' budget</span><b>' + php(ys.budget) + '</b></div><div class="kv"><span class="muted">Approved + pending</span><b>' + php(ys.approved + ys.pending) + '</b></div>' + (excludeId ? '' : '<div class="kv"><span class="muted">This request</span><b>' + php(mineY) + '</b></div>') +
      '<div class="kv"><span class="muted">Remaining for ' + thisY + '</span><b style="color:' + (left < 0 ? '#B91C1C' : '#14532D') + '">' + php(left) + '</b></div></div>' +
      (D.role() === 'superintendent' ? '<a href="#/budget" class="small">Open the full ' + esc(D.budgetLabel(sec)) + ' budget →</a>' : '');
  }
  function budgetManage(sec, year) {
    var f = ui.bud, edit = true;
    var ys = yearTotals(sec, year);
    var cards = '<div class="cards"><div class="stat"><span>Annual budget (requested maintenance)</span><b>' + php(ys.budget) + '</b></div><div class="stat"><span>Approved</span><b>' + php(ys.approved) + '</b></div><div class="stat"><span>Pending approval</span><b>' + php(ys.pending) + '</b></div><div class="stat"><span>Remaining</span><b class="' + (ys.remaining < 0 ? 'warn' : '') + '">' + php(ys.remaining) + '</b></div></div>';
    var af = f.add, defYm = (D.today().slice(0, 4) === String(year) ? D.today().slice(0, 7) : year + '-01'), addYm = af.ym && af.ym.slice(0, 4) === String(year) ? af.ym : defYm;
    var addForm = '';
    if (edit) {
      var lg = D.budgetLog(sec).filter(function (x) { return x.ym.slice(0, 4) === String(year); }).slice(0, 12);
      addForm = '<div class="card"><div class="f"><h2>Add budget for a month</h2><span class="small muted">Adds the amount on top of what is already set for that month of ' + esc(D.budgetLabel(sec)) + '. Whatever is not used carries over to the next month.</span></div>' +
        '<div class="row" style="align-items:flex-end;gap:12px"><div class="field"><label for="bud-add-ym">Month</label><select id="bud-add-ym" data-budadd="ym">' + MONFULL.map(function (n, i) { var v = year + '-' + (i + 1 < 10 ? '0' : '') + (i + 1); return '<option value="' + v + '"' + (v === addYm ? ' selected' : '') + '>' + n + ' ' + year + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="bud-add-amt">Amount to add (PHP)</label><input type="number" id="bud-add-amt" data-budadd="amount" min="0" step="1000" value="' + esc(af.amount) + '" placeholder="e.g. 50000" style="width:180px"></div>' +
        '<div class="field" style="flex:1 1 200px"><label for="bud-add-note">Note (optional)</label><input type="text" id="bud-add-note" data-budadd="note" value="' + esc(af.note) + '" placeholder="e.g. Additional allotment" style="width:100%"></div>' +
        '<button type="button" class="btn primary" data-act="bud-add">Add to budget</button></div>' +
        (lg.length ? '<div class="scroll"><table style="min-width:640px"><thead><tr><th>When</th><th>Month</th><th style="text-align:right">Added</th><th style="text-align:right">Month budget after</th><th>By</th><th>Note</th></tr></thead><tbody>' + lg.map(function (x) { return '<tr><td style="white-space:nowrap">' + fmtFull(x.when) + '</td><td>' + ymLabel(x.ym) + '</td><td style="text-align:right" class="mono">' + php(x.amount) + '</td><td style="text-align:right" class="mono">' + php(x.total) + '</td><td>' + esc(x.by) + '</td><td>' + esc(x.note || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="hint">No additions yet this year.</div>') + '</div>';
    }
    var rows = '';
    for (var m = 1; m <= 12; m++) {
      var ym = year + '-' + (m < 10 ? '0' : '') + m, b = D.budgetOf(sec, ym), c = D.committed(sec, ym, ''), left = b.maint - c.approved - c.pending;
      var inp = function (key, val) { return '<input type="number" min="0" step="1000" value="' + val + '" data-bud="' + key + '" data-sec="' + esc(sec) + '" data-ym="' + ym + '" aria-label="' + key + ' budget ' + ymLabel(ym) + '" style="width:130px;text-align:right"' + (edit ? '' : ' disabled') + '>'; };
      rows += '<tr><td style="white-space:nowrap;font-weight:500">' + MONFULL[m - 1] + '</td><td style="text-align:right">' + inp('maint', b.set) + '</td><td style="text-align:right" class="mono">' + php(b.carry) + '</td><td style="text-align:right" class="mono">' + php(b.maint) + '</td><td style="text-align:right" class="mono">' + php(c.approved) + '</td><td style="text-align:right" class="mono">' + php(c.pending) + '</td><td style="text-align:right;font-weight:600;color:' + (left < 0 ? '#B91C1C' : '#14532D') + '" class="mono">' + php(left) + '</td><td style="text-align:right">' + inp('other', b.other) + '</td></tr>';
    }
    rows += '<tr style="font-weight:600;background:#F7F8F5"><td>Year ' + year + '</td><td style="text-align:right" class="mono">' + php(ys.budget) + '</td><td></td><td></td><td style="text-align:right" class="mono">' + php(ys.approved) + '</td><td style="text-align:right" class="mono">' + php(ys.pending) + '</td><td style="text-align:right;color:' + (ys.remaining < 0 ? '#B91C1C' : '#14532D') + '" class="mono">' + php(ys.remaining) + '</td><td style="text-align:right" class="mono">' + php(ys.other) + '</td></tr>';
    var all = D.budgetGroups().map(function (g) { var x = g.key, t = yearTotals(x, year); return '<tr><td style="font-weight:500">' + esc(g.label) + '</td><td style="text-align:right" class="mono">' + php(t.budget) + '</td><td style="text-align:right" class="mono">' + php(t.approved + t.pending) + '</td><td style="text-align:right;font-weight:600;color:' + (t.remaining < 0 ? '#B91C1C' : '#14532D') + '" class="mono">' + php(t.remaining) + '</td></tr>'; }).join('');
    return addForm + '<div class="tablecard"><div class="filters"><div class="f"><h2>' + esc(D.budgetLabel(sec)) + ' · ' + year + ' by month</h2><span class="small muted">' + (edit ? 'Set the budget for each month. Whatever is not used is carried over to the next month of the same year. ' : 'View only. ') + 'Amounts in PHP · Sample starting budgets</span></div></div><div class="scroll"><table class="bt" style="min-width:820px"><thead><tr><th>Month</th><th style="text-align:right">Budget set for the month</th><th style="text-align:right">Carried over</th><th style="text-align:right">Available</th><th style="text-align:right">Approved</th><th style="text-align:right">Pending approval</th><th style="text-align:right">Remaining</th><th style="text-align:right">Others budget</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }
  /* Superintendent: review a request, optionally change the manpower / dates / times, then approve or reject. */
  /* Superintendent: only the Mechanical budget (MECH-BLR, MECH-STG, MECH-CHP) is shown, at the top of Manpower Approvals */
  var bdState = { open: false };
  document.addEventListener('toggle', function (e) { if (e.target && e.target.id === 'bud-details') bdState.open = e.target.open; }, true);
  function budgetTop() {
    var groups = D.budgetGroups(); if (!groups.length) return '';
    var sec = groups.some(function (g) { return g.key === ui.ap.group; }) ? ui.ap.group : groups[0].key, grp = groups.filter(function (g) { return g.key === sec; })[0];
    var ym = ui.ap.month || D.today().slice(0, 7), year = +ym.slice(0, 4); ui.bud.year = String(year); ui.bud.section = sec;
    var b = D.budgetOf(sec, ym), cm = D.committed(sec, ym, ''), actual = b.maint - cm.approved, after = actual - cm.pending, ys = yearTotals(sec, year);
    var mopts = []; D.budgetYears().forEach(function (y) { for (var m = 1; m <= 12; m++) { var v = y + '-' + (m < 10 ? '0' : '') + m; mopts.push({ v: v, l: MONFULL[m - 1] + ' ' + y }); } });
    return '<section class="card"><div class="row between"><div class="f"><h2>' + esc(grp.short) + ' budget' + (sec === 'MECHANICAL' ? ' · Boiler, STG and CHP' : '') + '</h2><span class="small muted">Budget allotted to ' + (sec === 'MECHANICAL' ? 'MECH-BLR, MECH-STG and MECH-CHP' : esc(grp.short)) + ' (requested maintenance)</span></div><div class="row">' + (groups.length > 1 ? sel('Budget', 'ap', 'group', groups.map(function (g) { return { v: g.key, l: g.label }; }), sec, 280) : '') + sel('Month', 'ap', 'month', mopts, ym, 200) + '</div></div>' +
      '<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"><div class="stat"><span>Monthly budget (allotted)</span><b style="font-size:22px">' + php(b.maint) + '</b></div><div class="stat"><span>Approved (used)</span><b style="font-size:22px">' + php(cm.approved) + '</b></div><div class="stat"><span>Pending approval</span><b style="font-size:22px">' + php(cm.pending) + '</b></div><div class="stat"><span>Actual left now</span><b style="font-size:22px" class="' + (actual < 0 ? 'warn' : '') + '">' + php(actual) + '</b></div><div class="stat"><span>Left if all pending are approved</span><b style="font-size:22px" class="' + (after < 0 ? 'warn' : '') + '">' + php(after) + '</b></div></div>' +
      '<div class="hint">' + ymLabel(ym) + ': ' + php(b.set) + ' set for the month' + (b.carry > 0 ? ' + ' + php(b.carry) + ' carried over from earlier months' : '') + ' · ' + year + ' so far: budget ' + php(ys.budget) + ', approved ' + php(ys.approved) + ', pending ' + php(ys.pending) + ', remaining ' + php(ys.remaining) + '.</div>' +
      '<details id="bud-details"' + (bdState.open ? ' open' : '') + '><summary class="lbl" style="cursor:pointer">Set or add the monthly budget</summary><div style="display:flex;flex-direction:column;gap:16px;margin-top:12px">' + budgetManage(sec, year) + '</div></details></section>';
  }
  function apDraftSpec(d) { return { start: d.start, end: d.end, timeStart: d.timeStart, timeEnd: d.timeEnd, qty: d.qty, dayRates: d.dayRates, dayMarks: d.dayMarks }; }
  function apFlow(sec, start, end, monthly, excludeId, orig) {   // remaining budget before, plan cost, remaining budget after (per month)
    var spans = monthSpans(start, end); if (!spans.length) spans = [{ ym: D.today().slice(0, 7), days: 1 }];
    var nm = D.budgetLabel(sec), tot = 0;
    var blocks = spans.map(function (sp) {
      var b = D.budgetOf(sec, sp.ym, excludeId, monthly), cm = D.committed(sec, sp.ym, excludeId), mine = monthly[sp.ym] || 0; tot += mine;
      var before = b.maint - cm.approved, after = before - mine, over = after < 0, col = over ? '#B91C1C' : '#14532D', bg = over ? '#FEF2F2' : '#F0FDF4', bd = over ? '#FCA5A5' : '#86EFAC';
      return '<div class="f" style="gap:8px"><b>' + esc(nm) + ' · ' + ymLabel(sp.ym) + (spans.length > 1 ? ' <span class="muted" style="font-weight:400">(' + sp.days + ' day' + (sp.days === 1 ? '' : 's') + ')</span>' : '') + '</b>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;align-items:stretch">' +
        '<div class="stat"><span>1. Remaining budget before approval</span><b style="font-size:24px">' + php(before) + '</b><span class="small muted">' + php(b.set) + ' set' + (b.carry > 0 ? ' + ' + php(b.carry) + ' carried over' : '') + ' − ' + php(cm.approved) + ' already approved</span></div>' +
        '<div class="stat"><span>2. New total plan cost (this request)</span><b style="font-size:24px">− ' + php(mine) + '</b></div>' +
        '<div class="stat" style="background:' + bg + ';border:2px solid ' + bd + '"><span style="color:' + col + ';font-weight:700">3. REMAINING BUDGET AFTER APPROVAL</span><b style="font-size:30px;color:' + col + '">' + php(after) + '</b><span class="small" style="color:' + col + ';font-weight:600">' + (over ? 'Over the monthly budget by ' + php(-after) : 'This is what is left to spend') + '</span></div></div>' +
        (cm.pending ? '<div class="hint">Other requests still pending for this budget: ' + php(cm.pending) + ' (not yet approved). If they are all approved too, ' + (after - cm.pending < 0 ? '<b style="color:#B91C1C">over by ' + php(cm.pending - after) + '</b>' : 'what is left would be <b>' + php(after - cm.pending) + '</b>') + '.</div>' : '') + '</div>';
    }).join('');
    return blocks + (spans.length > 1 ? '<div class="small" style="text-align:right">New total plan cost, all months: <b>' + php(tot) + '</b>' + (orig != null ? ' · Requested: ' + php(orig) : '') + '. Each day is charged to the budget of its own month.</div>' : (orig != null && Math.round(orig) !== Math.round(tot) ? '<div class="small muted" style="text-align:right">Originally requested: ' + php(orig) + '</div>' : ''));
  }
  function apLive(r, d) {
    var c = D.calcManpower(apDraftSpec(d)), orig = r.original || { total: r.calc.total };
    var bud = c.headcount ? apFlow(r.section, d.start, d.end, c.monthly, r.id, orig.total) : '';
    return '<div class="row between"><div>' + pill(c.kind, c.night ? ['#E0E7FF', '#3730A3'] : c.kind === 'Normal' ? ['#DCFCE7', '#14532D'] : ['#FEF3C7', '#78350F'], true) + '</div></div><div class="hint">' + esc(mpHoursInfo(c, d)) + '</div>' + (c.dayFlags.length ? '<div class="hint">Sunday / holiday rate included for ' + esc(c.dayFlags.map(function (f) { return fmtD(f.date) + ' (' + f.label + ' ×' + f.mult.toFixed(2) + ')'; }).join('; ')) + '.</div>' : '') + (bud || '<div class="hint">Add manpower to see the cost and the remaining budget.</div>') + (c.noNS.length ? '<div class="note">No night-shift (N/S) rate on the rate sheet for ' + esc(c.noNS.join(', ')) + '. The day rate is used for them.</div>' : '');
  }
  function apDraft(r) { return ui.apds[r.id] || (ui.apds[r.id] = { id: r.id, start: r.start, end: r.end, timeStart: r.timeStart, timeEnd: r.timeEnd, qty: JSON.parse(JSON.stringify(r.qty)), incharge: r.incharge || '', dayRates: !!r.dayRates, dayMarks: JSON.parse(JSON.stringify(r.dayMarks || {})), addPos: '', addQty: '1' }); }
  function draftReq(r, d) { var x = Object.assign({}, r, { start: d.start, end: d.end, timeStart: d.timeStart, timeEnd: d.timeEnd, qty: d.qty, incharge: d.incharge, dayRates: d.dayRates, dayMarks: d.dayMarks }); x.calc = D.calcManpower(x); return x; }
  function panelReq(id) { var r = D.manpowerRequests().filter(function (x) { return x.id === id; })[0]; return r && r.status === 'Pending approval' && ui.apds[id] ? draftReq(r, ui.apds[id]) : r; }
  function apEditor(r) {
    var d = apDraft(r), all = D.manpowerPositions();
    var items = all.map(function (p, i) { return { p: p, i: i, q: parseInt(d.qty[p.pos], 10) || 0 }; }).filter(function (x) { return x.q > 0; });
    var list = items.length ? '<table style="min-width:360px"><thead><tr><th>Positions</th><th style="text-align:right">Quantity</th><th></th></tr></thead><tbody>' + items.map(function (x) {
      return '<tr class="mprow"><td class="desc">' + esc(x.p.pos) + '</td><td style="text-align:right"><div class="stepper"><button type="button" data-act="ap-step" data-i="' + x.i + '" data-d="-1" aria-label="Decrease ' + esc(x.p.pos) + '">−</button><input type="number" min="0" max="99" value="' + x.q + '" data-ap="qty" data-i="' + x.i + '" aria-label="Number of ' + esc(x.p.pos) + '"><button type="button" data-act="ap-step" data-i="' + x.i + '" data-d="1" aria-label="Increase ' + esc(x.p.pos) + '">+</button></div></td><td style="text-align:right"><button type="button" class="btn" data-act="ap-remove" data-i="' + x.i + '" style="height:36px;padding:0 12px">Remove</button></td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty" style="padding:16px">No positions.</div>';
    return '<div class="box" style="border-color:#C2410C" data-rid="' + esc(r.id) + '"><h3>Review and adjust before approving</h3><div class="g2">' +
      '<div class="field"><label for="ap-start-' + esc(r.id) + '">Start date</label><input type="date" id="ap-start-' + esc(r.id) + '" data-ap="start" value="' + esc(d.start) + '"></div>' +
      '<div class="field"><label for="ap-end-' + esc(r.id) + '">End date</label><input type="date" id="ap-end-' + esc(r.id) + '" data-ap="end" value="' + esc(d.end) + '" min="' + esc(d.start) + '"></div>' +
      '<div class="field"><label for="ap-ts-' + esc(r.id) + '">Time start</label><input type="time" id="ap-ts-' + esc(r.id) + '" data-ap="timeStart" value="' + esc(d.timeStart) + '"></div>' +
      '<div class="field"><label for="ap-te-' + esc(r.id) + '">Time end</label><input type="time" id="ap-te-' + esc(r.id) + '" data-ap="timeEnd" value="' + esc(d.timeEnd) + '"></div>' +
      '<div class="field"><label for="ap-inch-' + esc(r.id) + '">MPC organic in-charge</label>' + inchargeSelect('ap-inch-' + r.id, 'data-ap="incharge"', d.incharge, r.section) + '</div></div>' +
      '<div class="sub"><div class="row" style="align-items:flex-end;gap:12px"><div class="field" style="flex:1 1 220px"><label for="ap-addpos-' + esc(r.id) + '">Add a position</label><input type="text" id="ap-addpos-' + esc(r.id) + '" data-ap="addPos" list="ap-poslist-' + esc(r.id) + '" value="' + esc(d.addPos) + '" placeholder="Click or type to search" autocomplete="off" style="width:100%"><datalist id="ap-poslist-' + esc(r.id) + '">' + all.map(function (p) { return '<option value="' + esc(p.pos) + '"></option>'; }).join('') + '</datalist></div>' +
      '<div class="field"><label for="ap-addqty-' + esc(r.id) + '">Quantity</label><input type="number" id="ap-addqty-' + esc(r.id) + '" data-ap="addQty" min="1" max="99" value="' + esc(d.addQty) + '" style="width:90px"></div><button type="button" class="btn primary" data-act="ap-add">+ Add</button></div></div>' +
      '<div class="scroll">' + list + '</div><div class="sub" id="ap-live-' + esc(r.id) + '">' + apLive(r, d) + '</div>' +
      '<div class="small muted">You can change the positions, quantities, dates and times here. After you approve, the email to BPPMS is prepared from these details. Your changes are recorded and the original request stays on file.</div></div>';
  }
  function apRefresh(id) {
    var d = ui.apds[id]; if (!d) return; var r = D.manpowerRequests().filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var el = document.getElementById('ap-live-' + id); if (el) el.innerHTML = apLive(r, d);
    var box = document.querySelector('[data-req="' + id + '"]'); if (!box) return;
    var e = bppmsEmail(draftReq(r, d)), sj = box.querySelector('[data-em="subj"]'), bd = box.querySelector('[data-em="body"]'), hp = document.getElementById('em-html-' + id);
    if (sj) sj.value = e.subject; if (bd) bd.value = e.text; if (hp) hp.innerHTML = e.html;
    var ed = document.getElementById('em-edited-' + id); if (ed) ed.textContent = 'Filled in automatically from the request.';
  }
  function origText(r, noCost) {
    if (!r.original) return '';
    var o = r.original, qs = D.manpowerPositions().filter(function (p) { return (o.qty[p.pos] || 0) > 0; }).map(function (p) { return o.qty[p.pos] + ' × ' + p.pos; }).join(', ');
    return '<div class="note">Changed by the Superintendent (' + fmtFull(r.edits[r.edits.length - 1].when) + '). Originally requested: ' + esc(qs) + ' · ' + fmtD(o.start) + ' to ' + fmtD(o.end) + ', ' + t12(o.timeStart) + ' – ' + t12(o.timeEnd) + (noCost ? '' : ' · ' + php(o.total) + '. Now: ' + php(r.calc.total)) + '.</div>';
  }
  function viewApprovals() {
    var all = D.visibleRequests(), f = ui.ap;
    function cnt(st) { return all.filter(function (r) { return r.status === st; }).length; }
    var list = all.filter(function (r) { return f.status === 'All' || r.status === f.status; });
    var opts = ['Pending approval', 'Approved', 'Sent to BPPMS', 'Rejected', 'All'].map(function (k) { return { v: k, l: k + (k === 'All' ? ' (' + all.length + ')' : ' (' + cnt(k) + ')') }; });
    function cardFor(r) {
      var editing = r.status === 'Pending approval' && D.canApprove(r.section);
      var bud = Object.keys(r.calc.monthly).sort().map(function (ym) { var b = D.budgetOf(r.section, ym, r.id, r.calc.monthly), c = D.committed(r.section, ym, r.id), left = b.maint - c.approved - c.pending - r.calc.monthly[ym]; return '<div class="kv small"><span class="muted">' + ymLabel(ym) + ' · budget ' + php(b.maint) + (b.carry > 0 ? ' (incl. ' + php(b.carry) + ' carried over)' : '') + ', committed ' + php(c.approved + c.pending) + ', this request ' + php(r.calc.monthly[ym]) + '</span><b style="color:' + (left < 0 ? '#B91C1C' : '#14532D') + '">' + (left < 0 ? 'Over by ' + php(-left) : 'Left ' + php(left)) + '</b></div>'; }).join('');
      var act;
      if (r.status === 'Pending approval' && !editing) act = '<div class="sep small muted">View only. This request is approved by the Superintendent of ' + esc(r.section) + '.</div>';
      else if (r.status === 'Pending approval') {
        act = '<div class="sep"><label class="lbl" for="ap-r-' + esc(r.id) + '">Remarks (required when rejecting)</label><textarea id="ap-r-' + esc(r.id) + '" rows="2"></textarea><div class="row">' +
          '<button type="button" class="btn primary" data-act="ap-approve-send" data-id="' + esc(r.id) + '">Approve and send to BPPMS</button>' +
          '<button type="button" class="btn" data-act="mp-reject" data-id="' + esc(r.id) + '">Reject</button></div></div>';
      } else act = '<div class="sep small muted">' + esc(r.status === 'Rejected' ? 'Rejected' : 'Approved') + ' by ' + esc(r.decidedBy || '') + ' · ' + fmtFull(r.decidedWhen) + (r.decisionRemark ? ' — ' + esc(r.decisionRemark) : '') + (r.status === 'Approved' ? '' : '') + (r.status === 'Sent to BPPMS' ? '<br>Email sent to BPPMS by ' + esc(r.sentBy || '') + ' · ' + fmtFull(r.sentWhen) : '') + '</div>';
      return '<section class="card"><div class="row between"><div><span class="mono" style="font-weight:600">' + esc(r.id) + '</span> <span class="muted small">· ' + esc(r.section) + ' · requested by ' + esc(r.by) + ' · ' + fmtFull(r.when) + '</span></div>' + mpPill(r.status, true) + '</div>' +
        '<h2>' + esc(r.activity) + '</h2><dl class="grid"><div><dt>Work order</dt><dd class="mono">' + esc(r.wo) + '</dd></div><div><dt>Priority</dt><dd>' + prio(r.priority) + '</dd></div><div><dt>Dates</dt><dd>' + fmtD(r.start) + ' to ' + fmtD(r.end) + '</dd></div><div><dt>Time</dt><dd>' + t12(r.timeStart) + ' – ' + t12(r.timeEnd) + '</dd></div><div><dt>MPC organic in-charge</dt><dd>' + esc(r.incharge || '—') + '</dd></div><div><dt>Manpower</dt><dd>' + esc(headsText(r)) + ' (' + r.calc.headcount + ')</dd></div><div><dt>Total plan cost</dt><dd class="mono" style="font-size:18px;font-weight:600">' + php(r.calc.total) + '</dd></div></dl>' +
        '<div class="small muted">Hours detected: ' + esc(r.calc.kind || '') + (r.calc.otHours > 0 ? ' · ' + fmtH(r.calc.otHours) + ' overtime per day' : '') + (r.calc.premiumDates && r.calc.premiumDates.length ? ' · Sunday / holiday rates on ' + r.calc.premiumDates.length + ' day' + (r.calc.premiumDates.length === 1 ? '' : 's') : '') + '</div>' + origText(r) +
        '<div class="longtext"><h3>Scope of works</h3><pre>' + esc(r.scope) + '</pre></div>' + (editing ? apEditor(r) + sendBar(r) : '') + (r.status === 'Approved' ? emailPanel(r) : r.status === 'Sent to BPPMS' ? '<details><summary class="hint" style="cursor:pointer">View the email that was sent to BPPMS</summary>' + emailPanel(r) + '</details>' : '') + (editing ? '' : '<div><div class="lbl" style="margin-bottom:4px">Budget check (' + esc(D.budgetLabel(r.section)) + ')</div>' + bud + '</div>') + act + '</section>';
    }
    var openR = f.open && all.filter(function (r) { return r.id === f.open; })[0];
    var items = openR ? '<div class="row"><button type="button" class="btn" data-act="ap-back">← Back to the list</button></div>' + cardFor(openR) : '';
    var rowsHtml = list.map(function (r) {
      var isNew = r.status === 'Pending approval' && D.canApprove(r.section) && (r.seenBy || []).indexOf(D.account().name) < 0;
      return '<tr data-act="ap-open" data-id="' + esc(r.id) + '" style="cursor:pointer"><td class="mono" style="font-weight:600">' + esc(r.id) + (isNew ? ' <span class="pill" style="background:#B45309;color:#fff;padding:1px 8px;border-radius:99px;font-size:11px">New</span>' : '') + '</td><td class="desc">' + esc(r.activity) + '</td><td>' + esc(r.section) + '</td><td>' + esc(r.by) + '<div class="small muted">' + fmtFull(r.when) + '</div></td><td>' + fmtD(r.start) + ' to ' + fmtD(r.end) + '</td><td>' + esc(headsText(r)) + '</td><td>' + prio(r.priority) + '</td><td>' + mpPill(r.status, true) + '</td><td><button type="button" class="btn' + (isNew ? ' primary' : '') + '" data-act="ap-open" data-id="' + esc(r.id) + '">' + (r.status === 'Pending approval' && D.canApprove(r.section) ? 'Review' : 'Open') + '</button></td></tr>';
    }).join('');
    var listHtml = list.length ? '<div class="tablecard"><div class="scroll"><table style="min-width:900px"><thead><tr><th>Request</th><th>Activity</th><th>Section</th><th>Requested by</th><th>Dates</th><th>Positions</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div><div class="small muted" style="padding:10px 14px">Click a request to open it. Pending requests open in the review screen where you can adjust and approve.</div></div>' : '<div class="card empty">No requests to show.</div>';
    return shell('ap', '<div class="row between"><div class="f"><span class="small muted">Manpower Approvals</span><h1>Manpower approvals</h1><span class="hint">You are viewing as ' + esc(D.account().name) + ' (' + esc(D.account().position) + ')' + (D.account().scopeAll ? ' · all sections' : ' · ' + esc(D.account().section)) + '. Approving a request emails it to BPPMS automatically and notifies the requester and the in-charge.</span></div></div><div class="cards"><div class="stat"><span>Pending approval</span><b>' + cnt('Pending approval') + '</b></div><div class="stat"><span>Approved, email to BPPMS</span><b>' + cnt('Approved') + '</b></div><div class="stat"><span>Sent to BPPMS</span><b>' + cnt('Sent to BPPMS') + '</b></div><div class="stat"><span>Rejected</span><b>' + cnt('Rejected') + '</b></div></div>' +
      budgetTop() + (openR ? '' : '<div class="tablecard"><div class="filters">' + sel('Status', 'ap', 'status', opts, f.status) + '</div></div>') + (openR ? (items || '<div class="card empty">Request not found.</div>') : listHtml));
  }

  /* Email to BPPMS: built after the Superintendent approves, in the same layout as the BPPMS request emails.
     It shows the activity, dates, times and number of persons only (no cost). */
  var MON_E = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  function eD(s) { var p = parts(s); return p ? MON_E[p.mo] + ' ' + p.d : ''; }
  function eDY(s) { var p = parts(s); return p ? eD(s) + ', ' + p.y : ''; }
  function eRange(a, b) { var x = parts(a), y = parts(b); if (!x || !y) return ''; if (a === b) return eDY(a); return x.y === y.y ? eD(a) + ' – ' + eD(b) + ', ' + y.y : eDY(a) + ' – ' + eDY(b); }
  function h24(t) { return String(t || '').replace(':', '') + 'H'; }
  function hm(minAbs) { var m = ((minAbs % 1440) + 1440) % 1440; return (m < 600 ? '0' : '') + Math.floor(m / 60) + (m % 60 < 10 ? '0' : '') + (m % 60) + 'H'; }
  function bppmsEmail(r) {
    var a = bppmsAuto(r);
    if (r.emailDraft) { var tx = r.emailDraft.text; return { subject: r.emailDraft.subject, text: tx, html: '<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#000;white-space:pre-wrap">' + esc(tx) + '</div>', edited: true }; }
    return a;
  }
  function bppmsAuto(r) {
    var c = r.calc, night = c.kind === 'Night shift', shift = night ? 'Nightshift' : 'Dayshift', ot = c.otHours > 0;
    var pax = c.lines.map(function (l) { var n = (r.notes || {})[l.pos]; return l.qty + ' – Pax ' + l.pos + (n ? ' (' + n + ')' : ''); });
    var descTag = ot && !night ? ' [OVERTIME]' : '';
    var otSeg = (c.otSegs || []).map(function (g) { return hm(g[0]) + ' – ' + hm(g[1]); }).join(' and ');
    var period = eRange(r.start, r.end) + ' (' + h24(r.timeStart) + ' – ' + h24(r.timeEnd) + ')' + (ot ? (c.kind === 'Overtime' ? ' – OVERTIME.' : ' with OVERTIME from ' + otSeg + '.') : '.');
    // Sunday / holiday check over the request dates
    var sun = false, hol = false, d0 = parts(r.start), d1 = parts(r.end);
    if (d0 && d1) { var t0 = Date.UTC(d0.y, d0.mo, d0.d), t1 = Date.UTC(d1.y, d1.mo, d1.d); for (var t = t0, k = 0; t <= t1 && k < 92; t += 86400000, k++) { var ds = new Date(t).toISOString().slice(0, 10); var mk = (r.dayMarks || {})[ds]; if (new Date(t).getUTCDay() === 0 || mk === 'rest') sun = true; if (D.holidayOf(ds) || mk === 'special' || mk === 'holiday') hol = true; } }
    var incl = (hol && sun) ? 'Holiday and Sunday' : hol ? 'Holiday' : sun ? 'Sunday' : '';
    var inclLine = incl ? '(' + incl + ' ' + shift + ' Duty included)' : '';
    var just = '1. ' + r.activity, scopeT = String(r.scope || '').trim();
    var sign = D.emailSignoff();
    var subject = 'Request for ' + r.activity + ' Services (' + r.id + ')';
    var pri = r.priority + ' ' + PRI[r.priority];
    var desc = ['BPPMS Support Services' + descTag, '', shift.toUpperCase() + ' DUTY'].concat(pax).concat(['', 'Total of ' + c.headcount + ' Pax']);
    var justL = [just].concat(r.areaNote ? ['', '(' + r.areaNote + ')'] : []).concat(['', period]).concat(inclLine ? [inclLine] : []);
    var times = [['Start date:', eDY(r.start)], ['Start time:', h24(r.timeStart)], ['Finish date:', eDY(r.end)], ['Finish time:', h24(r.timeEnd)]];
    var text = ["Dear sirs/Ma'am,", '', 'Good day, kindly accommodate below service request.', '', 'DESCRIPTION OF REQUEST', desc.join('\n'), '', 'JUSTIFICATION FOR REQUEST', justL.join('\n'), '', 'WORK ORDER NUMBER: ' + r.wo, '', 'ACTIVITY DESCRIPTION: ' + r.activity, '', 'SCOPE OF WORKS:', scopeT, '', 'PRIORITY LEVEL: ' + pri].concat(times.map(function (x) { return x[0] + ' ' + x[1]; }))
      .concat(['', 'MPC In-Charge:' + (r.incharge ? ' ' + r.incharge : ''), '', '', 'Regards,', sign]).join('\n');
    var th = 'border:1px solid #808080;padding:6px 10px;background:#F2F2F2;font-weight:bold;vertical-align:top;white-space:nowrap;text-align:left', td = 'border:1px solid #808080;padding:6px 10px;vertical-align:top';
    function br(a2) { return a2.map(function (x) { return esc(x) || '&nbsp;'; }).join('<br>'); }
    var html = '<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#000">' +
      '<p style="margin:0 0 10px">Dear sirs/Ma&#39;am,</p><p style="margin:0 0 12px">Good day, kindly accommodate below service request.</p>' +
      '<table style="border-collapse:collapse;width:100%;max-width:760px">' +
      '<tr><td style="' + th + '">DESCRIPTION OF REQUEST</td><td style="' + td + '">' + br(desc) + '</td></tr>' +
      '<tr><td style="' + th + '">JUSTIFICATION FOR REQUEST</td><td style="' + td + '">' + br(justL) + '</td></tr>' +
      '<tr><td style="' + th + '">WORK ORDER NUMBER</td><td style="' + td + '">' + esc(r.wo) + '</td></tr>' +
      '<tr><td style="' + th + '">ACTIVITY DESCRIPTION</td><td style="' + td + '">' + esc(r.activity) + '</td></tr>' +
      '<tr><td style="' + th + '">SCOPE OF WORKS</td><td style="' + td + '">' + br(scopeT.split('\n')) + '</td></tr>' +
      '<tr><td style="' + th + '">PRIORITY LEVEL</td><td style="' + td + '">' + esc(pri) + '</td></tr>' +
      times.map(function (x) { return '<tr><td style="' + th + '">' + esc(x[0]) + '</td><td style="' + td + '">' + esc(x[1]) + '</td></tr>'; }).join('') +
      '</table><p style="margin:14px 0 0">MPC In-Charge: ' + esc(r.incharge || '') + '</p><p style="margin:14px 0 0">Regards,<br>' + esc(sign) + '</p></div>';
    return { subject: subject, text: text, html: html };
  }
  function mailLinks(r, to) {
    var e = bppmsEmail(r), addr = String(to || '').replace(/\s+/g, ''), body = e.text.replace(/\n/g, '\r\n');
    var cc = D.ccFor(r, supName()).map(function (x) { return x.email; }).filter(Boolean).join(',');
    return { mailto: 'mailto:' + addr + '?' + (cc ? 'cc=' + encodeURIComponent(cc) + '&' : '') + 'subject=' + encodeURIComponent(e.subject) + '&body=' + encodeURIComponent(body),
      web: 'https://outlook.office.com/mail/deeplink/compose?to=' + encodeURIComponent(addr) + (cc ? '&cc=' + encodeURIComponent(cc) : '') + '&subject=' + encodeURIComponent(e.subject) + '&body=' + encodeURIComponent(body) };
  }
  function sendBar(r) {
    return '<div class="box" style="border-color:#1D4ED8" data-req="' + esc(r.id) + '"><div class="field" style="max-width:520px"><label for="em-to-' + esc(r.id) + '">BPPMS email address (the request is emailed here when you approve)</label><input type="text" id="em-to-' + esc(r.id) + '" data-em="to" value="' + esc(D.bppmsTo()) + '" placeholder="e.g. name@gmail.com" style="width:100%"></div>' +
      '<div class="small muted">Approving sends the email to BPPMS through Outlook automatically, with the work order, scope, dates, times and positions. The requester and the in-charge are told it is approved and already emailed. Cost is not included.</div></div>';
  }
  function emailPanel(r, draft) {
    var e = bppmsEmail(r), to = D.bppmsTo(), l = mailLinks(r, to), sent = r.status === 'Sent to BPPMS', id = esc(r.id);
    var hint = draft ? 'This is the email BPPMS will receive, shown as it will look in Outlook. Check it, then press “Approve and send email to BPPMS”. Cost is not included.'
      : sent ? 'Email sent to BPPMS by ' + esc(r.sentBy || '') + ' · ' + fmtFull(r.sentWhen) + '. The requester and the MPC organic in-charge were notified.'
      : 'Approved, but the email has not been sent yet. Press “Send email to BPPMS”.';
    var fields = sent ? '' :
      '<div class="g2"><div class="field"><label for="em-to-' + id + '">To (BPPMS Gmail address, separate several with commas)</label><input type="text" id="em-to-' + id + '" data-em="to" value="' + esc(to) + '" placeholder="e.g. name@gmail.com" style="width:100%"></div>' +
      '<div class="field"><label for="em-sign-' + id + '">Name under “Regards,” (the approver)</label><input type="text" id="em-sign-' + id + '" data-em="sign" value="' + esc(D.emailSignoff()) + '"></div></div>' +
      '<div class="field"><label for="em-subj-' + id + '">Subject</label><input type="text" id="em-subj-' + id + '" data-em="subj" value="' + esc(e.subject) + '" style="width:100%"></div>';
    var edit = sent ? '' : '<details><summary class="hint" style="cursor:pointer">Edit the message text before sending</summary><div class="field"><textarea id="em-body-' + id + '" data-em="body" rows="20" style="font-family:inherit;line-height:1.5" aria-label="Email message">' + esc(e.text) + '</textarea>' +
      '<div class="row"><span class="hint" id="em-edited-' + id + '">' + (e.edited ? 'You edited this email. Changes to the request or the sign-off name will not overwrite your edits.' : 'Filled in automatically from the request.') + (draft ? ' Changing the positions, dates or times above updates this email and replaces manual edits.' : '') + '</span><button type="button" class="btn" data-act="em-reset" data-id="' + id + '" style="height:36px">Reset to auto-filled</button></div></div></details>';
    var acts = draft ? '' : '<div class="row">' +
      (sent ? '<a class="btn primary" id="em-mailto-' + id + '" href="' + esc(l.mailto) + '" style="display:inline-flex;align-items:center;text-decoration:none">Open in Outlook again</a>' : '<button type="button" class="btn primary" data-act="em-send" data-id="' + id + '">Send email to BPPMS</button><a class="btn" id="em-mailto-' + id + '" href="' + esc(l.mailto) + '" style="display:inline-flex;align-items:center;text-decoration:none">Open draft only</a>') +
      '<a class="btn" id="em-web-' + id + '" href="' + esc(l.web) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">Outlook on the web</a><button type="button" class="btn" data-act="em-copy-html" data-id="' + id + '">Copy formatted email</button></div>';
    return '<div class="box" style="border-color:#1D4ED8" data-req="' + id + '"><h3>' + (sent ? 'Email sent to BPPMS' : 'Email to BPPMS') + '</h3><span class="hint">' + hint + '</span>' + fields +
      '<div id="em-html-' + id + '" style="border:1px solid var(--line);border-radius:10px;padding:14px;background:#fff;overflow:auto;margin:8px 0">' + e.html + '</div>' + edit + acts +
      (draft || sent ? '' : '<div class="hint">Outlook opens with the message. The table is copied automatically, so press Ctrl+V in the message body to keep the table layout.</div>') +
      '<div class="small muted">This prototype cannot send email by itself: the status changes to “Sent to BPPMS” when you press the send button. Later, Outlook can update it automatically.</div></div>';
  }

  /* ---------- router + events ---------- */
  function route() {
    try { routeInner(); } catch (e) {
      app.innerHTML = '<div class="main" style="padding:32px"><div class="card"><h2>This screen could not be shown</h2><p class="muted">' + esc(e && e.message) + '</p><p class="hint">This can happen when data saved by an older version is still in this browser. Reset the demo data to start clean.</p><div class="row"><button type="button" class="btn primary" data-act="reset">Reset demo data</button></div></div></div>';
    }
  }
  function routeInner() {
    var h = (location.hash || '').replace(/^#\/?/, ''), p = h.split('/'), role = D.role(), html;
    ME = D.techKey(D.account().name);
    if (['supervisor', 'superintendent', 'technician'].indexOf(role) < 0) { D.setRole('supervisor'); role = 'supervisor'; }
    var home = role === 'technician' ? '#/jobs' : D.account().level === 'logistics' ? '#/pr-conversion' : '#/dashboard';
    var TECH_BLOCK = ['wo', 'notifs', 'dashboard', 'prs', 'pr', 'pos', 'po', 'materials', 'material', 'equipment', 'manpower', 'budget', 'approvals', 'pr-approval', 'budget-overview'];
    if (D.account().level === 'logistics' && p[0] !== 'pr-conversion') { location.hash = home; return; }
    if (!p[0] || p[0] === 'budget' || (role === 'supervisor' && ['jobs', 'approvals'].indexOf(p[0]) >= 0) || (role === 'superintendent' && ['jobs', 'manpower'].indexOf(p[0]) >= 0) || (D.account().level === 'manager' && p[0] === 'approvals') || (role === 'technician' && TECH_BLOCK.indexOf(p[0]) >= 0)) { location.hash = home; return; }
    if (p[0] === 'dashboard') html = viewDashboard();
    else if (p[0] === 'prs') html = viewPrList();
    else if (p[0] === 'pr') html = viewPrDetail(p[1]);
    else if (p[0] === 'pos') html = viewPoList();
    else if (p[0] === 'po') html = viewPoDetail(p[1]);
    else if (p[0] === 'materials') html = viewMaterials();
    else if (p[0] === 'equipment') html = p[1] ? viewEquipmentDetail(p[1]) : viewEquipment();
    else if (p[0] === 'pr-approval') html = (role === 'supervisor' || D.account().level === 'superintendent') ? viewPrApproval() : shell('pra', '<div class="f"><span class="small muted">Purchasing</span><h1>Purchase Approval</h1></div><div class="card"><div class="muted">Coming soon.</div></div>');
    else if (p[0] === 'pr-conversion') html = viewPrConversion();
    else if (p[0] === 'budget-overview') html = shell('bo', '<div class="f"><span class="small muted">Purchasing</span><h1>Budget Overview</h1></div><div class="card"><div class="muted">Coming soon.</div></div>');
    else if (p[0] === 'manpower') html = viewManpower();
    else if (p[0] === 'approvals') html = viewApprovals();
    else if (p[0] === 'material') html = viewMaterialDetail(p[1]);
    else if (p[0] === 'wo') html = p[1] ? viewWoDetail(p[1]) : viewWoList();
    else if (p[0] === 'job') html = viewWoDetail(p[1]);
    else if (p[0] === 'jobs') html = viewJobs();
    else if (p[0] === 'notifs') html = viewNotifList();
    else if (p[0] === 'notif') html = viewNotif(p[1]);
    else { location.hash = home; return; }
    paint(html);
  }
  var lastHash = '';
  function paint(html) {
    var y = window.scrollY, same = lastHash === location.hash;
    app.innerHTML = html; lastHash = location.hash; desktopAlerts();
    window.scrollTo(0, same ? y : 0);
  }
  function approveDraft(id) {   // approves with the approver's changes; returns true when done
    var rr = D.manpowerRequests().filter(function (x) { return x.id === id; })[0], dv = ui.apds[id] || (rr && apDraft(rr)); if (!rr || !dv) return false;
    var dc = D.calcManpower(apDraftSpec(dv)), dta = document.getElementById('ap-r-' + id), dtx = dta ? dta.value.trim() : '';
    if (!dv.start || !dv.end || dv.end < dv.start) { say('Please check the start and end dates.'); return false; }
    if (!dv.timeStart || !dv.timeEnd || dv.timeStart === dv.timeEnd) { say('Please check the time start and time end.'); return false; }
    if (!dc.headcount) { say('Add at least one position.'); return false; }
    var changed = JSON.stringify([dv.qty, dv.start, dv.end, dv.timeStart, dv.timeEnd, (dv.incharge || '').trim(), !!dv.dayRates]) !== JSON.stringify([rr.qty, rr.start, rr.end, rr.timeStart, rr.timeEnd, (rr.incharge || '').trim(), !!rr.dayRates]);
    var keepDraft = rr.emailDraft;
    if (changed) { D.updateManpower(id, { qty: dv.qty, start: dv.start, end: dv.end, timeStart: dv.timeStart, timeEnd: dv.timeEnd, incharge: (dv.incharge || '').trim(), dayRates: !!dv.dayRates }, supName()); if (keepDraft) D.setEmailDraft(id, keepDraft); }
    D.decideManpower(id, 'Approved', supName(), changed ? 'Approved with changes.' + (dtx ? ' ' + dtx : '') : dtx);
    delete ui.apds[id]; ui.ap.status = 'Approved'; ui.ap.open = ''; return true;
  }
  function sendEmailNow(id) {   // opens the Outlook draft, copies the formatted table, marks the request as sent, notifies requester and in-charge
    var rr = D.manpowerRequests().filter(function (x) { return x.id === id; })[0]; if (!rr) return false;
    var to = String(D.bppmsTo() || '').trim();
    if (!/@/.test(to)) { say('Type the BPPMS email address in the To field first.'); return false; }
    if (rr.status === 'Approved') D.sendToBppms(id, supName(), '');
    ui.ap.status = 'Sent to BPPMS'; ui.modal = { type: 'sent', id: id, to: to }; return true;
  }
  function rerender() { route(); }
  function say(msg) { ui.toast = msg; rerender(); setTimeout(function () { ui.toast = ''; if (document.querySelector('.toast')) rerender(); }, 4500); }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-account')) { D.setAccount(t.value); ui.modal = null; ui.mp = null; ui.apds = {}; ui.ap.group = ''; ME = D.techKey(t.value); location.hash = D.role() === 'technician' ? '#/jobs' : D.account().level === 'logistics' ? '#/pr-conversion' : '#/dashboard'; rerender(); return; }
    if (t.hasAttribute('data-bud')) { D.setBudget(t.getAttribute('data-sec'), t.getAttribute('data-ym'), t.getAttribute('data-bud'), t.value); rerender(); return; }
    var pk = t.getAttribute && t.getAttribute('data-prf');
    if (pk) {
      if (pk === 'matq') { var mv = t.value, mm = D.materials().filter(function (x) { return mv === x.mat + ' - ' + x.text || mv.trim() === x.mat; })[0]; ui.prf.matq = mv; ui.prf.mat = mm ? mm.mat : ''; if (mm) ui.prf.matq = mm.mat + ' - ' + mm.text; ui.prf.err = mm || !mv ? '' : 'Pick a material number from the list.'; rerender(); }
      else if (t.tagName === 'SELECT') { ui.prf[pk] = t.value; ui.prf.err = ''; rerender(); }
      return;
    }
    var fk = t.getAttribute && t.getAttribute('data-filter');
    if (fk) { var a = fk.split('.'); ui[a[0]][a[1]] = t.value; rerender(); }
  });
  document.addEventListener('input', function (e) {
    var pak = e.target.getAttribute && e.target.getAttribute('data-pra');
    if (pak === 'rem') { ui.pra.rem = e.target.value; return; }
    if (pak && pak.indexOf('pf.') === 0) { ui.pra.pf[pak.slice(3)] = e.target.value; return; }
    if (pak && pak.indexOf('cv.') === 0) { ui.pra.cvf[pak.slice(3)] = e.target.value; return; }
    if (pak && pak.indexOf('ef.') === 0) { ui.pra.ef[pak.slice(3)] = e.target.value; var pt2 = document.getElementById('pra-total'); if (pt2) pt2.value = amt((parseFloat(ui.pra.ef.qty) || 0) * (parseFloat(ui.pra.ef.price) || 0)); return; }
    var pk = e.target.getAttribute && e.target.getAttribute('data-prf');
    if (pk) { ui.prf[pk] = e.target.value; if (pk === 'qty' || pk === 'unit') { var pt = document.getElementById('prf-total'); if (pt) pt.value = prfTotal() ? amt(prfTotal()) : ''; } if (pk === 'short') { var pc = document.getElementById('prf-cnt'); if (pc) pc.textContent = e.target.value.length + '/40'; } return; }
    var bak = e.target.getAttribute && e.target.getAttribute('data-budadd'); if (bak) { ui.bud.add[bak] = e.target.value; return; }
    var emk = e.target.getAttribute && e.target.getAttribute('data-em');
    if (emk) {
      var bx = e.target.closest('[data-req]'), rid3 = bx && bx.getAttribute('data-req'), rq3 = rid3 && panelReq(rid3);
      if (!rq3) return;
      function q(k) { return bx.querySelector('[data-em="' + k + '"]'); }
      if (emk === 'subj' || emk === 'body') D.setEmailDraft(rid3, { subject: q('subj').value, text: q('body').value });
      else if (emk === 'to') D.setBppmsTo(e.target.value); else if (emk === 'sign') D.setEmailSignoff(e.target.value);
      rq3 = panelReq(rid3);
      if (emk === 'sign' && !rq3.emailDraft) { q('subj').value = bppmsEmail(rq3).subject; q('body').value = bppmsEmail(rq3).text; }
      var lk = mailLinks(rq3, D.bppmsTo()), ml = document.getElementById('em-mailto-' + rid3), wl = document.getElementById('em-web-' + rid3), hp = document.getElementById('em-html-' + rid3), ed = document.getElementById('em-edited-' + rid3);
      if (ml) ml.setAttribute('href', lk.mailto); if (wl) wl.setAttribute('href', lk.web); if (hp) hp.innerHTML = bppmsEmail(rq3).html;
      if (ed && (emk === 'subj' || emk === 'body')) ed.textContent = 'You edited this email. Changes to the request or the sign-off name will not overwrite your edits.';
      return;
    }
    var ta = e.target, ak = ta.getAttribute && ta.getAttribute('data-ap');
    var abox = ta.closest && ta.closest('[data-rid]'), arid = abox && abox.getAttribute('data-rid');
    if (ak && arid && ui.apds[arid]) {
      var d = ui.apds[arid];
      if (ak === 'qty') d.qty[D.manpowerPositions()[+ta.getAttribute('data-i')].pos] = Math.max(0, Math.min(99, parseInt(ta.value, 10) || 0));
      else d[ak] = ta.value;
      if (['addPos', 'addQty'].indexOf(ak) < 0) D.setEmailDraft(arid, null);   // the email is rebuilt from the changed request
      if (ak === 'start') { if (d.end < d.start) d.end = d.start; rerender(); return; }
      if (['addPos', 'addQty'].indexOf(ak) >= 0) return;
      apRefresh(arid); return;
    }
    var t = e.target, k = t.getAttribute && t.getAttribute('data-mp'); if (!k) return;
    var m = mpState();
    if (k === 'qty') { var i = +t.getAttribute('data-i'); m.qty[D.manpowerPositions()[i].pos] = Math.max(0, Math.min(99, parseInt(t.value, 10) || 0)); }
    else if (k === 'note') { var np = D.manpowerPositions()[+t.getAttribute('data-i')].pos; if (t.value.trim()) m.notes[np] = t.value; else delete m.notes[np]; return; }
    else if (k === 'pick') { var w = D.workOrder(t.value); if (w) { m.wo = w.wo; m.activity = w.title; m.err = ''; rerender(); } return; }   // link to a live work order: fills Activity and Work order number
    else m[k] = t.value;
    m.err = '';
    if (k === 'section') { if (!D.inchargeChoices(m.section).some(function (x) { return x.name === m.incharge; })) m.incharge = ''; rerender(); return; }
    if (k === 'wo') { var hit = D.workOrder(m.wo); if (hit && !m.activity.trim()) { m.activity = hit.title; var ai = document.getElementById('mp-act'); if (ai) ai.value = m.activity; } }
    if (k === 'start') { if (m.end < m.start) m.end = m.start; rerender(); return; }
    mpRefresh();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.modal) { ui.modal = null; ui.err = ''; rerender(); } });
  document.addEventListener('click', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-overlay')) { ui.modal = null; ui.err = ''; ui.prf = { open: false }; ui.pra.rev = ''; rerender(); return; }
    var b = e.target.closest && e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (act === 'mp-step') { var mi = +b.getAttribute('data-i'), mp = mpState(), pn = D.manpowerPositions()[mi].pos; mp.qty[pn] = Math.max(0, Math.min(99, (parseInt(mp.qty[pn], 10) || 0) + (+b.getAttribute('data-d')))); var inp = document.querySelector('input[data-mp="qty"][data-i="' + mi + '"]'); if (inp) inp.value = mp.qty[pn]; mp.err = ''; if (mp.qty[pn] === 0) rerender(); else mpRefresh(); return; }
    if (act === 'mp-approve' || act === 'mp-reject') {
      var rid = b.getAttribute('data-id'), rta = document.getElementById('ap-r-' + rid), rtx = rta ? rta.value.trim() : '';
      if (act === 'mp-reject' && !rtx) { say('Please type the reason for rejecting.'); return; }
      D.decideManpower(rid, act === 'mp-approve' ? 'Approved' : 'Rejected', supName(), rtx); delete ui.apds[rid]; ui.ap.open = ''; if (act === 'mp-approve') ui.ap.status = 'Approved'; say(rid + (act === 'mp-approve' ? ' approved. The email to BPPMS is ready below.' : ' rejected.')); return;
    }
    var cbox = b.closest('[data-rid]'), crid = cbox && cbox.getAttribute('data-rid'), cd = crid && ui.apds[crid];
    if (act === 'ap-step') { var di = +b.getAttribute('data-i'), dn = D.manpowerPositions()[di].pos; cd.qty[dn] = Math.max(0, Math.min(99, (parseInt(cd.qty[dn], 10) || 0) + (+b.getAttribute('data-d')))); D.setEmailDraft(crid, null); rerender(); return; }
    if (act === 'ap-remove') { delete cd.qty[D.manpowerPositions()[+b.getAttribute('data-i')].pos]; D.setEmailDraft(crid, null); rerender(); return; }
    if (act === 'ap-add') {
      var dix = mpFindPos(cd.addPos), dq = Math.max(1, Math.min(99, parseInt(cd.addQty, 10) || 1));
      if (dix < 0) { say('Pick a position from the list first.'); return; }
      var dpn = D.manpowerPositions()[dix].pos; cd.qty[dpn] = Math.min(99, (parseInt(cd.qty[dpn], 10) || 0) + dq); cd.addPos = ''; cd.addQty = '1'; D.setEmailDraft(crid, null); rerender();
      setTimeout(function () { var f2 = document.getElementById('ap-addpos-' + crid); if (f2) f2.focus(); }, 0); return;
    }
    if (act === 'ap-approve-edit') { if (approveDraft(id)) say(id + ' approved. The email to BPPMS is ready below.'); return; }
    if (act === 'ap-approve-send') {
      if (!/@/.test(String(D.bppmsTo() || ''))) { say('Type the BPPMS email address in the To field first.'); return; }
      var chg = approveDraft(id); if (!chg) return;
      if (sendEmailNow(id)) say(id + ' approved and emailed to BPPMS. The requester and the in-charge are notified.'); return;
    }
    if (act === 'em-send') { if (sendEmailNow(id)) say(id + ' marked as sent to BPPMS. The requester and the in-charge are notified.'); return; }
    if (act === 'ap-open') { ui.ap.open = id; D.markAlertSeen(id); if (location.hash !== '#/approvals') location.hash = '#/approvals'; else rerender(); window.scrollTo(0, 0); return; }
    if (act === 'pra-review') { var pr0 = D.prApprovals().filter(function (x) { return x.id === id; })[0]; ui.pra = { rev: id, io: pr0 && pr0.status === 'Approved' ? pr0.io : '', err: '' }; rerender(); return; }
    if (act === 'pra-cp') { ui.pra.cp = true; ui.pra.err = ''; rerender(); return; }
    if (act === 'pra-pr-open') { ui.pra.pr = true; ui.pra.pf = { no: '', item: '' }; ui.pra.err = ''; rerender(); return; }
    if (act === 'pra-copy') {
      var cr = D.prApprovals().filter(function (x) { return x.id === id; })[0], ct = ['', cr.text, cr.qty || '', cr.uom || '', 'N'].join('\t');
      var done = function () { say('PR details copied.'); };
      try { navigator.clipboard.writeText(ct).then(done, function () { say('Copy failed.'); }); } catch (e) { say('Copy failed.'); }
      return;
    }
    if (act === 'pra-pr') { ui.pra.pr = true; ui.pra.pf = { no: '', item: '' }; ui.pra.err = ''; rerender(); return; }
    if (act === 'pra-pr-send') {
      var pf = ui.pra.pf;
      if (!String(pf.no).trim() || !String(pf.item).trim()) { ui.pra.err = 'Enter the PR number and item number.'; rerender(); return; }
      if (!/^\d{10}$/.test(String(pf.no).trim())) { ui.pra.err = 'The PR number must be 10 digits.'; rerender(); return; }
      if (!/^\d+$/.test(String(pf.item).trim())) { ui.pra.err = 'The item number must be numbers only.'; rerender(); return; }
      if (D.prItemExists(String(pf.no).trim(), String(pf.item).trim())) { ui.pra.err = 'PR ' + String(pf.no).trim() + ' item ' + String(pf.item).trim() + ' already exists.'; rerender(); return; }
      D.convertToPr(id, String(pf.no).trim(), String(pf.item).trim()); ui.pra = { rev: '', io: '', err: '' }; say(id + ' converted to PR ' + pf.no.trim() + '.'); return;
    }
    if (act === 'pra-conv') { ui.pra.conv = true; ui.pra.cvf = { res: '', items: '' }; ui.pra.err = ''; rerender(); return; }
    if (act === 'pra-conv-send') {
      var cf = ui.pra.cvf;
      if (!String(cf.res).trim() || !String(cf.items).trim()) { ui.pra.err = 'Enter the reservation number and item number/s.'; rerender(); return; }
      D.requestPrConversion(id, String(cf.res).trim(), String(cf.items).trim()); ui.pra = { rev: '', io: '', err: '' }; say('PR conversion requested for ' + id + '.'); return;
    }
    if (act === 'pra-edit') {
      ui.pra.edit = true;
      if (!isApprover()) { var e0 = D.prApprovals().filter(function (x) { return x.id === id; })[0]; ui.pra.ef = { text: e0.text, qty: e0.qty || '', uom: e0.uom || PRF_UOM[0], long: e0.long || '', price: e0.price != null ? e0.price : (e0.qty ? e0.amount / e0.qty : e0.amount) }; }
      rerender(); return;
    }
    if (act === 'pra-sedit') {
      var e1 = D.prApprovals().filter(function (x) { return x.id === id; })[0], ef1 = ui.pra.ef, q1 = parseFloat(ef1.qty), p1 = parseFloat(ef1.price), st1 = !!e1.mat;
      if (!st1 && !String(ef1.text).trim()) { ui.pra.err = 'Enter the description.'; rerender(); return; }
      if (e1.status !== 'Approved' && !(q1 > 0)) { ui.pra.err = 'Enter the quantity.'; rerender(); return; }
      if (e1.status !== 'Approved' && !(p1 > 0)) { ui.pra.err = 'Enter the unit price.'; rerender(); return; }
      D.editPrApproval(id, e1.status === 'Approved' ? { text: String(ef1.text).trim(), uom: ef1.uom, long: String(ef1.long).trim() } : st1 ? { qty: q1, amount: q1 * p1 } : { text: String(ef1.text).trim(), qty: q1, uom: ef1.uom, long: String(ef1.long).trim(), price: p1, amount: q1 * p1 });
      if (e1.status === 'Returned to requestor') D.decidePrApproval(id, 'Pending approval', '');
      ui.pra = { rev: '', io: '', err: '' }; say(id + ' updated.'); return;
    }
    if (act === 'pra-close') { ui.pra.rev = ''; ui.pra.err = ''; rerender(); return; }
    if (act === 'pra-return') { ui.pra.ret = true; ui.pra.err = ''; rerender(); return; }
    if (act === 'pra-reject') {
      if (!(ui.pra.rem || '').trim()) { ui.pra.err = 'Enter the remarks.'; rerender(); return; }
      D.decidePrApproval(id, 'Returned to requestor', '', ui.pra.rem.trim()); ui.pra = { rev: '', io: '', err: '' }; say(id + ' returned to requestor.'); return;
    }
    if (act === 'pra-approve' || act === 'pra-save') {
      var rq = D.prApprovals().filter(function (x) { return x.id === id; })[0], io = ioList().filter(function (x) { return x.io === ui.pra.io; })[0];
      if (!io) { ui.pra.err = 'Select the IO.'; rerender(); return; }
      if (io.io !== rq.io && rq.amount > ioLeft(io)) { ui.pra.err = 'The amount is more than the remaining budget of this IO.'; rerender(); return; }
      D.decidePrApproval(id, 'Approved', io.io); ui.pra = { rev: '', io: '', err: '' }; say(id + (act === 'pra-save' ? ' updated. ' : ' approved. ') + 'IO ' + io.io + ' balance: PHP ' + amt(ioLeft(io))); return;
    }
    if (act === 'pra-cancel') { D.decidePrApproval(id, 'Pending approval', ''); ui.pra = { rev: '', io: '', err: '' }; say('Approval of ' + id + ' cancelled.'); return; }
    if (act === 'prf-open') { ui.prf = prfFresh(); rerender(); return; }
    if (act === 'prf-close') { ui.prf = { open: false }; rerender(); return; }
    if (act === 'prf-clear') { ui.prf = prfFresh(); rerender(); return; }
    if (act === 'prf-submit') { var pe = prfSubmit(); if (pe) { ui.prf.err = pe; rerender(); } return; }
    if (act === 'bell-close') { ui.bell = false; rerender(); return; }
    if (act === 'bell-toggle') { ui.bell = !ui.bell; rerender(); return; }
    if (act === 'bell-all') { bellItems().forEach(function (i) { if (i.kind === 'ap') D.markAlertSeen(i.id); else if (i.kind === 'pra') D.markPraSeen(i.id); else D.markNoticeSeen(i.id); }); rerender(); return; }
    if (act === 'bell-item') {
      var kind = b.getAttribute('data-kind'); ui.bell = false;
      if (kind === 'pra') { D.markPraSeen(id); ui.pra = { rev: id.split('|')[0], io: '', err: '' }; var ph = D.account().level === 'logistics' ? '#/pr-conversion' : '#/pr-approval'; if (location.hash !== ph) location.hash = ph; else rerender(); }
      else if (kind === 'ap') { ui.ap.open = id; D.markAlertSeen(id); if (location.hash !== '#/approvals') location.hash = '#/approvals'; else rerender(); }
      else { D.markNoticeSeen(id); if (location.hash !== '#/manpower') location.hash = '#/manpower'; else rerender(); }
      window.scrollTo(0, 0); return;
    }
    if (act === 'ap-back') { ui.ap.open = ''; rerender(); return; }
    if (act === 'pl-read') { D.markPlanningSeen(); rerender(); return; }
    if (act === 'alerts-on') { try { Notification.requestPermission().then(function () { rerender(); say(Notification.permission === 'granted' ? 'Desktop alerts are on for this browser.' : 'Desktop alerts were not allowed.'); }); } catch (e) { say('This browser does not support desktop alerts.'); } return; }
    if (act === 'mp-read-in') { D.markInchargeSeen(); rerender(); return; }
    if (act === 'em-copy') {
      var rr = D.manpowerRequests().filter(function (x) { return x.id === id; })[0]; if (!rr) return;
      var ee = bppmsEmail(rr), txt2 = 'To: ' + D.bppmsTo() + '\nSubject: ' + ee.subject + '\n\n' + ee.text;
      try { navigator.clipboard.writeText(txt2).then(function () { say('Email text copied.'); }, function () { say('Could not copy. Select the text and press Ctrl+C.'); }); } catch (er) { say('Could not copy. Select the text and press Ctrl+C.'); }
      return;
    }
    if (act === 'mp-read') { D.markNoticesSeen(); rerender(); return; }
    if (act === 'em-reset') { D.setEmailDraft(id, null); rerender(); say('Email reset to the auto-filled version.'); return; }
    if (act === 'em-copy-html') {
      var he = document.getElementById('em-html-' + id), ok = false;
      if (he) { try { var rg = document.createRange(); rg.selectNodeContents(he); var sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(rg); ok = document.execCommand('copy'); sl.removeAllRanges(); } catch (er2) { ok = false; } }
      say(ok ? 'Formatted email copied. Paste it into the Outlook message.' : 'Could not copy. Select the message and press Ctrl+C.'); return;
    }
    if (act === 'mp-add') {
      var ma = mpState(), ix = mpFindPos(ma.addPos), aq = Math.max(1, Math.min(99, parseInt(ma.addQty, 10) || 1));
      if (ix < 0) { say('Pick a position from the list first.'); return; }
      var pnm = D.manpowerPositions()[ix].pos; ma.qty[pnm] = Math.min(99, (parseInt(ma.qty[pnm], 10) || 0) + aq); ma.addPos = ''; ma.addQty = '1'; ma.err = ''; rerender();
      setTimeout(function () { var f = document.getElementById('mp-addpos'); if (f) f.focus(); }, 0); return;
    }
    if (act === 'mp-remove') { var mr = mpState(); delete mr.notes[D.manpowerPositions()[+b.getAttribute('data-i')].pos]; delete mr.qty[D.manpowerPositions()[+b.getAttribute('data-i')].pos]; mr.err = ''; rerender(); return; }
    if (act === 'bud-add') {
      var bsec = ui.bud.section || D.budgetKey(mySection()), ba = ui.bud.add, byr = ui.bud.year || D.budgetYears()[0];
      var bym = ba.ym && ba.ym.slice(0, 4) === String(byr) ? ba.ym : (D.today().slice(0, 4) === String(byr) ? D.today().slice(0, 7) : byr + '-01');
      if (!(parseFloat(ba.amount) > 0)) { say('Enter the amount to add.'); return; }
      var nt = D.addBudget(bsec, bym, ba.amount, supName(), ba.note); ui.bud.add = { ym: bym, amount: '', note: '' }; rerender(); say(php(parseFloat(nt)) + ' is now the ' + ymLabel(bym) + ' budget for ' + D.budgetLabel(bsec) + '.'); return;
    }
    if (act === 'mp-mark') { var mmk = mpState(); if (!/^\d{4}-\d{2}-\d{2}$/.test(mmk.markDate)) { say('Pick the date to mark first.'); return; } mmk.dayMarks[mmk.markDate] = mmk.markType; mmk.markDate = ''; rerender(); return; }
    if (act === 'mp-unmark') { delete mpState().dayMarks[b.getAttribute('data-d')]; rerender(); return; }
    if (act === 'mp-std') { var ms = mpState(); ms.timeStart = D.manpowerStd.start; ms.timeEnd = D.manpowerStd.end; rerender(); return; }
    if (act === 'mp-go-ap') { ui.ap.status = 'Approved'; location.hash = '#/approvals'; rerender(); return; }
    if (act === 'mp-as-super') { D.setRole('superintendent'); ui.mp = null; location.hash = '#/approvals'; rerender(); return; }
    if (act === 'mp-as-sup') { D.setRole('supervisor'); ui.mp = null; ui.apds = {}; location.hash = '#/manpower'; rerender(); return; }
    if (act === 'mp-clear') { ui.mp = mpNew(); rerender(); return; }
    if (act === 'mp-new') { ui.mp = mpNew(); rerender(); return; }
    if (act === 'mp-submit') {
      var mq = mpState(), me = mpValidate(mq);
      if (me) { mq.err = me; rerender(); window.scrollTo(0, 0); return; }
      var saved = D.submitManpower({ section: mq.section, activity: mq.activity.trim(), priority: +mq.priority, wo: mq.wo.trim(), scope: mq.scope.trim(), start: mq.start, end: mq.end, timeStart: mq.timeStart, timeEnd: mq.timeEnd, qty: JSON.parse(JSON.stringify(mq.qty)), incharge: mq.incharge.trim(), dayRates: mq.dayRates, dayMarks: JSON.parse(JSON.stringify(mq.dayMarks)), by: whoAmI(), autoApprove: D.role() === 'superintendent' });
      mq.doneId = saved.id; window.scrollTo(0, 0); say(saved.status === 'Approved' ? 'Manpower request ' + saved.id + ' submitted and approved.' : 'Manpower request ' + saved.id + ' sent for approval.'); return;
    }
    if (act === 'more-materials') { ui.mm.limit += 15; rerender(); return; }
    if (act === 'reset') { if (window.confirm('Reset all demo entries (assignments, remarks, work done records) to the starting data?')) { D.reset(); ui.mp = null; ui.modal = null; say('Demo data reset.'); } }
    else if (act === 'note') { say(b.getAttribute('data-msg')); }
    else if (act === 'sim') { D.simulateSap(b.getAttribute('data-wo'), b.getAttribute('data-to'), b.getAttribute('data-key')); say('Demo: SAP changed the status to “' + b.getAttribute('data-to') + '”.'); }
    else if (act === 'assign-wo' || act === 'assign-notif') {
      var s = document.getElementById(act === 'assign-wo' ? 'as-wo' : 'as-notif'); if (!s || !s.value) { say('Pick a technician first.'); return; }
      if (act === 'assign-wo') D.assign(id, s.value, whoAmI()); else D.assignNotif(id, s.value, whoAmI());
      say('Assigned to ' + s.value + '.');
    }
    else if (act === 'add-remark') {
      var ta = document.getElementById('remark-text'), txt = ta ? ta.value.trim() : ''; if (!txt) { say('Type a remark first.'); return; }
      D.addRemark(id, { who: isSup() ? whoAmI() : ME, role: D.role() === 'superintendent' ? 'Superintendent' : D.role() === 'supervisor' ? 'Supervisor' : 'Technician', text: txt }); say('Remark added.');
    }
    else if (act === 'open-record') { ui.modal = { type: 'record', wo: (location.hash.split('/')[2]) }; ui.err = ''; rerender(); }
    else if (act === 'close-modal') { ui.modal = null; ui.err = ''; rerender(); }
    else if (act === 'submit-record') {
      function v(id2) { var el = document.getElementById(id2); return el ? el.value.trim() : ''; }
      function r(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : 'No'; }
      var rec = { findings: v('f-findings'), action: v('f-action'), helper: r('helper'), start: v('f-start'), finish: v('f-finish'), hrs: v('f-hrs'), notify: r('notify'), brand: v('f-brand'), qty: v('f-qty'), spec: v('f-spec'), by: ME };
      if (!rec.findings || !rec.action || !rec.start || !rec.finish || !rec.hrs) { ui.err = 'Please fill in Findings, Action taken, the actual dates and the duration.';
        // keep what was typed: re-open the dialog with the same values
        var keep = rec; rerender(); setTimeout(function () { function set(i, val) { var el = document.getElementById(i); if (el) el.value = val; } set('f-findings', keep.findings); set('f-action', keep.action); set('f-start', keep.start); set('f-finish', keep.finish); set('f-hrs', keep.hrs); set('f-brand', keep.brand); set('f-qty', keep.qty); set('f-spec', keep.spec); ['helper', 'notify'].forEach(function (nm) { var el = document.querySelector('input[name="' + nm + '"][value="' + (nm === 'helper' ? keep.helper : keep.notify) + '"]'); if (el) el.checked = true; }); }, 0); return; }
      D.saveRecord(b.getAttribute('data-wo'), rec); ui.modal = null; ui.err = ''; say('Work done recorded. This job moves to Completed in My Jobs.');
    }
  });
  window.addEventListener('storage', function (e) {   // another tab / window of this browser changed the data
    if (e.key !== 'mms.prototype.v1') return;
    D.reload(); desktopAlerts();
    var ae = document.activeElement; if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    rerender();
  });
  window.addEventListener('hashchange', function () { ui.modal = null; ui.err = ''; route(); });
  route(); desktopAlerts();
})();
