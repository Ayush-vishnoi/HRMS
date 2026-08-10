'use client';

import React from 'react';
import { X, Mail, Phone, MapPin, Calendar, Briefcase, Building2, WalletCards } from 'lucide-react';
import { Employee } from '@/data/mockData';

interface EmployeeDetailsModalProps {
  employee: Employee | null;
  canViewCompensation: boolean;
  onClose: () => void;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  employee,
  canViewCompensation,
  onClose,
}) => {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#B0D0EA] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Banner Header */}
        <div className="relative flex h-28 items-start justify-between bg-gradient-to-r from-[#17324A] via-[#2E6288] to-[#6FA6C9] p-4">
          <span className="rounded-full border border-white/30 bg-[#17324A]/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {employee.employeeCode}
          </span>
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="rounded-full bg-[#17324A]/35 p-1.5 text-white transition-colors hover:bg-[#17324A]/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="relative px-6 pb-6 pt-0">
          {/* Avatar Overlay */}
          <div className="-mt-12 mb-4 flex items-end justify-between">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-xl ring-2 ring-[#B0D0EA]"
            />
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                employee.status === 'Active'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : employee.status === 'Remote'
                    ? 'border-[#B0D0EA] bg-[#EAF2F8] text-[#2E6288]'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              • {employee.status}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#17324A]">{employee.name}</h2>
            <p className="text-xs font-medium text-[#2E6288]">{employee.role}</p>
          </div>

          {/* Quick Info Grid */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-3">
              <Building2 className="h-4 w-4 shrink-0 text-[#6B879B]" />
              <div>
                <span className="block text-[10px] font-semibold uppercase text-[#7A91A1]">Department</span>
                <span className="text-xs font-semibold text-[#17324A]">{employee.department}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-3">
              <Briefcase className="h-4 w-4 shrink-0 text-[#6B879B]" />
              <div>
                <span className="block text-[10px] font-semibold uppercase text-[#7A91A1]">Reporting Manager</span>
                <span className="text-xs font-semibold text-[#17324A]">{employee.manager}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-3">
              <Mail className="h-4 w-4 shrink-0 text-[#6B879B]" />
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase text-[#7A91A1]">Email Address</span>
                <span className="block truncate text-xs font-semibold text-[#17324A]">{employee.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-3">
              <Phone className="h-4 w-4 shrink-0 text-[#6B879B]" />
              <div>
                <span className="block text-[10px] font-semibold uppercase text-[#7A91A1]">Phone Number</span>
                <span className="text-xs font-semibold text-[#17324A]">{employee.phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-3">
              <MapPin className="h-4 w-4 shrink-0 text-[#6B879B]" />
              <div>
                <span className="block text-[10px] font-semibold uppercase text-[#7A91A1]">Location</span>
                <span className="text-xs font-semibold text-[#17324A]">{employee.location}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-3">
              <Calendar className="h-4 w-4 shrink-0 text-[#6B879B]" />
              <div>
                <span className="block text-[10px] font-semibold uppercase text-[#7A91A1]">Joining Date</span>
                <span className="text-xs font-semibold text-[#17324A]">{employee.joinDate}</span>
              </div>
            </div>
          </div>

          {/* Compensation details are available to HR Admin and remain private for managers. */}
          {canViewCompensation ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <WalletCards className="h-5 w-5 text-emerald-700" />
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-700">Annual compensation</span>
                <p className="text-sm font-bold text-[#17324A]">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                  }).format(employee.salary)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#B0D0EA] bg-[#EAF2F8] p-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#6B879B]">Compensation details</span>
                <p className="text-sm font-bold text-[#17324A]">Restricted to authorised payroll workflows</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
