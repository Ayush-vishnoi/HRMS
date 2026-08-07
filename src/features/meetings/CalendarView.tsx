'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, List, Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useHRMS } from '@/context/HRMSContext';
import { useMeetings } from '@/features/meetings/hooks/useMeetings';
import type { Meeting, MeetingFilters, MeetingType } from '@/types/meeting';

const pad = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const formatTime = (value: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const formatMonth = (date: Date) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);

function meetingTone(meeting: Meeting) {
  if (meeting.status === 'CANCELLED') return 'border-l-[#6e7681] bg-[#21262d]/50 text-[#8b949e]';
  return meeting.type === 'ORG_EVENT' ? 'border-l-[#d29922] bg-[#9e6a03]/15 text-[#f2cc60]' : 'border-l-[#8B3A4A] bg-[#8B3A4A]/15 text-[#e8a0ad]';
}

export function CalendarView({ onSelect, onSchedule }: { onSelect: (meeting: Meeting) => void; onSchedule: (date: string) => void }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date('2026-08-07T00:00:00')));
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [type, setType] = useState<MeetingType | 'ALL'>('ALL');
  const [mine, setMine] = useState(false);
  const [department, setDepartment] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date('2026-08-07T00:00:00')));
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
      setCursor((value) => new Date(value.getFullYear(), value.getMonth() + direction, 1));
      return;
    }
    const next = new Date(selectedDay);
    next.setDate(selectedDay.getDate() + direction * (view === 'week' ? 7 : 1));
    setSelectedDate(dateKey(next));
    setCursor(startOfMonth(next));
  };

  return (
    <section className="space-y-4" aria-label="Meetings calendar">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <button aria-label="Previous period" onClick={() => movePeriod(-1)} className="icon-button"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Next period" onClick={() => movePeriod(1)} className="icon-button"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => { setCursor(startOfMonth(new Date('2026-08-07T00:00:00'))); setSelectedDate('2026-08-07'); }} className="toolbar-button">Today</button>
          <h2 className="ml-2 text-lg font-semibold text-[#f0f6fc]">{view === 'day' ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date(`${selectedDate}T00:00:00`)) : formatMonth(cursor)}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-[#30363d] bg-[#161b22] p-0.5" role="group" aria-label="Calendar view">
            {(['month', 'week', 'day'] as const).map((option) => <button key={option} onClick={() => setView(option)} className={`px-3 py-1.5 text-xs capitalize rounded ${view === option ? 'bg-[#8B3A4A] text-white' : 'text-[#8b949e] hover:text-white'}`}>{option}</button>)}
          </div>
          <button onClick={() => setShowFilters((value) => !value)} className="toolbar-button"><Filter className="h-3.5 w-3.5" /> Filters</button>
          <Link href="/meetings/list" className="toolbar-button"><List className="h-3.5 w-3.5" /> List</Link>
          <button onClick={() => onSchedule(selectedDate)} className="primary-button"><Plus className="h-4 w-4" /> Schedule</button>
        </div>
      </div>
      {showFilters && <div className="flex flex-wrap items-center gap-3 border-y border-[#30363d] py-3 text-xs text-[#8b949e]">
        <label className="flex items-center gap-2">Type <select value={type} onChange={(event) => setType(event.target.value as MeetingType | 'ALL')} className="field"><option value="ALL">All meetings</option><option value="TEAM">Team meetings</option><option value="ORG_EVENT">Org events</option></select></label>
        <label className="flex items-center gap-2">Department <select value={department} onChange={(event) => setDepartment(event.target.value)} className="field"><option value="ALL">All departments</option><option>AI/ML</option><option>Engineering</option><option>Design</option></select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} /> My meetings only</label>
        <span className="ml-auto text-[11px]">Signed in as {currentUser.name}</span>
      </div>}
      <div className="flex flex-wrap gap-4 text-[11px] text-[#8b949e]"><span><i className="legend-dot bg-[#8B3A4A]" /> Team meeting</span><span><i className="legend-dot bg-[#d29922]" /> Org event</span><span><i className="legend-dot bg-[#6e7681]" /> Cancelled</span></div>
      {isError ? <div className="empty-state"><RefreshCw className="h-5 w-5" /><p>Meetings could not be loaded.</p><button onClick={() => void refetch()} className="toolbar-button">Retry</button></div> : isLoading ? <div className="calendar-grid animate-pulse">{Array.from({ length: 42 }, (_, index) => <div key={index} className="min-h-24 border border-[#30363d] bg-[#161b22]" />)}</div> : <div className={`calendar-grid ${view === 'week' ? 'calendar-week' : ''} ${view === 'day' ? 'calendar-day' : ''}`}>
        {view !== 'day' && ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <div key={label} className="calendar-weekday">{label}</div>)}
        {daysToRender.map((day) => {
          const key = dateKey(day); const dayMeetings = visibleMeetings.filter((meeting) => dateKey(new Date(meeting.startsAt)) === key); const isToday = key === '2026-08-07'; const isCurrentMonth = day.getMonth() === cursor.getMonth();
          return <button key={key} onClick={() => setSelectedDate(key)} onDoubleClick={() => onSchedule(key)} aria-label={`${new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(day)}, ${dayMeetings.length} meetings`} className={`calendar-cell ${isToday ? 'ring-1 ring-inset ring-[#e8a0ad]' : ''} ${!isCurrentMonth && view === 'month' ? 'opacity-40' : ''} ${selectedDate === key ? 'bg-[#21262d]' : ''}`}><span className={`date-number ${isToday ? 'bg-[#8B3A4A] text-white' : ''}`}>{day.getDate()}</span><div className="space-y-1 text-left">{dayMeetings.slice(0, 3).map((meeting) => <span key={meeting.id} onClick={(event) => { event.stopPropagation(); onSelect(meeting); }} className={`meeting-chip ${meetingTone(meeting)}`}><b>{meeting.allDay ? 'All day' : formatTime(meeting.startsAt)}</b> {meeting.title}</span>)}{dayMeetings.length > 3 && <span className="text-[10px] text-[#8b949e]">+{dayMeetings.length - 3} more</span>}</div></button>;
        })}
      </div>}
    </section>
  );
}

