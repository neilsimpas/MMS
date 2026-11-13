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
    - Manpower Request (BPPMS): the supervisor chooses the Section, links an open work order (fills Activity and
      Work order no.) or types them, then Priority, Scope of works, start/end dates and Time start / Time end
      (default 7:30 AM - 5:00 PM). The app works out the hours type from the times alone:
        7:30 AM - 5:00 PM          = normal hours (day rate)
        any hour outside that band = overtime (for example 5:00 PM - 7:00 PM is overtime only, no day rate)
        start at 7:00 PM or later  = night shift (N/S rates; only hours after 7:30 AM next morning are overtime)
      Positions are added one by one: search/pick a position, set the quantity, press Add.
      Total plan cost is calculated live from the BPPMS rate sheet (js/store.js, MP_POS); rates are not shown per
      person. The request is sent to the Superintendent ("Pending approval"). The form also shows the section's
      budget for each month the request touches and for the year.
    - Section Budget: each section sets a monthly budget (requested maintenance and others) for the year.
      Remaining = budget - approved - pending manpower requests (rejected ones do not count). Months add up
      to the year; all sections are summarised. Starting amounts are SAMPLE values (js/store.js, BUDGET_SAMPLE).
    - Superintendent (account level, no personal name; choose "Superintendent" in Viewing as): sees the same menu as the Supervisor
      (including making Manpower Requests, which are approved on submission) plus Manpower Approvals, which only he
      has. There he can Approve, Reject (remarks required) or "Edit before approving" to change the positions,
      quantities, dates and times (plan cost and budget update live). The original request is kept.
      After approval an "Email to BPPMS" panel appears: To (BPPMS Gmail address(es), remembered), Subject and
      Message with the activity, start date, end date, time and manpower only (no cost, work order or scope).
      "Open in Outlook" (mailto) and "Open in Outlook on the web" open a ready draft in his Outlook; he presses Send
      there, then "I sent the email to BPPMS" sets the status to Sent to BPPMS. The prototype cannot send email by
      itself (IT can automate this later, for example with Microsoft Graph).
      Status flow: Pending approval -> Approved -> Sent to BPPMS (or Rejected).
      A request's cost is spread over its calendar months: regular pay evenly over the request dates,
      overtime on its own dates.
      RULES: a Time start of 7:00 PM or later uses the N/S rates (Supervisor, Team Leader, Safety Officer have
      no N/S rate on the sheet, so their day rate is used). Overtime pay = day rate / 8 x premium per date:
      ordinary 125%, Sunday or special non-working day 130%, regular holiday 200% (js/store.js, MP_MULT).
      ASSUMPTIONS to confirm with the BPPMS contract: 8 paid hours per normal day (9.5-hour band, part days are
      paid in proportion), a night shift is paid as one full N/S day, overtime after midnight uses the premium of
      the start date, and the premiums above. Sunday/holiday premiums are applied to overtime hours only.
      HOLIDAYS: fixed-date holidays, Holy Week and National Heroes Day are built in. Holidays proclaimed each
      year (Eid'l Fitr, Eid'l Adha, Chinese New Year, extra special days) must be added to MP_HOLIDAYS_EXTRA
      from the official Presidential Proclamation.
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

EMAIL TO BPPMS (updated)
- After approval the email is auto-filled in the BPPMS request layout: DESCRIPTION OF REQUEST (shift, "N - Pax <position> (name)", total pax), JUSTIFICATION FOR REQUEST (activity, scope, areas note, dates/times, OVERTIME window, Holiday/Sunday note), PRIORITY LEVEL, start/finish date and time (24h, e.g. 2000H), MPC In-Charge, Regards.
- Subject: "Request for <activity> Services (<request no.>)". No cost is shown.
- "Open in Outlook" fills plain text; "Copy formatted email" copies the table layout for pasting into Outlook.
- Hours rules: a normal day is 9 hours (07:30-17:00 normal); time outside it is overtime; a start at/after 19:00 is night shift, overtime after 9 hours.
- Future Outlook automation: call D.sendToBppms(id, by, ref) to mark a request as Sent to BPPMS.

