'use client';

import React, { useState } from 'react';
import {
  Crown,
  ChevronDown,
  ChevronRight,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Employee, MOCK_EMPLOYEES } from '@/data/mockData';

interface OrgNodeProps {
  employee: Employee;
  subordinates?: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  level: number;
}

export const OrgNode: React.FC<OrgNodeProps> = ({
  employee,
  subordinates = [],
  onSelectEmployee,
  level,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const levelBadges: Record<number, { title: string; color: string }> = {
    0: { title: 'Executive Officer (CEO)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    1: { title: 'Department Head / Manager', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    2: { title: 'Team Lead', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    3: { title: 'Individual Contributor', color: 'bg-[#F5F9FC] text-[#17324A] border-[#D9E5EE]' },
  };

  const badge = levelBadges[level] || levelBadges[3];

  return (
    <div className="flex flex-col items-center select-none">
      {/* Node Card */}
      <div
        onClick={() => onSelectEmployee(employee)}
        className={`relative p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md hover:shadow-lg transition-all cursor-pointer w-64 text-center group hover:border-[#17324A] ${
          level === 0 ? 'ring-2 ring-purple-400' : ''
        }`}
      >
        {/* Level Indicator Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shadow-xs flex items-center gap-1 ${badge.color}`}>
            {level === 0 && <Crown className="w-3 h-3 text-purple-700" />}
            {badge.title}
          </span>
        </div>

        <div className="pt-2 flex flex-col items-center space-y-2">
          <img
            src={employee.avatar}
            alt={employee.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-[#B0D0EA] shadow-xs group-hover:scale-105 transition-transform"
          />

          <div>
            <h4 className="text-sm font-black text-[#17324A] group-hover:text-purple-700 transition-colors">
              {employee.name}
            </h4>
            <p className="text-xs font-semibold text-[#5F7180]">{employee.role}</p>
            <span className="text-[10px] font-mono text-[#5F7180] bg-[#F5F9FC] px-2 py-0.5 rounded mt-1 inline-block border border-[#D9E5EE]">
              {employee.department} • {employee.employeeCode}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[#5F7180] pt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {employee.location.split(',')[0]}
            </span>
          </div>
        </div>

        {/* Expand/Collapse toggle button if subordinates exist */}
        {subordinates.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#17324A] text-white flex items-center justify-center shadow-md hover:bg-[#234B68] transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Subordinate branches connection line */}
      {subordinates.length > 0 && isExpanded && (
        <div className="flex flex-col items-center w-full">
          <div className="w-0.5 h-6 bg-[#B0D0EA]" />

          {/* Subordinates Row */}
          <div className="flex items-start justify-center gap-8 relative pt-2">
            {subordinates.map((sub, idx) => {
              // Find grandchildren
              const grandChildren = MOCK_EMPLOYEES.filter(
                (emp) => emp.manager === sub.name
              );

              return (
                <div key={sub.id} className="relative flex flex-col items-center">
                  <OrgNode
                    employee={sub}
                    subordinates={grandChildren}
                    onSelectEmployee={onSelectEmployee}
                    level={level + 1}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const OrgChart: React.FC<{ onSelectEmployee: (emp: Employee) => void }> = ({
  onSelectEmployee,
}) => {
  const ceo = MOCK_EMPLOYEES.find((emp) => emp.role.includes('CEO')) || MOCK_EMPLOYEES[0];
  const directReports = MOCK_EMPLOYEES.filter((emp) => emp.manager === ceo.name);

  return (
    <div className="p-8 rounded-2xl bg-white border border-[#B0D0EA] shadow-md overflow-x-auto min-h-[600px] flex flex-col items-center justify-start">
      <div className="text-center space-y-1 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Crown className="w-3.5 h-3.5 text-purple-700" />
          Interactive Corporate Hierarchy Chart
        </div>
        <h3 className="text-xl font-black text-[#17324A]">
          Apex HRMS Organization Structure
        </h3>
        <p className="text-xs text-[#5F7180]">
          Drill down through executive leadership, department managers, team leads, and staff
        </p>
      </div>

      <OrgNode
        employee={ceo}
        subordinates={directReports}
        onSelectEmployee={onSelectEmployee}
        level={0}
      />
    </div>
  );
};
