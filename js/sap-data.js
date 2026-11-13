/* ============================================================================
   SAP DATA (READ-ONLY)  -  SAMPLE DATA FOR THE PROTOTYPE
   ----------------------------------------------------------------------------
   Everything in this file stands in for data that lives in SAP.
   The app only READS it. It never writes back to SAP.

   FOR IT: replace this file (or the functions in js/store.js that read it) with
   a real source: SAP OData/API calls, or a scheduled export. The screens do not
   need to change as long as the same fields are provided.

   Dates are "YYYY-MM-DD" or "YYYY-MM-DD HH:MM". "today" is fixed for the demo.
   ============================================================================ */
window.SAP = {
  today: '2026-10-14',

  /* People. In the real system these come from your user list / SAP user IDs. */
  users: {
    supervisors: [{ id: 'NGSIMPAS', name: 'N. G. Simpas', title: 'Mechanical Supervisor', section: 'MECH-BLR' }],
    superintendents: [{ id: 'SUPT', name: 'Superintendent', title: 'Superintendent' }],   // approves manpower requests (replace with the real name / SAP user)
    technicians: ['R. Valledor', 'A. Tormis', 'R. Sajulga', 'R. Bual'],
    operations: ['EOTAZA', 'MPARILLA', 'PMACASO', 'EANACIO'],
    /* MPC accounts (name, position, section). Each person only sees their own section; Planning Section and the Maintenance Manager see all sections. */
    accounts: [{"name": "Aldrin L. Macabuhay","position": "C&I Technician","section": "C&I Section"},{"name": "Arturo D. Ubalde Jr.","position": "Contracts Administrator","section": "C&I Section"},{"name": "Berenice Dophnie C. Ruiz","position": "C&I Technician","section": "C&I Section"},{"name": "Charles A. Fajardo","position": "Sr. C&I Technician","section": "C&I Section"},{"name": "Clark Odnil U. Yap Jr.","position": "C&I Technician","section": "C&I Section"},{"name": "Ian Christian M. Tadlas","position": "Sr. C&I Technician","section": "C&I Section"},{"name": "Kent Roger Abrea","position": "C&I Supervisor","section": "C&I Section"},{"name": "Louis Paolo C. Tibon","position": "C&I Technician","section": "C&I Section"},{"name": "Randy D. Pescadero","position": "C&I Technician","section": "C&I Section"},{"name": "Virgilio C. Luardo","position": "C&I Superintendent","section": "C&I Section"},{"name": "Anecito Q. Cabactulan Jr.","position": "Electrician","section": "Electrical Section"},{"name": "Edwin Victor O. Varquez","position": "Electrical Supervisor","section": "Electrical Section"},{"name": "Emmanuel S. Sombilon","position": "Electrician","section": "Electrical Section"},{"name": "Hurly Dave B. Rodriguez","position": "Electrical Supervisor","section": "Electrical Section"},{"name": "Joe Ysmael U. Tagam","position": "Electrician","section": "Electrical Section"},{"name": "Marvin M. Suse","position": "Sr. Electrician","section": "Electrical Section"},{"name": "Ramil L. Jalop","position": "Electrician","section": "Electrical Section"},{"name": "Rey Mark A. Andoy","position": "Electrician","section": "Electrical Section"},{"name": "Roy G. Labis","position": "Electrical Superintendent","section": "Electrical Section"},{"name": "Abraham B. Tormis","position": "Mechanic","section": "Mechanical Section"},{"name": "Alex G. Veimen","position": "Mechanical Supervisor","section": "Mechanical Section"},{"name": "Arnel R. Ayon","position": "Mechanic","section": "Mechanical Section"},{"name": "Carolino M. Luna","position": "Mechanical Superintendent","section": "Mechanical Section"},{"name": "Clengie T. Ybañez","position": "Mechanic","section": "Mechanical Section"},{"name": "Elgin B. Montaño","position": "Machinist","section": "Mechanical Section"},{"name": "Gabriel T. Ipanag","position": "Mechanical Supervisor","section": "Mechanical Section"},{"name": "Gibson L. Cabunoc","position": "Sr. Mechanic","section": "Mechanical Section"},{"name": "Grego Ramon A. Lucagbo","position": "Mechanic","section": "Mechanical Section"},{"name": "Jake G. Delfin","position": "Mechanic","section": "Mechanical Section"},{"name": "James Ryan M. Pasayon","position": "Mechanic","section": "Mechanical Section"},{"name": "Jessie S. Roa","position": "Mechanic","section": "Mechanical Section"},{"name": "Jonel L. Dapat","position": "Mechanic","section": "Mechanical Section"},{"name": "Junil P. Liagas","position": "Mechanic","section": "Mechanical Section"},{"name": "Mark E. Pacquiao","position": "Welder","section": "Mechanical Section"},{"name": "Marlon D. Custodio","position": "CHP Supervisor","section": "Mechanical Section"},{"name": "Rey J. Bual","position": "Mechanic","section": "Mechanical Section"},{"name": "Rito M. Valledor","position": "Sr. Mechanic","section": "Mechanical Section"},{"name": "Roger L. Sajulga","position": "Mechanic","section": "Mechanical Section"},{"name": "Ronnel A. Flores","position": "Mechanic","section": "Mechanical Section"},{"name": "Sulpecio V. Carmona Jr.","position": "Welder","section": "Mechanical Section"},{"name": "Val Dave A. Madarieta","position": "Mechanic","section": "Mechanical Section"},{"name": "Jess Eddie Q. Madera","position": "Maintenance Planner","section": "Planning Section"},{"name": "Mary Grace F. Hinampas","position": "Maintenance Planner","section": "Planning Section"},{"name": "Naoichi R. Yamada","position": "Planning Superintendent","section": "Planning Section"},{"name": "Neil Gregory A. Simpas","position": "Mechanic","section": "Planning Section"},{"name": "Princess Charmaine P. Mazo","position": "Secretary","section": "MTD Department"},{"name": "Romel M. Arnaldo","position": "Maintenance Manager","section": "MTD Department"}]
  },

  /* Work orders. status = the SAP status shown in the app.
     ptw = false means a work order that needs no permit to work.            */
  workOrders: [
    { wo: '8000001633', notif: '10002770', title: 'U3 ID fan B high vibration DE bearing', kks: '30HNA20AN001', equipment: 'ID fan B', unit: 'Unit 3', priority: 1, status: 'In Progress', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-10-14', dates: { notification: '2026-10-13 23:55', released: '2026-10-14 06:40', ptwIssued: '2026-10-14 08:10' }, ptwIssuedBy: 'EOTAZA' },
    { wo: '8000001618', notif: '10002742', title: 'U1 BFP B suction local Pressure Gauge st', kks: '10GBN60AP002', equipment: 'BFP B suction local pressure gauge', unit: 'Unit 1', priority: 2, status: 'PTW Issued', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-10-14', dates: { notification: '2026-10-13 22:40', released: '2026-10-14 07:05', ptwIssued: '2026-10-14 13:05' }, ptwIssuedBy: 'EOTAZA', ptwNo: '[PTW NO.]' },
    { wo: '8000001594', notif: '10002709', title: 'U3 loop seal aeration valve stuck open', kks: '30HBK30AA012', equipment: 'Loop seal aeration valve', unit: 'Unit 3', priority: 3, status: 'PTW In-process', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-10-12', dates: { notification: '2026-10-07 15:20', released: '2026-10-08 08:00' } },
    { wo: '8000001636', notif: '10002772', title: 'U1 FD fan B damper actuator calibration', kks: '10HLB10AN001', equipment: 'FD fan B damper actuator', unit: 'Unit 1', priority: 2, status: 'Released / Cleared', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-10-15', dates: { notification: '2026-10-14 01:30', released: '2026-10-14 07:30' } },
    { wo: '8000001626', notif: '10002761', title: 'U1 PA fan B inlet damper actuator stiff', kks: '10HLB20AA001', equipment: 'PA fan B inlet damper', unit: 'Unit 1', priority: 3, status: 'PTW Closed', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-10-15', dates: { notification: '2026-10-11 09:00', released: '2026-10-12 08:15', ptwIssued: '2026-10-14 07:50', ptwClosed: '2026-10-14 12:40' }, ptwIssuedBy: 'MPARILLA' },
    { wo: '8000001615', notif: '10002748', title: 'U2 coal feeder 3 belt tension low', kks: '20HFB30AF001', equipment: 'Coal feeder 3', unit: 'Unit 2', priority: 3, status: 'Released / Cleared', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-10-13', dates: { notification: '2026-10-08 10:10', released: '2026-10-09 08:00' } },
    { wo: '8000001630', notif: '10002766', title: 'U2 bed ash cooler drive chain adjust', kks: '20HDA10AF001', equipment: 'Bed ash cooler drive', unit: 'Unit 2', priority: 3, status: 'Released / Cleared', orderType: 'Preventive Maintenance', maintType: 'Preventive', ptw: true, due: '2026-10-16', dates: { notification: '2026-10-12 16:00', released: '2026-10-13 08:20' } },
    { wo: '8000001645', notif: '10002780', title: 'U1 coal feeder 2 spare pulley re-lagging', kks: '10HFB20AF001', equipment: 'Spare drive pulley', unit: 'Unit 1', priority: 3, status: 'Execution', orderType: 'Predictive Maintenance', maintType: 'Preventive', ptw: false, due: '2026-10-15', dates: { notification: '2026-10-12 09:10', released: '2026-10-13 08:30', execution: '2026-10-14 07:30' } },
    { wo: '8000001639', notif: '10002775', title: 'U2 loop seal blower B abnormal noise', kks: '20HBK40AN002', equipment: 'Loop seal blower B', unit: 'Unit 2', priority: 5, status: 'Created', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-10-17', dates: { notification: '2026-10-14 08:05' } },
    { wo: '8000001572', notif: '10002688', title: 'U1 ID fan A coupling inspection', kks: '10HNA10AN001', equipment: 'ID fan A', unit: 'Unit 1', priority: 2, status: 'Time Confirmed', orderType: 'Predictive Maintenance', maintType: 'Predictive/CM', ptw: true, due: '2026-10-11', dates: { notification: '2026-10-05 11:00', released: '2026-10-06 08:00', ptwIssued: '2026-10-09 08:00', ptwClosed: '2026-10-09 15:00', confirmed: '2026-10-10 09:00' }, ptwIssuedBy: 'PMACASO' },
    { wo: '8000001560', notif: '10002671', title: 'U1 FD fan A lube oil cooler leak', kks: '10HLB10AN002', equipment: 'FD fan A lube oil cooler', unit: 'Unit 1', priority: 3, status: 'Technically Complete', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-10-10', dates: { notification: '2026-10-03 10:00', released: '2026-10-04 08:00', ptwIssued: '2026-10-07 08:00', ptwClosed: '2026-10-07 14:00', confirmed: '2026-10-08 09:00' }, ptwIssuedBy: 'EANACIO' },

    /* Older work orders (historyOnly). They only feed the "Recent Activities" list for a KKS and are not listed in the Work Orders list. */
    { wo: '8000001544', historyOnly: true, notif: '', title: 'BFP B suction pressure gauge calibrated', kks: '10GBN60AP002', equipment: 'BFP B suction local pressure gauge', unit: 'Unit 1', priority: 3, status: 'Technically Complete', orderType: 'Preventive Maintenance', maintType: 'Preventive', ptw: true, due: '2026-09-22', dates: { released: '2026-09-18 08:00', confirmed: '2026-09-22 10:30' } },
    { wo: '8000001478', historyOnly: true, notif: '', title: 'BFP B suction line leak repaired', kks: '10GBN60AP002', equipment: 'BFP B suction line', unit: 'Unit 1', priority: 2, status: 'Technically Complete', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-08-30', dates: { released: '2026-08-27 08:00', confirmed: '2026-08-30 14:10' } },
    { wo: '8000001402', historyOnly: true, notif: '', title: 'BFP B vibration check, normal', kks: '10GBN60AP002', equipment: 'BFP B', unit: 'Unit 1', priority: 3, status: 'Technically Complete', orderType: 'Predictive Maintenance', maintType: 'Predictive/CM', ptw: false, due: '2026-08-05', dates: { released: '2026-08-04 08:00', confirmed: '2026-08-05 08:50' } },
    { wo: '8000001331', historyOnly: true, notif: '', title: 'BFP B suction strainer cleaned', kks: '10GBN60AP002', equipment: 'BFP B suction strainer', unit: 'Unit 1', priority: 3, status: 'Technically Complete', orderType: 'Preventive Maintenance', maintType: 'Preventive', ptw: true, due: '2026-07-14', dates: { released: '2026-07-10 08:00', confirmed: '2026-07-14 09:20' } },
    { wo: '8000001502', historyOnly: true, notif: '', title: 'Spare drive pulley removed and returned to stores', kks: '10HFB20AF001', equipment: 'Spare drive pulley', unit: 'Unit 1', priority: 3, status: 'Technically Complete', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-09-28', dates: { released: '2026-09-25 08:00', confirmed: '2026-09-28 14:20' } },
    { wo: '8000001387', historyOnly: true, notif: '', title: 'Preventive maintenance completed on coal feeder 2 drive', kks: '10HFB20AF001', equipment: 'Coal feeder 2 drive', unit: 'Unit 1', priority: 3, status: 'Technically Complete', orderType: 'Preventive Maintenance', maintType: 'Preventive', ptw: true, due: '2026-09-02', dates: { released: '2026-08-30 08:00', confirmed: '2026-09-02 08:00' } },
    { wo: '8000001356', historyOnly: true, notif: '', title: 'Gravimetric feeder 2 belt replaced', kks: '10HFB20AF001', equipment: 'Feeder 2 belt', unit: 'Unit 1', priority: 2, status: 'Technically Complete', orderType: 'Corrective Maintenance', maintType: 'Corrective', ptw: true, due: '2026-08-12', dates: { released: '2026-08-09 08:00', confirmed: '2026-08-12 13:40' } },
    { wo: '8000001310', historyOnly: true, notif: '', title: 'Feeder 2 drive gearbox oil change', kks: '10HFB20AF001', equipment: 'Feeder 2 gearbox', unit: 'Unit 1', priority: 3, status: 'Technically Complete', orderType: 'Preventive Maintenance', maintType: 'Preventive', ptw: true, due: '2026-07-30', dates: { released: '2026-07-27 08:00', confirmed: '2026-07-30 09:15' } }
  ],

  /* Notifications. status: Outstanding | In process | Order assigned | Completed | Deleted */
  notifications: [
    { n: '10002783', title: 'U2 PA fan A NDE bearing temperature high', kks: '20HLB30AN001', equipment: 'PA fan A', unit: 'Unit 2', by: 'EOTAZA', when: '2026-10-14 10:15', priority: 2, status: 'Outstanding', wo: '', longText: '14.10.2026 10:15:22 EOTAZA\nPA fan A NDE bearing temperature rising, now 82 C and\nstill increasing. Vibration normal. Unit load unchanged.\nPlease assess.' },
    { n: '10002781', title: 'U2 PA fan B outlet damper position deviation', kks: '20HLB40AA001', equipment: 'PA fan B outlet damper', unit: 'Unit 2', by: 'PMACASO', when: '2026-10-14 09:40', priority: 3, status: 'Outstanding', wo: '', longText: '14.10.2026 09:40:10 PMACASO\nDamper feedback deviates from demand by about 15 percent.' },
    { n: '10002779', title: 'U1 primary air heater inlet temp sensor drifting', kks: '10HLB30CT001', equipment: 'PAH inlet temp sensor', unit: 'Unit 1', by: 'MPARILLA', when: '2026-10-13 18:20', priority: 3, status: 'In process', wo: '', longText: '13.10.2026 18:20:05 MPARILLA\nTemperature reading drifts compared with the redundant sensor.' },
    { n: '10002780', title: 'U1 coal feeder 2 spare pulley re-lagging', kks: '10HFB20AF001', equipment: 'Spare drive pulley', unit: 'Unit 1', by: 'EANACIO', when: '2026-10-12 09:10', priority: 3, status: 'Order assigned', wo: '8000001645', longText: '12.10.2026 09:10:44 EANACIO\nSpare drive pulley lagging worn. Re-lag before next change-over.' },
    { n: '10002775', title: 'U2 loop seal blower B abnormal noise', kks: '20HBK40AN002', equipment: 'Loop seal blower B', unit: 'Unit 2', by: 'EOTAZA', when: '2026-10-14 08:05', priority: 5, status: 'Order assigned', wo: '8000001639', longText: '14.10.2026 08:05:31 EOTAZA\nAbnormal noise from blower B. Planned for the coming outage.' },
    { n: '10002772', title: 'U1 FD fan B damper actuator calibration', kks: '10HLB10AN001', equipment: 'FD fan B damper actuator', unit: 'Unit 1', by: 'PMACASO', when: '2026-10-14 01:30', priority: 2, status: 'Order assigned', wo: '8000001636', longText: '14.10.2026 01:30:12 PMACASO\nActuator response slow. Calibrate and check linkage.' },
    { n: '10002770', title: 'U3 ID fan B high vibration DE bearing', kks: '30HNA20AN001', equipment: 'ID fan B', unit: 'Unit 3', by: 'PMACASO', when: '2026-10-13 23:55', priority: 1, status: 'Order assigned', wo: '8000001633', longText: '13.10.2026 23:55:20 PMACASO\nVibration alarm on DE bearing, trending up.' },
    { n: '10002742', title: 'U1 BFP B suction local Pressure Gauge st', kks: '10GBN60AP002', equipment: 'BFP B suction local pressure gauge', unit: 'Unit 1', by: 'MPARILLA', when: '2026-10-13 22:40', priority: 2, status: 'Order assigned', wo: '8000001618', longText: '13.10.2026 22:40:12 MPARILLA\nBFP B suction local pressure gauge stuck, not moving\nwhile pump is in service. DCS suction pressure normal.\nRequest replacement of local gauge.' },
    { n: '10002768', title: 'U2 service water pump seal drip (duplicate)', kks: '20PAB10AP001', equipment: 'Service water pump', unit: 'Unit 2', by: 'MPARILLA', when: '2026-10-13 14:50', priority: 4, status: 'Deleted', wo: '', longText: '13.10.2026 14:50:09 MPARILLA\nDuplicate of an existing notification.' },
    { n: '10002390', title: 'U1 FD fan B damper actuator calibration', kks: '10HLB10AN001', equipment: 'FD fan B damper actuator', unit: 'Unit 1', by: 'EANACIO', when: '2026-09-24 09:30', priority: 3, status: 'Completed', wo: '', longText: '24.09.2026 09:30:00 EANACIO\nCalibration requested.' },
    { n: '10002342', title: 'U2 ID fan B inlet damper limit switch', kks: '20HNA20AA001', equipment: 'ID fan B inlet damper', unit: 'Unit 2', by: 'EANACIO', when: '2026-09-11 08:20', priority: 4, status: 'Outstanding', wo: '', longText: '11.09.2026 08:20:00 EANACIO\nLimit switch intermittent.' },

    /* Older notifications. They only feed the "Notification history" list for a KKS. */
    { n: '10002690', historyOnly: true, title: 'U2 PA fan A NDE bearing vibration alarm', kks: '20HLB30AN001', equipment: 'PA fan A', unit: 'Unit 2', by: 'EOTAZA', when: '2026-08-27 09:40', priority: 2, status: 'Completed', wo: '', longText: '' },
    { n: '10002544', historyOnly: true, title: 'U2 PA fan A lube oil level low', kks: '20HLB30AN001', equipment: 'PA fan A', unit: 'Unit 2', by: 'PMACASO', when: '2026-06-12 14:05', priority: 3, status: 'Completed', wo: '', longText: '' },
    { n: '10002311', historyOnly: true, title: 'U2 PA fan A coupling guard missing', kks: '20HLB30AN001', equipment: 'PA fan A', unit: 'Unit 2', by: 'MPARILLA', when: '2026-03-03 08:30', priority: 4, status: 'Completed', wo: '', longText: '' },
    { n: '10002280', historyOnly: true, title: 'U2 PA fan A inlet damper actuator stiff (duplicate)', kks: '20HLB30AN001', equipment: 'PA fan A', unit: 'Unit 2', by: 'EANACIO', when: '2026-02-18 11:20', priority: 4, status: 'Deleted', wo: '', longText: '' },
    { n: '10002588', historyOnly: true, title: 'U1 BFP B suction strainer differential pressure high', kks: '10GBN60AP002', equipment: 'BFP B suction local pressure gauge', unit: 'Unit 1', by: 'MPARILLA', when: '2026-08-14 10:20', priority: 3, status: 'Completed', wo: '', longText: '' },
    { n: '10002490', historyOnly: true, title: 'U1 BFP B seal leak at suction flange', kks: '10GBN60AP002', equipment: 'BFP B', unit: 'Unit 1', by: 'PMACASO', when: '2026-07-02 13:35', priority: 2, status: 'Completed', wo: '', longText: '' },
    { n: '10002301', historyOnly: true, title: 'U1 BFP B suction local pressure gauge replaced', kks: '10GBN60AP002', equipment: 'BFP B suction local pressure gauge', unit: 'Unit 1', by: 'EOTAZA', when: '2026-05-20 09:05', priority: 3, status: 'Completed', wo: '', longText: '' },
    { n: '10002190', historyOnly: true, title: 'U1 BFP B suction local pressure gauge (duplicate)', kks: '10GBN60AP002', equipment: 'BFP B suction local pressure gauge', unit: 'Unit 1', by: 'EANACIO', when: '2026-02-08 15:50', priority: 4, status: 'Deleted', wo: '', longText: '' }
  ]
};

/* ============================================================================
   PURCHASING + MATERIAL MASTER (READ-ONLY SAMPLE DATA)
   Same rule as above: this stands in for SAP. IT replaces it with real data.
   Dates are "YYYY-MM-DD". Prices are in PHP.
   ============================================================================ */
window.SAP.sections = ['MECH-BLR', 'MECH-STG', 'MECH-CHP', 'ELEC', 'C&I'];

/* Purchase requisition ITEMS (one row per PR item). po = purchase order number if one exists. */
window.SAP.purchaseRequests = [
  { date: '2026-10-14', pr: '1100045821', item: '00010', po: '', mat: '', text: 'Gauge isolation needle valve, 1/2"', longText: 'Isolation needle valve for the BFP B suction pressure gauge replacement.\n\n[SAMPLE LONG TEXT - replace with the SAP item text]', price: 3850, qty: 1, uom: 'PC', sec: 'MECH-BLR', deliv: '' },
  { date: '2026-10-13', pr: '1100045807', item: '00010', po: '5700001276', mat: '20341872', text: 'Bed ash cooler drive chain', price: 68500, qty: 1, uom: 'SET', sec: 'MECH-BLR', deliv: '2026-10-28' },
  { date: '2026-10-13', pr: '1100045807', item: '00020', po: '5700001276', mat: '20341873', text: 'Chain connecting link', price: 1250, qty: 4, uom: 'PC', sec: 'MECH-BLR', deliv: '2026-10-28' },
  { date: '2026-10-12', pr: '1100045790', item: '00010', po: '', mat: '20352210', text: 'Spherical roller bearing, ID fan DE', price: 96400, qty: 2, uom: 'PC', sec: 'MECH-BLR', deliv: '' },
  { date: '2026-10-12', pr: '1100045790', item: '00020', po: '', mat: '20352211', text: 'Labyrinth seal set, ID fan', price: 24800, qty: 2, uom: 'SET', sec: 'MECH-BLR', deliv: '' },
  { date: '2026-10-10', pr: '1100045764', item: '00010', po: '5700001198', mat: '', text: 'Rubber lagging sheet, 12 mm', price: 5200, qty: 3, uom: 'M2', sec: 'MECH-BLR', deliv: '2026-10-13' },
  { date: '2026-10-10', pr: '1100045764', item: '00020', po: '5700001198', mat: '', text: 'Lagging adhesive', price: 2150, qty: 2, uom: 'CAN', sec: 'MECH-BLR', deliv: '2026-10-13' },
  { date: '2026-10-08', pr: '1100045731', item: '00010', po: '5700001144', mat: '20338904', text: 'Gravimetric feeder belt, 36"', price: 142000, qty: 1, uom: 'PC', sec: 'MECH-BLR', deliv: '2026-10-12' },
  { date: '2026-10-14', pr: '1200045826', item: '00010', po: '', mat: '20361537', text: 'Turbine lube oil filter element', price: 18900, qty: 4, uom: 'PC', sec: 'MECH-STG', deliv: '' },
  { date: '2026-10-11', pr: '1200045778', item: '00010', po: '5700001230', mat: '20361790', text: 'Condenser vacuum pump mechanical seal', price: 55300, qty: 1, uom: 'SET', sec: 'MECH-STG', deliv: '2026-10-30' },
  { date: '2026-10-13', pr: '1300045812', item: '00010', po: '', mat: '', text: 'Conveyor belt splicing kit, 1200 mm', price: 47500, qty: 1, uom: 'SET', sec: 'MECH-CHP', deliv: '' },
  { date: '2026-10-09', pr: '1300045749', item: '00010', po: '5700001160', mat: '20370415', text: 'Crusher hammer, ring granulator', price: 12600, qty: 12, uom: 'PC', sec: 'MECH-CHP', deliv: '2026-10-18' },
  { date: '2026-10-12', pr: '1300045795', item: '00010', po: '', mat: '20370662', text: '6.6 kV vacuum circuit breaker trip coil', price: 38750, qty: 2, uom: 'PC', sec: 'ELEC', deliv: '' },
  { date: '2026-10-10', pr: '1200045770', item: '00010', po: '5700001205', mat: '', text: 'Pressure transmitter, 0-250 bar, HART', price: 64200, qty: 2, uom: 'PC', sec: 'C&I', deliv: '2026-10-20' }
];

/* Purchase requisition HEADER details. Missing fields are shown as a dash. */
window.SAP.prHeaders = {
  '1100045821': { requisitioner: 'R. Valledor', createdBy: 'N. G. Simpas', wo: '8000001618', release: 'Awaiting release', headerText: 'Isolation needle valve for the BFP B suction pressure gauge replacement. For WO 8000001618.' },
  '1100045807': { requisitioner: 'R. Valledor', createdBy: 'N. G. Simpas', wo: '8000001630', release: 'Released', headerText: 'Replacement drive chain and links for U2 bed ash cooler 1. Existing chain elongated beyond limit. For WO 8000001630.' },
  '1100045790': { requisitioner: 'R. Bual', createdBy: 'N. G. Simpas', wo: '', release: 'Released', headerText: 'Bearing and labyrinth seal set for ID fan DE, planned overhaul.' },
  '1100045764': { requisitioner: 'R. Valledor', createdBy: 'N. G. Simpas', wo: '8000001645', release: 'Released', headerText: 'Lagging sheet and adhesive for coal feeder 2 spare pulley re-lagging. For WO 8000001645.' },
  '1100045731': { requisitioner: 'R. Sajulga', createdBy: 'N. G. Simpas', wo: '8000001615', release: 'Released', headerText: 'Gravimetric feeder belt for U2 coal feeder 3. For WO 8000001615.' },
  '1200045826': { requisitioner: '', createdBy: '', wo: '', release: 'Released', headerText: 'Turbine lube oil filter elements, routine replacement.' },
  '1200045778': { requisitioner: '', createdBy: '', wo: '', release: 'Released', headerText: 'Condenser vacuum pump mechanical seal.' },
  '1300045812': { requisitioner: '', createdBy: '', wo: '', release: 'Released', headerText: 'Conveyor belt splicing kit.' },
  '1300045749': { requisitioner: '', createdBy: '', wo: '', release: 'Released', headerText: 'Crusher hammers, ring granulator.' },
  '1300045795': { requisitioner: '', createdBy: '', wo: '', release: 'Released', headerText: '6.6 kV breaker trip coils.' },
  '1200045770': { requisitioner: '', createdBy: '', wo: '', release: 'Released', headerText: 'Pressure transmitters for C&I.' }
};

/* Purchase order ITEMS (one row per PO item). rec = quantity received so far. late = delivery date passed. */
window.SAP.purchaseOrders = [
  { date: '2026-10-14', po: '5700001276', item: '00010', pr: '1100045807', vendor: 'Sample Industrial Supply', mat: '20341872', text: 'Bed ash cooler drive chain', longText: 'Replacement drive chain for U2 bed ash cooler 1.\n\n[SAMPLE LONG TEXT - replace with the SAP item text]', price: 68500, qty: 1, rec: 0, uom: 'SET', deliv: '2026-10-28', sec: 'MECH-BLR' },
  { date: '2026-10-14', po: '5700001276', item: '00020', pr: '1100045807', vendor: 'Sample Industrial Supply', mat: '20341873', text: 'Chain connecting link', price: 1250, qty: 4, rec: 0, uom: 'PC', deliv: '2026-10-28', sec: 'MECH-BLR' },
  { date: '2026-10-12', po: '5700001230', item: '00010', pr: '1200045778', vendor: 'Sample Seals & Pumps Inc.', mat: '20361790', text: 'Condenser vacuum pump mechanical seal', price: 55300, qty: 1, rec: 0, uom: 'SET', deliv: '2026-10-30', sec: 'MECH-STG' },
  { date: '2026-10-11', po: '5700001205', item: '00010', pr: '1200045770', vendor: 'Sample Instruments Trading', mat: '', text: 'Pressure transmitter, 0-250 bar, HART', price: 64200, qty: 2, rec: 1, uom: 'PC', deliv: '2026-10-20', sec: 'C&I' },
  { date: '2026-10-11', po: '5700001198', item: '00010', pr: '1100045764', vendor: 'Sample Rubber Products Co.', mat: '', text: 'Rubber lagging sheet, 12 mm', price: 5200, qty: 3, rec: 3, uom: 'M2', deliv: '2026-10-13', sec: 'MECH-BLR' },
  { date: '2026-10-11', po: '5700001198', item: '00020', pr: '1100045764', vendor: 'Sample Rubber Products Co.', mat: '', text: 'Lagging adhesive', price: 2150, qty: 2, rec: 2, uom: 'CAN', deliv: '2026-10-13', sec: 'MECH-BLR' },
  { date: '2026-10-10', po: '5700001160', item: '00010', pr: '1300045749', vendor: 'Sample Wear Parts Corp.', mat: '20370415', text: 'Crusher hammer, ring granulator', price: 12600, qty: 12, rec: 6, uom: 'PC', deliv: '2026-10-18', sec: 'MECH-CHP' },
  { date: '2026-10-09', po: '5700001144', item: '00010', pr: '1100045731', vendor: 'Sample Conveyor Systems', mat: '20338904', text: 'Gravimetric feeder belt, 36"', price: 142000, qty: 1, rec: 0, uom: 'PC', deliv: '2026-10-12', sec: 'MECH-BLR', late: true }
];
window.SAP.poHeaders = { _default: { docType: 'NB · Standard PO', vendorNo: '[VENDOR NO.]', purGroup: '[PUR. GROUP]', terms: '[TERMS]', currency: 'PHP' } };

/* Goods receipts posted in SAP against PO items. */
window.SAP.goodsReceipts = [
  { po: '5700001205', item: '00010', date: '2026-10-14', qty: 1, matDoc: '5000012011' },
  { po: '5700001198', item: '00010', date: '2026-10-13', qty: 3, matDoc: '5000011980' },
  { po: '5700001198', item: '00020', date: '2026-10-13', qty: 2, matDoc: '5000011981' },
  { po: '5700001160', item: '00010', date: '2026-10-12', qty: 6, matDoc: '5000011601' }
];

/* Material master: [material no., description, stock balance (null = no stock record), UoM, price per unit] */
window.SAP.materialsAsOf = '2026-10-19 10:34';
window.SAP.materials = [
  ['101000001', 'Bearing,6305 ZZ C3', null, 'Piece', 1000.00],
  ['101000002', 'Bearing,7324-B-XL-MP', 1, 'Piece', 65200.89],
  ['101000003', 'Bearing,6319,M,C3,FAG,cons', null, 'Piece', 19107.14],
  ['101000004', 'Bearing,6210 C3,Engine Fire Pump', 2, 'Piece', 1001.79],
  ['101000005', 'Bearing,6308 C3,Engine Fire Pump', 0, 'Piece', 1108.93],
  ['101000006', 'Bearing,6202-Z,FloorACU', null, 'Piece', 200.00],
  ['101000007', 'Bearing,6216-2Z-C3', null, 'Piece', 6000.00],
  ['101000009', 'Bearing,Ball,6205 ZZ', null, 'Piece', 129.46],
  ['101000010', 'Bearing,Roller,NU226 EC C3', null, 'Piece', 10367.86],
  ['101000011', 'Bearing,Ball,6326 C3,PAF', null, 'Piece', 17783.30],
  ['101000012', 'Bearing,Roller,NU230 C3', null, 'Piece', 32794.29],
  ['101000013', 'Bearing,Ball,6328 C3', null, 'Piece', 33742.12],
  ['101000014', 'Bearing,Ball,6319 C3', null, 'Piece', 6282.79],
  ['101000015', 'Oil Seal,65x85x10,Double Lip ACWP', null, 'Piece', 531.25],
  ['101000016', 'V-Ring,VS-065,ACWP Motor', null, 'Piece', 526.79],
  ['104000122', 'Relay,Monitoring,KFU8-DW-1.D,DE RAV', 3, 'Set', 60000.00],
  ['104000124', 'Battery,Lithium,CR14250SE(3V),FDK', 10, 'Piece', 1000.00],
  ['107000146', 'Oil Seal,85x110x13,AE3842-A0,NOK', 2, 'Piece', 2000.00],
  ['107000147', 'Gasket,Bottom,Ø248x5mm,CaSil,ESV', 2, 'Piece', 3000.00],
  ['107000148', 'Gasket,Top,Ø248x5mm,CaSil,ESV', 2, 'Piece', 3000.00],
  ['20338904', 'Gravimetric feeder belt, 36"', 0, 'Piece', 142000.00],
  ['20341872', 'Bed ash cooler drive chain', 1, 'Set', 68500.00],
  ['20341873', 'Chain connecting link', 8, 'Piece', 1250.00],
  ['20352210', 'Spherical roller bearing, ID fan DE', 2, 'Piece', 96400.00],
  ['208000043', 'Oil Treatment,STP,444mL', 6, 'Piece', 230.00]
];
