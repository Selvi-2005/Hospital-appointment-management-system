
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AppointmentService } from '../../../core/services/appointment.service';

/* ============================================================
   TYPES
   ============================================================ */

type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled';

interface AppointmentRecord {
  id: number;
  patient_name: string;
  doctor_name: string;
  department: string;
  appointment_date: string | Date;
  appointment_time: string;
  contact_number: string;
  status: AppointmentStatus;
  created_date?: string | Date | null;
}

interface AppointmentForm {
  patient_name: string;
  doctor_name: string;
  department: string;
  appointment_date: string;
  appointment_time: string;
  contact_number: string;
  status: AppointmentStatus;
}

type ModalMode = 'add' | 'edit' | 'view' | null;

function createEmptyForm(): AppointmentForm {
  return {
    patient_name: '',
    doctor_name: '',
    department: '',
    appointment_date: '',
    appointment_time: '',
    contact_number: '',
    status: 'Scheduled'
  };
}

/* ============================================================
   COMPONENT
   ============================================================ */

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-list.html',
  styleUrl: './appointment-list.css'
})
export class AppointmentListComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly cdr = inject(ChangeDetectorRef);

  /* DATA */
  appointments: AppointmentRecord[] = [];
  selectedAppointment: AppointmentRecord | null = null;
  deleteTarget: AppointmentRecord | null = null;

  /* FORM */
  form: AppointmentForm = createEmptyForm();
  validationErrors: Record<string, string> = {};

  /* FILTERS */
  searchTerm = '';
  selectedDepartment = '';
  selectedStatus = '';
  dateFrom = '';
  dateTo = '';

  readonly departments: string[] = [
    'General Medicine',
    'Orthopedics',
    'Pediatrics',
    'Cardiology',
    'Neurology',
    'Dermatology',
    'ENT',
    'Gynecology',
    'Ophthalmology',
    'Dental'
  ];

  readonly statuses: AppointmentStatus[] = [
    'Scheduled',
    'Completed',
    'Cancelled'
  ];

  /* SORTING */
  sortBy = 'appointment_date';
  sortOrder: 'ASC' | 'DESC' = 'DESC';

  /* PAGINATION */
  page = 1;
  limit = 5;
  total = 0;
  totalPages = 1;

  readonly pageSizeOptions: number[] = [5, 10, 20];

  /* UI STATE */
  loading = false;
  saving = false;
  deleting = false;
  modalMode: ModalMode = null;
  errorMessage = '';

  successVisible = false;
  successTitle = '';
  successMessage = '';

  private successTimer: ReturnType<typeof setTimeout> | null = null;

  /* INITIALIZE */
  ngOnInit(): void {
    this.loadAppointments();
  }

  /* LOAD APPOINTMENTS */
  loadAppointments(): void {
    this.loading = true;
    this.errorMessage = '';

    this.appointmentService
      .getAppointments(
        this.page,
        this.limit,
        this.searchTerm,
        this.selectedDepartment,
        this.selectedStatus,
        this.dateFrom,
        this.dateTo,
        this.sortBy,
        this.sortOrder
      )
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.appointments = (response.data ?? []).map(item =>
            this.normalizeAppointment(item)
          );

          this.total = response.pagination?.total ?? 0;
          this.totalPages = Math.max(
            response.pagination?.totalPages ?? 1,
            1
          );

          if (this.page > this.totalPages) {
            this.page = this.totalPages;
            this.loadAppointments();
            return;
          }

          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.extractErrorMessage(
            error,
            'Unable to load appointments.'
          );
          this.cdr.markForCheck();
        }
      });
  }

  /* NORMALIZE BACKEND RECORD */
  private normalizeAppointment(item: unknown): AppointmentRecord {
    const record = item as Record<string, unknown>;
    const rawStatus = String(record['status'] ?? 'Scheduled');

    const status = this.statuses.includes(rawStatus as AppointmentStatus)
      ? (rawStatus as AppointmentStatus)
      : 'Scheduled';

    return {
      id: Number(record['id'] ?? 0),
      patient_name: String(record['patient_name'] ?? ''),
      doctor_name: String(record['doctor_name'] ?? ''),
      department: String(record['department'] ?? ''),
      appointment_date: String(record['appointment_date'] ?? ''),
      appointment_time: String(record['appointment_time'] ?? ''),
      contact_number: String(record['contact_number'] ?? ''),
      status,
      created_date: record['created_date'] as
        | string
        | Date
        | null
        | undefined
    };
  }

  /* FILTERS */
  applyFilters(): void {
    this.errorMessage = '';

    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      this.errorMessage = 'Date From cannot be later than Date To.';
      return;
    }

    this.page = 1;
    this.loadAppointments();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedDepartment = '';
    this.selectedStatus = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.page = 1;
    this.errorMessage = '';
    this.loadAppointments();
  }

  get activeFilterCount(): number {
    let count = 0;

    if (this.searchTerm.trim()) count++;
    if (this.selectedDepartment) count++;
    if (this.selectedStatus) count++;
    if (this.dateFrom) count++;
    if (this.dateTo) count++;

    return count;
  }

  /* SORTING */
  changeSort(column: string): void {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = column;
      this.sortOrder = 'ASC';
    }

    this.page = 1;
    this.loadAppointments();
  }

  getSortSymbol(column: string): string {
    if (this.sortBy !== column) {
      return '↕';
    }

    return this.sortOrder === 'ASC' ? '↑' : '↓';
  }

  /* PAGINATION */
  previousPage(): void {
    if (this.page <= 1) return;

    this.page--;
    this.loadAppointments();
  }

  nextPage(): void {
    if (this.page >= this.totalPages) return;

    this.page++;
    this.loadAppointments();
  }

  changePageSize(): void {
    this.page = 1;
    this.loadAppointments();
  }

  get showingFrom(): number {
    if (this.total === 0) return 0;

    return (this.page - 1) * this.limit + 1;
  }

  get showingTo(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  /* ADD */
  openAddModal(): void {
    this.modalMode = 'add';
    this.selectedAppointment = null;
    this.form = createEmptyForm();
    this.validationErrors = {};
    this.errorMessage = '';
  }

  /* EDIT */
  openEditModal(appointment: AppointmentRecord): void {
    this.modalMode = 'edit';
    this.selectedAppointment = appointment;
    this.validationErrors = {};
    this.errorMessage = '';

    this.form = {
      patient_name: appointment.patient_name,
      doctor_name: appointment.doctor_name,
      department: appointment.department,
      appointment_date: this.toDateInputValue(
        appointment.appointment_date
      ),
      appointment_time: this.toTimeInputValue(
        appointment.appointment_time
      ),
      contact_number: appointment.contact_number,
      status: appointment.status
    };
  }

  /* VIEW */
  openViewModal(appointment: AppointmentRecord): void {
    this.modalMode = 'view';
    this.errorMessage = '';
    this.selectedAppointment = appointment;

    this.appointmentService
      .getAppointmentById(appointment.id)
      .subscribe({
        next: (result) => {
          this.selectedAppointment = this.normalizeAppointment(result);
          this.cdr.markForCheck();

          this.showSuccess(
            'Appointment Details Loaded',
            `Details for ${appointment.patient_name} loaded successfully.`
          );
        },
        error: () => {
          // Show the existing row details if the detail request fails.
          this.selectedAppointment = appointment;
          this.cdr.markForCheck();
        }
      });
  }

  /* CLOSE MODAL */
  closeModal(): void {
    if (this.saving) return;

    this.modalMode = null;
    this.selectedAppointment = null;
    this.validationErrors = {};
    this.errorMessage = '';
  }

  /* SAVE APPOINTMENT */
  saveAppointment(): void {
    this.validationErrors = {};
    this.errorMessage = '';

    if (!this.validateForm()) return;

    this.saving = true;

    const payload: AppointmentForm = {
      patient_name: this.form.patient_name.trim(),
      doctor_name: this.form.doctor_name.trim(),
      department: this.form.department.trim(),
      appointment_date: this.form.appointment_date,
      appointment_time: this.form.appointment_time,
      contact_number: this.form.contact_number.trim(),
      status: this.form.status
    };

    /* UPDATE */
    if (this.modalMode === 'edit' && this.selectedAppointment) {
      const id = this.selectedAppointment.id;

      this.appointmentService
        .updateAppointment(id, payload)
        .pipe(
          finalize(() => {
            this.saving = false;
            this.cdr.markForCheck();
          })
        )
        .subscribe({
          next: () => {
            this.modalMode = null;
            this.selectedAppointment = null;
            this.validationErrors = {};
            this.errorMessage = '';

            this.loadAppointments();

            this.showSuccess(
              'Appointment Updated',
              'The appointment details have been updated successfully.'
            );
          },
          error: (error: HttpErrorResponse) => {
            this.errorMessage = this.extractErrorMessage(
              error,
              'Unable to update appointment.'
            );
            this.cdr.markForCheck();
          }
        });

      return;
    }

    /* CREATE */
    this.appointmentService
      .createAppointment(payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.modalMode = null;
          this.selectedAppointment = null;
          this.validationErrors = {};
          this.errorMessage = '';

          this.page = 1;
          this.loadAppointments();

          this.showSuccess(
            'Appointment Booked Successfully',
            `The appointment for ${payload.patient_name} has been successfully scheduled.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.extractErrorMessage(
            error,
            'Unable to create appointment.'
          );
          this.cdr.markForCheck();
        }
      });
  }

  /* DELETE */
  openDeleteModal(appointment: AppointmentRecord): void {
    this.deleteTarget = appointment;
    this.errorMessage = '';
  }

  closeDeleteModal(): void {
    if (this.deleting) return;

    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;

    const appointment = this.deleteTarget;
    this.deleting = true;

    this.appointmentService
      .deleteAppointment(appointment.id)
      .pipe(
        finalize(() => {
          this.deleting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          const wasLastRecordOnPage =
            this.appointments.length === 1 && this.page > 1;

          this.deleteTarget = null;

          if (wasLastRecordOnPage) {
            this.page--;
          }

          this.loadAppointments();

          this.showSuccess(
            'Appointment Deleted',
            `The appointment for ${appointment.patient_name} has been deleted successfully.`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.extractErrorMessage(
            error,
            'Unable to delete appointment.'
          );
          this.cdr.markForCheck();
        }
      });
  }

  /* VALIDATION */
  private validateForm(): boolean {
    let valid = true;

    const patientName = this.form.patient_name.trim();
    const doctorName = this.form.doctor_name.trim();
    const department = this.form.department.trim();
    const contact = this.form.contact_number.trim();

    if (!patientName) {
      this.validationErrors['patient_name'] =
        'Patient name is required.';
      valid = false;
    } else if (patientName.length < 2) {
      this.validationErrors['patient_name'] =
        'Enter a valid patient name.';
      valid = false;
    }

    if (!doctorName) {
      this.validationErrors['doctor_name'] =
        'Doctor name is required.';
      valid = false;
    }

    if (!department) {
      this.validationErrors['department'] =
        'Department is required.';
      valid = false;
    }

    if (!this.form.appointment_date) {
      this.validationErrors['appointment_date'] =
        'Appointment date is required.';
      valid = false;
    }

    if (!this.form.appointment_time) {
      this.validationErrors['appointment_time'] =
        'Appointment time is required.';
      valid = false;
    }

    if (!/^\d{10}$/.test(contact)) {
      this.validationErrors['contact_number'] =
        'Enter a valid 10-digit contact number.';
      valid = false;
    }

    if (!this.statuses.includes(this.form.status)) {
      this.validationErrors['status'] =
        'Select a valid appointment status.';
      valid = false;
    }

    return valid;
  }

  isInvalid(field: string): boolean {
    return !!this.validationErrors[field];
  }

  /* DATE HELPERS */
  toDateInputValue(
    value: string | Date | null | undefined
  ): string {
    if (!value) return '';

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    return String(value).slice(0, 10);
  }

  toTimeInputValue(
    value: string | null | undefined
  ): string {
    if (!value) return '';

    return String(value).slice(0, 5);
  }

  formatDate(
    value: string | Date | null | undefined
  ): string {
    const dateValue = this.toDateInputValue(value);

    if (!dateValue) return '—';

    const [year, month, day] = dateValue.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  formatTime(
    value: string | null | undefined
  ): string {
    if (!value) return '—';

    const [hour, minute] = String(value)
      .slice(0, 5)
      .split(':')
      .map(Number);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return String(value);
    }

    const date = new Date();
    date.setHours(hour, minute, 0, 0);

    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  /* UI HELPERS */
  getStatusClass(status: string): string {
    switch (status) {
      case 'Scheduled':
        return 'status-scheduled';
      case 'Completed':
        return 'status-completed';
      case 'Cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  getPatientInitials(name: string): string {
    if (!name) return '?';

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  /* SUCCESS TOAST */
  private showSuccess(title: string, message: string): void {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }

    this.successTitle = title;
    this.successMessage = message;
    this.successVisible = true;

    // Ask Angular to update the toast immediately.
    this.cdr.detectChanges();

    this.successTimer = setTimeout(() => {
      this.successVisible = false;
      this.successTimer = null;
      this.cdr.markForCheck();
    }, 5000);
  }

  closeSuccess(): void {
    this.successVisible = false;

    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }

    this.cdr.markForCheck();
  }

  /* ERROR HELPER */
  private extractErrorMessage(
    error: HttpErrorResponse,
    fallback: string
  ): string {
    const message = error.error?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }
}