EMAIL EDITING / IN-CHARGE
- The request form has a required "MPC in-charge / person in charge" field; it appears in the BPPMS email. The Superintendent can change it under "Edit before approving".
- After approval the Superintendent can edit the email subject and message before sending. Edits are saved with the request; "Reset to auto-filled" restores the generated email.

LATEST CHANGES
- Request form no longer has name/remarks, area note or in-charge fields.
- MPC In-Charge is left blank in the email (the approver can type it into the editable email, or in "Edit before approving").
- "Regards," uses the approver's name (default: the Superintendent account; the approver can type his name once and it is remembered).
- The email draft is visible and editable on pending requests too; it can be sent only after approval.
- The requester (Supervisor) is notified of approvals/rejections: badge on "Manpower Request" and an "Updates on your requests" panel with remarks; "Mark as read" clears it.

BUDGET / IN-CHARGE UPDATE
- "MPC organic in-charge" is a required field on the request form; it is shown in the approval and in the email ("MPC In-Charge: ...").
- The top of the request form shows the section's annual budget, approved, pending and remaining, plus this month's available amount.
- The Section Budget tab is now for the Superintendent only (he sets the budget per month). Supervisors only see the budget summary on the request form.
- Carry-over: unused budget of a month (set amount + earlier carry - approved - pending) is added to the next month of the same year. It does not carry from one year into the next. An overspent month carries 0 (the deficit is not carried).
- Sample budgets now start in the current month, so no sample amount is carried over from past months. Use "Reset demo data" to apply this to saved data.

MECHANICAL BUDGET / APPROVER VIEW UPDATE
- MECH-BLR, MECH-STG and MECH-CHP share ONE "Mechanical" budget (ELEC and C&I keep their own). Older saved budgets of the three sections are added together automatically.
- The top of the request form shows the monthly budget (month of the start date): budget available, approved, pending, remaining.
- Manpower Approvals: each pending request opens directly in an editor (dates, times, positions, quantities, in-charge) with live cost and budget check, and the email to BPPMS is shown below, updating as the Superintendent changes things. The email can also be edited by hand. Approve keeps the changes and the edited email; Send only becomes available after approval.

SUNDAY/HOLIDAY, MONTH SPLIT, IN-CHARGE, ADD BUDGET
- Sundays and known holidays inside the request dates are flagged on the form; one button "Apply Sunday / holiday rates" pays the normal hours and overtime of those dates at 130% (Sunday / special day) or 200% (regular holiday). A date that is not in the built-in list can be marked by hand under "Mark another date as a holiday". The Superintendent has the same button when reviewing.
- Cost is charged per date: days in October use the October budget, days in November the November budget (for example Oct 25 to Nov 5). The top of the form shows one set of monthly figures per month the request touches.
- MPC organic in-charge is chosen from the user accounts (technicians/mechanics, supervisor, superintendent). The request appears under "Manpower requests assigned to you" on that person's screen (My Jobs for technicians, Manpower Request for the supervisor/superintendent). Cost is not shown there.
- Section Budget (Superintendent): "Add budget for a month" adds an allotment on top of a month's budget and keeps a history; monthly amounts can still be typed directly.

AUTOMATIC SUNDAY/HOLIDAY RATES, APPROVER BUDGET, EMAIL TABLE
- No button any more: Sundays (130%), special non-working days (130%) and regular holidays (200%) from the Philippine holiday calendar are charged automatically on the normal hours and the overtime of that date. Dates of a proclaimed holiday that is not in the built-in calendar can be marked under the schedule section.
- Saved requests are recalculated once with this rule when the app opens.
- Superintendent review shows, for every month the request touches: allotted budget, approved (used), other pending, this request, left after this request, and the actual amount left of the allotted budget now.
- The email (text and table) now includes WORK ORDER NUMBER, ACTIVITY DESCRIPTION and SCOPE OF WORKS.

SUPERINTENDENT BUDGET VIEW
- The Section Budget tab is gone. The top of Manpower Approvals shows ONLY the Mechanical budget (MECH-BLR, MECH-STG, MECH-CHP): monthly budget, approved, pending, actual left, with a month selector and a "Set or add the monthly budget" section.
- The request form offers only MECH-BLR, MECH-STG and MECH-CHP.
- The email draft is no longer shown while a request is pending; after approval the email (table + editable text) appears.
- Sunday / holiday rates are automatic (no button). index.html now loads the scripts with a version tag so an old cached copy is not used.

