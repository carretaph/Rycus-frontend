// src/pages/FeedPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  fetchFeed,
  createPost,
  likePost,
  unlikePost,
  deletePost,
  type PostDto,
} from "../api/posts";

import AvatarWithBadge from "../components/AvatarWithBadge";
import "./FeedPage.css";

type FeedFilter = "ALL" | "POST" | "NEWS" | "AD";

type FeedItem =
  | {
      kind: "POST";
      id: string;
      postId: number;
      createdAt: string;
      authorName: string;
      authorEmail: string;
      authorAvatarUrl?: string;
      text: string;
      likeCount: number;
      likedByViewer: boolean;
    }
  | {
      kind: "NEWS";
      id: string;
      createdAt: string;
      title: string;
      text: string;
    }
  | {
      kind: "AD";
      id: string;
      createdAt: string;
      title: string;
      text: string;
      ctaText: string;
      ctaUrl: string;
    };

const STATIC_ITEMS: FeedItem[] = [
  {
    kind: "NEWS",
    id: "news-1",
    createdAt: "2026-01-18T20:00:00Z",
    title: "Welcome to Rycus",
    text: "Your professional customer intelligence network.",
  },
];

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function mapPost(p: PostDto): FeedItem {
  const avatar =
    typeof p.authorAvatarUrl === "string" && p.authorAvatarUrl.trim()
      ? p.authorAvatarUrl.trim()
      : undefined;

  return {
    kind: "POST",
    id: `post-${p.id}`,
    postId: p.id,
    createdAt: p.createdAt,
    authorName: p.authorName,
    authorEmail: p.authorEmail,
    authorAvatarUrl: avatar,
    text: p.text,
    likeCount: p.likeCount ?? 0,
    likedByViewer: !!p.likedByViewer,
  };
}

