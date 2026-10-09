import { Component } from '@angular/core';

import { AppointmentListComponent } from './features/appointments/appointment-list/appointment-list';

@Component({
selector: 'app-root',
imports: [
AppointmentListComponent
],
templateUrl: './app.html',
styleUrl: './app.css'
})
export class App {}
