'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Mail,
  Phone,
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
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Employee Management Directory
          </h1>
          <p className="text-xs text-slate-400">View team members, organization hierarchy, and contact profiles</p>
        </div>

        <div className="flex items-center gap-3">
          {canAddEmployee && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add New Employee
            </button>
          )}

          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Role Permission Notice */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>
            Permission Level: <strong className="text-slate-200 uppercase">{currentUser.userRole}</strong>.
            {canAddEmployee
              ? ' You have full authorization to onboard & edit employee records.'
              : ' View-only access to company employee directory.'}
          </span>
        </div>
        <span className="font-bold text-slate-200">{filteredEmployees.length} Members Listed</span>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, designation, email, or code..."
            className="w-full pl-9 pr-4 py-2 bg-slate-850 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedDept === dept
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => setActiveEmployee(emp)}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group shadow-md flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-700 ring-2 ring-indigo-500/10 group-hover:scale-105 transition-transform"
                  />
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : emp.status === 'Remote'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {emp.name}
                  </h3>
                  <p className="text-xs text-indigo-300 font-medium">{emp.role}</p>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">{emp.employeeCode}</span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{emp.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{emp.location}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                <span>View Full Profile</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Employees List View */
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-850/50">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setActiveEmployee(emp)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-slate-100">{emp.name}</p>
                          <p className="text-[11px] text-slate-400">{emp.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{emp.department}</td>
                    <td className="py-3 px-4 text-slate-400">{emp.email}</td>
                    <td className="py-3 px-4 text-slate-400">{emp.location}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : emp.status === 'Remote'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
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
