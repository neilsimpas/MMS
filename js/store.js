/* ============================================================================
   DATA ACCESS  -  this is the ONLY file the screens use to get or save data.
   ----------------------------------------------------------------------------
   Two kinds of data:

   1) SAP data (read-only)  ->  Data.workOrders(), Data.notifications(), ...
      Today these read the sample file js/sap-data.js.
      FOR IT: change these functions to read from SAP (API or export).

   2) MMS-only data (saved by this app) -> technician assignments, remarks,
      "Record work done" entries.
      Today these are saved in the browser (localStorage) so the prototype works
      with no server and no database. They are NOT shared between people.
      FOR IT: change the small load() / save() functions at the top to talk to
      your server database instead. Nothing else needs to change.
   ============================================================================ */
window.Data = (function () {
  var KEY = 'mms.prototype.v1';
  var memory = null; // used if the browser blocks localStorage

  /* ---------- storage (swap this block for a database later) ---------- */
  function load() {
    try { var raw = window.localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { if (memory) return memory; }
    return seed();
  }
  function save() {
    memory = db;
    try { window.localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* keep in memory only */ }
  }

  /* ---------- starting MMS data for the demo ---------- */
  /* SAMPLE monthly budgets in PHP per section: maint = requested maintenance (manpower), other = other costs.
     Each section sets its own amounts on the Section Budget screen; these are only starting values for the demo. */
  var BUDGET_SAMPLE = { 'MECHANICAL': [1400000, 420000], 'ELEC': [300000, 90000], 'C&I': [250000, 75000] };   // MECH-BLR + MECH-STG + MECH-CHP share one Mechanical budget
  function seedBudgets() {
    var out = {}, y0 = +window.SAP.today.slice(0, 4);
    Object.keys(BUDGET_SAMPLE).forEach(function (sec) {
      out[sec] = {};
      [y0, y0 + 1].forEach(function (y) { for (var m = 1; m <= 12; m++) { var k = y + '-' + (m < 10 ? '0' : '') + m, started = k >= window.SAP.today.slice(0, 7); out[sec][k] = { maint: started ? BUDGET_SAMPLE[sec][0] : 0, other: started ? BUDGET_SAMPLE[sec][1] : 0 }; } });   // sample: budgets start in the current month, so no sample amount is carried over from the past
    });
    return out;
  }

  function seed() {
    return {
      role: 'supervisor',
      assignments: {            // work order -> technician (MMS only)
        '8000001633': { tech: 'A. Tormis', by: 'N. G. Simpas', when: '2026-10-14 06:50' },
        '8000001618': { tech: 'R. Valledor', by: 'N. G. Simpas', when: '2026-10-14 06:55' },
        '8000001594': { tech: 'R. Bual', by: 'N. G. Simpas', when: '2026-10-08 08:30' },
        '8000001636': { tech: 'R. Sajulga', by: 'N. G. Simpas', when: '2026-10-14 07:45' },
        '8000001626': { tech: 'R. Valledor', by: 'N. G. Simpas', when: '2026-10-12 08:30' },
        '8000001615': { tech: 'R. Sajulga', by: 'N. G. Simpas', when: '2026-10-09 08:30' },
        '8000001630': { tech: 'R. Valledor', by: 'N. G. Simpas', when: '2026-10-13 08:40' },
        '8000001645': { tech: 'R. Valledor', by: 'N. G. Simpas', when: '2026-10-13 08:40' },
        '8000001572': { tech: 'R. Valledor', by: 'N. G. Simpas', when: '2026-10-06 08:30' },
        '8000001560': { tech: 'R. Bual', by: 'N. G. Simpas', when: '2026-10-04 08:30' }
      },
      notifAssignments: {       // notification -> technician assigned to assess it (MMS only)
        '10002783': { tech: 'R. Valledor', by: 'N. G. Simpas', when: '2026-10-14 11:05' },
        '10002779': { tech: 'A. Tormis', by: 'N. G. Simpas', when: '2026-10-13 18:40' }
      },
      remarks: {                // notification -> list of remarks (MMS only)
        '10002783': [
          { who: 'N. G. Simpas', role: 'Supervisor', when: '2026-10-14 11:05', text: 'Assigned to R. Valledor for assessment. Please check the NDE bearing temperature and lubrication, and tell me if a work order is needed.' }
        ],
        '10002742': [
          { who: 'N. G. Simpas', role: 'Supervisor', when: '2026-10-14 06:50', text: 'Work order created in SAP and assigned to you.' },
          { who: 'R. Valledor', role: 'Technician', when: '2026-10-14 06:45', text: 'Gauge is stuck at 0 with the pump running. Root valve is passing slightly. I recommend a work order to replace the gauge.' },
          { who: 'N. G. Simpas', role: 'Supervisor', when: '2026-10-14 06:30', text: 'Assigned to R. Valledor for assessment. Please check the gauge and tell me if a work order is needed.' }
        ]
      },
      records: {},              // work order -> "Record work done" entry (MMS only)
      manpower: [],             // manpower requests (MMS only)
      emailSignoff: '',   // name under "Regards," in the BPPMS email (editable on the email panel)
      bppmsTo: '',              // BPPMS email address(es) used for the approved-request email (MMS only)
      budgets: seedBudgets(),   // section budgets per month (MMS only, SAMPLE amounts)
      sapOverrides: {}          // demo only: lets you simulate an SAP event such as "PTW closed"
    };
  }

  var db = load();
  if (!db.manpower) db.manpower = [];   // data saved by an earlier version of the prototype
  if (!db.budgets) db.budgets = seedBudgets();
  if (!db.budgets.MECHANICAL) {   // older saved data: join the MECH-BLR / MECH-STG / MECH-CHP budgets into one Mechanical budget
    var mech = {};
    ['MECH-BLR', 'MECH-STG', 'MECH-CHP'].forEach(function (k) { var o = db.budgets[k] || {}; Object.keys(o).forEach(function (ym) { var x = mech[ym] || (mech[ym] = { maint: 0, other: 0 }); x.maint += o[ym].maint || 0; x.other += o[ym].other || 0; }); delete db.budgets[k]; });
    db.budgets.MECHANICAL = mech;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function now() { return window.SAP.today + ' 14:20'; }

  /* ---------- SAP data (read-only) ---------- */
  function workOrders() {
    return window.SAP.workOrders.map(function (w) {
      var o = clone(w), ov = db.sapOverrides[w.wo];
      if (ov) { o.status = ov.status || o.status; o.dates = Object.assign(o.dates || {}, ov.dates || {}); }
      return o;
    });
  }
  function workOrder(id) { return workOrders().filter(function (w) { return w.wo === id; })[0] || null; }
  function notifications() { return clone(window.SAP.notifications); }
  function notification(n) { return notifications().filter(function (x) { return x.n === n; })[0] || null; }
  function workOrderHistory(kks, excludeWo) {          // work orders on the same KKS, newest first
    return workOrders().filter(function (w) { return w.kks === kks; })
      .sort(function (a, b) { return lastDate(b).localeCompare(lastDate(a)); });
  }
  function notifHistory(kks) {                          // notifications on the same KKS, newest first
    return notifications().filter(function (x) { return x.kks === kks; })
      .sort(function (a, b) { return b.when.localeCompare(a.when); });
  }
  function lastDate(w) { var d = w.dates || {}; return d.confirmed || d.ptwClosed || d.ptwIssued || d.execution || d.released || d.notification || ''; }

  /* ---------- SAP purchasing + material master (read-only) ---------- */
  function purchaseRequestItems() { return clone(window.SAP.purchaseRequests); }
  function purchaseRequest(pr) {
    var items = purchaseRequestItems().filter(function (i) { return i.pr === pr; });
    if (!items.length) return null;
    var h = clone(window.SAP.prHeaders[pr] || {});
    return { pr: pr, items: items, date: items[0].date, sec: items[0].sec, header: h };
  }
  function purchaseOrderItems() { return clone(window.SAP.purchaseOrders); }
  function purchaseOrder(po) {
    var items = purchaseOrderItems().filter(function (i) { return i.po === po; });
    if (!items.length) return null;
    var h = Object.assign({}, window.SAP.poHeaders._default, window.SAP.poHeaders[po] || {});
    var receipts = clone(window.SAP.goodsReceipts).filter(function (r) { return r.po === po; });
    return { po: po, items: items, header: h, receipts: receipts, vendor: items[0].vendor, date: items[0].date, sec: items[0].sec };
  }
  function materials() { return clone(window.SAP.materials).map(function (m) { return { mat: m[0], text: m[1], stock: m[2], uom: m[3], price: m[4] }; }); }
  function materialsAsOf() { return window.SAP.materialsAsOf; }
  function sections() { return window.SAP.sections.slice(); }

  /* ---------- MMS-only data (saved by this app) ---------- */
  /* ---------- accounts: who is signed in, what they may see ---------- */
  var DEFAULT_ACCOUNT = 'Ronnel A. Flores';
  function accounts() { return window.SAP.users.accounts.slice(); }
  function groupOfSection(sec) { return sec === 'Mechanical Section' ? 'MECHANICAL' : sec === 'Electrical Section' ? 'ELEC' : sec === 'C&I Section' ? 'C&I' : ''; }
  var SITE = { 'Ronnel A. Flores': 'MECH-BLR', 'Rito M. Valledor': 'MECH-BLR' };   // the work section of a person; everyone else follows the section group (Superintendent: all MECH)
  function accInfo(a) {
    var pos = a.position, level = /Logistics/.test(pos) ? 'logistics' : /Superintendent/.test(pos) ? 'superintendent' : /Manager/.test(pos) ? 'manager' : /Supervisor/.test(pos) ? 'supervisor' : 'staff';
    var all = a.section === 'Planning Section' || /Manager|Logistics/.test(pos);          // Planning (all of them) and the Maintenance Manager see every section
    var role = (level === 'superintendent' || level === 'manager') ? 'superintendent' : level === 'supervisor' ? 'supervisor' : (all ? 'supervisor' : 'technician');
    return { name: a.name, site: SITE[a.name] || '', position: pos, section: a.section, group: groupOfSection(a.section), level: level, scopeAll: all, role: role,
      canApproveAll: all && (level === 'superintendent' || level === 'manager') };
  }
  function account() {
    var list = window.SAP.users.accounts, nm = db.account, a = list.filter(function (x) { return x.name === nm; })[0] || list.filter(function (x) { return x.name === DEFAULT_ACCOUNT; })[0];
    return accInfo(a);
  }
  function setAccount(name) { db.account = name; save(); }
  function role() { return account().role; }
  function setRole(r) { /* the role now follows the signed-in account */ }
  function sectionGroup(sec) { return String(sec || '').indexOf('MECH') === 0 ? 'MECHANICAL' : sec; }
  function inScope(sec) { var a = account(); if (a.site) return sec === a.site; return a.scopeAll || a.group === sectionGroup(sec); }
  function canApprove(sec) { var a = account(); return (a.level === 'superintendent' || a.level === 'manager') && (a.scopeAll || a.group === sectionGroup(sec)); }
  // "R. Valledor": the short technician name used by the sample SAP work orders
  function techKey(name) { var p = String(name || '').replace(/\s+Jr\.?$/, '').split(/\s+/); return p.length > 1 ? p[0].charAt(0) + '. ' + p[p.length - 1] : name; }
  function inchargeChoices(sec) {   // only people of the same section (Planning and the Manager see everyone)
    var me = account(), g = sectionGroup(sec);
    return accounts().filter(function (a) { return me.scopeAll || groupOfSection(a.section) === g; });
  }
  function technicianOf(wo) { return db.assignments[wo] ? db.assignments[wo].tech : ''; }
  function assignmentOf(wo) { return db.assignments[wo] || null; }
  function assign(wo, tech, by) {
    if (!tech) { delete db.assignments[wo]; } else { db.assignments[wo] = { tech: tech, by: by, when: now() }; }
    save();
  }
  function notifTechnician(n) { return db.notifAssignments[n] ? db.notifAssignments[n].tech : ''; }
  function notifAssignmentOf(n) { return db.notifAssignments[n] || null; }
  function assignNotif(n, tech, by) {
    var prev = notifTechnician(n);
    if (!tech) { delete db.notifAssignments[n]; } else { db.notifAssignments[n] = { tech: tech, by: by, when: now() }; }
    if (tech && tech !== prev) {
      addRemark(n, { who: by, role: 'Supervisor', text: (prev ? 'Reassigned from ' + prev + ' to ' + tech : 'Assigned to ' + tech) + ' for assessment.' });
    } else { save(); }
  }
  function remarks(n) { return (db.remarks[n] || []).slice(); }
  function addRemark(n, r) {
    var list = db.remarks[n] || (db.remarks[n] = []);
    list.unshift({ who: r.who, role: r.role, when: now(), text: r.text });
    save();
  }
  function record(wo) { return db.records[wo] || null; }
  function saveRecord(wo, rec) { rec.when = now(); db.records[wo] = rec; save(); }


  /* ---------- Manpower request (BPPMS rate sheet) ----------
     Rates are PHP per person per day: [position, day rate, night-shift (N/S) rate].
     Source: BPPMS personnel rate sheet supplied by the requester. null = no N/S rate on the sheet.
     Rates are used for the plan-cost calculation only; the screens do not show them per person. */
  var MP_POS = [
    ['Supervisor', 2590.35, null], ['Team Leader', 2090.91, null], ['Safety Officer', 2090.91, null],
    ['Welder (SMAW)', 2465.84, 2753.14], ['TIG Welder', 3103.35, 3464.89], ['Pipe Fitter', 2465.84, 2753.14],
    ['Skilled Mechanic', 1657.50, 1850.61], ['Assist', 1020.02, 1138.85], ['HE Mechanic', 2495.07, 2785.77],
    ['Insulator', 2465.84, 2753.14], ['Insulator Helper', 1020.015, 1138.85], ['Scaffolder', 1657.50, 1850.61],
    ['Scaffolder (Assist)', 1020.02, 1138.85], ['Technician', 2495.07, 2785.77], ['Technician (Assist)', 1020.02, 1138.85]
  ];
  var MP_STD = { start: '07:30', end: '17:00' };      // standard BPPMS working hours (editable on the form)
  var MP_NIGHT_FROM = '19:00';                        // a start time at or after 7:00 PM uses the N/S rates
  /* ASSUMPTION - to be confirmed against the BPPMS contract: a normal day is 8 paid hours at the day rate;
     overtime hourly pay = (day rate / 8) x multiplier. The multipliers below are the ones agreed with the requester. */
  var MP_NORMAL_HOURS = 8;
  var MP_MULT = { ordinary: 1.25, rest: 1.30, special: 1.30, holiday: 2.00 };

  /* Philippine holidays (used to pick the overtime multiplier).
     Fixed-date and Holy Week / National Heroes Day holidays are worked out for any year.
     Holidays that are proclaimed each year (Eid'l Fitr, Eid'l Adha, Chinese New Year, extra special days)
     are NOT built in: add them to MP_HOLIDAYS_EXTRA from the official Presidential Proclamation.
     Format: { d: 'YYYY-MM-DD', t: 'regular' | 'special', n: 'name' } */
  var MP_HOLIDAYS_EXTRA = [];
  var FIXED = {
    '01-01': ['regular', "New Year's Day"], '04-09': ['regular', 'Araw ng Kagitingan'], '05-01': ['regular', 'Labor Day'],
    '06-12': ['regular', 'Independence Day'], '11-30': ['regular', 'Bonifacio Day'], '12-25': ['regular', 'Christmas Day'],
    '12-30': ['regular', 'Rizal Day'], '08-21': ['special', 'Ninoy Aquino Day'], '11-01': ['special', "All Saints' Day"],
    '12-08': ['special', 'Feast of the Immaculate Conception'], '12-31': ['special', 'Last Day of the Year']
  };
  function isoOf(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function easterMs(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, mo - 1, da);
  }
  function holiday(ds) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds || '')) return null;
    var y = +ds.slice(0, 4), f = FIXED[ds.slice(5)], day = 86400000, em = easterMs(y);
    if (f) return { type: f[0], name: f[1] };
    if (ds === isoOf(em - 3 * day)) return { type: 'regular', name: 'Maundy Thursday' };
    if (ds === isoOf(em - 2 * day)) return { type: 'regular', name: 'Good Friday' };
    if (ds === isoOf(em - 1 * day)) return { type: 'special', name: 'Black Saturday' };
    var aug = new Date(Date.UTC(y, 7, 31)); while (aug.getUTCDay() !== 1) aug = new Date(aug.getTime() - day);
    if (ds === isoOf(aug.getTime())) return { type: 'regular', name: 'National Heroes Day' };
    for (var x = 0; x < MP_HOLIDAYS_EXTRA.length; x++) if (MP_HOLIDAYS_EXTRA[x].d === ds) return { type: MP_HOLIDAYS_EXTRA[x].t, name: MP_HOLIDAYS_EXTRA[x].n };
    return null;
  }
  function msOf(ds) { var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds || ''); return a ? Date.UTC(+a[1], +a[2] - 1, +a[3]) : null; }
  function mpDays(start, end) { var a = msOf(start), b = msOf(end); if (a == null || b == null) return 0; var d = Math.round((b - a) / 86400000) + 1; return d > 0 ? d : 0; }
  function mins(t) { var m = /^(\d{2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; }
  function spanHours(a, b) { var x = mins(a), y = mins(b); if (x == null || y == null) return 0; var d = y - x; if (d <= 0) d += 1440; return d / 60; }
  function isNightStart(t) { var m = mins(t); return m != null && m >= mins(MP_NIGHT_FROM); }
  // overtime multiplier for one calendar date: regular holiday 200%; special day or Sunday (rest day) 130%; otherwise 125%
  function otDayInfo(ds) {
    var h = holiday(ds), sun = new Date(msOf(ds)).getUTCDay() === 0;
    if (h && h.type === 'regular') return { mult: MP_MULT.holiday, label: 'Regular holiday (' + h.name + ')' };
    if (h) return { mult: MP_MULT.special, label: 'Special non-working day (' + h.name + ')' };
    if (sun) return { mult: MP_MULT.rest, label: 'Sunday (rest day)' };
    return { mult: MP_MULT.ordinary, label: 'Ordinary day' };
  }
  /* Work out from the time range alone whether it is normal hours, overtime or a night shift.
     Normal day = 9 elapsed hours (8 paid hours + 1 hour break), as in the BPPMS request emails
     (for example 0800H-2000H: normal until 1700H, overtime 1700H-2000H; 2000H-0800H: normal until 0500H, overtime 0500H-0800H).
       - Start at 7:00 PM or later -> night shift (N/S rates): the first 9 hours are normal, everything after is overtime.
       - Otherwise the standard band is MP_STD (7:30 AM - 5:00 PM): the part inside the band is paid at the day rate
         (pro rata of 9 hours, capped at one day); every hour outside the band is overtime. A range with no hour inside the
         band (for example 5:00 PM to 7:00 PM) is overtime only, with no day rate.
     otSegs lists the overtime windows as minutes from midnight (can pass 1440 for the next day). */
  var MP_DAY_MIN = 540;
  function classifyTime(ts, te) {
    var s = mins(ts), e = mins(te);
    if (s == null || e == null || s === e) return { kind: 'Normal', night: false, normalFrac: 0, otHours: 0, hours: 0, otSegs: [] };
    var dur = e > s ? e - s : e - s + 1440, a = mins(MP_STD.start), b = mins(MP_STD.end), end = s + dur;
    if (s >= mins(MP_NIGHT_FROM)) {
      var extra = Math.max(0, dur - MP_DAY_MIN);
      return { kind: 'Night shift', night: true, normalFrac: Math.min(1, dur / MP_DAY_MIN), otHours: extra / 60, hours: dur / 60, otSegs: extra > 0 ? [[s + MP_DAY_MIN, end]] : [] };
    }
    var bands = [[a, b], [a + 1440, b + 1440]], cur = s, segs = [], overlap = 0;
    bands.forEach(function (bd) {
      if (bd[1] <= cur || bd[0] >= end) return;
      if (bd[0] > cur) segs.push([cur, bd[0]]);
      overlap += Math.min(end, bd[1]) - Math.max(s, bd[0]); cur = Math.max(cur, bd[1]);
    });
    if (cur < end) segs.push([cur, end]);
    var ot = dur - overlap, frac = Math.min(1, overlap / MP_DAY_MIN);
    var kind = overlap === 0 ? 'Overtime' : ot > 0 ? 'Normal + overtime' : frac < 1 ? 'Normal (part of the day)' : 'Normal';
    return { kind: kind, night: false, normalFrac: frac, otHours: ot / 60, hours: dur / 60, otSegs: segs };
  }
  // spec: { start, end, timeStart, timeEnd, daysOverride, qty:{position:n} }
  /* Sunday / holiday rates: a date that is a Sunday (rest day), special non-working day or regular holiday is FLAGGED automatically.
     The flagged dates are paid at the premium (rest day / special 130%, regular holiday 200%) on the normal hours as well as on overtime
     only when the user presses "Apply Sunday/holiday rates" (spec.dayRates). Dates the user marks by hand (spec.dayMarks: {date: 'rest'|'special'|'holiday'}) always apply. */
  function dayFlag(ds, marks) {
    var mk = marks && marks[ds];
    if (mk === 'holiday') return { mult: MP_MULT.holiday, label: 'Regular holiday (marked)', manual: true };
    if (mk === 'special') return { mult: MP_MULT.special, label: 'Special non-working day (marked)', manual: true };
    if (mk === 'rest') return { mult: MP_MULT.rest, label: 'Sunday / rest day (marked)', manual: true };
    var h = holiday(ds), sun = new Date(msOf(ds)).getUTCDay() === 0;
    if (h && h.type === 'regular') return { mult: MP_MULT.holiday, label: 'Regular holiday (' + h.name + ')', manual: false };
    if (h) return { mult: MP_MULT.special, label: 'Special non-working day (' + h.name + ')', manual: false };
    if (sun) return { mult: MP_MULT.rest, label: 'Sunday (rest day)', manual: false };
    return null;
  }
  function calcManpower(spec) {
    var calendar = mpDays(spec.start, spec.end), ov = parseInt(spec.daysOverride, 10), days = ov > 0 ? ov : calendar;
    var cl = classifyTime(spec.timeStart, spec.timeEnd), night = cl.night, otHours = cl.otHours, otDates = [];
    var marks = spec.dayMarks || {}, flags = [], premium = {}, dates = [], s0 = msOf(spec.start);
    for (var k0 = 0; k0 < Math.min(calendar, 731); k0++) {
      var d0 = isoOf(s0 + k0 * 86400000), f0 = dayFlag(d0, marks); dates.push(d0);
      if (f0) { flags.push({ date: d0, mult: f0.mult, label: f0.label, manual: f0.manual }); premium[d0] = f0.mult; }   // Sundays and Philippine holidays are always charged at the premium rate
    }
    if (otHours > 0 && calendar > 0) {
      for (var k = 0; k < Math.min(calendar, 92); k++) { var ds = isoOf(s0 + k * 86400000), inf = otDayInfo(ds), f1 = marks[ds] ? dayFlag(ds, marks) : null; otDates.push({ date: ds, mult: f1 ? f1.mult : inf.mult, label: f1 ? f1.label : inf.label }); }
    }
    var scale = ov > 0 && calendar > 0 ? days / calendar : 1;          // "working days" override also scales the overtime
    var lines = [], head = 0, regular = 0, otCost = 0, fallback = [], monthly = {};
    function addM(ds, v) { var k2 = ds.slice(0, 7); monthly[k2] = (monthly[k2] || 0) + v; }
    MP_POS.forEach(function (p) {
      var q = parseInt((spec.qty || {})[p[0]], 10) || 0; if (q <= 0) return;
      var rate = night && p[2] != null ? p[2] : p[1];
      if (night && p[2] == null && fallback.indexOf(p[0]) < 0) fallback.push(p[0]);
      var reg = 0, o = 0;
      dates.forEach(function (d) { var v = q * rate * cl.normalFrac * (premium[d] || 1) * scale; reg += v; addM(d, v); });   // regular pay is charged to the month of each date
      otDates.forEach(function (d) { var v = q * (rate / MP_NORMAL_HOURS) * d.mult * otHours * scale; o += v; addM(d.date, v); });
      lines.push({ pos: p[0], qty: q, rate: rate, regular: reg, ot: o, total: reg + o });
      head += q; regular += reg; otCost += o;
    });
    return { monthly: monthly, otSegs: cl.otSegs, kind: cl.kind, hours: cl.hours, normalFrac: cl.normalFrac, calendarDays: calendar, days: days, night: night, lines: lines, headcount: head, regular: regular, ot: otCost, total: regular + otCost, otDates: otDates, otHours: otHours, noNS: fallback, dayFlags: flags, autoDayRates: true, premiumDates: Object.keys(premium) };
  }
  function manpowerRequests() { return db.manpower.slice(); }
  // everyone who can be named as MPC organic in-charge (the person is matched by name, so the request shows on that account)
  function people() {
    return accounts().map(function (a) { return { name: a.name, role: a.position }; });
  }
  function visibleRequests() { var me = account(); return db.manpower.filter(function (r) { return me.scopeAll || inScope(r.section) || r.by === me.name || r.incharge === me.name; }); }
  function manpowerFor(name) { return db.manpower.filter(function (r) { return r.incharge && r.incharge === name; }); }
  function bppmsTo() { return db.bppmsTo || ''; }
  function emailSignoff() { var me = account().name; return (db.signoffs && db.signoffs[me]) || me; }   // default: the approving account   // default: the approving account (the Superintendent)
  function setEmailSignoff(v) { (db.signoffs = db.signoffs || {})[account().name] = String(v || ''); save(); }
  function setBppmsTo(v) { db.bppmsTo = String(v || ''); save(); }
  function decideManpower(id, decision, by, remark) {
    var r = db.manpower.filter(function (x) { return x.id === id; })[0]; if (!r) return null;
    r.status = decision; r.decidedBy = by; r.decidedWhen = now(); r.decisionRemark = remark || '';
    r.noticeSeen = !!r.autoApproved || (r.by === by); if (decision === 'Approved') r.inchargeSeen = false; save(); return r;
  }
  // The Superintendent may change the manpower, dates and times before approving. The original request is kept for traceability.
  function updateManpower(id, patch, by) {
    var r = db.manpower.filter(function (x) { return x.id === id; })[0]; if (!r) return null;
    if (!r.original) r.original = { qty: JSON.parse(JSON.stringify(r.qty)), dayRates: !!r.dayRates, start: r.start, end: r.end, timeStart: r.timeStart, timeEnd: r.timeEnd, total: r.calc.total, headcount: r.calc.headcount, when: r.when };
    ['qty', 'start', 'end', 'timeStart', 'timeEnd', 'incharge', 'areaNote', 'dayRates', 'dayMarks'].forEach(function (k) { if (patch[k] != null) r[k] = JSON.parse(JSON.stringify(patch[k])); });
    delete r.emailDraft;
    r.calc = calcManpower(r);
    (r.edits = r.edits || []).push({ by: by, when: now(), total: r.calc.total });
    save(); return r;
  }
  function setEmailDraft(id, d) {   // Superintendent's hand-edited email (subject + text); null goes back to the auto-filled email
    var r = db.manpower.filter(function (x) { return x.id === id; })[0]; if (!r) return null;
    if (d) r.emailDraft = { subject: String(d.subject || ''), text: String(d.text || '') }; else delete r.emailDraft;
    save(); return r;
  }
  function manpowerNotices() {   // decisions the requester has not read yet (Approved / Rejected)
    var me = account().name;
    return db.manpower.filter(function (r) { return r.by === me; }).filter(function (r) { return (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Sent to BPPMS') && r.decidedWhen && r.noticeSeen === false; })
      .sort(function (a, b) { return String(b.decidedWhen).localeCompare(String(a.decidedWhen)); });
  }
  var PRA_OLD = { 'Rejected': 'Returned to requestor', 'Pending': 'Pending approval', 'Pending conversion': 'Approved', 'Converted': 'PR Created' };   // names used before the final status list
  function prApprovals() { return clone(window.SAP.prApprovals).concat(clone(db.prApprovals || [])).map(function (r) { r.status = PRA_OLD[r.status] || r.status; var cv = (db.praConv || {})[r.id]; if (cv) r.conv = cv; var ed = (db.praEdits || {})[r.id]; if (ed) Object.keys(ed).forEach(function (k) { r[k] = ed[k]; }); var d = (db.praDecisions || {})[r.id]; if (d) { r.status = PRA_OLD[d.status] || d.status; r.io = d.io; r.remarks = d.remarks || ''; } if (r.conv && r.status === 'Approved') r.status = 'For PR conversion'; var pp = (db.praPr || {})[r.id]; if (pp) { r.status = 'PR Created'; r.prNo = pp.no; r.prItem = pp.item; } return r; }); }
  function decidePrApproval(id, status, io, remarks) { db.praDecisions = db.praDecisions || {}; db.praDecisions[id] = { status: status, io: io || '', remarks: remarks || '', by: account().name, when: now() }; save(); }
  function requestPrConversion(id, res, items) { db.praConv = db.praConv || {}; db.praConv[id] = { res: res, items: items, by: account().name, when: now() }; save(); }
  function praSeen(key) { var m = (db.praSeen || {})[account().name]; return !!(m && m[key]); }
  function markPraSeen(key) { db.praSeen = db.praSeen || {}; var n = account().name; db.praSeen[n] = db.praSeen[n] || {}; db.praSeen[n][key] = 1; save(); }
  function prItemExists(no, item) { var it = String(item).replace(/^0+/, ''), hit = function (p, i) { return String(p) === String(no) && String(i).replace(/^0+/, '') === it; }; return window.SAP.purchaseRequests.some(function (x) { return hit(x.pr, x.item); }) || Object.keys(db.praPr || {}).some(function (k) { return hit(db.praPr[k].no, db.praPr[k].item); }); }
  function convertToPr(id, no, item) { db.praPr = db.praPr || {}; db.praPr[id] = { no: no, item: item, by: account().name, when: now() }; save(); }
  function editPrApproval(id, f) { db.praEdits = db.praEdits || {}; db.praEdits[id] = f; save(); }
  function addPrApproval(r) {   // a supervisor's PR approval request; the Superintendent sets the IO when approving
    db.prApprovals = db.prApprovals || [];
    var n = window.SAP.prApprovals.length + db.prApprovals.length + 1;
    r.id = 'PRA-' + window.SAP.today.slice(0, 4) + '-' + ('000' + n).slice(-4); r.date = window.SAP.today; r.by = account().name; r.status = 'Pending approval'; r.io = '';
    db.prApprovals.push(r); save(); return r;
  }
  function markNoticeSeen(id) { var me = account().name; db.manpower.forEach(function (r) { if (r.id === id && r.by === me && r.noticeSeen === false) r.noticeSeen = true; }); save(); }
  function markNoticesSeen() { var me = account().name; db.manpower.forEach(function (r) { if (r.by === me && r.noticeSeen === false) r.noticeSeen = true; }); save(); }
  /* Email addresses are added to window.SAP.users.accounts as email: "name@company.com" at go-live. */
  function emailOf(name) { var a = window.SAP.users.accounts.filter(function (x) { return x.name === name; })[0]; return (a && a.email) || ''; }
  function ccFor(r, approver) {   // people copied on the email to BPPMS: requester, MPC organic in-charge and the approver
    var out = [], seen = {};
    [[r.by, 'requester'], [r.incharge, 'in-charge'], [approver || r.decidedBy, 'approver']].forEach(function (x) { if (x[0] && !seen[x[0]]) { seen[x[0]] = 1; out.push({ name: x[0], role: x[1], email: emailOf(x[0]) }); } });
    return out;
  }
  function reload() { try { var raw = window.localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch (e) {} }   // pick up changes saved by another tab / window
  function approvalAlerts() {   // new requests waiting for this account's approval that it has not opened yet
    var me = account().name;
    return db.manpower.filter(function (r) { return r.status === 'Pending approval' && canApprove(r.section) && (r.seenBy || []).indexOf(me) < 0; });
  }
  function markAlertSeen(id) { var me = account().name, r = db.manpower.filter(function (x) { return x.id === id; })[0]; if (r) { r.seenBy = r.seenBy || []; if (r.seenBy.indexOf(me) < 0) r.seenBy.push(me); save(); } }
  function planningAlerts() {   // Planning Section is told about every new request and every decision
    var a = account(); if (a.section !== 'Planning Section') return [];
    return db.manpower.filter(function (r) {
      if ((r.planSeen || []).indexOf(a.name) >= 0 || r.by === a.name) return false;
      if (r.status === 'Pending approval') return !canApprove(r.section);
      return !!r.decidedWhen;
    }).sort(function (x, y) { return String(y.decidedWhen || y.when).localeCompare(String(x.decidedWhen || x.when)); });
  }
  function markPlanningSeen() { var a = account(); db.manpower.forEach(function (r) { if (r.status !== 'Pending approval' || !canApprove(r.section)) { r.planSeen = r.planSeen || []; if (r.planSeen.indexOf(a.name) < 0) r.planSeen.push(a.name); } }); save(); }
  function inchargeNotices() {   // approved / emailed requests where this account is the MPC organic in-charge and has not read the update
    var me = account().name;
    return db.manpower.filter(function (r) { return r.incharge === me && r.inchargeSeen === false && (r.status === 'Approved' || r.status === 'Sent to BPPMS'); }).sort(function (a, b) { return String(b.decidedWhen).localeCompare(String(a.decidedWhen)); });
  }
  function markInchargeSeen() { var me = account().name; db.manpower.forEach(function (r) { if (r.incharge === me && r.inchargeSeen === false) r.inchargeSeen = true; }); save(); }
  function sendToBppms(id, by, ref) {
    var r = db.manpower.filter(function (x) { return x.id === id; })[0]; if (!r || r.status !== 'Approved') return null;
    r.status = 'Sent to BPPMS'; r.sentBy = by; r.sentWhen = now(); r.bppmsRef = ref || ''; r.noticeSeen = (r.by === by); r.inchargeSeen = false; save(); return r;
  }
  /* ---------- section budgets (maint = requested maintenance / manpower, other = other costs) ---------- */
  function budgetKey(sec) { return String(sec || '').indexOf('MECH') === 0 ? 'MECHANICAL' : sec; }   // Boiler, Steam Turbine and CHP are one Mechanical budget
  function budgetGroups() { return budgetGroupsAll().filter(function (g) { var me = account(); return me.scopeAll || me.group === g.key; }); }
  function budgetGroupsAll() { return [{ key: 'MECHANICAL', label: 'Mechanical (MECH-BLR, MECH-STG, MECH-CHP)', short: 'Mechanical' }].concat(window.SAP.sections.filter(function (x) { return x.indexOf('MECH') !== 0; }).map(function (x) { return { key: x, label: x, short: x }; })); }
  function addBudget(sec, ym, amount, by, note) {   // the Superintendent adds an allotment on top of a month's budget; every addition is logged
    var amt = parseFloat(amount); if (!(amt > 0)) return null;
    var k = budgetKey(sec), s0 = db.budgets[k] || (db.budgets[k] = {}), b = s0[ym] || (s0[ym] = { maint: 0, other: 0 });
    b.maint += amt; (db.budgetLog = db.budgetLog || []).unshift({ when: now(), by: by, key: k, ym: ym, amount: amt, note: String(note || ''), total: b.maint });
    save(); return b.maint;
  }
  function budgetLog(sec) { var k = budgetKey(sec); return (db.budgetLog || []).filter(function (x) { return x.key === k; }); }
  function requestSections() { return window.SAP.sections.filter(function (x) { return inScope(x); }); }   // the Mechanical supervisor requests for MECH-BLR / MECH-STG / MECH-CHP only
  function budgetLabel(sec) { return budgetKey(sec) === 'MECHANICAL' ? 'Mechanical' : sec; }
  function budgetSet(sec, ym) { var b = (db.budgets[budgetKey(sec)] || {})[ym]; return { maint: b ? b.maint : 0, other: b ? b.other : 0 }; }
  /* Requested-maintenance budget of a month = amount set for that month + unspent amount carried over from the earlier months of the same year.
     exclude = a request id to leave out; extra = {YYYY-MM: amount} of a request not yet saved (so its earlier-month cost also reduces the carry-over). */
  function budgetOf(sec, ym, exclude, extra) {
    var set = budgetSet(sec, ym), y = ym.slice(0, 4), mo = +ym.slice(5), carry = 0;
    for (var k = 1; k < mo; k++) {
      var key = y + '-' + (k < 10 ? '0' : '') + k, c = committed(sec, key, exclude || '');
      carry = Math.max(0, budgetSet(sec, key).maint + carry - c.approved - c.pending - ((extra && extra[key]) || 0));
    }
    return { maint: set.maint + carry, other: set.other, set: set.maint, carry: carry };
  }
  function setBudget(sec, ym, key, amount) {
    var bk = budgetKey(sec), s0 = db.budgets[bk] || (db.budgets[bk] = {}), b = s0[ym] || (s0[ym] = { maint: 0, other: 0 });
    b[key] = Math.max(0, parseFloat(amount) || 0); save();
  }
  // amounts already committed against a section's maintenance budget in a month (rejected requests do not count)
  function committed(sec, ym, excludeId) {
    var out = { approved: 0, pending: 0 };
    db.manpower.forEach(function (r) {
      if (budgetKey(r.section) !== budgetKey(sec) || r.id === excludeId || !r.calc || !r.calc.monthly) return;
      var v = r.calc.monthly[ym] || 0;
      if (r.status === 'Approved' || r.status === 'Sent to BPPMS') out.approved += v; else if (r.status === 'Pending approval') out.pending += v;
    });
    return out;
  }
  function budgetYears() { var y0 = +window.SAP.today.slice(0, 4); return [y0, y0 + 1]; }
  function submitManpower(req) {
    var n = db.manpower.length + 1, yr = window.SAP.today.slice(0, 4);
    var r = Object.assign({}, req, { id: 'MR-' + yr + '-' + (n < 10 ? '000' : n < 100 ? '00' : '0') + n, status: 'Pending approval', sentTo: 'Superintendent', when: now() });
    if (req.autoApprove) { r.status = 'Approved'; r.decidedBy = req.by; r.decidedWhen = now(); r.decisionRemark = 'Requested by the Superintendent, approved on submission.'; r.sentTo = 'BPPMS requester'; }
    delete r.autoApprove;
    r.calc = calcManpower(r);
    db.manpower.unshift(r); save(); return r;
  }

  /* ---------- demo helpers ---------- */
  function simulateSap(wo, status, dateKey) {   // pretend SAP changed the work order
    var o = db.sapOverrides[wo] || (db.sapOverrides[wo] = { dates: {} });
    o.status = status; if (dateKey) o.dates[dateKey] = now(); save();
  }
  function reset() { db = seed(); save(); }

  /* ---------- business rules ---------- */
  var DONE = ['Time Confirmed', 'Technically Complete'];
  var rules = {
    isRecorded: function (wo) { return !!db.records[wo]; },
    isFinished: function (w) { return DONE.indexOf(w.status) >= 0; },
    // A technician can record work only after the PTW is closed in SAP (no-PTW jobs have no PTW to wait for).
    canRecord: function (w) {
      if (db.records[w.wo] || DONE.indexOf(w.status) >= 0) return false;
      if (!w.ptw) return w.status === 'Execution' || w.status === 'In Progress';
      return w.status === 'PTW Closed';
    },
    // My Jobs buckets: a job stays "Open" until the technician records the work.
    bucket: function (w) { return (db.records[w.wo] || DONE.indexOf(w.status) >= 0) ? 'Completed' : 'Open'; }
  };

  /* Data saved by an earlier version of the prototype: rebuild each manpower request's calculation so old entries open in the new screens. */
  (function migrate() {
    var changed = false, names = { 'N. G. Simpas': 'Neil Gregory A. Simpas', 'Superintendent': 'Carolino M. Luna', 'Lino': 'Carolino M. Luna' };
    window.SAP.users.accounts.forEach(function (a) { var k = techKey(a.name); if (!names[k]) names[k] = a.name; });
    function fix(o, k) { if (o && o[k] && names[o[k]]) { o[k] = names[o[k]]; changed = true; } }
    db.manpower.forEach(function (r) { ['by', 'decidedBy', 'sentBy', 'incharge'].forEach(function (k) { fix(r, k); }); (r.edits || []).forEach(function (e) { fix(e, 'by'); }); });
    (db.budgetLog || []).forEach(function (e) { fix(e, 'by'); });
    if (db.role === 'bppms') { db.role = 'supervisor'; changed = true; }   // the BPPMS requester screen was removed
    db.manpower.forEach(function (r) {
      ['by', 'decidedBy', 'sentBy'].forEach(function (k) { if (r[k] === 'Lino') { r[k] = 'Superintendent'; changed = true; } });   // earlier build used a personal name
      (r.edits || []).forEach(function (e) { if (e.by === 'Lino') { e.by = 'Superintendent'; changed = true; } });
      try {
        if (!r.qty) r.qty = {};
        if (!r.timeStart && r.time) r.timeStart = r.time;            // very first version used a single reporting time
        if (!r.timeEnd) r.timeEnd = '17:00';
        if (!r.calc || !r.calc.monthly || !r.calc.kind || !r.calc.autoDayRates) { r.calc = calcManpower(r); changed = true; }
      } catch (e) { r.calc = { monthly: {}, lines: [], headcount: 0, total: 0, kind: '', otHours: 0, otDates: [], noNS: [] }; changed = true; }
    });
    if (changed) save();
  })();

  return {
    today: function () { return window.SAP.today; },
    users: function () { return window.SAP.users; },
    workOrders: workOrders, workOrder: workOrder, notifications: notifications, notification: notification,
    workOrderHistory: workOrderHistory, notifHistory: notifHistory,
    purchaseRequestItems: purchaseRequestItems, purchaseRequest: purchaseRequest, purchaseOrderItems: purchaseOrderItems, purchaseOrder: purchaseOrder,
    materials: materials, materialsAsOf: materialsAsOf, sections: sections,
    role: role, setRole: setRole, accounts: accounts, account: account, setAccount: setAccount, inScope: inScope, canApprove: canApprove, techKey: techKey, inchargeChoices: inchargeChoices, visibleRequests: visibleRequests,
    technicianOf: technicianOf, assignmentOf: assignmentOf, assign: assign,
    notifTechnician: notifTechnician, notifAssignmentOf: notifAssignmentOf, assignNotif: assignNotif,
    remarks: remarks, addRemark: addRemark, record: record, saveRecord: saveRecord,
    manpowerPositions: function () { return MP_POS.map(function (p) { return { pos: p[0] }; }); },
    manpowerStd: MP_STD, manpowerNormalHours: MP_NORMAL_HOURS,
    bppmsTo: bppmsTo, setBppmsTo: setBppmsTo, emailSignoff: emailSignoff, manpowerNotices: manpowerNotices, emailOf: emailOf, ccFor: ccFor, reload: reload, approvalAlerts: approvalAlerts, markAlertSeen: markAlertSeen, planningAlerts: planningAlerts, markPlanningSeen: markPlanningSeen, inchargeNotices: inchargeNotices, markInchargeSeen: markInchargeSeen, prApprovals: prApprovals, addPrApproval: addPrApproval, editPrApproval: editPrApproval, convertToPr: convertToPr, praSeen: praSeen, markPraSeen: markPraSeen, prItemExists: prItemExists, requestPrConversion: requestPrConversion, decidePrApproval: decidePrApproval, markNoticesSeen: markNoticesSeen, markNoticeSeen: markNoticeSeen, setEmailDraft: setEmailDraft, setEmailSignoff: setEmailSignoff, decideManpower: decideManpower, updateManpower: updateManpower, sendToBppms: sendToBppms, budgetOf: budgetOf, requestSections: requestSections, addBudget: addBudget, budgetLog: budgetLog, people: people, manpowerFor: manpowerFor, budgetKey: budgetKey, budgetGroups: budgetGroups, budgetLabel: budgetLabel, budgetSet: budgetSet, setBudget: setBudget, committed: committed, budgetYears: budgetYears,
    calcManpower: calcManpower, classifyTime: classifyTime, manpowerRequests: manpowerRequests, submitManpower: submitManpower, mpDays: mpDays, holidayOf: holiday, mpIsNight: isNightStart,
    simulateSap: simulateSap, reset: reset, rules: rules
  };
})();
