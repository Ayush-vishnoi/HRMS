'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Check, Edit3, ExternalLink, MapPin, Repeat, ThumbsDown, ThumbsUp, Trash2, Video, X, XCircle } from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { useCancelMeeting, useRsvpMeeting } from '@/features/meetings/hooks/useMeetings';
import { authFetch } from '@/lib/api-client';
import type { Meeting, RSVP } from '@/features/meetings/types/meeting';

const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

type InterviewDecision = { decision: 'SELECT' | 'REJECT'; remark: string; submittedAt?: string | null };
type InterviewMeetingCtx = {
  interviewId: string;
  round: number;
  status: string;
  candidateName: string;
  myDecision: InterviewDecision | null;
};

export function MeetingDetailDrawer({ meeting, onClose, onEdit }: { meeting: Meeting | null; onClose: () => void; onEdit: (meeting: Meeting) => void }) {
  const { currentUser } = useHRMS();
  const cancelMutation = useCancelMeeting();
  const rsvpMutation = useRsvpMeeting();
  const attendee = meeting?.attendees.find((person) => person.id === currentUser.id);
  const [myRsvp, setMyRsvp] = useState<RSVP>(attendee?.rsvp ?? 'PENDING');
  const [reasonMode, setReasonMode] = useState<'DECLINED' | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [syncedMeetingId, setSyncedMeetingId] = useState(meeting?.id);

  // Interviewer verdict (Select/Reject + remark) for a mirrored interview meeting.
  const [interviewCtx, setInterviewCtx] = useState<InterviewMeetingCtx | null>(null);
  const [decisionChoice, setDecisionChoice] = useState<'SELECT' | 'REJECT' | null>(null);
  const [decisionRemark, setDecisionRemark] = useState('');
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionDone, setDecisionDone] = useState(false);

  const meetingId = meeting?.id;
  const isMirror = Boolean(meetingId && /^i[0-9a-f]{31}$/.test(meetingId));

  // Load the interviewer's decision context whenever a mirrored interview meeting opens.
  useEffect(() => {
    setInterviewCtx(null);
    setDecisionChoice(null);
    setDecisionRemark('');
    setDecisionError(null);
    setDecisionDone(false);
    if (!meetingId || !isMirror) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch<any>(`/api/recruitment/interviews/by-meeting/${meetingId}`);
        const ctx = (res?.data ?? res) as InterviewMeetingCtx | null;
        if (!cancelled && ctx?.interviewId) {
          setInterviewCtx(ctx);
          if (ctx.myDecision) {
            setDecisionChoice(ctx.myDecision.decision);
            setDecisionRemark(ctx.myDecision.remark ?? '');
          }
        }
      } catch {
        if (!cancelled) setInterviewCtx(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId, isMirror]);

  const submitInterviewDecision = async () => {
    if (!meetingId || !decisionChoice) return;
    const remark = decisionRemark.trim();
    if (!remark) {
      setDecisionError('A remark is required.');
      return;
    }
    setDecisionSaving(true);
    setDecisionError(null);
    try {
      await authFetch(`/api/recruitment/interviews/by-meeting/${meetingId}/decision`, {
        method: 'POST',
        body: { decision: decisionChoice, remark },
      });
      setInterviewCtx((prev) =>
        prev ? { ...prev, myDecision: { decision: decisionChoice, remark } } : prev,
      );
      setDecisionDone(true);
    } catch (err) {
      setDecisionError((err as Error).message || 'Could not submit your decision.');
    } finally {
      setDecisionSaving(false);
    }
  };

  // Reset the local RSVP state whenever a different meeting opens. Setting
  // state during render (guarded by the previous meeting id) is the
  // React-recommended alternative to a reset effect.
  if (meeting?.id !== syncedMeetingId) {
    setSyncedMeetingId(meeting?.id);
    setMyRsvp(attendee?.rsvp ?? 'PENDING');
    setReasonMode(null);
    setReason('');
    setReasonError(null);
  }

  if (!meeting) return null;

  const isOrganizer = meeting.organizer.id === currentUser.id;
  const canManage = isOrganizer || currentUser.userRole === 'admin';
  // Interview mirrors are managed from Recruitment ATS; block Edit/Cancel here.
  const isInterviewMirror = /^i[0-9a-f]{31}$/.test(meeting.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastMeeting = new Date(meeting.startsAt) < today;
  // Only invited attendees can respond; company-wide events (no invitation list)
  // have no RSVP flow of their own.
  const canRespond = Boolean(attendee) && !isPastMeeting && !isOrganizer && meeting.status !== 'CANCELLED';
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

  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="meeting-title"><header className="drawer-header"><div><span className={`type-badge ${meeting.type === 'ORG_EVENT' ? 'type-org' : 'type-team'}`}>{isInterviewMirror ? 'Interview' : meeting.type === 'ORG_EVENT' ? 'Org event' : 'Team meeting'}</span><h2 id="meeting-title" className="mt-2 text-xl font-semibold text-[#17324A]">{meeting.title}</h2></div><button onClick={onClose} className="icon-button" aria-label="Close meeting details"><X className="h-4 w-4" /></button></header>
    <div className="drawer-body space-y-6"><div className="detail-grid"><div><CalendarDays /><span><b>{meeting.allDay ? 'All-day event' : dateTime(meeting.startsAt)}</b>{!meeting.allDay && <small>Ends {dateTime(meeting.endsAt)}</small>}</span></div>{meeting.location && <div><MapPin /><span><b>{meeting.location}</b><small>Location</small></span></div>}{meeting.videoLink && <div><Video /><span><a href={meeting.videoLink} target="_blank" rel="noreferrer" className="font-semibold text-[#39759D] hover:text-[#285E82]">Join video meeting <ExternalLink className="inline h-3 w-3" /></a><small>Video conference</small></span></div>}<div><Repeat /><span><b className="capitalize">{meeting.recurrence.toLowerCase()}</b><small>Recurrence</small></span></div></div>
      {meeting.description && <section><h3 className="section-label">Agenda</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52677A]">{meeting.description}</p></section>}
      <section><div className="flex items-center justify-between"><h3 className="section-label">Attendees</h3><span className="text-xs text-[#667085]">{meeting.attendees.length} invited</span></div>{meeting.attendees.length === 0 ? <p className="mt-2 text-xs text-[#667085]">Company-wide event. No individual invitation list.</p> : <div className="mt-2 divide-y divide-[#D9E5EE] overflow-hidden rounded-lg border border-[#D9E5EE] bg-white">{meeting.attendees.map((person) => <div className="person-row px-3 py-2" key={person.id}><img src={person.avatarUrl} alt="" /><span><b>{person.name}</b><small>{person.department}</small>{person.rsvp === 'DECLINED' && person.responseReason && <small className="text-[#9B3F3F]">Reason: {person.responseReason}</small>}</span>{!isPastMeeting && <span className={`rsvp-badge rsvp-${person.rsvp?.toLowerCase()}`}>{person.rsvp}</span>}</div>)}</div>}</section>
      {canRespond && <section><h3 className="section-label">Your response</h3>{myRsvp === 'PENDING' && !reasonMode && <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => submitResponse('ACCEPTED')} disabled={isSavingResponse} className="rsvp-button"><Check /> Accept</button><button onClick={() => { setReasonMode('DECLINED'); setReasonError(null); }} disabled={isSavingResponse} className="rsvp-button"><XCircle /> Reject</button></div>}{myRsvp === 'ACCEPTED' && !reasonMode && <button onClick={() => { setReasonMode('DECLINED'); setReasonError(null); }} disabled={isSavingResponse} className="danger-button mt-2"><XCircle className="h-3.5 w-3.5" /> Cancel</button>}{myRsvp === 'DECLINED' && !reasonMode && <div className="mt-2 space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="rsvp-badge rsvp-declined">DECLINED</span>{attendee?.responseReason && <small className="text-xs text-[#667085]">Reason: {attendee.responseReason}</small>}</div><button onClick={() => submitResponse('ACCEPTED')} disabled={isSavingResponse} className="rsvp-button"><Check /> Accept</button></div>}{reasonMode && <div className="mt-2 space-y-2"><label htmlFor="meeting-response-reason" className="form-label">Reason</label><textarea id="meeting-response-reason" value={reason} onChange={(event) => { setReason(event.target.value); setReasonError(null); }} maxLength={500} rows={3} className="form-input w-full resize-y" disabled={isSavingResponse} aria-invalid={Boolean(reasonError)} /><div className="flex items-center justify-between gap-3"><span className="text-xs text-[#667085]">{reason.length}/500</span>{reasonError && <span className="form-error mt-0">{reasonError}</span>}</div><div className="flex gap-2"><button onClick={submitReason} disabled={isSavingResponse} className="danger-button">{isSavingResponse ? 'Saving...' : 'Confirm'}</button><button onClick={() => { setReasonMode(null); setReason(''); setReasonError(null); }} disabled={isSavingResponse} className="toolbar-button">Back</button></div></div>}</section>}
      {isInterviewMirror ? (
        meeting.status === 'CANCELLED' ? (
          <div className="rounded-lg border border-[#C9D0D7] bg-[#EEF1F4] p-3 text-sm font-medium text-[#4B5563]">This is an interview scheduled in Recruitment ATS and it has been cancelled.</div>
        ) : interviewCtx ? (
          <section className="rounded-lg border border-[#9CC9AC] bg-[#F4FAF6] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#1E5736]"><ThumbsUp className="h-3.5 w-3.5 text-[#287047]" /> Your interview verdict</h3>
              <span className="text-[10px] font-semibold text-[#5D7D94]">{interviewCtx.candidateName} · Round {interviewCtx.round}</span>
            </div>
            {decisionDone && interviewCtx.myDecision ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-[#C3D9E8] bg-white p-2.5 text-xs">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${interviewCtx.myDecision.decision === 'SELECT' ? 'bg-[#DDEFE4] text-[#287047]' : 'bg-[#F3DCDC] text-[#A45A5A]'}`}>{interviewCtx.myDecision.decision === 'SELECT' ? 'Selected' : 'Rejected'}</span>
                  <span className="text-[11px] italic text-[#475569]">&ldquo;{interviewCtx.myDecision.remark}&rdquo;</span>
                </div>
                <p className="text-[11px] font-medium text-[#287047]">Recorded — HR has been notified.</p>
                <button onClick={() => { setDecisionDone(false); }} className="toolbar-button">Change verdict</button>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-[#42614E]">Record your decision for this candidate. HR is notified to move them to the next round or select them.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setDecisionChoice('SELECT'); setDecisionError(null); }} disabled={decisionSaving} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${decisionChoice === 'SELECT' ? 'border-[#287047] bg-[#287047] text-white' : 'border-[#9CC9AC] bg-white text-[#287047] hover:bg-[#DDEFE4]'}`}><ThumbsUp className="h-3.5 w-3.5" /> Select</button>
                  <button type="button" onClick={() => { setDecisionChoice('REJECT'); setDecisionError(null); }} disabled={decisionSaving} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${decisionChoice === 'REJECT' ? 'border-[#A45A5A] bg-[#A45A5A] text-white' : 'border-[#D9A3A3] bg-white text-[#A45A5A] hover:bg-[#F3DCDC]'}`}><ThumbsDown className="h-3.5 w-3.5" /> Reject</button>
                </div>
                <textarea value={decisionRemark} onChange={(event) => { setDecisionRemark(event.target.value); setDecisionError(null); }} maxLength={1000} rows={3} placeholder="Add a remark for HR (required)…" className="form-input w-full resize-y text-xs" disabled={decisionSaving} />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[#667085]">{decisionRemark.length}/1000</span>
                  {decisionError && <span className="form-error mt-0 text-[11px]">{decisionError}</span>}
                </div>
                <button type="button" onClick={submitInterviewDecision} disabled={decisionSaving || !decisionChoice || !decisionRemark.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#17324A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#315B76] disabled:cursor-not-allowed disabled:opacity-50">{decisionSaving ? 'Submitting…' : interviewCtx.myDecision ? 'Update verdict' : 'Submit verdict'}</button>
              </>
            )}
          </section>
        ) : (
          <div className="rounded-lg border border-[#C9D0D7] bg-[#EEF1F4] p-3 text-sm font-medium text-[#4B5563]">This is an interview scheduled in Recruitment ATS. Update it from the Recruitment page.</div>
        )
      ) : meeting.status === 'CANCELLED' && <div className="rounded-lg border border-[#C9D0D7] bg-[#EEF1F4] p-3 text-sm font-medium text-[#4B5563]">This meeting has been cancelled.</div>}
      {!isPastMeeting && canManage && !isInterviewMirror && meeting.status !== 'CANCELLED' && <footer className="drawer-footer"><button onClick={() => onEdit(meeting)} className="toolbar-button"><Edit3 className="h-3.5 w-3.5" /> Edit</button><button onClick={() => { if (window.confirm('Cancel this meeting?')) cancelMutation.mutate(meeting.id); }} className="danger-button"><Trash2 className="h-3.5 w-3.5" /> Cancel meeting</button></footer>}
    </div></aside></div>;
}
