"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  user_id: string;
  created_at: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchBookmarks = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setBookmarks((data as Bookmark[]) || []);
  }, []);

  const subscribeToChanges = useCallback((uid: string) => {
    return supabase
      .channel("bookmarks-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${uid}`,
        },
        (payload) => setBookmarks((prev) => [payload.new as Bookmark, ...prev]),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${uid}`,
        },
        (payload) =>
          setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id)),
      )
      .subscribe();
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push("/");
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);
      setUserEmail(data.session.user.email ?? null);
      await fetchBookmarks(uid);
      channel = subscribeToChanges(uid);
      setLoading(false);
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchBookmarks, subscribeToChanges, router]);

  const addBookmark = async () => {
    if (!title.trim() || !url.trim() || !userId) return;
    setAdding(true);
    await supabase.from("bookmarks").insert({
      title: title.trim(),
      url: url.trim(),
      user_id: userId,
    });
    setTitle("");
    setUrl("");
    setAdding(false);
  };

  const deleteBookmark = async (id: string) => {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId!);

    if (error) console.error("Delete failed:", error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addBookmark();
  };

  const getDomain = (rawUrl: string) => {
    try {
      return new URL(rawUrl).hostname.replace("www.", "");
    } catch {
      return rawUrl;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100">
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  const canAdd = title.trim() && url.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            ⌘ Marks
          </span>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="hidden sm:block text-sm text-slate-500 truncate max-w-[220px]">
                {userEmail}
              </span>
            )}
            <button
              onClick={logout}
              className="text-sm text-slate-600 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-100 hover:text-slate-900 transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Add Bookmark */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">
            Add bookmark
          </p>
          <div className="flex gap-3">
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 text-sm bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
            />
            <input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 text-sm bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
            />
            <button
              onClick={addBookmark}
              disabled={adding || !canAdd}
              className="shrink-0 text-sm font-medium bg-slate-900 text-white rounded-xl px-6 py-2.5 hover:bg-slate-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </div>

        {/* Bookmark List */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Saved
            </span>
            <span className="text-sm font-semibold text-slate-300 tabular-nums">
              {bookmarks.length}
            </span>
          </div>

          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-4xl opacity-30">🔖</span>
              <p className="text-sm text-slate-400">
                No bookmarks yet. Add one above.
              </p>
            </div>
          ) : (
            <ul>
              {bookmarks.map((b, i) => (
                <li
                  key={b.id}
                  className={`flex items-center gap-4 px-6 py-4 group hover:bg-slate-50 transition-colors duration-200 ${
                    i !== bookmarks.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500 uppercase">
                    {b.title.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium text-slate-900 truncate hover:text-slate-600 transition-colors"
                    >
                      {b.title}
                    </a>
                    <span className="block text-xs text-slate-400 truncate">
                      {getDomain(b.url)}
                    </span>
                  </div>

                  <button
                    onClick={() => deleteBookmark(b.id)}
                    className="shrink-0 text-sm text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md"
                    aria-label="Delete bookmark"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
