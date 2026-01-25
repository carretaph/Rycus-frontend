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

type FeedFilter = "ALL" | "POST" | "NEWS" | "AD";

type FeedItem =
  | {
      kind: "POST";
      id: string;
      postId: number;
      createdAt: string;
      authorName: string;
      authorEmail: string;
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
    title: "Welcome to the Rycus Wall",
    text: "This wall is connected to the backend. Next: edit posts, comments, and moderation tools.",
  },
  {
    kind: "AD",
    id: "ad-1",
    createdAt: "2026-01-18T20:10:00Z",
    title: "Sponsored",
    text: "Want to promote your business inside Rycus?",
    ctaText: "Advertise on Rycus",
    ctaUrl: "/profile",
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
  return {
    kind: "POST",
    id: `post-${p.id}`,
    postId: p.id,
    createdAt: p.createdAt,
    authorName: p.authorName,
    authorEmail: p.authorEmail,
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

  // ✅ Edit state
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  async function loadFeed() {
    setLoading(true);
    setError(null);

    try {
      const viewerEmail = user?.email ?? undefined;
      const data = await fetchFeed(50, viewerEmail);
      setPosts(data.map(mapPost));
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
      setError("Failed to create post. Check security/token settings.");
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

    // optimistic remove
    setPosts((prev) =>
      prev.filter((p) => !(p.kind === "POST" && p.postId === item.postId))
    );

    try {
      await deletePost(item.postId, user.email);

      // si estabas editando ese post, cancelar edición
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

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Wall</h1>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["ALL", "POST", "NEWS", "AD"] as const).map((f) => (
            <button
              key={f}
              className="btn"
              onClick={() => setFilter(f)}
              style={{ opacity: filter === f ? 1 : 0.7 }}
            >
              {f === "ALL" ? "All" : f === "POST" ? "Posts" : f === "NEWS" ? "News" : "Ads"}
            </button>
          ))}

          <button className="btn" onClick={loadFeed} style={{ opacity: 0.9 }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Composer */}
      <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Create a post</div>

        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="What's new?"
          rows={3}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
          }}
        />

        {error && <div style={{ marginTop: 8, color: "#b91c1c" }}>{error}</div>}
        {loading && <div style={{ marginTop: 8, opacity: 0.7 }}>Loading...</div>}

        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <button className="btn" onClick={handlePost} disabled={loading}>
            Post
          </button>
        </div>
      </div>

      {/* Feed */}
      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.map((it) => (
          <div key={it.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {it.kind === "POST" ? "📝 Post" : it.kind === "NEWS" ? "🗞️ News" : "📢 Ad"}
              </strong>
              <span style={{ opacity: 0.7, fontSize: 12 }}>{formatTime(it.createdAt)}</span>
            </div>

            {it.kind === "POST" && (
              <>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  by {it.authorName} ({it.authorEmail})
                </div>

                {/* ✅ Edit UI */}
                {editingPostId === it.postId ? (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                      }}
                    />

                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn" onClick={() => saveEdit(it)} disabled={loading}>
                        💾 Save
                      </button>
                      <button className="btn" onClick={cancelEdit} style={{ opacity: 0.85 }}>
                        ✖ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{it.text}</div>
                )}

                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="btn" onClick={() => toggleLike(it)} style={{ opacity: it.likedByViewer ? 1 : 0.85 }}>
                    {it.likedByViewer ? "❤️ Liked" : "🤍 Like"}
                  </button>

                  <span style={{ opacity: 0.8, fontSize: 13 }}>{it.likeCount} likes</span>

                  {/* ✅ Author actions */}
                  {user?.email && user.email.toLowerCase() === it.authorEmail.toLowerCase() && (
                    <>
                      {editingPostId !== it.postId && (
                        <button className="btn" onClick={() => startEdit(it)} style={{ opacity: 0.85 }}>
                          ✏️ Edit
                        </button>
                      )}

                      <button className="btn" onClick={() => handleDelete(it)} style={{ opacity: 0.85 }}>
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {it.kind !== "POST" && <div style={{ marginTop: 8, fontWeight: 700 }}>{it.title}</div>}

            {it.kind !== "POST" && (
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{it.text}</div>
            )}

            {it.kind === "AD" && (
              <div style={{ marginTop: 12 }}>
                <a className="btn" href={it.ctaUrl}>
                  {it.ctaText}
                </a>
              </div>
            )}
          </div>
        ))}

        {!loading && items.length === 0 && (
          <div style={{ opacity: 0.6, padding: 12, border: "1px dashed #e5e7eb", borderRadius: 12 }}>
            Nothing here yet.
          </div>
        )}
      </div>
    </div>
  );
}