export default function FeedPage() {
  const { user } = useAuth();

  const [filter, setFilter] = useState<FeedFilter>("ALL");
  const [postText, setPostText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [posts, setPosts] = useState<FeedItem[]>([]);

  const pollRef = useRef<number | null>(null);

  const meName =
    user?.name ||
    user?.firstName ||
    (user?.email ? user.email.split("@")[0] : "You");

  const canLoadViewerEmail = (user?.email || "").trim() || undefined;

  async function loadFeed(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;

    if (!silent) setLoading(true);
    if (!silent) setError(null);

    try {
      const data = await fetchFeed(50, canLoadViewerEmail);
      setPosts(Array.isArray(data) ? data.map(mapPost) : []);
    } catch {
      if (!silent) setError("Could not load the wall.");
      if (!silent) setPosts([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();

    // Polling (solo si el tab está visible)
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadFeed({ silent: true });
      }
    }, 8000);

    // Refrescar cuando vuelves al tab / focus (muy útil en producción)
    const onFocus = () => void loadFeed({ silent: true });
    const onVis = () => {
      if (document.visibilityState === "visible") void loadFeed({ silent: true });
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line
  }, [canLoadViewerEmail]);

  async function handlePost() {
    const text = postText.trim();

    if (!text) {
      setError("Write something before posting 🙂");
      return;
    }

    if (!user?.email) {
      setError("You must be logged in.");
      return;
    }

    const authorName = user.name || user.firstName || user.email.split("@")[0];

    setLoading(true);
    setError(null);

    try {
      const created = await createPost({
        text,
        authorEmail: user.email,
        authorName,
      });

      setPosts((prev) => [mapPost(created), ...prev]);
      setPostText("");

      // mini refresh silencioso para “alinear” con backend (timestamps/likes/etc)
      void loadFeed({ silent: true });
    } catch {
      setError("Failed to create post.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(item: FeedItem) {
    if (item.kind !== "POST") return;
    if (!user?.email) return;

    const email = user.email;

    // optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.kind === "POST" && p.postId === item.postId
          ? {
              ...p,
              likedByViewer: !p.likedByViewer,
              likeCount: Math.max(0, p.likeCount + (p.likedByViewer ? -1 : 1)),
            }
          : p
      )
    );

    try {
      if (!item.likedByViewer) {
        const res = await likePost(item.postId, email);
        setPosts((prev) =>
          prev.map((p) =>
            p.kind === "POST" && p.postId === item.postId
              ? { ...p, likedByViewer: res.liked, likeCount: res.likeCount }
              : p
          )
        );
      } else {
        const res = await unlikePost(item.postId, email);
        setPosts((prev) =>
          prev.map((p) =>
            p.kind === "POST" && p.postId === item.postId
              ? { ...p, likedByViewer: res.liked, likeCount: res.likeCount }
              : p
          )
        );
      }
    } catch {
      void loadFeed({ silent: true });
    }
  }

  async function handleDelete(item: FeedItem) {
    if (item.kind !== "POST") return;
    if (!user?.email) return;

    if (!confirm("Delete this post permanently?")) return;

    setPosts((prev) => prev.filter((p) => !(p.kind === "POST" && p.postId === item.postId)));

    try {
      await deletePost(item.postId, user.email);
      void loadFeed({ silent: true });
    } catch {
      void loadFeed({ silent: true });
    }
  }

  const fullFeed = useMemo(() => {
    return [...posts, ...STATIC_ITEMS].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts]);

  const items = useMemo(() => {
    if (filter === "ALL") return fullFeed;
    if (filter === "POST") return fullFeed.filter((i) => i.kind === "POST");
    if (filter === "NEWS") return fullFeed.filter((i) => i.kind === "NEWS");
    return fullFeed.filter((i) => i.kind === "AD");
  }, [filter, fullFeed]);

  return (
    <div className="feed-wrap">
      {/* HEADER */}
      <div className="feed-card">
        <div className="feed-headerRow">
          <div>
            <h1 className="feed-title">Wall</h1>
            <div className="feed-subtle">{items.length} items</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* ✅ para que setFilter NO quede unused */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FeedFilter)}
              className="feed-btn feed-btnOutline"
              style={{ padding: "8px 10px" }}
              aria-label="Filter"
            >
              <option value="ALL">All</option>
              <option value="POST">Posts</option>
              <option value="NEWS">News</option>
              <option value="AD">Ads</option>
            </select>

            <button className="feed-btn feed-btnOutline" onClick={() => void loadFeed()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="feed-subtle" style={{ marginTop: 8 }}>
            Updating…
          </div>
        )}
      </div>

      <div className="feed-spacer12" />

      {/* CREATE POST */}
      <div className="feed-card">
        <div className="feed-createRow">
          <AvatarWithBadge
            size={42}
            avatarUrl={user?.avatarUrl || null}
            name={meName}
            email={user?.email || null}
            showReferralBadge={!!(user as any)?.offersReferralFee}
          />

          <div className="feed-createRight">
            <textarea
              className="feed-textarea"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's new?"
            />

            {error && <div className="feed-error">{error}</div>}

            <div className="feed-actions">
              <button className="feed-btn feed-btnPrimary" onClick={handlePost} disabled={loading}>
                {loading ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POSTS */}
      <div className="feed-list">
        {items.map((it) => (
          <div key={it.id} className="feed-card">
            {it.kind === "POST" && (
              <div className="feed-postTop">
                {/* badge solo si el post es mío */}
                <AvatarWithBadge
                  size={42}
                  avatarUrl={it.authorAvatarUrl}
                  name={it.authorName}
                  email={it.authorEmail}
                  showReferralBadge={
                    !!user?.email &&
                    user.email.toLowerCase() === it.authorEmail.toLowerCase() &&
                    !!(user as any)?.offersReferralFee
                  }
                />

                <div className="feed-postMeta">
                  <div className="feed-postNameRow">
                    <div>
                      <div className="feed-postName">{it.authorName}</div>
                      <div className="feed-postEmail">{it.authorEmail}</div>
                    </div>

                    <div className="feed-postTime">{formatTime(it.createdAt)}</div>
                  </div>

                  <div className="feed-postBody">{it.text}</div>

                  <div className="feed-postActionsRow">
                    <button className="feed-btn feed-btnGhost" onClick={() => void toggleLike(it)}>
                      👍 Like
                    </button>

                    {user?.email &&
                      user.email.toLowerCase() === it.authorEmail.toLowerCase() && (
                        <button className="feed-btn feed-btnDanger" onClick={() => void handleDelete(it)}>
                          Delete
                        </button>
                      )}
                  </div>
                </div>
              </div>
            )}

            {it.kind === "NEWS" && (
              <>
                <strong>{it.title}</strong>
                <div className="feed-postBody">{it.text}</div>
              </>
            )}

            {it.kind === "AD" && (
              <>
                <strong>{it.title}</strong>
                <div className="feed-postBody">{it.text}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}