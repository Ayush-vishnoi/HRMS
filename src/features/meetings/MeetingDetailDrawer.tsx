'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Check, Edit3, ExternalLink, MapPin, Repeat, Trash2, Video, X, XCircle } from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { useCancelMeeting, useRsvpMeeting } from '@/features/meetings/hooks/useMeetings';
import type { Meeting, RSVP } from '@/features/meetings/types/meeting';

const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function MeetingDetailDrawer({ meeting, onClose, onEdit }: { meeting: Meeting | null; onClose: () => void; onEdit: (meeting: Meeting) => void }) {
  const { currentUser } = useHRMS();
  const cancelMutation = useCancelMeeting();
  const rsvpMutation = useRsvpMeeting();
  const attendee = meeting?.attendees.find((person) => person.id === currentUser.id);
  const [myRsvp, setMyRsvp] = useState<RSVP>(attendee?.rsvp ?? 'PENDING');
  const [reasonMode, setReasonMode] = useState<'DECLINED' | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    setMyRsvp(attendee?.rsvp ?? 'PENDING');
    setReasonMode(null);
    setReason('');
    setReasonError(null);
  }, [meeting?.id, attendee?.rsvp]);

  if (!meeting) return null;

  const isOrganizer = meeting.organizer.id === currentUser.id;
  const canManage = isOrganizer || currentUser.userRole === 'admin';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastMeeting = new Date(meeting.startsAt) < today;
  const canRespond = !isPastMeeting && !isOrganizer && meeting.status !== 'CANCELLED';
  const isSavingResponse = rsvpMutation.isPending;

  const submitResponse = (rsvp: RSVP, responseReason?: string) => {
    rsvpMutation.mutate(
      { id: meeting.id, rsvp, reason: responseReason },
      {
        onSuccess: () => {
          setMyRsvp(rsvp);
          setReasonMode(null);
          setReason('');
          setReasonError(null);
        },
      },
    );
  };

  const submitReason = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReasonError('A reason is required.');
      return;
    }
    if (trimmedReason.length > 500) {
      setReasonError('The reason must be 500 characters or fewer.');
      return;
    }
    submitResponse('DECLINED', trimmedReason);
  };

  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="meeting-title"><header className="drawer-header"><div><span className={`type-badge ${meeting.type === 'ORG_EVENT' ? 'type-org' : 'type-team'}`}>{meeting.type === 'ORG_EVENT' ? 'Org event' : 'Team meeting'}</span><h2 id="meeting-title" className="mt-2 text-xl font-semibold text-[#17324A]">{meeting.title}</h2></div><button onClick={onClose} className="icon-button" aria-label="Close meeting details"><X className="h-4 w-4" /></button></header>
    <div className="drawer-body space-y-6"><div className="detail-grid"><div><CalendarDays /><span><b>{meeting.allDay ? 'All-day event' : dateTime(meeting.startsAt)}</b>{!meeting.allDay && <small>Ends {dateTime(meeting.endsAt)}</small>}</span></div>{meeting.location && <div><MapPin /><span><b>{meeting.location}</b><small>Location</small></span></div>}{meeting.videoLink && <div><Video /><span><a href={meeting.videoLink} target="_blank" rel="noreferrer" className="font-semibold text-[#39759D] hover:text-[#285E82]">Join video meeting <ExternalLink className="inline h-3 w-3" /></a><small>Video conference</small></span></div>}<div><Repeat /><span><b className="capitalize">{meeting.recurrence.toLowerCase()}</b><small>Recurrence</small></span></div></div>
      {meeting.description && <section><h3 className="section-label">Agenda</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52677A]">{meeting.description}</p></section>}
      <section><div className="flex items-center justify-between"><h3 className="section-label">Attendees</h3><span className="text-xs text-[#667085]">{meeting.attendees.length} invited</span></div>{meeting.attendees.length === 0 ? <p className="mt-2 text-xs text-[#667085]">Company-wide event. No individual invitation list.</p> : <div className="mt-2 divide-y divide-[#D9E5EE] overflow-hidden rounded-lg border border-[#D9E5EE] bg-white">{meeting.attendees.map((person) => <div className="person-row px-3 py-2" key={person.id}><img src={person.avatarUrl} alt="" /><span><b>{person.name}</b><small>{person.department}</small></span>{!isPastMeeting && <span className={`rsvp-badge rsvp-${person.rsvp?.toLowerCase()}`}>{person.rsvp}</span>}</div>)}</div>}</section>
      {canRespond && <section><h3 className="section-label">Your response</h3>{myRsvp === 'PENDING' && !reasonMode && <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => submitResponse('ACCEPTED')} disabled={isSavingResponse} className="rsvp-button"><Check /> Accept</button><button onClick={() => { setReasonMode('DECLINED'); setReasonError(null); }} disabled={isSavingResponse} className="rsvp-button"><XCircle /> Reject</button></div>}{myRsvp === 'ACCEPTED' && !reasonMode && <button onClick={() => { setReasonMode('DECLINED'); setReasonError(null); }} disabled={isSavingResponse} className="danger-button mt-2"><XCircle className="h-3.5 w-3.5" /> Cancel</button>}{reasonMode && <div className="mt-2 space-y-2"><label htmlFor="meeting-response-reason" className="form-label">Reason</label><textarea id="meeting-response-reason" value={reason} onChange={(event) => { setReason(event.target.value); setReasonError(null); }} maxLength={500} rows={3} className="form-input w-full resize-y" disabled={isSavingResponse} aria-invalid={Boolean(reasonError)} /><div className="flex items-center justify-between gap-3"><span className="text-xs text-[#667085]">{reason.length}/500</span>{reasonError && <span className="form-error mt-0">{reasonError}</span>}</div><div className="flex gap-2"><button onClick={submitReason} disabled={isSavingResponse} className="danger-button">{isSavingResponse ? 'Saving...' : 'Confirm'}</button><button onClick={() => { setReasonMode(null); setReason(''); setReasonError(null); }} disabled={isSavingResponse} className="toolbar-button">Back</button></div></div>}</section>}
      {meeting.status === 'CANCELLED' && <div className="rounded-lg border border-[#C9D0D7] bg-[#EEF1F4] p-3 text-sm font-medium text-[#4B5563]">This meeting has been cancelled.</div>}
      {!isPastMeeting && canManage && meeting.status !== 'CANCELLED' && <footer className="drawer-footer"><button onClick={() => onEdit(meeting)} className="toolbar-button"><Edit3 className="h-3.5 w-3.5" /> Edit</button><button onClick={() => { if (window.confirm('Cancel this meeting?')) cancelMutation.mutate(meeting.id); }} className="danger-button"><Trash2 className="h-3.5 w-3.5" /> Cancel meeting</button></footer>}
    </div></aside></div>;
}
