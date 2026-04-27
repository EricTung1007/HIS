export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'nurse' | 'doctor' | 'caregiver';
  department?: string;
}

export interface Patient {
  id: number;
  patient_no: string;
  name: string;
  id_number?: string;
  birth_date: string;
  gender: 'M' | 'F';
  blood_type?: string;
  admission_date: string;
  discharge_date?: string;
  room_no?: string;
  bed_no?: string;
  care_level?: string;
  nhi_no?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  status: 'active' | 'discharged' | 'deceased';
  notes?: string;
  created_at: string;
}

export interface MedicalHistory {
  id: number;
  patient_id: number;
  chief_complaint?: string;
  present_illness?: string;
  past_history?: string;
  family_history?: string;
  surgical_history?: string;
  social_history?: string;
  smoking?: string;
  alcohol?: string;
  created_at: string;
  updated_at: string;
}

export interface Diagnosis {
  id: number;
  patient_id: number;
  icd_code?: string;
  description: string;
  diagnosis_date?: string;
  status: 'active' | 'resolved';
  notes?: string;
  created_at: string;
}

export interface Allergy {
  id: number;
  patient_id: number;
  allergen: string;
  reaction?: string;
  severity: 'mild' | 'moderate' | 'severe';
  created_at: string;
}

export interface MedicationOrder {
  id: number;
  patient_id: number;
  medication_name: string;
  generic_name?: string;
  dose: string;
  unit?: string;
  route: string;
  frequency: string;
  times_per_day?: string;
  start_date: string;
  end_date?: string;
  indication?: string;
  instructions?: string;
  status: 'active' | 'discontinued' | 'completed';
  ordered_by?: number;
  ordered_by_name?: string;
  created_at: string;
  administrations?: MedicationAdministration[];
}

export interface MedicationAdministration {
  id: number;
  order_id: number;
  patient_id: number;
  scheduled_time?: string;
  administered_at?: string;
  dose_given?: string;
  status: 'given' | 'held' | 'refused' | 'not_available';
  notes?: string;
  administered_by?: number;
  administered_by_name?: string;
  created_at: string;
}

export interface IntakeOutput {
  id: number;
  patient_id: number;
  record_date: string;
  record_time: string;
  type: 'intake' | 'output';
  category: string;
  amount: number;
  unit: string;
  notes?: string;
  recorded_by?: number;
  recorded_by_name?: string;
  created_at: string;
}

export interface VitalSigns {
  id: number;
  patient_id: number;
  measured_at: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  pain_score?: number;
  blood_glucose?: number;
  notes?: string;
  recorded_by?: number;
  recorded_by_name?: string;
  created_at: string;
}

export interface PhysicalExam {
  id: number;
  patient_id: number;
  exam_date: string;
  consciousness?: string;
  gcs_eye?: number;
  gcs_verbal?: number;
  gcs_motor?: number;
  general_appearance?: string;
  head?: string;
  eyes?: string;
  ears?: string;
  nose?: string;
  throat?: string;
  neck?: string;
  lymph_nodes?: string;
  chest_inspection?: string;
  breath_sounds?: string;
  respiratory_pattern?: string;
  heart_sounds?: string;
  peripheral_pulses?: string;
  edema?: string;
  abdomen_inspection?: string;
  bowel_sounds?: string;
  abdomen_palpation?: string;
  muscle_strength?: string;
  range_of_motion?: string;
  mobility?: string;
  skin_color?: string;
  skin_integrity?: string;
  wounds?: string;
  pressure_injuries?: string;
  orientation?: string;
  memory?: string;
  speech?: string;
  urinary?: string;
  bowel_pattern?: string;
  morse_fall_history?: number;
  morse_secondary_diagnosis?: number;
  morse_ambulatory_aid?: number;
  morse_iv?: number;
  morse_gait?: number;
  morse_mental_status?: number;
  braden_sensory?: number;
  braden_moisture?: number;
  braden_activity?: number;
  braden_mobility?: number;
  braden_nutrition?: number;
  braden_friction?: number;
  additional_notes?: string;
  examiner?: number;
  examiner_name?: string;
  created_at: string;
}

export interface NursingNote {
  id: number;
  patient_id: number;
  note_datetime: string;
  note_type: 'SOAP' | 'DAR' | 'narrative';
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  content?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}
