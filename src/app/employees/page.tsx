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
import { useHRMS } from '@/context/HRMSContext';
import { Employee } from '@/data/mockData';
import { EmployeeDetailsModal } from '@/components/modals/EmployeeDetailsModal';
import { AddEmployeeModal } from '@/components/modals/AddEmployeeModal';

export default function EmployeesPage() {
  const { employees, currentUser } = useHRMS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const canAddEmployee = currentUser.userRole === 'admin' || currentUser.userRole === 'manager';

  const departments = ['All', 'Engineering', 'Design', 'Human Resources', 'Marketing', 'Finance'];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'All' || emp.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase text-[#B86B78]">People directory</p>
          <h1 className="text-xl font-bold text-[#F0F2F5] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B86B78]" />
            Employee Management Directory
          </h1>
          <p className="text-xs text-[#8B949E]">View team members, organization hierarchy, and contact profiles</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canAddEmployee && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-md bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add New Employee
            </button>
          )}

          <div className="flex items-center bg-[#161b22] border border-[#30363d] p-1 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              title="Grid view"
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'grid' ? 'bg-[#8B3A4A] text-white' : 'text-[#8B949E] hover:text-[#F0F2F5] hover:bg-[#21262d]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              title="List view"
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'list' ? 'bg-[#8B3A4A] text-white' : 'text-[#8B949E] hover:text-[#F0F2F5] hover:bg-[#21262d]'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Role Permission Notice */}
      <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-[#8B949E]">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#B86B78] shrink-0" />
          <span>
            Permission level: <strong className="text-[#F0F2F5] uppercase">{currentUser.userRole}</strong>.
            {canAddEmployee
              ? ' You can onboard and edit employee records.'
              : ' You have view-only access to the employee directory.'}
          </span>
        </div>
        <span className="font-bold text-[#F0F2F5] whitespace-nowrap">{filteredEmployees.length} members listed</span>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, designation, email, or code..."
            className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#F0F2F5] placeholder-[#8B949E] focus:outline-none focus:border-[#8B3A4A] focus:ring-2 focus:ring-[#8B3A4A]/20"
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
                  ? 'bg-[#8B3A4A] text-white'
                  : 'bg-[#21262d] text-[#8B949E] hover:text-[#F0F2F5] border border-[#30363d]'
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
              className="p-5 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[#8B3A4A]/60 transition-colors cursor-pointer group shadow-md flex flex-col justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#8B3A4A]"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-14 h-14 rounded-lg object-cover border border-[#30363d] ring-2 ring-[#8B3A4A]/10"
                  />
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      emp.status === 'Active'
                        ? 'bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30'
                        : emp.status === 'Remote'
                        ? 'bg-[#8B3A4A]/15 text-[#B86B78] border border-[#8B3A4A]/30'
                        : 'bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20'
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#F0F2F5] group-hover:text-[#B86B78] transition-colors">
                    {emp.name}
                  </h3>
                  <p className="text-xs text-[#B86B78] font-medium">{emp.role}</p>
                  <span className="text-[11px] text-[#6e7681] font-mono mt-0.5 block">{emp.employeeCode}</span>
                </div>

                <div className="pt-2 border-t border-[#30363d] space-y-1.5 text-xs text-[#8B949E]">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#6e7681]" />
                    <span>{emp.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#6e7681]" />
                    <span>{emp.location}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center justify-between text-xs text-[#B86B78] font-semibold">
                <span>View full profile</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Employees List View */
        <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#30363d] text-[#8B949E] font-semibold bg-[#21262d]/50">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d] text-[#F0F2F5]">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setActiveEmployee(emp)}
                    className="hover:bg-[#21262d]/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full object-cover border border-[#30363d]" />
                        <div>
                          <p className="font-bold text-[#F0F2F5]">{emp.name}</p>
                          <p className="text-[11px] text-[#8B949E]">{emp.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#F0F2F5]">{emp.department}</td>
                    <td className="py-3 px-4 text-[#8B949E]">{emp.email}</td>
                    <td className="py-3 px-4 text-[#8B949E]">{emp.location}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          emp.status === 'Active'
                            ? 'bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30'
                            : emp.status === 'Remote'
                            ? 'bg-[#8B3A4A]/15 text-[#B86B78] border border-[#8B3A4A]/30'
                            : 'bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-xs font-semibold text-[#B86B78] hover:text-[#d18b97]">
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
      <EmployeeDetailsModal employee={activeEmployee} onClose={() => setActiveEmployee(null)} />
      <AddEmployeeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
