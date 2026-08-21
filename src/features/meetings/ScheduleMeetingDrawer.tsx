'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Check, Clock, MapPin, Search, Users, Video, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { useCreateMeeting, useEmployeeSearch, useUpdateMeeting } from '@/features/meetings/hooks/useMeetings';
import type { CreateMeetingInput, Meeting } from '@/features/meetings/types/meeting';

const pad = (value: number) => String(value).padStart(2, '0');
const localDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const defaultValues = (date = localDateKey(new Date())): FormValues => ({ title: '', type: 'TEAM', description: '', date, startTime: '10:00', endTime: '11:00', allDay: false, location: '', videoLink: '', department: '', recurrence: 'NONE', reminderMinutes: 15 });
const localDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

const schema = z.object({
  title: z.string().trim().min(3, 'Enter at least 3 characters'),
  type: z.enum(['TEAM', 'ORG_EVENT']),
  description: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date'),
  startTime: z.string().min(1, 'Choose a start time'),
  endTime: z.string().min(1, 'Choose an end time'),
  allDay: z.boolean(),
  location: z.string().optional(),
  videoLink: z.union([z.literal(''), z.url('Enter a valid video URL')]).optional(),
  department: z.string().optional(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']),
  reminderMinutes: z.number().optional(),
}).refine((values) => values.allDay || values.endTime > values.startTime, { message: 'End time must be after start time', path: ['endTime'] });

type FormValues = z.infer<typeof schema>;

export function ScheduleMeetingDrawer({ open, meeting, initialDate, onClose }: { open: boolean; meeting?: Meeting; initialDate?: string; onClose: () => void }) {
  const { currentUser } = useHRMS();
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const employees = useEmployeeSearch(employeeSearch);
  const createMutation = useCreateMeeting();
  const updateMutation = useUpdateMeeting();
  const canCreateOrgEvent = currentUser.userRole !== 'employee';
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaultValues() });
  const meetingType = watch('type');
  const allDay = watch('allDay');

  useEffect(() => {
    if (!open) return;
    createMutation.reset();
    updateMutation.reset();
    setEmployeeSearch('');
    if (meeting) {
      const startsAt = new Date(meeting.startsAt); const endsAt = new Date(meeting.endsAt);
      reset({ title: meeting.title, type: meeting.type, description: meeting.description ?? '', date: localDateKey(startsAt), startTime: localTime(startsAt), endTime: localTime(endsAt), allDay: meeting.allDay, location: meeting.location ?? '', videoLink: meeting.videoLink ?? '', department: meeting.department ?? '', recurrence: meeting.recurrence, reminderMinutes: meeting.reminderMinutes ?? 15 });
      setAttendeeIds(meeting.attendees.filter((attendee) => attendee.id !== currentUser.id).map((attendee) => attendee.id));
    } else { reset(defaultValues(initialDate)); setAttendeeIds([]); }
  }, [initialDate, meeting, open, reset]);

  if (!open || currentUser.userRole === 'employee') return null;
  const submit = async (values: FormValues) => {
    const startsAt = localDateTime(values.date, values.allDay ? '00:00' : values.startTime);
    const endsAt = localDateTime(values.date, values.allDay ? '23:59' : values.endTime);
    const input: CreateMeetingInput = { title: values.title.trim(), type: values.type, description: values.description?.trim() || undefined, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), allDay: values.allDay, location: values.location?.trim() || undefined, videoLink: values.videoLink?.trim() || undefined, attendeeIds: attendeeIds.filter((id) => id !== currentUser.id), department: values.department || undefined, recurrence: values.recurrence, reminderMinutes: values.reminderMinutes };

    try {
      if (meeting) await updateMutation.mutateAsync({ id: meeting.id, input });
      else await createMutation.mutateAsync(input);
      setEmployeeSearch('');
      setAttendeeIds([]);
      reset(defaultValues());
      onClose();
    } catch {
      // Mutation state renders the server-provided error while keeping the form open.
    }
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="schedule-title"><header className="drawer-header"><div><p className="eyebrow"><CalendarDays className="h-3.5 w-3.5" /> Meeting setup</p><h2 id="schedule-title" className="text-lg font-semibold text-[#17324A]">{meeting ? 'Edit meeting' : 'Schedule meeting'}</h2></div><button onClick={onClose} className="icon-button" aria-label="Close schedule drawer"><X className="h-4 w-4" /></button></header>
    <form onSubmit={handleSubmit((values) => void submit(values))} className="drawer-body space-y-5">
      <label className="form-label">Title<input {...register('title')} className="field mt-1 w-full" placeholder="Meeting title" />{errors.title && <span className="form-error">{errors.title.message}</span>}</label>
      <fieldset><legend className="form-label">Meeting type</legend><div className="segmented mt-1"><label><input type="radio" value="TEAM" {...register('type')} /> Team meeting</label><label className={!canCreateOrgEvent ? 'opacity-40' : ''}><input type="radio" value="ORG_EVENT" disabled={!canCreateOrgEvent} {...register('type')} /> Org event</label></div></fieldset>
      <label className="form-label">Agenda<textarea {...register('description')} rows={4} className="field mt-1 w-full resize-none" placeholder="Add context and discussion points" /></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><label className="form-label sm:col-span-1">Date<input type="date" {...register('date')} className="field mt-1 w-full" /></label><label className="form-label">Start<input type="time" disabled={allDay} {...register('startTime')} className="field mt-1 w-full" /></label><label className="form-label">End<input type="time" disabled={allDay} {...register('endTime')} className="field mt-1 w-full" />{errors.endTime && <span className="form-error">{errors.endTime.message}</span>}</label></div>
      {meetingType === 'ORG_EVENT' && <label className="toggle-row"><input type="checkbox" {...register('allDay')} /><span>All-day event</span></label>}
      <div className="grid gap-3 sm:grid-cols-2"><label className="form-label"><MapPin className="inline h-3.5 w-3.5" /> Location<input {...register('location')} className="field mt-1 w-full" placeholder="Office or room" /></label><label className="form-label"><Video className="inline h-3.5 w-3.5" /> Video link<input {...register('videoLink')} className="field mt-1 w-full" placeholder="https://meet.company.com/..." />{errors.videoLink && <span className="form-error">{errors.videoLink.message}</span>}</label></div>
      {meetingType === 'ORG_EVENT' && <label className="form-label">Audience<select {...register('department')} className="field mt-1 w-full"><option value="">Whole company</option><option>AI/ML</option><option>Engineering</option><option>Design</option><option>Human Resources</option></select></label>}
      <div><label className="form-label"><Users className="inline h-3.5 w-3.5" /> Attendees</label><div className="relative mt-1"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#667085]" /><input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} className="field w-full pl-9" placeholder="Search employees" /></div><div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[#D9E5EE] bg-white">{employees.data?.filter((employee) => employee.id !== currentUser.id).map((employee) => <button type="button" key={employee.id} onClick={() => setAttendeeIds((ids) => ids.includes(employee.id) ? ids.filter((id) => id !== employee.id) : [...ids, employee.id])} className="flex w-full items-center gap-2 border-b border-[#D9E5EE] px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-[#EAF2F8]"><img src={employee.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-[#17324A]">{employee.name}</b><small className="text-[#667085]">{employee.department} · {employee.role}</small></span>{attendeeIds.includes(employee.id) && <Check className="h-4 w-4 text-[#C96F58]" />}</button>)}</div></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="form-label">Recurrence<select {...register('recurrence')} className="field mt-1 w-full"><option value="NONE">Does not repeat</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></label><label className="form-label"><Clock className="inline h-3.5 w-3.5" /> Reminder<select {...register('reminderMinutes', { valueAsNumber: true })} className="field mt-1 w-full"><option value="0">No reminder</option><option value="10">10 minutes before</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option></select></label></div>
      {(createMutation.error || updateMutation.error) && <p className="form-error">{(createMutation.error ?? updateMutation.error)?.message || 'The meeting could not be saved. Try again.'}</p>}
      <footer className="drawer-footer"><button type="button" onClick={onClose} className="toolbar-button">Cancel</button><button disabled={isPending} className="primary-button">{isPending ? 'Saving...' : meeting ? 'Save changes' : 'Schedule meeting'}</button></footer>
    </form></aside></div>;
}
