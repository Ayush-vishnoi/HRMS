# MYLOTIC GROUP HRMS

Client-facing human resources management application built with Next.js App Router, React, and TypeScript. It provides role-aware employee, manager, and HR administration workflows for attendance, leave, payroll, recruitment, analytics, meetings, documents, policies, assets, grievances, and Help Desk requests.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Local Development

```bash
npm ci
npm run dev
```

The development server is available at `http://localhost:3000` by default.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

Run the complete production validation pipeline with:

```bash
npm run validate
```

## Project Structure

```text
src/
  app/        Next.js routes, layouts, and global styles
  features/   Domain-owned components, data, APIs, hooks, and types
  shared/     Cross-domain layout, providers, and utilities
public/       Referenced static assets
```

Route modules remain in `src/app` so URL behavior follows App Router conventions. Business UI and domain fixtures live under `src/features`, while reusable infrastructure with multiple domain consumers lives under `src/shared`.

## Application State

The current implementation uses in-memory mock fixtures and browser `localStorage` for demo persistence. `HRMSContext` owns the role-aware client state for authentication, employees, attendance, late clock-in requests, leave requests, and Help Desk tickets.

This is not a production persistence or security boundary. Before deployment with real employee data, replace mock services with authenticated server APIs, PostgreSQL-backed storage, authorization checks on the server, audit logging, and protected handling of payroll and personally identifiable information.

## Core Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- TanStack React Query
- React Hook Form and Zod
- Recharts
- XLSX
- Lucide React

## Production Build

```bash
npm run build
npm run start
```

Configuration is environment-independent at present because the application does not yet connect to external services. Document required environment variables here when authentication, database, email, storage, or observability integrations are introduced.
