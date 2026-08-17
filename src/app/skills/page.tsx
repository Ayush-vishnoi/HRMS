'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type SkillMaster = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
};

type EmployeeSkill = {
  id: string;
  employeeId: string;
  skillId: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  yearsExp: number;
  verified: boolean;
  skill: SkillMaster;
};

const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

export default function SkillsPage() {
  const { currentUser, employees } = useHRMS();
  const [allSkills, setAllSkills] = useState<SkillMaster[]>([]);
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [selectedSkillName, setSelectedSkillName] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [proficiency, setProficiency] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>('Advanced');
  const [yearsExp, setYearsExp] = useState('3.0');

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/skills?employeeId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAllSkills(json.data.allSkills || []);
          setEmployeeSkills(json.data.employeeSkills || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [currentUser.id]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillName) return;

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: currentUser.id,
          skillName: selectedSkillName,
          category,
          proficiency,
          yearsExp: Number(yearsExp),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSelectedSkillName('');
        await fetchSkills();
      }
    } catch (err) {
      console.error('Failed to add skill:', err);
    }
  };

  const filteredSkills = useMemo(() => {
    return employeeSkills.filter((es) => {
      const text = `${es.skill.name} ${es.skill.category} ${es.proficiency}`.toLowerCase();
      const matchSearch = !searchQuery || text.includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'All' || es.skill.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [employeeSkills, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(allSkills.map((s) => s.category)))];
  }, [allSkills]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <BrainCircuit className="h-4 w-4" /> Talent & Skills Intelligence
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Skills Matrix & Intelligence
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            Manage technical & functional competency benchmarks, verified manager endorsements, and career path alignment.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4 text-white" />
          Endorse New Skill
        </button>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            VERIFIED SKILLS ENDORSED
          </span>
          <div className="text-3xl font-black text-[#17324A] tracking-tight">
            {employeeSkills.length} Competencies
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-emerald-600 font-semibold">
            100% Manager Verified
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            TOP SPECIALIZATION
          </span>
          <div className="text-2xl font-black text-[#315B76] tracking-tight">
            AI/ML & Full-Stack
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
            Primary engineering discipline
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            CAREER BENCHMARK
          </span>
          <div className="text-xl font-bold text-[#17324A] tracking-tight">
            Senior Platform Engineer Track
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-blue-600 font-semibold">
            Next Milestone: Staff Engineer
          </div>
        </div>
      </div>

      {/* Skills Matrix Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#17324A] text-white shadow-sm'
                    : 'bg-[#EAF2F8] text-[#52677A] hover:bg-[#DCECF7]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <label className="relative block">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#667085]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skill, competency..."
              className="rounded-lg border border-[#9FC2DC] py-1.5 pl-8 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] sm:w-60"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((es) => (
            <div
              key={es.id}
              className="p-4 rounded-xl border border-[#D9E5EE] bg-white hover:border-[#9FC2DC] transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B91B5]">
                    {es.skill.category}
                  </span>
                  <h3 className="text-sm font-bold text-[#17324A]">{es.skill.name}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    es.proficiency === 'Expert'
                      ? 'bg-purple-100 text-purple-700'
                      : es.proficiency === 'Advanced'
                      ? 'bg-emerald-100 text-emerald-700'
                      : es.proficiency === 'Intermediate'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {es.proficiency}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#667085] pt-2 border-t border-[#F0F4F8]">
                <span>Experience: <strong>{es.yearsExp} Years</strong></span>
                {es.verified && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredSkills.length === 0 && !loading && (
            <div className="col-span-full py-8 text-center text-xs text-[#667085]">
              No skills found matching your filter criteria. Click &quot;Endorse New Skill&quot; to add.
            </div>
          )}
        </div>
      </div>

      {/* Add Skill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#D9E5EE] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF2F8] pb-3">
              <h3 className="text-base font-bold text-[#17324A]">Endorse Skill</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1 text-[#667085]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Skill Name *</label>
                <input
                  required
                  value={selectedSkillName}
                  onChange={(e) => setSelectedSkillName(e.target.value)}
                  placeholder="e.g. Distributed Systems Architecture, Python ML"
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="AI/ML">AI/ML</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">Proficiency</label>
                  <select
                    value={proficiency}
                    onChange={(e) => setProficiency(e.target.value as any)}
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                  >
                    {PROFICIENCY_LEVELS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Years of Experience</label>
                <input
                  type="number"
                  step="0.5"
                  value={yearsExp}
                  onChange={(e) => setYearsExp(e.target.value)}
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAF2F8]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#17324A] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#244A68]"
                >
                  Save to Skills Matrix
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
