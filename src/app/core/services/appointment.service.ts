import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import {
  Observable,
  map
} from 'rxjs';

import {
  Appointment
} from '../models/appointment.model';

export interface AppointmentListResponse {
  data: Appointment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:3000/api/appointment';


  getAppointments(
    page: number,
    limit: number,
    search: string,
    department: string,
    status: string,
    dateFrom: string,
    dateTo: string,
    sortBy: string,
    sortOrder: 'ASC' | 'DESC'
  ): Observable<AppointmentListResponse> {

    let params =
      new HttpParams()
        .set('page', page)
        .set('limit', limit)
        .set('sortBy', sortBy)
        .set('sortOrder', sortOrder);

    const searchValue =
      search.trim();

    if (searchValue) {
      params = params.set(
        'search',
        searchValue
      );
    }

    if (department) {
      params = params.set(
        'department',
        department
      );
    }

    if (status) {
      params = params.set(
        'status',
        status
      );
    }

    if (dateFrom) {
      params = params.set(
        'dateFrom',
        dateFrom
      );
    }

    if (dateTo) {
      params = params.set(
        'dateTo',
        dateTo
      );
    }

    return this.http.get<AppointmentListResponse>(
      this.apiUrl,
      { params }
    );
  }


  getAppointmentById(
    id: number
  ): Observable<Appointment> {

    return this.http
      .get<
        Appointment |
        { data: Appointment }
      >(
        `${this.apiUrl}/${id}`
      )
      .pipe(
        map((response) => {

          if (
            response &&
            typeof response === 'object' &&
            'data' in response
          ) {
            return response.data;
          }

          return response as Appointment;
        })
      );
  }


  createAppointment(
    appointment: Omit<
      Appointment,
      'id' | 'created_date'
    >
  ): Observable<Appointment> {

    return this.http
      .post<
        Appointment |
        { data: Appointment }
      >(
        this.apiUrl,
        appointment
      )
      .pipe(
        map((response) => {

          if (
            response &&
            typeof response === 'object' &&
            'data' in response
          ) {
            return response.data;
          }

          return response as Appointment;
        })
      );
  }


  updateAppointment(
    id: number,
    appointment: Omit<
      Appointment,
      'id' | 'created_date'
    >
  ): Observable<Appointment> {

    return this.http
      .put<
        Appointment |
        { data: Appointment }
      >(
        `${this.apiUrl}/${id}`,
        appointment
      )
      .pipe(
        map((response) => {

          if (
            response &&
            typeof response === 'object' &&
            'data' in response
          ) {
            return response.data;
          }

          return response as Appointment;
        })
      );
  }


  deleteAppointment(
    id: number
  ): Observable<unknown> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );
  }
}