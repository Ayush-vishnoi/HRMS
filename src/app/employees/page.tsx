'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  Building2,
  ChevronRight,
  UserPlus,
  ShieldCheck
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import type { Employee } from '@/features/employees/data/employees';
import { EmployeeDetailsModal } from '@/features/employees/components/EmployeeDetailsModal';
import { AddEmployeeModal } from '@/features/employees/components/AddEmployeeModal';

export default function EmployeesPage() {
  const { employees, currentUser } = useHRMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const canAddEmployee = currentUser.userRole === 'admin';

  const departments = [
    'All',
    'Engineering',
    'Design',
    'Human Resources',
    'Marketing',
    'Finance'
  ];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      selectedDept === 'All' ||
      emp.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  if (currentUser.userRole === 'employee') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-8 text-center shadow-md">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#EAF2F8] p-3 text-[#17324A]" />
          <h2 className="text-lg font-bold text-[#17324A]">Manager or HR Admin access required</h2>
          <p className="mt-2 text-sm text-[#55708A]">The employee directory is restricted to people managers and HR.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <p className="text-[11px] font-semibold uppercase text-[#17324A]">
            People directory
          </p>

          <h1 className="flex items-center gap-2 text-xl font-bold text-[#17324A]">
            <Users className="w-5 h-5 text-[#17324A]" />
            Employee Management Directory
          </h1>

          <p className="text-xs text-[#667085]">
            View team members, organization hierarchy, and contact profiles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* Add Employee */}
          {canAddEmployee && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-md bg-[#17324A] hover:bg-[#17324A]/90 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add New Employee
            </button>
          )}

          {/* Grid / List Toggle */}
          <div className="flex items-center rounded-md border border-[#D9E5EE] bg-white p-1">

            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              title="Grid view"
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#B0D0EA] text-[#17324A]'
                  : 'text-[#667085] hover:text-[#17324A] hover:bg-[#B0D0EA]/40'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              title="List view"
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#B0D0EA] text-[#17324A]'
                  : 'text-[#667085] hover:text-[#17324A] hover:bg-[#B0D0EA]/40'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>

          </div>
        </div>
      </div>

      {/* Role Permission Notice */}
      <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#E1E5EA] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-[#667085]">

        <div className="flex items-start gap-2">

          <ShieldCheck className="w-4 h-4 text-[#17324A] shrink-0" />

          <span>
            Permission level:{' '}
            <strong className="text-[#1F2933] uppercase">
              {currentUser.userRole}
            </strong>
            .

            {canAddEmployee
              ? ' You have complete employee directory access, including compensation details and onboarding.'
              : ' You have view-only access to the employee directory.'}
          </span>

        </div>

        <span className="font-bold text-[#1F2933] whitespace-nowrap">
          {filteredEmployees.length} members listed
        </span>

      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-lg bg-[#FFFFFF] border border-[#E1E5EA]">

        {/* Search */}
        <div className="relative flex-1 max-w-md">

          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, designation, email, or code..."
            className="w-full pl-9 pr-4 py-2 bg-[#F7F8FA] border border-[#E1E5EA] rounded-md text-xs text-[#1F2933] placeholder-[#667085] focus:outline-none focus:border-[#17324A] focus:ring-2 focus:ring-[#B0D0EA]"
          />

        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 xl:pb-0">

          {departments.map((dept) => (

            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedDept === dept
                  ? 'bg-[#B0D0EA] text-[#17324A] border border-[#B0D0EA]'
                  : 'bg-[#F1F3F5] text-[#667085] hover:text-[#17324A] hover:bg-[#B0D0EA]/40 border border-[#E1E5EA]'
              }`}
            >
              {dept}
            </button>

          ))}

        </div>
      </div>

      {/* Employees Grid View */}
      {viewMode === 'grid' ? (

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

          {filteredEmployees.map((emp) => (

            <button
              type="button"
              key={emp.id}
              onClick={() => setActiveEmployee(emp)}
              className="p-5 rounded-lg bg-[#FFFFFF] border border-[#E1E5EA] hover:border-[#B0D0EA] hover:bg-[#FFFFFF] transition-colors cursor-pointer group shadow-md flex flex-col justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#B0D0EA]"
            >

              <div className="space-y-3">

                <div className="flex items-start justify-between">

                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-14 h-14 rounded-lg object-cover border border-[#E1E5EA] ring-2 ring-[#B0D0EA]/50"
                  />

                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      emp.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : emp.status === 'Remote'
                        ? 'bg-[#B0D0EA] text-[#17324A] border border-[#B0D0EA]'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {emp.status}
                  </span>

                </div>

                <div>

                  <h3 className="text-sm font-bold text-[#1F2933] group-hover:text-[#17324A] transition-colors">
                    {emp.name}
                  </h3>

                  <p className="text-xs text-[#17324A] font-medium">
                    {emp.role}
                  </p>

                  <span className="text-[11px] text-[#667085] font-mono mt-0.5 block">
                    {emp.employeeCode}
                  </span>

                </div>

                <div className="pt-2 border-t border-[#E1E5EA] space-y-1.5 text-xs text-[#667085]">

                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#667085]" />
                    <span>{emp.department}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#667085]" />
                    <span>{emp.location}</span>
                  </div>

                </div>

              </div>

              <div className="mt-4 pt-3 border-t border-[#E1E5EA] flex items-center justify-between text-xs text-[#17324A] font-semibold">

                <span>View full profile</span>

                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />

              </div>

            </button>

          ))}

        </div>

      ) : (

        /* Employees List View */
        <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#E1E5EA] shadow-md">

          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs border-collapse">

              <thead>

                <tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] font-semibold text-[#667085]">

                  <th className="py-3 px-4">
                    Employee
                  </th>

                  <th className="py-3 px-4">
                    Department
                  </th>

                  <th className="py-3 px-4">
                    Email
                  </th>

                  <th className="py-3 px-4">
                    Location
                  </th>

                  <th className="py-3 px-4">
                    Status
                  </th>

                  <th className="py-3 px-4 text-right">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-[#D9E5EE] text-[#17324A]">

                {filteredEmployees.map((emp) => (

                  <tr
                    key={emp.id}
                    onClick={() => setActiveEmployee(emp)}
                    className="hover:bg-[#B0D0EA]/20 cursor-pointer transition-colors"
                  >

                    <td className="py-3 px-4">

                      <div className="flex items-center gap-3">

                        <img
                          src={emp.avatar}
                          alt={emp.name}
                          className="w-8 h-8 rounded-full object-cover border border-[#E1E5EA]"
                        />

                        <div>

                          <p className="font-bold text-[#1F2933]">
                            {emp.name}
                          </p>

                          <p className="text-[11px] text-[#667085]">
                            {emp.role}
                          </p>

                        </div>

                      </div>

                    </td>

                    <td className="py-3 px-4 font-semibold text-[#1F2933]">
                      {emp.department}
                    </td>

                    <td className="py-3 px-4 text-[#667085]">
                      {emp.email}
                    </td>

                    <td className="py-3 px-4 text-[#667085]">
                      {emp.location}
                    </td>

                    <td className="py-3 px-4">

                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          emp.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : emp.status === 'Remote'
                            ? 'bg-[#B0D0EA] text-[#17324A] border border-[#B0D0EA]'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {emp.status}
                      </span>

                    </td>

                    <td className="py-3 px-4 text-right">

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveEmployee(emp);
                        }}
                        className="text-xs font-semibold text-[#17324A] hover:text-[#17324A]/80"
                      >
                        Details &rarr;
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

      {/* Modals */}
      <EmployeeDetailsModal
        employee={activeEmployee}
        canViewCompensation={currentUser.userRole === 'admin'}
        onClose={() => setActiveEmployee(null)}
      />

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

    </div>
  );
}