ACCOUNTS AND SECTION VISIBILITY
- "Viewing as" now lists the 47 MPC accounts (name, position, section) from js/sap-data.js (users.accounts). Replace/extend that list with the real user list when the system goes live.
- Each account only sees its own section: manpower requests of its section, the in-charge list of its section, the budget of its section (Mechanical = MECH-BLR + MECH-STG + MECH-CHP, Electrical = ELEC, C&I = C&I). A person also sees requests where he is the requester or the in-charge.
- Planning Section (all) and the Maintenance Manager see every section. Planning Superintendent and the Maintenance Manager can also approve every section; other Planning staff can request and view only.
- Approvers: the Superintendent of each section (C&I, Electrical, Mechanical), plus Planning Superintendent and the Maintenance Manager (all sections). Supervisors create requests; technicians/mechanics/electricians see the requests where they are the MPC organic in-charge.
- The Secretary (MTD Department) has no section and is treated like a technician-level user (sees only requests assigned to her).
- Old saved requests are converted to the real names (for example N. G. Simpas -> Neil Gregory A. Simpas, Superintendent -> Carolino M. Luna).
- The "Regards," name in the email is the approving account's name (can be changed per account).

Automatic approve-and-send email
- The approval card shows the email to BPPMS directly as a table: "Dear sirs/Ma'am, Good day, kindly accommodate below service request." then the request table, MPC In-Charge and Regards (no cost).
- "Approve and send email to BPPMS" approves with the approver's changes, opens the Outlook draft, copies the formatted table (paste with Ctrl+V) and sets the status to Sent to BPPMS.
- The requester and the MPC organic in-charge (My Jobs, with a badge) get a notice that the request is approved and already emailed.
- The prototype cannot detect that Outlook really sent the message; the status changes on the send button. Real automatic update needs an Outlook integration calling D.sendToBppms(id, by, ref).

Update: the approval card no longer shows the email body. One click on "Approve and send to BPPMS" approves, opens the Outlook email, sets Sent to BPPMS and notifies requester and in-charge. The sent email can be viewed afterwards under "View the email that was sent to BPPMS".

Going live (requirement from Jomari)
- The "Viewing as" list is a prototype switcher. In production the signed-in user must come from SAP, with the actual name, position/designation and section as held in SAP (user master / HR org structure).
- All account data is read from one place, window.SAP.users.accounts (name, position, section). Replace that source with the SAP feed; approver scope, section visibility, in-charge choices and the Regards name follow from it.
- Remove the switcher and the sample accounts at go-live. Approver and in-charge rights must be taken from the SAP position, not typed in.

Approvals list and alerts
- Manpower Approvals shows a list (request, activity, section, requested by, dates, positions, priority, status). Click a row or Review to open that request; Approve and send, Reject and the adjust editor are on the opened request. "Back to the list" returns.
- New requests: the approver (by position and section) sees a banner on every page, a badge on Manpower Approvals and a "New" tag in the list until the request is opened. Planning Section accounts are told about every new request and every approval, email sent or rejection. Requester and in-charge notices are unchanged.
- "Turn on desktop alerts" asks the browser for permission and then shows a pop-up on the PC. Windows or tabs of the same browser update each other. Different PCs or browsers cannot share data in this offline prototype; that needs the shared database and server at go-live.

Approver budget view: three blocks per month - 1. Remaining budget before approval, 2. New total plan cost, 3. REMAINING BUDGET AFTER APPROVAL (green, or red when over budget). Other pending requests are noted below.

Outlook view and CC
- After "Approve and send to BPPMS" an Outlook-style Sent Items window shows From, To, Cc, Subject and the email table. Real sending needs the Outlook connection at go-live.
- Cc = requester, MPC organic in-charge and approver. Add email: "name@company.com" to each account in window.SAP.users.accounts (js/sap-data.js) at go-live; those addresses then go on Cc automatically (also in the Open in my Outlook link).
