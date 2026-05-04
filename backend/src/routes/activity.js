const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/activity
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;

  const query = `
    SELECT 
      a.activity_type,
      a.source_id,
      a.patient_id,
      a.created_at,
      a.title,
      a.description,
      p.name as patient_name,
      p.room_no as patient_room,
      p.bed_no as patient_bed,
      u.name as user_name
    FROM (
      SELECT 
        'vitals' as activity_type, id as source_id, patient_id, created_at, recorded_by as user_id,
        '生命徵象' as title, 
        'BP ' || COALESCE(systolic_bp, '-') || '/' || COALESCE(diastolic_bp, '-') || ' HR ' || COALESCE(heart_rate, '-') as description
      FROM vital_signs

      UNION ALL

      SELECT 
        'io' as activity_type, id as source_id, patient_id, created_at, recorded_by as user_id,
        CASE WHEN type='intake' THEN '攝入量' ELSE '排出量' END as title, 
        amount || ' ' || COALESCE(unit, 'mL') as description
      FROM intake_output

      UNION ALL

      SELECT 
        'note' as activity_type, id as source_id, patient_id, created_at, created_by as user_id,
        '護理紀錄' as title, 
        COALESCE(note_type, '一般紀錄') as description
      FROM nursing_notes

      UNION ALL

      SELECT 
        'medication' as activity_type, ma.id as source_id, ma.patient_id, ma.created_at, ma.administered_by as user_id,
        '給藥' as title, 
        mo.medication_name || ' ' || COALESCE(ma.dose_given, mo.dose) as description
      FROM medication_administrations ma
      JOIN medication_orders mo ON ma.order_id = mo.id

      UNION ALL

      SELECT 
        'family_log' as activity_type, id as source_id, patient_id, created_at, created_by as user_id,
        '聯絡簿' as title, 
        SUBSTR(COALESCE(extra_notes, ai_summary, '新增紀錄'), 1, 30) as description
      FROM family_contact_logs

      UNION ALL

      SELECT 
        'billing' as activity_type, br.id as source_id, br.patient_id, br.created_at, br.recorded_by as user_id,
        '核銷' as title, 
        bc.code || ' ' || bc.name as description
      FROM billing_records br
      JOIN ltc_billing_codes bc ON br.billing_code_id = bc.id
    ) a
    JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `;

  try {
    const activities = db.prepare(query).all(limit);
    res.json(activities);
  } catch (error) {
    console.error('Fetch activity error:', error);
    res.status(500).json({ error: '無法獲取近期活動紀錄' });
  }
});

module.exports = router;
