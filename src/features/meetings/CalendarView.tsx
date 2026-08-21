'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, List, Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { useMeetings } from '@/features/meetings/hooks/useMeetings';
import type { Meeting, MeetingFilters, MeetingType } from '@/features/meetings/types/meeting';

const pad = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const formatTime = (value: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const formatMonth = (date: Date) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);

function meetingTone(meeting: Meeting) {
  if (meeting.status === 'CANCELLED') return 'border-l-[#8A939D] bg-[#EEF1F4] text-[#4B5563] line-through decoration-[#8A939D]';
  return meeting.type === 'ORG_EVENT'
    ? 'border-l-[#D9A441] bg-[#FFF3D9] text-[#7A5410]'
    : 'border-l-[#C96F58] bg-[#FBEDEA] text-[#8D4333]';
}

export function CalendarView({ onSelect, onSchedule, canSchedule }: { onSelect: (meeting: Meeting) => void; onSchedule: (date: string) => void; canSchedule: boolean }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [type, setType] = useState<MeetingType | 'ALL'>('ALL');
  const [mine, setMine] = useState(false);
  const [department, setDepartment] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [overflowDate, setOverflowDate] = useState<string | null>(null);
  const { currentUser } = useHRMS();
  const filters: MeetingFilters = useMemo(() => ({ type, mine, department }), [type, mine, department]);
  const { data: meetings = [], isLoading, isError, refetch } = useMeetings(filters);
  const monthStart = startOfMonth(cursor);
  const firstDay = new Date(monthStart);
  firstDay.setDate(monthStart.getDate() - monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(firstDay); day.setDate(firstDay.getDate() + index); return day; });
  const visibleMeetings = view === 'day' ? meetings.filter((meeting) => dateKey(new Date(meeting.startsAt)) === selectedDate) : meetings;
  const selectedDay = new Date(`${selectedDate}T00:00:00`);
  const weekStart = new Date(selectedDay);
  weekStart.setDate(selectedDay.getDate() - selectedDay.getDay());
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const daysToRender = view === 'day' ? [selectedDay] : view === 'week' ? weekDays : days;
  const movePeriod = (direction: -1 | 1) => {
    if (view === 'month') {
      setCursor((value) => {
        const next = new Date(value.getFullYear(), value.getMonth() + direction, 1);
        setSelectedDate(dateKey(next));
        return next;
      });
      return;
    }
    const next = new Date(selectedDay);
    next.setDate(selectedDay.getDate() + direction * (view === 'week' ? 7 : 1));
    setSelectedDate(dateKey(next));
    setCursor(startOfMonth(next));
  };
  const goToToday = () => {
    const today = new Date();
    setCursor(startOfMonth(today));
    setSelectedDate(dateKey(today));
  };
  const selectDate = (day: Date) => {
    setSelectedDate(dateKey(day));
    setOverflowDate(null);
    if (view === 'month' && day.getMonth() !== cursor.getMonth()) {
      setCursor(startOfMonth(day));
    }
  };

  return (
    <section className="space-y-4" aria-label="Meetings calendar">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <button aria-label="Previous period" onClick={() => movePeriod(-1)} className="icon-button"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Next period" onClick={() => movePeriod(1)} className="icon-button"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={goToToday} className="toolbar-button">Today</button>
          <h2 className="ml-2 text-lg font-bold text-[#17324A]">{view === 'day' ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date(`${selectedDate}T00:00:00`)) : formatMonth(cursor)}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#9FC2DC] bg-[#EAF2F8] p-1" role="group" aria-label="Calendar view">
            {(['month', 'week', 'day'] as const).map((option) => <button key={option} onClick={() => setView(option)} className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition-colors ${view === option ? 'bg-[#17324A] text-white shadow-sm' : 'text-[#52677A] hover:bg-white hover:text-[#17324A]'}`}>{option}</button>)}
          </div>
          <button onClick={() => setShowFilters((value) => !value)} className="toolbar-button"><Filter className="h-3.5 w-3.5" /> Filters</button>
          <Link href="/meetings/list" className="toolbar-button"><List className="h-3.5 w-3.5" /> List</Link>
          {canSchedule && <button onClick={() => onSchedule(selectedDate)} className="primary-button"><Plus className="h-4 w-4" /> Schedule</button>}
        </div>
      </div>
      {showFilters && <div className="flex flex-wrap items-center gap-3 border-y border-[#D9E5EE] bg-[#F9FBFD] px-3 py-3 text-xs text-[#52677A]">
        <label className="flex items-center gap-2">Type <select value={type} onChange={(event) => setType(event.target.value as MeetingType | 'ALL')} className="field"><option value="ALL">All meetings</option><option value="TEAM">Team meetings</option><option value="ORG_EVENT">Org events</option></select></label>
        <label className="flex items-center gap-2">Department <select value={department} onChange={(event) => setDepartment(event.target.value)} className="field"><option value="ALL">All departments</option><option>AI/ML</option><option>Engineering</option><option>Design</option></select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} /> My meetings only</label>
        <span className="ml-auto text-[11px]">Signed in as {currentUser.name}</span>
      </div>}
      <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-[#52677A]"><span><i className="legend-dot bg-[#C96F58]" /> Team meeting</span><span><i className="legend-dot bg-[#D9A441]" /> Org event</span><span><i className="legend-dot bg-[#8A939D]" /> Cancelled</span></div>
      {isError ? <div className="empty-state"><RefreshCw className="h-5 w-5" /><p>Meetings could not be loaded.</p><button onClick={() => void refetch()} className="toolbar-button">Retry</button></div> : isLoading ? <div className="calendar-grid animate-pulse">{Array.from({ length: 42 }, (_, index) => <div key={index} className="min-h-24 border border-[#D9E5EE] bg-[#F8FAFC]" />)}</div> : <div className={`calendar-grid ${view === 'week' ? 'calendar-week' : ''} ${view === 'day' ? 'calendar-day' : ''}`}>
        {view !== 'day' && ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <div key={label} className="calendar-weekday">{label}</div>)}
        {daysToRender.map((day) => {
          const key = dateKey(day);
          const dayMeetings = visibleMeetings.filter((meeting) => dateKey(new Date(meeting.startsAt)) === key);
          const isToday = key === dateKey(new Date());
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const hasOverflow = dayMeetings.length > 3;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => selectDate(day)}
              onDoubleClick={canSchedule ? () => onSchedule(key) : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectDate(day);
                }
              }}
              aria-label={`${new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(day)}, ${dayMeetings.length} meetings`}
              className={`calendar-cell ${isToday ? 'ring-2 ring-inset ring-[#C96F58]' : ''} ${!isCurrentMonth && view === 'month' ? 'opacity-50' : ''} ${selectedDate === key ? 'bg-[#EAF2F8]' : ''}`}
            >
              <span className={`date-number ${isToday ? 'bg-[#C96F58] text-white' : ''}`}>{day.getDate()}</span>
              <div className="space-y-1 text-left">
                {dayMeetings.slice(0, 3).map((meeting) => (
                  <button
                    type="button"
                    key={meeting.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOverflowDate(null);
                      onSelect(meeting);
                    }}
                    className={`meeting-chip w-full text-left ${meetingTone(meeting)}`}
                  >
                    <b>{meeting.allDay ? 'All day' : formatTime(meeting.startsAt)}</b> {meeting.title}
                  </button>
                ))}
                {hasOverflow && (
                  <div className="relative">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={overflowDate === key}
                      aria-label={`Show all ${dayMeetings.length} meetings for this date`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOverflowDate((value) => value === key ? null : key);
                      }}
                      className="w-full rounded px-1 text-left text-[10px] font-semibold text-[#397CA8] hover:bg-[#EAF2F8]"
                    >
                      +{dayMeetings.length - 3} more meetings
                    </button>
                    {overflowDate === key && (
                      <div
                        role="menu"
                        aria-label={`Meetings on ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(day)}`}
                        className="absolute left-0 top-full z-20 mt-1 min-w-56 rounded-lg border border-[#BFD3E1] bg-white p-1.5 shadow-lg"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {dayMeetings.map((meeting) => (
                          <button
                            type="button"
                            role="menuitem"
                            key={meeting.id}
                            onClick={() => {
                              setOverflowDate(null);
                              onSelect(meeting);
                            }}
                            className="block w-full rounded px-2 py-1.5 text-left text-xs text-[#17324A] hover:bg-[#EAF2F8]"
                          >
                            <span className="block font-semibold">{meeting.title}</span>
                            <span className="text-[10px] text-[#667085]">{meeting.allDay ? 'All day' : formatTime(meeting.startsAt)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>}
    </section>
  );
}

export function MeetingFiltersBar({ onSearch }: { onSearch: (value: string) => void }) {
  return <div className="flex items-center gap-2"><Search className="h-4 w-4 text-[#667085]" /><input onChange={(event) => onSearch(event.target.value)} placeholder="Search meetings" className="field min-w-48" /></div>;
}

export function MeetingHeader({ title, onSchedule, canSchedule }: { title: string; onSchedule: () => void; canSchedule: boolean }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow"><CalendarDays className="h-3.5 w-3.5" /> Collaboration</p><h1 className="page-title">{title}</h1><p className="page-subtitle">Coordinate team conversations and company-wide events.</p></div>{canSchedule && <button onClick={onSchedule} className="primary-button"><Plus className="h-4 w-4" /> Schedule</button>}</div>;
}

export function MeetingSummary({ meetings }: { meetings: Meeting[] }) {
  const upcoming = meetings.filter((meeting) => meeting.status === 'UPCOMING').length;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="summary-tile"><Clock3 className="h-4 w-4 text-[#C96F58]" /><strong>{upcoming}</strong><span>Upcoming</span></div><div className="summary-tile"><Users className="h-4 w-4 text-[#B77C13]" /><strong>{meetings.filter((meeting) => meeting.type === 'TEAM').length}</strong><span>Team meetings</span></div><div className="summary-tile"><CalendarDays className="h-4 w-4 text-[#397CA8]" /><strong>{meetings.filter((meeting) => meeting.type === 'ORG_EVENT').length}</strong><span>Org events</span></div><div className="summary-tile"><X className="h-4 w-4 text-[#667085]" /><strong>{meetings.filter((meeting) => meeting.status === 'CANCELLED').length}</strong><span>Cancelled</span></div></div>;
}
