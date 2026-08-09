import Link from 'next/link';
import { ArrowLeft, CalendarDays, Megaphone } from 'lucide-react';
import { ANNOUNCEMENTS } from '@/data/announcements';

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ announcementId: string }> }) {
  const { announcementId } = await params;
  const announcement = ANNOUNCEMENTS.find((item) => item.id === announcementId);

  if (!announcement) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#30363d] bg-[#161b22] p-8 text-center">
        <h1 className="text-xl font-bold text-[#F0F2F5]">Announcement not found</h1>
        <p className="mt-2 text-sm text-[#8B949E]">This announcement may no longer be available.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#B86B78] hover:text-[#F0F2F5]">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl sm:p-10">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#8B949E] transition-colors hover:text-[#F0F2F5]">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mt-8 flex items-start gap-3">
        <div className="rounded-xl border border-[#8B3A4A]/30 bg-[#8B3A4A]/20 p-3 text-[#B86B78]">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B86B78]">Company announcement</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F0F2F5] sm:text-3xl">{announcement.title}</h1>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#8B949E]">
            <CalendarDays className="h-4 w-4" />
            <span>{announcement.department}</span>
            <span>·</span>
            <span>{announcement.publishedAt}</span>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-[#30363d]" />
      <div className="space-y-5 text-sm leading-7 text-[#c9d1d9]">
        {announcement.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </article>
  );
}
