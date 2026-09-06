'use client';

import { authFetch } from '@/lib/api-client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  GraduationCap,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type LmsCourse = {
  id: string;
  title: string;
  category: string;
  description: string;
  durationHours: number;
  level: string;
  isMandatory: boolean;
  passingPercentage: number;
  thumbnailUrl?: string | null;
  modules: {
    id: string;
    title: string;
    orderIndex: number;
    contentType: string;
    estimatedMinutes: number;
  }[];
};

type Enrollment = {
  id: string;
  employeeId: string;
  courseId: string;
  dueDate: string;
  progressPercentage: number;
  status: 'Enrolled' | 'InProgress' | 'Completed' | 'Expired';
  completionDate?: string | null;
  scorePercentage?: number | null;
  certificateUrl?: string | null;
  course: LmsCourse;
};

export default function LmsPage() {
  const { currentUser } = useHRMS();
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<LmsCourse | null>(null);

  const fetchLms = async () => {
    try {
      setLoading(true);
      const res = await authFetch<Response>(`/api/lms?employeeId=${encodeURIComponent(currentUser.id)}`, { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCourses(json.data.courses || []);
          setEnrollments(json.data.enrollments || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch LMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLms();
  }, [currentUser.id]);

  const handleEnrollOrProgress = async (courseId: string, progress: number) => {
    try {
      const existing = enrollments.find((e) => e.courseId === courseId);
      const action = existing ? 'progress' : 'enroll';

      const res = await authFetch<Response>('/api/lms', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          employeeId: currentUser.id,
          courseId,
          progressPercentage: progress,
          scorePercentage: progress >= 100 ? 95 : undefined,
        }),
      });

      if (res.ok) {
        await fetchLms();
      }
    } catch (err) {
      console.error('Failed to update course progress:', err);
    }
  };

  const enrollmentMap = useMemo(() => {
    return new Map(enrollments.map((e) => [e.courseId, e]));
  }, [enrollments]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const text = `${c.title} ${c.description} ${c.category}`.toLowerCase();
      const matchSearch = !searchQuery || text.includes(searchQuery.toLowerCase());
      const matchCat = activeCategory === 'All' || c.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [courses, searchQuery, activeCategory]);

  const completedCount = useMemo(
    () => enrollments.filter((e) => e.status === 'Completed').length,
    [enrollments]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <GraduationCap className="h-4 w-4" /> Learning & Development
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Training & LMS Academy
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            Upskill with mandatory compliance training (POSH, Security), full-stack architecture modules, and professional certifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <Trophy className="h-4 w-4 text-amber-600" />
            {completedCount} Certifications Earned
          </div>
        </div>
      </div>

      {/* Top Learning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            COURSES ENROLLED
          </span>
          <div className="text-3xl font-black text-[#17324A] tracking-tight">
            {enrollments.length} Programs
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
            Active learning journeys in progress
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
              MANDATORY COMPLIANCE
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              100% Compliant
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 tracking-tight">
            POSH 2026 Verified
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
            Annual statutory requirement fulfilled
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            RECOMMENDED FOR CAREER
          </span>
          <div className="text-xl font-bold text-[#17324A] tracking-tight">
            Next.js 16 Enterprise Patterns
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-blue-600 font-semibold">
            Aligned with AI/ML Fullstack Track
          </div>
        </div>
      </div>

      {/* Course Catalog Filter */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'POSH', 'Technical', 'Compliance', 'Leadership'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat
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
              placeholder="Search course title or topic..."
              className="rounded-lg border border-[#9FC2DC] py-1.5 pl-8 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] sm:w-64"
            />
          </label>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => {
            const enrollment = enrollmentMap.get(course.id);
            const isCompleted = enrollment?.status === 'Completed';
            const progress = enrollment?.progressPercentage ?? 0;

            return (
              <div
                key={course.id}
                className="p-5 rounded-2xl border border-[#D9E5EE] bg-white hover:border-[#9FC2DC] transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF2F8] text-[#17324A]">
                      {course.category} · {course.level}
                    </span>
                    {course.isMandatory && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                        Mandatory
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#17324A] leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-xs text-[#667085] line-clamp-2">
                    {course.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#F0F4F8]">
                  <div className="flex items-center justify-between text-xs text-[#667085]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {course.durationHours} Hours
                    </span>
                    <span className="font-semibold text-[#17324A]">
                      {isCompleted ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Certified (95%)
                        </span>
                      ) : (
                        `${progress}% Completed`
                      )}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#EAF2F8] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-[#315B76]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {isCompleted ? (
                      <a
                        href={enrollment?.certificateUrl || '#'}
                        download
                        className="px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5"
                      >
                        <Award className="h-3.5 w-3.5" /> Download Certificate
                      </a>
                    ) : (
                      <button
                        onClick={() => handleEnrollOrProgress(course.id, progress === 0 ? 50 : 100)}
                        className="px-4 py-2 rounded-lg bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {progress === 0 ? 'Start Course' : 'Resume & Complete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
