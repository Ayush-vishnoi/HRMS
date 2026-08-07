import { redirect } from 'next/navigation';

export default function MeetingsIndexPage() {
  redirect('/meetings/calendar');
}
