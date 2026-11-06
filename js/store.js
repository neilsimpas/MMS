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
      sapOverrides: {}          // demo only: lets you simulate an SAP event such as "PTW closed"
    };
  }

  var db = load();

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
  function role() { return db.role; }
  function setRole(r) { db.role = r; save(); }
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

  return {
    today: function () { return window.SAP.today; },
    users: function () { return window.SAP.users; },
    workOrders: workOrders, workOrder: workOrder, notifications: notifications, notification: notification,
    workOrderHistory: workOrderHistory, notifHistory: notifHistory,
    purchaseRequestItems: purchaseRequestItems, purchaseRequest: purchaseRequest, purchaseOrderItems: purchaseOrderItems, purchaseOrder: purchaseOrder,
    materials: materials, materialsAsOf: materialsAsOf, sections: sections,
    role: role, setRole: setRole,
    technicianOf: technicianOf, assignmentOf: assignmentOf, assign: assign,
    notifTechnician: notifTechnician, notifAssignmentOf: notifAssignmentOf, assignNotif: assignNotif,
    remarks: remarks, addRemark: addRemark, record: record, saveRecord: saveRecord,
    simulateSap: simulateSap, reset: reset, rules: rules
  };
})();
