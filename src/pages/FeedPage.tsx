// src/pages/FeedPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  fetchFeed,
  createPost,
  likePost,
  unlikePost,
  deletePost,
  updatePost,
  type PostDto,
} from "../api/posts";

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

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function AvatarBubble({
  name,
  url,
  label,
}: {
  name: string;
  url?: string;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const cleanUrl =
    typeof url === "string" && url.trim().length > 0 ? url.trim() : undefined;

  const showImg = !!cleanUrl && !failed;

  // cache-buster (solo para evitar caching raro mientras debug)
  const src = showImg
    ? cleanUrl!.includes("?")
      ? `${cleanUrl!}&v=${Date.now()}`
      : `${cleanUrl!}?v=${Date.now()}`
    : undefined;

  return (
    <div
      className={`feed-avatar ${showImg ? "feed-avatarHasImg" : ""}`}
      aria-label={label ?? `${name} avatar`}
    >
      {showImg ? (
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : null}

      <span>{initials(name)}</span>
    </div>
  );
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

  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  async function loadFeed() {
    setLoading(true);
    setError(null);

    try {
      const viewerEmail = user?.email ?? undefined;
      const data = await fetchFeed(50, viewerEmail);
      setPosts(Array.isArray(data) ? data.map(mapPost) : []);
    } catch {
      setError("Could not load the wall. Check backend URL / CORS.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const authorName =
      (user.firstName?.trim() && user.firstName.trim()) ||
      (user.name?.trim() && user.name.trim()) ||
      user.email.split("@")[0];

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
      setFilter("ALL");
    } catch {
      setError("Failed to create post.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(item: FeedItem) {
    if (item.kind !== "POST") return;

    if (!user?.email) {
      setError("You must be logged in.");
      return;
    }

    const email = user.email;

    // optimistic UI
    setPosts((prev) =>
      prev.map((p) => {
        if (p.kind !== "POST") return p;
        if (p.postId !== item.postId) return p;

        const nextLiked = !p.likedByViewer;
        const nextCount = Math.max(0, p.likeCount + (nextLiked ? 1 : -1));
        return { ...p, likedByViewer: nextLiked, likeCount: nextCount };
      })
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
      void loadFeed();
    }
  }

  async function handleDelete(item: FeedItem) {
    if (item.kind !== "POST") return;

    if (!user?.email) {
      setError("You must be logged in.");
      return;
    }

    const ok = confirm("Delete this post permanently?");
    if (!ok) return;

    setPosts((prev) =>
      prev.filter((p) => !(p.kind === "POST" && p.postId === item.postId))
    );

    try {
      await deletePost(item.postId, user.email);

      if (editingPostId === item.postId) {
        setEditingPostId(null);
        setEditText("");
      }
    } catch {
      setError("Failed to delete post.");
      void loadFeed();
    }
  }

  function startEdit(item: FeedItem) {
    if (item.kind !== "POST") return;
    setEditingPostId(item.postId);
    setEditText(item.text);
    setError(null);
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditText("");
    setError(null);
  }

  async function saveEdit(item: FeedItem) {
    if (item.kind !== "POST") return;

    if (!user?.email) {
      setError("You must be logged in.");
      return;
    }

    const text = editText.trim();
    if (!text) {
      setError("Post text cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await updatePost(item.postId, user.email, text);

      setPosts((prev) =>
        prev.map((p) =>
          p.kind === "POST" && p.postId === item.postId ? mapPost(updated) : p
        )
      );

      setEditingPostId(null);
      setEditText("");
    } catch {
      setError("Failed to update post.");
      void loadFeed();
    } finally {
      setLoading(false);
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

  const meName =
    user?.name ||
    user?.firstName ||
    (user?.email ? user.email.split("@")[0] : "You");

  return (
    <div className="feed-wrap">
      {/* Header */}
      <div className="feed-card">
        <div className="feed-headerRow">
          <div>
            <h1 className="feed-title">Wall</h1>
            <div className="feed-subtle">{items.length} items</div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="feed-tabs">
              {(["ALL", "POST", "NEWS", "AD"] as const).map((f) => (
                <button
                  key={f}
                  className={`feed-tab ${filter === f ? "feed-tabActive" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "ALL" ? "All" : f === "POST" ? "Posts" : f === "NEWS" ? "News" : "Ads"}
                </button>
              ))}
            </div>

            <button className="feed-btn feed-btnOutline" onClick={loadFeed} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="feed-spacer12" />

      {/* Composer */}
      <div className="feed-card">
        <div className="feed-createRow">
          <AvatarBubble name={meName} url={user?.avatarUrl || undefined} label="Your avatar" />

          <div className="feed-createRight">
            <textarea
              className="feed-textarea"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's new?"
              rows={3}
            />

            {error && (
              <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 700 }}>
                {error}
              </div>
            )}
            {loading && <div style={{ marginTop: 8, opacity: 0.7 }}>Loading...</div>}

            <div className="feed-actions">
              <button className="feed-btn feed-btnPrimary" onClick={handlePost} disabled={loading}>
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="feed-list">
        {items.map((it) => (
          <div key={it.id} className="feed-card">
            {it.kind === "POST" && (
              <div className="feed-postTop">
                <AvatarBubble name={it.authorName} url={it.authorAvatarUrl} />

                <div className="feed-postMeta">
                  <div className="feed-postNameRow">
                    <div>
                      <p className="feed-postName">{it.authorName}</p>
                      <div className="feed-postEmail">{it.authorEmail}</div>
                    </div>
                    <div className="feed-postTime">{formatTime(it.createdAt)}</div>
                  </div>

                  {editingPostId === it.postId ? (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        className="feed-textarea"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                      />
                      <div className="feed-actions" style={{ justifyContent: "flex-start" }}>
                        <button
                          className="feed-btn feed-btnPrimary"
                          onClick={() => saveEdit(it)}
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          className="feed-btn feed-btnOutline"
                          onClick={cancelEdit}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="feed-postBody">{it.text}</div>
                  )}

                  <div className="feed-postActionsRow">
                    <div className="feed-actionGroup">
                      <button
                        className="feed-btn feed-btnGhost"
                        onClick={() => toggleLike(it)}
                        disabled={loading}
                      >
                        {it.likedByViewer ? "👍 Liked" : "👍 Like"}
                      </button>
                      <div className="feed-likesCount">{it.likeCount} likes</div>
                    </div>

                    {user?.email &&
                      user.email.toLowerCase() === it.authorEmail.toLowerCase() && (
                        <div className="feed-actionGroup">
                          {editingPostId !== it.postId && (
                            <button
                              className="feed-btn feed-btnGhost"
                              onClick={() => startEdit(it)}
                              disabled={loading}
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <button
                            className="feed-btn feed-btnDanger"
                            onClick={() => handleDelete(it)}
                            disabled={loading}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {it.kind === "NEWS" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{it.title}</strong>
                  <span className="feed-postTime">{formatTime(it.createdAt)}</span>
                </div>
                <div className="feed-postBody">{it.text}</div>
              </>
            )}

            {it.kind === "AD" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{it.title}</strong>
                  <span className="feed-postTime">{formatTime(it.createdAt)}</span>
                </div>
                <div className="feed-postBody">{it.text}</div>
              </>
            )}
          </div>
        ))}

        {!loading && items.length === 0 && (
          <div className="feed-card" style={{ opacity: 0.7, borderStyle: "dashed" }}>
            Nothing here yet.
          </div>
        )}
      </div>
    </div>
  );
}
