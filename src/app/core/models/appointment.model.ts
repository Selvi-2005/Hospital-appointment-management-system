export interface Appointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  department: string;
  appointment_date: string;
  appointment_time: string;
  contact_number: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  created_date: string;
}