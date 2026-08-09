import { Employee } from '@/data/mockData';

export type UserRole = 'employee' | 'team_lead' | 'manager' | 'admin' | 'ceo';

export type TaskStatus =
  | 'Pending'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Changes Requested'
  | 'Completed'
  | 'Overdue';

export type DeliverableStatus =
  | 'Not Submitted'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'
  | 'Resubmitted';

export interface DeliverableAttachment {
  id: string;
  name: string;
  size: string;
  url?: string;
  uploadedAt: string;
}

export interface DeliverableReview {
  id: string;
  reviewedBy: string;
  reviewedByName: string;
  reviewerRole: UserRole;
  action: 'Approved' | 'Rejected' | 'Changes Requested';
  feedback: string;
  reviewedAt: string;
}

export interface Deliverable {
  id: string;
  taskId: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  status: DeliverableStatus;
  notes: string;
  attachments: DeliverableAttachment[];
  reviews: DeliverableReview[];
  resubmissionCount: number;
}

export interface AuditLogEntry {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
  comments?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  department: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  dueDate?: string;
  completedAt?: string;
  completionNote?: string;
  expectedDeliverable: string;
  assignedTo: string; // Employee ID
  assignedToName: string;
  assignedToRole?: string;
  assignedBy: string; // Assigner Name
  assignedById?: string;
  assignedByRole?: UserRole;
  assignedDate?: string;
  kraCategory?: string;
  ceoApprovalRequired?: boolean;
  status: TaskStatus;
  deliverable?: Deliverable;
  auditLogs: AuditLogEntry[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  userRole: UserRole;
  department: string;
  avatar: string;
  employeeCode: string;
}

/**
 * Returns direct reports for a given manager/lead name
 */
export function getDirectReports(managerName: string, employees: Employee[]): Employee[] {
  return employees.filter((e) => e.manager.toLowerCase() === managerName.toLowerCase());
}

/**
 * Returns all employees under a department
 */
export function getDepartmentEmployees(department: string, employees: Employee[]): Employee[] {
  return employees.filter((e) => e.department.toLowerCase() === department.toLowerCase());
}

/**
 * Returns the list of employees the currentUser is authorized to assign tasks to
 * Hierarchy:
 * - CEO: Can assign to anyone in the organization
 * - Manager: Can assign to Team Leads & Employees within their department
 * - Team Lead: Can assign to direct reports only
 * - Employee: Cannot assign tasks
 */
export function getAccessibleAssignees(currentUser: UserAccount, employees: Employee[]): Employee[] {
  if (currentUser.userRole === 'ceo') {
    return employees.filter((e) => e.id !== currentUser.id);
  }

  if (currentUser.userRole === 'manager') {
    return employees.filter(
      (e) => e.department.toLowerCase() === currentUser.department.toLowerCase() && e.id !== currentUser.id
    );
  }

  if (currentUser.userRole === 'team_lead') {
    return getDirectReports(currentUser.name, employees).filter((e) => e.id !== currentUser.id);
  }

  return [];
}

/**
 * Checks if currentUser is authorized to assign a task to targetEmployeeId
 */
export function canAssignTask(currentUser: UserAccount, targetEmployeeId: string, employees: Employee[]): boolean {
  if (currentUser.userRole === 'employee') return false;
  const allowed = getAccessibleAssignees(currentUser, employees);
  return allowed.some((e) => e.id === targetEmployeeId);
}

/**
 * Checks if currentUser has permission to view a specific task
 * - Employee: Only own assigned tasks
 * - Team Lead: Own tasks + tasks assigned to direct reports
 * - Manager: Own tasks + all tasks in department
 * - CEO: All tasks in organization
 */
export function canViewTask(currentUser: UserAccount, task: Task, employees: Employee[]): boolean {
  if (currentUser.userRole === 'ceo') return true;

  if (task.assignedTo === currentUser.id || task.assignedById === currentUser.id) return true;

  if (currentUser.userRole === 'manager') {
    return task.department.toLowerCase() === currentUser.department.toLowerCase();
  }

  if (currentUser.userRole === 'team_lead') {
    const directReports = getDirectReports(currentUser.name, employees);
    return directReports.some((e) => e.id === task.assignedTo);
  }

  return false;
}

/**
 * Filters the master task list to only those accessible by currentUser
 */
export function getAccessibleTasks(currentUser: UserAccount, tasks: Task[], employees: Employee[]): Task[] {
  return tasks.filter((task) => canViewTask(currentUser, task, employees));
}

/**
 * Checks if currentUser can submit/resubmit a deliverable for this task
 * (Must be the assigned employee and task is not yet completed)
 */
export function canSubmitDeliverable(currentUser: UserAccount, task: Task): boolean {
  if (task.assignedTo !== currentUser.id) return false;
  return task.status === 'Pending' || task.status === 'In Progress' || task.status === 'Changes Requested';
}

/**
 * Checks if currentUser can review this deliverable
 * Hierarchy:
 * - If CEO Approval is Required: Team Lead / Manager can review and recommend, but final approval is CEO.
 * - CEO can review any submitted deliverable.
 * - Manager can review deliverables in department.
 * - Team Lead can review deliverables of direct reports.
 */
export function canReviewDeliverable(currentUser: UserAccount, task: Task, employees: Employee[]): boolean {
  if (!task.deliverable || task.deliverable.status === 'Not Submitted' || task.deliverable.status === 'Approved') {
    return false;
  }

  if (currentUser.userRole === 'ceo') return true;

  if (currentUser.userRole === 'manager') {
    return task.department.toLowerCase() === currentUser.department.toLowerCase();
  }

  if (currentUser.userRole === 'team_lead') {
    const directReports = getDirectReports(currentUser.name, employees);
    return directReports.some((e) => e.id === task.assignedTo);
  }

  return false;
}

/**
 * Checks if currentUser can issue final APPROVAL on this deliverable
 * If task.ceoApprovalRequired is true, ONLY CEO can approve!
 */
export function canApproveDeliverable(currentUser: UserAccount, task: Task, employees: Employee[]): boolean {
  if (!canReviewDeliverable(currentUser, task, employees)) return false;

  if (task.ceoApprovalRequired) {
    return currentUser.userRole === 'ceo';
  }

  return true;
}
