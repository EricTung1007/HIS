const db = require('../db');

/**
 * Automatically creates a billing record if the provided code exists.
 * 
 * @param {string} patientId 
 * @param {string} codeStr - The billing code (e.g., 'BA03')
 * @param {string} userId - The ID of the user creating the record
 * @param {string|Date} dateTimeStr - The time of the service (ISO string or Date)
 * @param {string} notes - Optional notes for the billing record
 */
function autoBill(patientId, codeStr, userId, dateTimeStr, notes) {
  try {
    const codeRow = db.prepare('SELECT * FROM ltc_billing_codes WHERE code = ?').get(codeStr);
    if (!codeRow) {
      console.warn(`[Auto-Billing] Code ${codeStr} not found in database.`);
      return;
    }
    
    let dt = new Date();
    if (dateTimeStr) {
      dt = new Date(dateTimeStr);
      if (isNaN(dt.getTime())) dt = new Date();
    }
    
    // Format date as YYYY-MM-DD
    // Note: getMonth() is 0-indexed, and we pad to 2 digits.
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    
    db.prepare(`
      INSERT INTO billing_records (patient_id, billing_code_id, service_date, service_time, quantity, unit_price, is_remote, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      patientId, 
      codeRow.id, 
      date, 
      time, 
      1, 
      codeRow.price, 
      0, 
      notes || '系統自動核銷', 
      userId
    );
    
    console.log(`[Auto-Billing] Created billing record ${codeStr} for patient ${patientId}`);
  } catch (err) {
    console.error(`[Auto-Billing] Failed for code ${codeStr}:`, err.message);
  }
}

module.exports = { autoBill };
