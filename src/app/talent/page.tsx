'use client';

import { authFetch } from '@/lib/api-client';
import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crown,
  ExternalLink,
  Flame,
  GitPullRequest,
  GraduationCap,
  Layers,
  MapPin,
  Plus,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

export default function TalentPage() {
  const { currentUser, employees } = useHRMS();
  const isAdmin = currentUser.userRole === 'admin';
  const isManager = currentUser.userRole === 'manager';

  const [activeSubTab, setActiveSubTab] = useState<'paths' | 'skills_gap' | 'aspirations' | 'mobility' | 'succession'>('paths');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [talentData, setTalentData] = useState<any>({
    skillGap: null,
    careerPaths: [],
    aspiration: null,
    benchmarks: [],
    talentPools: [],
    successionPlans: [],
  });

  const [aspirationForm, setAspirationForm] = useState({
    targetRole: '',
    targetDepartment: '',
    targetTimeline: '1-2 Years',
    skillsToDevelop: [] as string[],
    managerNotes: '',
  });

  const [mobilityModal, setMobilityModal] = useState<any | null>(null);
  const [mobilityForm, setMobilityForm] = useState({
    targetDepartment: '',
    targetRole: '',
    targetLocation: 'Corporate HQ - Bengaluru',
    reason: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchTalentData = async () => {
    setLoading(true);
    try {
      const res = await authFetch<Response>(`/api/talent?employeeId=${currentUser.id}`, { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTalentData(json.data);
          if (json.data.aspiration) {
            setAspirationForm({
              targetRole: json.data.aspiration.target_role || '',
              targetDepartment: json.data.aspiration.target_department || '',
              targetTimeline: json.data.aspiration.target_timeline || '1-2 Years',
              skillsToDevelop: json.data.aspiration.skills_to_develop || [],
              managerNotes: json.data.aspiration.manager_notes || '',
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching talent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTalentData();
  }, [currentUser.id]);

  const handleSaveAspirations = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch<Response>('/api/talent', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_aspirations',
          employeeId: currentUser.id,
          ...aspirationForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Career aspirations saved successfully!');
        fetchTalentData();
      } else {
        alert(json.error || 'Failed to save aspirations');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyMobility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch<Response>('/api/talent', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_internal_mobility',
          ...mobilityForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Internal mobility application submitted to HR Lifecycle engine!');
        setMobilityModal(null);
      } else {
        alert(json.error || 'Failed to apply');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnrollCourse = async (courseId: string, courseTitle: string) => {
    try {
      const res = await authFetch<Response>('/api/lms', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enroll',
          courseId,
          employeeId: currentUser.id,
        }),
      });
      if (res.ok) {
        showToast(`Enrolled in "${courseTitle}" via LMS!`);
        fetchTalentData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const skillGap = talentData.skillGap;

  return (
    <div className="min-h-screen bg-slate-50/60 p-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-2xl transition-all">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-md shadow-indigo-100">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Career & Talent Ecosystem</h1>
              <p className="text-sm text-slate-500">Career path ladders, skill gap intelligence, internal mobility, and succession pipelines</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-purple-200 bg-purple-50/80 px-4 py-2 text-xs font-bold text-purple-900">
              Current Role: <span className="font-semibold text-purple-700">{(currentUser as any).roleTitle || currentUser.role}</span>
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {[
            { id: 'paths', label: 'Career Paths & Progression', icon: TrendingUp },
            { id: 'skills_gap', label: 'Skill Gap Intelligence', icon: Sparkles },
            { id: 'aspirations', label: 'My Career Aspirations', icon: Target },
            { id: 'mobility', label: 'Internal Mobility Hub', icon: Briefcase },
            { id: 'succession', label: 'Talent Pools & Succession (HR)', icon: Crown, hide: !isAdmin },
          ]
            .filter((t) => !t.hide)
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
        </div>
      </div>

      {/* SUBTAB 1: CAREER PATHS */}
      {activeSubTab === 'paths' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Department Career Growth Ladders</h3>
                <p className="text-xs text-slate-500">Transparent advancement criteria, required skills, and performance benchmarks</p>
              </div>
            </div>

            {/* Engineering Career Progression Ladder */}
            <div className="mt-6 space-y-4">
              {[
                {
                  level: 'L1',
                  role: 'Associate Software Engineer',
                  nextRole: 'Software Engineer',
                  exp: '0 - 2 Years',
                  skills: 'Core TypeScript/Python, Git, Clean Code Principles, Unit Testing',
                  expectations: 'Consistently completes assigned sprint tasks with high code quality.',
                  badgeColor: 'bg-slate-100 text-slate-700',
                },
                {
                  level: 'L2',
                  role: 'Software Engineer',
                  nextRole: 'Senior Software Engineer',
                  exp: '2 - 4 Years',
                  skills: 'Next.js, Node.js, PostgreSQL/Prisma, API Design, Docker',
                  expectations: 'Independently designs and delivers full-stack features and unblocks peers.',
                  badgeColor: 'bg-blue-100 text-blue-800',
                  isCurrent: ((currentUser as any).roleTitle || currentUser.role)?.toLowerCase().includes('engineer'),
                },
                {
                  level: 'L3',
                  role: 'Senior Software Engineer',
                  nextRole: 'Lead AI Engineer',
                  exp: '4 - 7 Years',
                  skills: 'System Architecture, Microservices, Performance Optimization, Code Reviews',
                  expectations: 'Architects scalable systems, mentors junior developers, and leads release trains.',
                  badgeColor: 'bg-indigo-100 text-indigo-800',
                },
                {
                  level: 'L4',
                  role: 'Lead AI Engineer / Technical Lead',
                  nextRole: 'Principal Architect',
                  exp: '7 - 10 Years',
                  skills: 'LLM Orchestration, Cloud Architecture, Scalability, Cross-Team Delivery',
                  expectations: 'Drives technical vision, leads cross-functional teams, and sets architectural standards.',
                  badgeColor: 'bg-purple-100 text-purple-800',
                },
                {
                  level: 'L5',
                  role: 'Principal Architect / Director of Engineering',
                  nextRole: 'VP of Engineering',
                  exp: '10+ Years',
                  skills: 'Enterprise Strategy, Multi-Cloud Governance, Executive Alignment, Org Scaling',
                  expectations: 'Defines long-term technical roadmap, organizational hiring standards, and executive alignment.',
                  badgeColor: 'bg-amber-100 text-amber-800',
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-5 transition-all ${
                    step.isCurrent
                      ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-xl px-3 py-1 text-xs font-bold ${step.badgeColor}`}>
                        {step.level}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          {step.role}
                          {step.isCurrent && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              Your Current Level
                            </span>
                          )}
                        </h4>
                        <div className="text-xs text-slate-500">Typical Experience: {step.exp}</div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-600">
                      <span className="font-semibold text-indigo-700">Next Step:</span> {step.nextRole}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">Required Skills & Capabilities:</span>
                      <p className="mt-1 text-slate-600 leading-relaxed">{step.skills}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Performance Expectations:</span>
                      <p className="mt-1 text-slate-600 leading-relaxed">{step.expectations}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: SKILLS GAP INTELLIGENCE */}
      {activeSubTab === 'skills_gap' && (
        <div className="space-y-6">
          {/* Readiness Score Card */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
                  <Sparkles className="h-3.5 w-3.5" />
                  Target Role Readiness
                </span>
                <h3 className="mt-2 text-2xl font-bold">
                  {skillGap?.targetRole || `Senior ${(currentUser as any).roleTitle || currentUser.role}`}
                </h3>
                <p className="mt-1 text-xs text-indigo-200">
                  Assessing your existing proficiency against target benchmarks
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5 text-center backdrop-blur-sm border border-white/10">
                <div className="text-3xl font-black text-white">{skillGap?.readinessPercentage ?? 80}%</div>
                <div className="text-xs font-semibold text-indigo-200">Role Readiness Score</div>
              </div>
            </div>
          </div>

          {/* Skill Gap Items Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Detailed Skill Gap Matrix</h3>
                <p className="text-xs text-slate-500">Current proficiency vs target benchmark with direct LMS training integration</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Skill</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Current Level</th>
                    <th className="p-3">Required Level</th>
                    <th className="p-3">Gap Status</th>
                    <th className="p-3 text-right">Recommended Learning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {skillGap?.gaps?.map((gap: any) => (
                    <tr key={gap.skillId} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{gap.skillName}</td>
                      <td className="p-3 text-slate-500">{gap.category}</td>
                      <td className="p-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
                          {gap.currentProficiency} (L{gap.currentLevel})
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-800 font-bold">
                          {gap.requiredProficiency} (L{gap.requiredLevel})
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            gap.status === 'Met' || gap.status === 'Exceeds'
                              ? 'bg-emerald-100 text-emerald-800'
                              : gap.priority === 'Critical'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {gap.status === 'Met' ? 'Met Target' : gap.status === 'Exceeds' ? 'Exceeds' : `Gap: -${gap.gapLevels} Levels`}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {gap.recommendedCourse ? (
                          <button
                            onClick={() => handleEnrollCourse(gap.recommendedCourse.id, gap.recommendedCourse.title)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            <GraduationCap className="h-3.5 w-3.5" />
                            {gap.recommendedCourse.isEnrolled ? 'In Progress in LMS' : 'Enroll in LMS Course'}
                          </button>
                        ) : (
                          <span className="text-slate-400">On-the-job Coaching</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: MY CAREER ASPIRATIONS */}
      {activeSubTab === 'aspirations' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">My Career Aspirations & Growth Plan</h3>
                <p className="text-xs text-slate-500">Declare your desired career trajectory and discuss action items with your manager</p>
              </div>
            </div>

            <form onSubmit={handleSaveAspirations} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Target Role Title</label>
                  <input
                    type="text"
                    required
                    value={aspirationForm.targetRole}
                    onChange={(e) => setAspirationForm({ ...aspirationForm, targetRole: e.target.value })}
                    placeholder="e.g. Lead AI Engineer / Engineering Manager"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Desired Timeline</label>
                  <select
                    value={aspirationForm.targetTimeline}
                    onChange={(e) => setAspirationForm({ ...aspirationForm, targetTimeline: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none cursor-pointer"
                  >
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                    <option value="1-2 Years">1 - 2 Years</option>
                    <option value="2-3 Years">2 - 3 Years</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Key Skills to Master</label>
                <input
                  type="text"
                  value={aspirationForm.skillsToDevelop.join(', ')}
                  onChange={(e) =>
                    setAspirationForm({
                      ...aspirationForm,
                      skillsToDevelop: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                  placeholder="e.g. LLM Systems, Microservices Architecture, People Leadership (comma separated)"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              {aspirationForm.managerNotes && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <span className="text-xs font-bold text-indigo-900">Manager 1-on-1 Coaching Notes:</span>
                  <p className="mt-1 text-xs text-indigo-800 leading-relaxed">{aspirationForm.managerNotes}</p>
                </div>
              )}

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Save Career Aspirations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 4: INTERNAL MOBILITY HUB */}
      {activeSubTab === 'mobility' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Internal Job Openings & Mobility</h3>
              <p className="text-xs text-slate-500">Explore open cross-department transfer opportunities within the company</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Lead AI Engineer',
                department: 'Engineering / AI Innovation',
                location: 'Bengaluru (Hybrid)',
                openings: 2,
                desc: 'Lead the next-generation autonomous workflows and AI agent toolchains for enterprise HRMS.',
              },
              {
                title: 'Staff Platform Architect',
                department: 'Cloud Infrastructure',
                location: 'Mumbai / Remote',
                openings: 1,
                desc: 'Scale high-throughput multi-region database replication and real-time microservices.',
              },
              {
                title: 'Product Operations Lead',
                department: 'Operations',
                location: 'Gurugram',
                openings: 1,
                desc: 'Align lifecycle processes, compliance validation, and enterprise customer success.',
              },
            ].map((job, idx) => (
              <div key={idx} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      {job.department}
                    </span>
                    <span className="text-[10px] text-slate-400">{job.openings} Openings</span>
                  </div>
                  <h4 className="mt-3 text-base font-bold text-slate-900">{job.title}</h4>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{job.location}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">{job.desc}</p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => {
                      setMobilityModal(job);
                      setMobilityForm({
                        targetDepartment: job.department,
                        targetRole: job.title,
                        targetLocation: job.location,
                        reason: `Applied for ${job.title} via internal mobility hub.`,
                      });
                    }}
                    className="w-full rounded-xl bg-indigo-600 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    Apply for Internal Transfer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: TALENT POOLS & SUCCESSION (HR ADMIN ONLY) */}
      {activeSubTab === 'succession' && isAdmin && (
        <div className="space-y-6">
          {/* 9-Box Talent Matrix Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">9-Box Performance vs Potential Talent Matrix</h3>
                <p className="text-xs text-slate-500">Executive talent mapping and high-potential calibration</p>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                Confidential HR Access
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="font-bold text-emerald-900">Top Talent (Star)</div>
                <div className="text-[10px] text-emerald-700">High Perf / High Pot</div>
                <div className="mt-2 text-xs font-semibold text-slate-800">Ayush Vishnoi, Priya S.</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="font-bold text-blue-900">High Performer</div>
                <div className="text-[10px] text-blue-700">High Perf / Med Pot</div>
                <div className="mt-2 text-xs font-semibold text-slate-800">Arjun Mehta, Sneha P.</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                <div className="font-bold text-indigo-900">High Potential</div>
                <div className="text-[10px] text-indigo-700">Med Perf / High Pot</div>
                <div className="mt-2 text-xs font-semibold text-slate-800">Vikram Rao</div>
              </div>
            </div>
          </div>

          {/* Succession Planning Pipelines */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Critical Leadership Succession Pipelines</h3>
                <p className="text-xs text-slate-500">Readiness classification: Ready Now, Ready in 1-2 Years, Developing</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {[
                {
                  role: 'VP of Engineering / Head of Tech',
                  incumbent: 'Priya Sharma (EMP-006)',
                  emergency: 'Arjun Mehta (EMP-002)',
                  successors: [
                    { name: 'Ayush Vishnoi', readiness: 'READY_NOW', note: 'Top architecture delivery & system ownership' },
                    { name: 'Arjun Mehta', readiness: 'READY_1_2_YEARS', note: 'Management readiness coaching in progress' },
                  ],
                },
                {
                  role: 'Lead Architect',
                  incumbent: 'Ayush Vishnoi (EMP-001)',
                  emergency: 'Vikram Rao (EMP-004)',
                  successors: [
                    { name: 'Sneha Patil', readiness: 'READY_1_2_YEARS', note: 'Cloud & microservices training completed' },
                  ],
                },
              ].map((pipe, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{pipe.role}</h4>
                      <div className="text-xs text-slate-500">Incumbent: {pipe.incumbent}</div>
                    </div>
                    <div className="text-xs font-semibold text-rose-700">
                      Emergency Successor: {pipe.emergency}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-200/60 pt-3">
                    <div className="text-xs font-bold text-slate-700">Successor Bench:</div>
                    {pipe.successors.map((s, sIdx) => (
                      <div key={sIdx} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-900">{s.name}</span>
                          <span className="ml-2 text-slate-500">— {s.note}</span>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          {s.readiness === 'READY_NOW' ? 'Ready Now' : 'Ready in 1-2 Years'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INTERNAL MOBILITY MODAL */}
      {mobilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Apply for Internal Transfer</h3>
                <p className="text-xs text-slate-500">{mobilityModal.title} ({mobilityModal.department})</p>
              </div>
              <button onClick={() => setMobilityModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyMobility} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Reason for Transfer / Statement of Interest</label>
                <textarea
                  rows={3}
                  required
                  value={mobilityForm.reason}
                  onChange={(e) => setMobilityForm({ ...mobilityForm, reason: e.target.value })}
                  placeholder="Explain why you are interested in this role and how your current skills align..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none"
                />
              </div>

              <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800">
                This request will be routed through the existing HR Lifecycle Change Request workflow for Manager and HR endorsement.
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setMobilityModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
