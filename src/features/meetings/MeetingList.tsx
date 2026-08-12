'use client';

import { ArrowDownUp, CalendarDays, ChevronLeft, ChevronRight, List, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMeetings } from '@/features/meetings/hooks/useMeetings';
import type { Meeting } from '@/features/meetings/types/meeting';

const PAGE_SIZE = 6;
const when = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function MeetingList({ onSelect, onSchedule, canSchedule }: { onSelect: (meeting: Meeting) => void; onSchedule: () => void; canSchedule: boolean }) {
  const { data: meetings = [], isLoading, isError } = useMeetings();
  const [tab, setTab] = useState<'UPCOMING' | 'PAST' | 'CANCELLED'>('UPCOMING');
  const [search, setSearch] = useState('');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => meetings.filter((meeting) => {
    const matchesSearch = `${meeting.title} ${meeting.organizer.name} ${meeting.location ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === 'CANCELLED' ? meeting.status === 'CANCELLED' : tab === 'PAST' ? meeting.status === 'COMPLETED' : meeting.status === 'UPCOMING' || meeting.status === 'ONGOING';
    return matchesSearch && matchesTab;
  }).sort((a, b) => (new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()) * (ascending ? 1 : -1)), [ascending, meetings, search, tab]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow"><List className="h-3.5 w-3.5" /> Meetings</p><h1 className="page-title">Meeting list</h1><p className="page-subtitle">Search and review scheduled, past, and cancelled meetings.</p></div><div className="flex gap-2"><Link href="/meetings/calendar" className="toolbar-button"><CalendarDays className="h-3.5 w-3.5" /> Calendar</Link>{canSchedule && <button onClick={onSchedule} className="primary-button"><Plus className="h-4 w-4" /> Schedule</button>}</div></div>
    <div className="flex flex-col gap-3 border-y border-[#D9E5EE] bg-[#F9FBFD] py-3 lg:flex-row lg:items-center lg:justify-between"><div className="segmented">{(['UPCOMING', 'PAST', 'CANCELLED'] as const).map((item) => <button key={item} onClick={() => { setTab(item); setPage(1); }} className={tab === item ? 'active' : ''}>{item[0] + item.slice(1).toLowerCase()}</button>)}</div><div className="flex gap-2"><label className="relative"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#667085]" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="field min-w-64 pl-9" placeholder="Search title, organizer, location" /></label><button onClick={() => setAscending((value) => !value)} className="toolbar-button" title="Toggle date sort"><ArrowDownUp className="h-3.5 w-3.5" /> Date</button></div></div>
    {isLoading ? <div className="space-y-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-lg border border-[#D9E5EE] bg-[#F8FAFC]" />)}</div> : isError ? <div className="empty-state">Meetings could not be loaded.</div> : paginated.length === 0 ? <div className="empty-state"><CalendarDays className="h-6 w-6" /><b>No meetings found</b><span>Adjust the search or choose another status tab.</span></div> : <div className="overflow-x-auto rounded-xl border border-[#D9E5EE] bg-white"><table className="meeting-table"><thead><tr><th>Date and time</th><th>Meeting</th><th>Type</th><th>Organizer</th><th>Status</th></tr></thead><tbody>{paginated.map((meeting) => <tr key={meeting.id} onClick={() => onSelect(meeting)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onSelect(meeting)}><td>{meeting.allDay ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(meeting.startsAt)) : when(meeting.startsAt)}</td><td><b>{meeting.title}</b><small>{meeting.location ?? meeting.videoLink ?? 'Location pending'}</small></td><td><span className={`type-badge ${meeting.type === 'ORG_EVENT' ? 'type-org' : 'type-team'}`}>{meeting.type === 'ORG_EVENT' ? 'Org event' : 'Team'}</span></td><td>{meeting.organizer.name}</td><td><span className={`status-badge status-${meeting.status.toLowerCase()}`}>{meeting.status}</span></td></tr>)}</tbody></table></div>}
    <footer className="flex items-center justify-between text-xs text-[#667085]"><span>{filtered.length} meetings</span><div className="flex items-center gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="icon-button"><ChevronLeft className="h-4 w-4" /></button><span>Page {page} of {pages}</span><button disabled={page === pages} onClick={() => setPage((value) => value + 1)} className="icon-button"><ChevronRight className="h-4 w-4" /></button></div></footer>
  </section>;
}
