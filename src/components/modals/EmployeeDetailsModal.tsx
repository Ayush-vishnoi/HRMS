'use client';

import React from 'react';
import { X, Mail, Phone, MapPin, Calendar, Briefcase, Building2, UserCheck, DollarSign } from 'lucide-react';
import { Employee } from '@/data/mockData';
import { formatINR } from '@/utils/formatters';

interface EmployeeDetailsModalProps {
  employee: Employee | null;
  onClose: () => void;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ employee, onClose }) => {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Banner Header */}
        <div className="h-28 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 relative p-4 flex items-start justify-between">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-900/60 text-slate-200 border border-slate-700/50 backdrop-blur-sm">
            {employee.employeeCode}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar Overlay */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-slate-900 ring-2 ring-indigo-500/30 shadow-xl"
            />
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                employee.status === 'Active'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : employee.status === 'Remote'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              • {employee.status}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-100">{employee.name}</h2>
            <p className="text-xs text-indigo-400 font-medium">{employee.role}</p>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center gap-3">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Department</span>
                <span className="text-xs font-semibold text-slate-200">{employee.department}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Reporting Manager</span>
                <span className="text-xs font-semibold text-slate-200">{employee.manager}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Email Address</span>
                <span className="text-xs font-semibold text-slate-200 truncate block">{employee.email}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Phone Number</span>
                <span className="text-xs font-semibold text-slate-200">{employee.phone}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Location</span>
                <span className="text-xs font-semibold text-slate-200">{employee.location}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Joining Date</span>
                <span className="text-xs font-semibold text-slate-200">{employee.joinDate}</span>
              </div>
            </div>
          </div>

          {/* Salary / Tier */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-850 to-slate-800 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Annual Compensation</span>
                <p className="text-sm font-bold text-slate-100">{formatINR(employee.salary)} / year</p>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-600 transition-colors">
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
