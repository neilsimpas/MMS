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
  var ui = { wo: { status: 'All statuses', tech: 'All', q: '' }, notif: { status: 'Outstanding', month: 'All months', q: '' }, jobs: { status: 'Open', q: '' }, dash: { month: 'All months' }, pr: { show: 'All', sec: 'All', q: '' }, po: { status: 'All', sec: 'All', q: '' }, prtxt: { sel: '' }, potxt: { sel: '' }, eq: { q: '' }, mm: { stock: 'All', q: '', limit: 15 }, modal: null, err: '', toast: '' };

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

  /* ---------- layout ---------- */
  function shell(active, content) {
    var role = D.role();
    var outstanding = D.notifications().filter(function (n) { return n.status === 'Outstanding'; }).length;
    var nav = role === 'supervisor'
      ? '<a href="#/dashboard" class="' + (active === 'dash' ? 'on' : '') + '">Dashboard</a><a href="#/wo" class="' + (active === 'wo' ? 'on' : '') + '">Work Orders</a><a href="#/notifs" class="' + (active === 'notifs' ? 'on' : '') + '">Notifications<span class="badge">' + outstanding + '</span></a>' +
        '<a href="#/prs" class="' + (active === 'prs' ? 'on' : '') + '">Purchase Requests</a><a href="#/pos" class="' + (active === 'pos' ? 'on' : '') + '">Purchase Orders</a><a href="#/materials" class="' + (active === 'mm' ? 'on' : '') + '">Material Master</a><a href="#/equipment" class="' + (active === 'eq' ? 'on' : '') + '">Equipment</a>'
      : '<a href="#/jobs" class="' + (active === 'jobs' ? 'on' : '') + '">My Jobs</a>';
    return '<div class="shell"><nav class="side" aria-label="Main menu"><div class="brand"><div class="logo">MPC</div><div><b>MMS</b><span>Maintenance Management System</span></div></div>' +
      '<div class="nav">' + nav + '</div><div class="grow"></div>' +
      '<div class="who"><label for="role">Viewing as</label><select id="role" data-role><option value="supervisor"' + (role === 'supervisor' ? ' selected' : '') + '>Supervisor (' + SUP + ')</option><option value="technician"' + (role === 'technician' ? ' selected' : '') + '>Technician (' + ME + ')</option></select>' +
      '<button type="button" data-act="reset">Reset demo data</button><span style="color:#9AA3AF;line-height:1.4">Prototype. SAP data is sample data. Entries made here are saved in this browser only.</span></div></nav>' +
      '<main class="main">' + content + '</main></div>' + (ui.modal ? modalHtml() : '') + (ui.toast ? '<div class="toast" role="status">' + esc(ui.toast) + '</div>' : '');
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
    var w = D.workOrder(id); if (!w) return shell(D.role() === 'supervisor' ? 'wo' : 'jobs', '<div class="card"><h2>Work order not found</h2></div>');
    var sup = D.role() === 'supervisor', n = w.notif ? D.notification(w.notif) : null;
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
    var m = ui.modal; if (m.type !== 'record') return '';
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
    var n = D.notification(id), sup = D.role() === 'supervisor';
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
    return shell('jobs', '<div class="f"><span class="small muted">Signed in as ' + ME + '</span><h1>My Jobs</h1></div>' +
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

  /* ---------- router + events ---------- */
  function route() {
    var h = (location.hash || '').replace(/^#\/?/, ''), p = h.split('/'), role = D.role(), html;
    if (!p[0] || (role === 'supervisor' && p[0] === 'jobs') || (role === 'technician' && (['wo', 'notifs', 'dashboard', 'prs', 'pr', 'pos', 'po', 'materials', 'material', 'equipment'].indexOf(p[0]) >= 0))) { location.hash = role === 'supervisor' ? '#/dashboard' : '#/jobs'; return; }
    if (p[0] === 'dashboard') html = viewDashboard();
    else if (p[0] === 'prs') html = viewPrList();
    else if (p[0] === 'pr') html = viewPrDetail(p[1]);
    else if (p[0] === 'pos') html = viewPoList();
    else if (p[0] === 'po') html = viewPoDetail(p[1]);
    else if (p[0] === 'materials') html = viewMaterials();
    else if (p[0] === 'equipment') html = p[1] ? viewEquipmentDetail(p[1]) : viewEquipment();
    else if (p[0] === 'material') html = viewMaterialDetail(p[1]);
    else if (p[0] === 'wo') html = p[1] ? viewWoDetail(p[1]) : viewWoList();
    else if (p[0] === 'job') html = viewWoDetail(p[1]);
    else if (p[0] === 'jobs') html = viewJobs();
    else if (p[0] === 'notifs') html = viewNotifList();
    else if (p[0] === 'notif') html = viewNotif(p[1]);
    else { location.hash = role === 'supervisor' ? '#/dashboard' : '#/jobs'; return; }
    paint(html);
  }
  var lastHash = '';
  function paint(html) {
    var y = window.scrollY, same = lastHash === location.hash;
    app.innerHTML = html; lastHash = location.hash;
    window.scrollTo(0, same ? y : 0);
  }
  function rerender() { route(); }
  function say(msg) { ui.toast = msg; rerender(); setTimeout(function () { ui.toast = ''; if (document.querySelector('.toast')) rerender(); }, 2500); }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-role')) { D.setRole(t.value); ui.modal = null; location.hash = t.value === 'supervisor' ? '#/dashboard' : '#/jobs'; rerender(); return; }
    var fk = t.getAttribute && t.getAttribute('data-filter');
    if (fk) { var a = fk.split('.'); ui[a[0]][a[1]] = t.value; rerender(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.modal) { ui.modal = null; ui.err = ''; rerender(); } });
  document.addEventListener('click', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-overlay')) { ui.modal = null; ui.err = ''; rerender(); return; }
    var b = e.target.closest && e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (act === 'more-materials') { ui.mm.limit += 15; rerender(); return; }
    if (act === 'reset') { if (window.confirm('Reset all demo entries (assignments, remarks, work done records) to the starting data?')) { D.reset(); ui.modal = null; say('Demo data reset.'); } }
    else if (act === 'note') { say(b.getAttribute('data-msg')); }
    else if (act === 'sim') { D.simulateSap(b.getAttribute('data-wo'), b.getAttribute('data-to'), b.getAttribute('data-key')); say('Demo: SAP changed the status to “' + b.getAttribute('data-to') + '”.'); }
    else if (act === 'assign-wo' || act === 'assign-notif') {
      var s = document.getElementById(act === 'assign-wo' ? 'as-wo' : 'as-notif'); if (!s || !s.value) { say('Pick a technician first.'); return; }
      if (act === 'assign-wo') D.assign(id, s.value, SUP); else D.assignNotif(id, s.value, SUP);
      say('Assigned to ' + s.value + '.');
    }
    else if (act === 'add-remark') {
      var ta = document.getElementById('remark-text'), txt = ta ? ta.value.trim() : ''; if (!txt) { say('Type a remark first.'); return; }
      D.addRemark(id, { who: D.role() === 'supervisor' ? SUP : ME, role: D.role() === 'supervisor' ? 'Supervisor' : 'Technician', text: txt }); say('Remark added.');
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
  window.addEventListener('hashchange', function () { ui.modal = null; ui.err = ''; route(); });
  route();
})();
