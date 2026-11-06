MMS - Work Orders & Notifications (working prototype, no database)
=====================================================================

HOW TO OPEN
  Double-click index.html. No server, no install, no internet needed
  (the IBM Plex fonts load from Google if online, otherwise a normal font is used).
  Use Chrome or Edge.

WHAT WORKS
  Supervisor (N. G. Simpas)
    - Dashboard with two pie charts and a Month filter:
        Work Order time confirmation rate (work orders with work done: time confirmed vs awaiting)
        Notification completion / conversion rate (completed, converted to work order, not yet converted)
    - Work Orders list with filters and summary cards
    - Work Order detail: progress, details, recent activities for the KKS,
      assign / reassign technician, read-only "Record work done" from the technician
    - Notifications list with Status and Month filters
    - Purchase Requests list (filters: with/without PO, section, search) and PR detail
    - Purchase Orders list (delivery status, section, search) and PO detail with goods receipts
    - Material Master (stock filter, search, Show more)
      All purchasing and material data is read-only SAP data; the app only displays it.
    - Notification details: assign / reassign technician for assessment,
      Assessment remarks, notification history for the KKS
  Technician (R. Valledor)
    - My Jobs with Open / Assessment / Completed / All
    - Job detail with "Record work done" pop-up
      (unlocked only after the PTW is closed in SAP; no-PTW jobs unlocked during Execution)
    - Notification view with Assessment remarks
  Use "Viewing as" (bottom left) to switch between the two roles.
  "Demo: SAP moves this to ..." buttons simulate SAP changing a status
  (for example PTW Issued -> PTW Closed) so you can test the whole flow.
  "Reset demo data" puts everything back to the starting data.

  Not in this version: MIR, PR approval, mobile screens, picture upload.

FILES
  index.html        page that loads everything
  css/app.css       styles
  js/sap-data.js    SAMPLE SAP DATA  (read-only)      <- IT replaces this
  js/store.js       DATA LAYER: the only file that reads/saves data   <- IT connects here
  js/ui.js          the screens (no data access of its own)

TWO KINDS OF DATA
  1. SAP data (read-only): work orders, notifications, purchase requests, purchase orders,
     goods receipts, material master, statuses, PTW dates, priority, KKS.
     Today: js/sap-data.js. The app never writes to SAP.
     To connect SAP: change workOrders(), notifications() (and the small helpers around
     them) in js/store.js to return the same fields from an SAP API or export.
  2. MMS-only data (saved by the app): technician assignments, assessment remarks,
     "Record work done" entries.
     Today: saved in the browser (localStorage), so it is NOT shared between people or PCs.
     To use a database: replace load() and save() at the top of js/store.js, or call
     your server from assign(), addRemark(), saveRecord() etc.

BUSINESS RULES (js/store.js, "rules")
  - A technician can record work only after the PTW is closed in SAP (PTW jobs).
  - A job stays in "Open" in My Jobs until the work is recorded; then it shows under "Completed".
  - Assigning a technician to a notification does not change its SAP status.
