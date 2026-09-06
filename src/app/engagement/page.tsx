'use client';

import { authFetch } from '@/lib/api-client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Heart,
  Lightbulb,
  MessageSquare,
  PartyPopper,
  Pin,
  Plus,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type Survey = {
  id: string;
  title: string;
  description: string;
  surveyType: string;
  startDate: string;
  endDate: string;
  isAnonymous: boolean;
  status: string;
  responseCount: number;
};

type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  postType: string;
  title: string;
  content: string;
  mediaUrl?: string | null;
  pinned: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
};

type Recognition = {
  id: string;
  giverId: string;
  giverName: string;
  receiverId: string;
  receiverName: string;
  recognitionType: string;
  badgeIcon: string;
  message: string;
  likesCount: number;
  createdAt: string;
};

type Suggestion = {
  id: string;
  employeeId?: string | null;
  employeeName?: string | null;
  category: string;
  title: string;
  description: string;
  status: string;
  upvotesCount: number;
  hrResponse?: string | null;
};

export default function EngagementPage() {
  const { currentUser, employees } = useHRMS();
  const [activeTab, setActiveTab] = useState<'feed' | 'kudos' | 'surveys' | 'suggestions'>('feed');

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showKudosModal, setShowKudosModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);

  // Kudos Form
  const [kudosReceiverId, setKudosReceiverId] = useState('');
  const [kudosBadge, setKudosBadge] = useState('⭐');
  const [kudosType, setKudosType] = useState('Spotlight');
  const [kudosMessage, setKudosMessage] = useState('');

  // Post Form
  const [postTitle, setPostTitle] = useState('');
  const [postType, setPostType] = useState('General');
  const [postContent, setPostContent] = useState('');

  // Suggestion Form
  const [sugTitle, setSugTitle] = useState('');
  const [sugCategory, setSugCategory] = useState('Workplace');
  const [sugDesc, setSugDesc] = useState('');
  const [sugAnonymous, setSugAnonymous] = useState(false);

  const fetchEngagement = async () => {
    try {
      setLoading(true);
      const res = await authFetch<Response>('/api/engagement', { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSurveys(json.data.surveys || []);
          setFeedPosts(json.data.feedPosts || []);
          setRecognitions(json.data.recognitions || []);
          setSuggestions(json.data.suggestions || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch engagement data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngagement();
  }, []);

  const handleSendKudos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kudosReceiverId || !kudosMessage) return;

    const receiver = employees.find((emp) => emp.id === kudosReceiverId);
    try {
      const res = await authFetch<Response>('/api/engagement', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kudos',
          giverId: currentUser.id,
          giverName: currentUser.name,
          receiverId: kudosReceiverId,
          receiverName: receiver ? receiver.name : 'Colleague',
          recognitionType: kudosType,
          badgeIcon: kudosBadge,
          message: kudosMessage,
        }),
      });

      if (res.ok) {
        setShowKudosModal(false);
        setKudosMessage('');
        await fetchEngagement();
      }
    } catch (err) {
      console.error('Failed to send kudos:', err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postContent) return;

    try {
      const res = await authFetch<Response>('/api/engagement', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatar,
          postType,
          title: postTitle,
          content: postContent,
        }),
      });

      if (res.ok) {
        setShowPostModal(false);
        setPostTitle('');
        setPostContent('');
        await fetchEngagement();
      }
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugTitle || !sugDesc) return;

    try {
      const res = await authFetch<Response>('/api/engagement', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggestion',
          employeeId: sugAnonymous ? null : currentUser.id,
          employeeName: sugAnonymous ? 'Anonymous Employee' : currentUser.name,
          category: sugCategory,
          title: sugTitle,
          description: sugDesc,
        }),
      });

      if (res.ok) {
        setShowSuggestionModal(false);
        setSugTitle('');
        setSugDesc('');
        await fetchEngagement();
      }
    } catch (err) {
      console.error('Failed to submit suggestion:', err);
    }
  };

  const handleUpvoteSuggestion = async (id: string) => {
    try {
      const res = await authFetch<Response>('/api/engagement', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upvote_suggestion',
          id,
        }),
      });

      if (res.ok) {
        await fetchEngagement();
      }
    } catch (err) {
      console.error('Failed to upvote suggestion:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <Heart className="h-4 w-4" /> Employee Experience & Culture
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Engagement & Social Voice
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            Share peer recognition, celebrate team milestones, participate in pulse surveys, and submit suggestions for workplace improvements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowKudosModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-sm flex items-center gap-2 hover:opacity-95 transition-all cursor-pointer"
          >
            <Star className="w-4 h-4" />
            Give Kudos / Badge
          </button>
          <button
            onClick={() => setShowPostModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Announcement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D9E5EE] pb-2">
        {[
          { key: 'feed', label: 'Company Feed & Announcements', icon: MessageSquare },
          { key: 'kudos', label: 'Recognition & Kudos Wall', icon: Star },
          { key: 'surveys', label: 'Pulse Surveys & eNPS', icon: TrendingUp },
          { key: 'suggestions', label: 'Employee Voice & Ideas', icon: Lightbulb },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#17324A] text-white shadow-sm'
                  : 'text-[#52677A] hover:bg-[#EAF2F8]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content: Social Feed */}
      {activeTab === 'feed' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {feedPosts.map((post) => (
              <div
                key={post.id}
                className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#EAF2F8] text-[#17324A] font-bold flex items-center justify-center text-xs">
                      {post.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#17324A]">{post.authorName}</h4>
                      <p className="text-[10px] text-[#667085]">{post.postType} · {new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {post.pinned && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Pin className="h-3 w-3" /> Pinned
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-[#17324A]">{post.title}</h3>
                <p className="text-xs text-[#52677A] leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                <div className="flex items-center gap-4 pt-2 border-t border-[#F0F4F8] text-xs text-[#667085]">
                  <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                    <Heart className="h-3.5 w-3.5 fill-current" /> {post.likesCount} Cheers
                  </span>
                  <span className="flex items-center gap-1.5 text-[#667085]">
                    <MessageSquare className="h-3.5 w-3.5" /> {post.commentsCount} Comments
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#EAF2F8] border border-[#B0D0EA] space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#17324A]">
                Upcoming Celebrations
              </span>
              <div className="space-y-2.5 text-xs text-[#17324A]">
                <div className="flex items-center gap-2">
                  <PartyPopper className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold">Rahul Verma</p>
                    <p className="text-[10px] text-[#667085]">Work Anniversary · 5 Years (Tomorrow)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PartyPopper className="h-4 w-4 text-pink-600 shrink-0" />
                  <div>
                    <p className="font-bold">Ananya Rao</p>
                    <p className="text-[10px] text-[#667085]">Birthday Celebration · 22 Aug</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Kudos Wall */}
      {activeTab === 'kudos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recognitions.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#FDFBF7] border border-amber-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{rec.badgeIcon}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {rec.recognitionType}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-[#17324A]">To: {rec.receiverName}</h4>
                  <p className="text-[10px] text-[#667085]">From: {rec.giverName}</p>
                </div>

                <p className="text-xs text-[#52677A] italic bg-white/80 p-3 rounded-xl border border-amber-100">
                  &quot;{rec.message}&quot;
                </p>

                <div className="text-[10px] text-[#667085] flex items-center justify-between pt-1">
                  <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                  <span className="font-bold text-amber-700">⭐ {rec.likesCount} Appreciations</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Surveys */}
      {activeTab === 'surveys' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
          <h2 className="text-base font-bold text-[#17324A]">Active Pulse Surveys & eNPS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="p-5 rounded-2xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                    {survey.surveyType}
                  </span>
                  <span className="text-[10px] text-[#667085]">
                    {survey.responseCount} Responses
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#17324A]">{survey.title}</h3>
                <p className="text-xs text-[#667085]">{survey.description}</p>
                <div className="pt-2 border-t border-[#EAF2F8] flex items-center justify-between">
                  <span className="text-[10px] text-emerald-600 font-semibold">100% Anonymous</span>
                  <button className="px-3 py-1.5 bg-[#17324A] text-white text-xs font-bold rounded-lg hover:bg-[#244A68]">
                    Take Survey (2 mins)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Suggestions */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowSuggestionModal(true)}
              className="px-4 py-2 rounded-xl bg-[#17324A] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm hover:bg-[#244A68]"
            >
              <Lightbulb className="w-4 h-4" />
              Submit Suggestion / Idea
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-5 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF2F8] text-[#17324A]">
                    {sug.category}
                  </span>
                  <button
                    onClick={() => handleUpvoteSuggestion(sug.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> {sug.upvotesCount} Upvotes
                  </button>
                </div>

                <h3 className="font-bold text-sm text-[#17324A]">{sug.title}</h3>
                <p className="text-xs text-[#52677A]">{sug.description}</p>
                <div className="pt-2 border-t border-[#F0F4F8] text-[10px] text-[#667085] flex items-center justify-between">
                  <span>By: {sug.employeeName || 'Anonymous'}</span>
                  <span className="font-semibold text-blue-600">Status: {sug.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Give Kudos Modal */}
      {showKudosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#D9E5EE] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF2F8] pb-3">
              <h3 className="text-base font-bold text-[#17324A]">Send Peer Recognition / Kudos</h3>
              <button onClick={() => setShowKudosModal(false)} className="rounded-lg p-1 text-[#667085]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendKudos} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Select Colleague *</label>
                <select
                  required
                  value={kudosReceiverId}
                  onChange={(e) => setKudosReceiverId(e.target.value)}
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                >
                  <option value="">Choose a team member...</option>
                  {employees
                    .filter((e) => e.id !== currentUser.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department} · {emp.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">Badge</label>
                  <select
                    value={kudosBadge}
                    onChange={(e) => setKudosBadge(e.target.value)}
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                  >
                    <option value="⭐">⭐ Star Performer</option>
                    <option value="🚀">🚀 Rocket / Speed</option>
                    <option value="💡">💡 Innovation Spark</option>
                    <option value="🤝">🤝 Team Champion</option>
                    <option value="🏆">🏆 MVP Champion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">Category</label>
                  <select
                    value={kudosType}
                    onChange={(e) => setKudosType(e.target.value)}
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                  >
                    <option value="Spotlight">Spotlight</option>
                    <option value="Innovation">Innovation</option>
                    <option value="TeamPlayer">Team Player</option>
                    <option value="CustomerHero">Customer Hero</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Appreciation Note *</label>
                <textarea
                  required
                  rows={3}
                  value={kudosMessage}
                  onChange={(e) => setKudosMessage(e.target.value)}
                  placeholder="Recognize their specific impact, dedication, or support..."
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAF2F8]">
                <button
                  type="button"
                  onClick={() => setShowKudosModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg shadow-sm hover:opacity-95"
                >
                  Publish Kudos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#D9E5EE] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF2F8] pb-3">
              <h3 className="text-base font-bold text-[#17324A]">Create Feed Announcement</h3>
              <button onClick={() => setShowPostModal(false)} className="rounded-lg p-1 text-[#667085]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Title *</label>
                <input
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Q3 Town Hall & Product Demo"
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Post Type</label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value)}
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Celebration">Celebration</option>
                  <option value="Award">Award</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Content / Message *</label>
                <textarea
                  required
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Write message to the organization..."
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAF2F8]">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#17324A] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#244A68]"
                >
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggestion Modal */}
      {showSuggestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#D9E5EE] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF2F8] pb-3">
              <h3 className="text-base font-bold text-[#17324A]">Submit Workplace Suggestion</h3>
              <button onClick={() => setShowSuggestionModal(false)} className="rounded-lg p-1 text-[#667085]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSuggestion} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Title *</label>
                <input
                  required
                  value={sugTitle}
                  onChange={(e) => setSugTitle(e.target.value)}
                  placeholder="e.g. Ergonomic Standing Desks on 4th Floor"
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Category</label>
                <select
                  value={sugCategory}
                  onChange={(e) => setSugCategory(e.target.value)}
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A]"
                >
                  <option value="Workplace">Workplace & Facilities</option>
                  <option value="Engineering">Engineering Tools & Infra</option>
                  <option value="Culture">Culture & Community</option>
                  <option value="Benefits">Benefits & Wellness</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={sugDesc}
                  onChange={(e) => setSugDesc(e.target.value)}
                  placeholder="Describe your suggestion and its positive impact..."
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={sugAnonymous}
                  onChange={(e) => setSugAnonymous(e.target.checked)}
                  className="rounded border-[#9FC2DC]"
                />
                <label htmlFor="anonCheck" className="text-xs text-[#17324A]">
                  Submit Anonymously (Hide identity)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAF2F8]">
                <button
                  type="button"
                  onClick={() => setShowSuggestionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#17324A] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#244A68]"
                >
                  Submit Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
