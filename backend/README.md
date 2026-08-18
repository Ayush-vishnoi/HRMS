# HRMS Backend (NestJS)

REST API backend for HRMS. Runs on port 4000.

## Setup

```bash
cd backend
npm install
npm run build
```

## Development

```bash
npm run start:dev
```

## Production

```bash
npm run build
npm run start:prod
```

## API Base URL

`http://localhost:4000/api`

## Available Endpoints

### Auth
- `POST /api/auth/login` — Login with email + password → returns JWT token
- `GET  /api/auth/session` — Get current user (requires Bearer token)

### Employees
- `GET    /api/employees` — List all employees (query: department, status, search)
- `GET    /api/employees/:id` — Get employee detail
- `PATCH  /api/employees/:id` — Update employee

### Attendance
- `GET   /api/attendance` — List records (query: employeeId, from, to)
- `POST  /api/attendance/clock-in` — Clock in
- `POST  /api/attendance/clock-out` — Clock out
- `GET   /api/attendance/late-requests` — List late requests
- `POST  /api/attendance/late-requests` — Submit late request
- `PATCH /api/attendance/late-requests/:id` — Approve/reject late request

### Leaves
- `GET   /api/leaves/balances` — Leave balances
- `GET   /api/leaves` — Leave requests (query: employeeId, status)
- `POST  /api/leaves` — Apply for leave
- `PATCH /api/leaves/:id` — Approve/reject leave

### Meetings
- `GET   /api/meetings` — My meetings (query: from, to)
- `GET   /api/meetings/:id` — Meeting detail
- `POST  /api/meetings` — Create meeting
- `PATCH /api/meetings/:id/rsvp` — Accept/decline invite
- `PATCH /api/meetings/:id/cancel` — Cancel meeting

### Payroll
- `GET /api/payroll/payslips` — Payslips (query: employeeId, monthYear)
- `GET /api/payroll/cycles` — Payroll cycles
- `GET /api/payroll/salary-structure/:employeeId` — Salary structure
- `GET /api/payroll/loans` — Loans
- `GET /api/payroll/tax-declarations` — Tax declarations

### Help Desk
- `GET   /api/help-desk` — Tickets (query: employeeId, status, category)
- `POST  /api/help-desk` — Create ticket
- `PATCH /api/help-desk/:id/resolve` — Resolve ticket

### Notifications
- `GET   /api/notifications` — My notifications
- `PATCH /api/notifications/:id/read` — Mark as read
- `PATCH /api/notifications/read-all` — Mark all as read

## Authentication

All endpoints (except `/api/auth/login`) require:
```
Authorization: Bearer <jwt_token>
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
BACKEND_PORT=4000
FRONTEND_URL=http://localhost:3000
```
