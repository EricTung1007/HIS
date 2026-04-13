const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'his.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'nurse',
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    id_number TEXT,
    birth_date DATE NOT NULL,
    gender TEXT NOT NULL,
    blood_type TEXT,
    admission_date DATE NOT NULL,
    discharge_date DATE,
    room_no TEXT,
    bed_no TEXT,
    care_level TEXT,
    nhi_no TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS medical_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    chief_complaint TEXT,
    present_illness TEXT,
    past_history TEXT,
    family_history TEXT,
    surgical_history TEXT,
    social_history TEXT,
    smoking TEXT,
    alcohol TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS diagnoses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    icd_code TEXT,
    description TEXT NOT NULL,
    diagnosis_date DATE,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS allergies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    allergen TEXT NOT NULL,
    reaction TEXT,
    severity TEXT DEFAULT 'mild',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS medication_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    generic_name TEXT,
    dose TEXT NOT NULL,
    unit TEXT,
    route TEXT NOT NULL,
    frequency TEXT NOT NULL,
    times_per_day TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    indication TEXT,
    instructions TEXT,
    status TEXT DEFAULT 'active',
    ordered_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS medication_administrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    scheduled_time DATETIME,
    administered_at DATETIME,
    dose_given TEXT,
    status TEXT NOT NULL DEFAULT 'given',
    notes TEXT,
    administered_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES medication_orders(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS intake_output (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    record_time TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT DEFAULT 'mL',
    notes TEXT,
    recorded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS vital_signs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    measured_at DATETIME NOT NULL,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    temperature REAL,
    spo2 REAL,
    weight REAL,
    height REAL,
    pain_score INTEGER,
    blood_glucose REAL,
    notes TEXT,
    recorded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS physical_exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    exam_date DATE NOT NULL,
    consciousness TEXT,
    gcs_eye INTEGER,
    gcs_verbal INTEGER,
    gcs_motor INTEGER,
    general_appearance TEXT,
    head TEXT,
    eyes TEXT,
    ears TEXT,
    nose TEXT,
    throat TEXT,
    neck TEXT,
    lymph_nodes TEXT,
    chest_inspection TEXT,
    breath_sounds TEXT,
    respiratory_pattern TEXT,
    heart_sounds TEXT,
    peripheral_pulses TEXT,
    edema TEXT,
    abdomen_inspection TEXT,
    bowel_sounds TEXT,
    abdomen_palpation TEXT,
    muscle_strength TEXT,
    range_of_motion TEXT,
    mobility TEXT,
    skin_color TEXT,
    skin_integrity TEXT,
    wounds TEXT,
    pressure_injuries TEXT,
    orientation TEXT,
    memory TEXT,
    speech TEXT,
    urinary TEXT,
    bowel_pattern TEXT,
    morse_fall_history INTEGER DEFAULT 0,
    morse_secondary_diagnosis INTEGER DEFAULT 0,
    morse_ambulatory_aid INTEGER DEFAULT 0,
    morse_iv INTEGER DEFAULT 0,
    morse_gait INTEGER DEFAULT 0,
    morse_mental_status INTEGER DEFAULT 0,
    braden_sensory INTEGER DEFAULT 4,
    braden_moisture INTEGER DEFAULT 4,
    braden_activity INTEGER DEFAULT 4,
    braden_mobility INTEGER DEFAULT 4,
    braden_nutrition INTEGER DEFAULT 4,
    braden_friction INTEGER DEFAULT 3,
    additional_notes TEXT,
    examiner INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS nursing_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    note_datetime DATETIME NOT NULL,
    note_type TEXT DEFAULT 'SOAP',
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    content TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );
`);

module.exports = db;
