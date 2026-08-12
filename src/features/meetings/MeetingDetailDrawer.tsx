'use client';

import { CalendarDays, Check, Clock, Edit3, ExternalLink, MapPin, Repeat, Trash2, Video, X, XCircle } from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { useCancelMeeting, useRsvpMeeting } from '@/features/meetings/hooks/useMeetings';
import type { Meeting, RSVP } from '@/features/meetings/types/meeting';

const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function MeetingDetailDrawer({ meeting, onClose, onEdit }: { meeting: Meeting | null; onClose: () => void; onEdit: (meeting: Meeting) => void }) {
  const { currentUser } = useHRMS();
  const cancelMutation = useCancelMeeting();
  const rsvpMutation = useRsvpMeeting();
  if (!meeting) return null;
  const canManage = currentUser.userRole === 'manager' || currentUser.userRole === 'admin';
  const myRsvp = meeting.attendees.find((attendee) => attendee.id === currentUser.id)?.rsvp ?? 'PENDING';
  const respond = (rsvp: RSVP) => rsvpMutation.mutate({ id: meeting.id, rsvp });

  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="meeting-title"><header className="drawer-header"><div><span className={`type-badge ${meeting.type === 'ORG_EVENT' ? 'type-org' : 'type-team'}`}>{meeting.type === 'ORG_EVENT' ? 'Org event' : 'Team meeting'}</span><h2 id="meeting-title" className="mt-2 text-xl font-semibold text-[#17324A]">{meeting.title}</h2></div><button onClick={onClose} className="icon-button" aria-label="Close meeting details"><X className="h-4 w-4" /></button></header>
    <div className="drawer-body space-y-6"><div className="detail-grid"><div><CalendarDays /><span><b>{meeting.allDay ? 'All-day event' : dateTime(meeting.startsAt)}</b>{!meeting.allDay && <small>Ends {dateTime(meeting.endsAt)}</small>}</span></div>{meeting.location && <div><MapPin /><span><b>{meeting.location}</b><small>Location</small></span></div>}{meeting.videoLink && <div><Video /><span><a href={meeting.videoLink} target="_blank" rel="noreferrer" className="font-semibold text-[#39759D] hover:text-[#285E82]">Join video meeting <ExternalLink className="inline h-3 w-3" /></a><small>Video conference</small></span></div>}<div><Repeat /><span><b className="capitalize">{meeting.recurrence.toLowerCase()}</b><small>Recurrence</small></span></div></div>
      {meeting.description && <section><h3 className="section-label">Agenda</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52677A]">{meeting.description}</p></section>}
      <section><h3 className="section-label">Organizer</h3><div className="person-row mt-2"><img src={meeting.organizer.avatarUrl} alt="" /><span><b>{meeting.organizer.name}</b><small>{meeting.organizer.department}</small></span></div></section>
      <section><div className="flex items-center justify-between"><h3 className="section-label">Attendees</h3><span className="text-xs text-[#667085]">{meeting.attendees.length} invited</span></div>{meeting.attendees.length === 0 ? <p className="mt-2 text-xs text-[#667085]">Company-wide event. No individual invitation list.</p> : <div className="mt-2 divide-y divide-[#D9E5EE] overflow-hidden rounded-lg border border-[#D9E5EE] bg-white">{meeting.attendees.map((attendee) => <div className="person-row px-3 py-2" key={attendee.id}><img src={attendee.avatarUrl} alt="" /><span><b>{attendee.name}</b><small>{attendee.department}</small></span><span className={`rsvp-badge rsvp-${attendee.rsvp?.toLowerCase()}`}>{attendee.rsvp}</span></div>)}</div>}</section>
      {meeting.status !== 'CANCELLED' && <section><h3 className="section-label">Your response</h3><div className="mt-2 grid grid-cols-3 gap-2"><button onClick={() => respond('ACCEPTED')} className={`rsvp-button ${myRsvp === 'ACCEPTED' ? 'rsvp-selected' : ''}`}><Check /> Accept</button><button onClick={() => respond('PENDING')} className={`rsvp-button ${myRsvp === 'PENDING' ? 'rsvp-selected' : ''}`}><Clock /> Maybe</button><button onClick={() => respond('DECLINED')} className={`rsvp-button ${myRsvp === 'DECLINED' ? 'rsvp-selected' : ''}`}><XCircle /> Decline</button></div></section>}
      {meeting.status === 'CANCELLED' && <div className="rounded-lg border border-[#C9D0D7] bg-[#EEF1F4] p-3 text-sm font-medium text-[#4B5563]">This meeting has been cancelled.</div>}
      {canManage && meeting.status !== 'CANCELLED' && <footer className="drawer-footer"><button onClick={() => onEdit(meeting)} className="toolbar-button"><Edit3 className="h-3.5 w-3.5" /> Edit</button><button onClick={() => { if (window.confirm('Cancel this meeting?')) cancelMutation.mutate(meeting.id); }} className="danger-button"><Trash2 className="h-3.5 w-3.5" /> Cancel meeting</button></footer>}
    </div></aside></div>;
}