export function MeetingFiltersBar({ onSearch }: { onSearch: (value: string) => void }) {
  return <div className="flex items-center gap-2"><Search className="h-4 w-4 text-[#6e7681]" /><input onChange={(event) => onSearch(event.target.value)} placeholder="Search meetings" className="field min-w-48" /></div>;
}

export function MeetingHeader({ title, onSchedule }: { title: string; onSchedule: () => void }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow"><CalendarDays className="h-3.5 w-3.5" /> Collaboration</p><h1 className="page-title">{title}</h1><p className="page-subtitle">Coordinate team conversations and company-wide events.</p></div><button onClick={onSchedule} className="primary-button"><Plus className="h-4 w-4" /> Schedule</button></div>;
}

export function MeetingSummary({ meetings }: { meetings: Meeting[] }) {
  const upcoming = meetings.filter((meeting) => meeting.status === 'UPCOMING').length;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="summary-tile"><Clock3 className="h-4 w-4 text-[#e8a0ad]" /><strong>{upcoming}</strong><span>Upcoming</span></div><div className="summary-tile"><Users className="h-4 w-4 text-[#d29922]" /><strong>{meetings.filter((meeting) => meeting.type === 'TEAM').length}</strong><span>Team meetings</span></div><div className="summary-tile"><CalendarDays className="h-4 w-4 text-[#58a6ff]" /><strong>{meetings.filter((meeting) => meeting.type === 'ORG_EVENT').length}</strong><span>Org events</span></div><div className="summary-tile"><X className="h-4 w-4 text-[#8b949e]" /><strong>{meetings.filter((meeting) => meeting.status === 'CANCELLED').length}</strong><span>Cancelled</span></div></div>;
}
