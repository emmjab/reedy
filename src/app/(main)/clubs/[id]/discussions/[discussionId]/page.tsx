"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: User;
}

interface Discussion {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  user: User;
  comments: Comment[];
  club: { id: string; name: string };
}

function Avatar({ user }: { user: User }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
      {user.name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function DiscussionPage() {
  const { id: clubId, discussionId } = useParams<{ id: string; discussionId: string }>();
  const router = useRouter();

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/clubs/${clubId}/discussions/${discussionId}`);
    if (res.ok) setDiscussion(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/clubs/${clubId}/discussions/${discussionId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (res.ok) {
      setCommentBody("");
      await load();
    }
    setPosting(false);
  };

  const deleteComment = async (commentId: string) => {
    await fetch(`/api/clubs/${clubId}/discussions/${discussionId}/comments?commentId=${commentId}`, { method: "DELETE" });
    await load();
  };

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-gray-400">Loading...</div>;
  }

  if (!discussion) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-gray-500">Discussion not found.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Breadcrumb */}
      <Link href={`/clubs/${clubId}`} className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
        ← {discussion.club.name}
      </Link>

      {/* Original post */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{discussion.title}</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          <Avatar user={discussion.user} />
          <span>{discussion.user.name}</span>
          <span>·</span>
          <span>{formatDate(discussion.createdAt)}</span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{discussion.body}</p>
      </div>

      {/* Comments */}
      <div className="mt-8 space-y-4">
        <h2 className="font-semibold text-gray-800">
          {discussion.comments.length} {discussion.comments.length === 1 ? "reply" : "replies"}
        </h2>
        {discussion.comments.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Avatar user={c.user} />
                <span className="font-medium text-gray-800">{c.user.name}</span>
                <span>·</span>
                <span>{formatDate(c.createdAt)}</span>
              </div>
              <button
                onClick={() => deleteComment(c.id)}
                className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                title="Delete comment"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{c.body}</p>
          </div>
        ))}
      </div>

      {/* Reply form */}
      <form onSubmit={postComment} className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="Add a reply..."
          rows={3}
          className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="mt-3 flex justify-end">
          <Button type="submit" size="sm" loading={posting} disabled={!commentBody.trim()}>
            Reply
          </Button>
        </div>
      </form>
    </div>
  );
}
