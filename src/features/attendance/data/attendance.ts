export interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: string;
  status: 'On Time' | 'Late' | 'Half Day' | 'Absent' | 'On Leave';
  location: string;
}

export const MOCK_ATTENDANCE_LOGS: AttendanceRecord[] = [
  { id: 'ATT-001', date: '2026-08-06', checkIn: '09:02 AM', checkOut: 'In Progress', hoursWorked: '7h 20m', status: 'On Time', location: 'Bengaluru HQ' },
  { id: 'ATT-002', date: '2026-08-05', checkIn: '09:00 AM', checkOut: '06:15 PM', hoursWorked: '9h 15m', status: 'On Time', location: 'Bengaluru HQ' },
  { id: 'ATT-003', date: '2026-08-04', checkIn: '09:35 AM', checkOut: '06:30 PM', hoursWorked: '8h 55m', status: 'Late', location: 'Bengaluru HQ' },
  { id: 'ATT-004', date: '2026-08-03', checkIn: '08:55 AM', checkOut: '05:45 PM', hoursWorked: '8h 50m', status: 'On Time', location: 'Work from Home' },
  { id: 'ATT-005', date: '2026-07-31', checkIn: '09:10 AM', checkOut: '06:00 PM', hoursWorked: '8h 50m', status: 'On Time', location: 'Bengaluru HQ' },
  { id: 'ATT-006', date: '2026-07-30', checkIn: '09:05 AM', checkOut: '01:30 PM', hoursWorked: '4h 25m', status: 'Half Day', location: 'Bengaluru HQ' },
];
