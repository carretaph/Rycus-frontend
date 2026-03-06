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

import axios from "../api/axiosClient";
import AvatarWithBadge from "../components/AvatarWithBadge";
import "./FeedPage.css";

type FeedFilter = "ALL" | "POST" | "NEWS" | "AD";

type CommentDto = {
  id: number;
  postId: number;
  createdAt: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl?: string;
  text: string;
};

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
      commentCount: number;
      imageUrls: string[];
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
    typeof (p as any).authorAvatarUrl === "string" && (p as any).authorAvatarUrl.trim()
      ? (p as any).authorAvatarUrl.trim()
      : undefined;

  const imageUrlsRaw = (p as any).imageUrls;
  const imageUrls: string[] = Array.isArray(imageUrlsRaw)
    ? imageUrlsRaw.filter((u: any) => typeof u === "string")
    : [];

  const commentCount = Number((p as any).commentCount ?? 0) || 0;
  const createdAt = (p as any).createdAt || new Date().toISOString();

  return {
    kind: "POST",
    id: `post-${p.id}-${createdAt}`,
    postId: p.id,
    createdAt,
    authorName: (p as any).authorName,
    authorEmail: (p as any).authorEmail,
    authorAvatarUrl: avatar,
    text: (p as any).text,
    likeCount: Number((p as any).likeCount ?? 0) || 0,
    likedByViewer: !!(p as any).likedByViewer,
    commentCount,
    imageUrls,
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

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [openCommentsFor, setOpenCommentsFor] = useState<number | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<number, CommentDto[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<number, string>>({});
  const [commentErrorByPost, setCommentErrorByPost] = useState<Record<number, string | null>>({});

  const meName =
    (user as any)?.name ||
    (user as any)?.firstName ||
    ((user as any)?.email ? (user as any).email.split("@")[0] : "You");

  const canLoadViewerEmail = ((user as any)?.email || "").trim() || undefined;

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

    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadFeed({ silent: true });
      }
    }, 8000);

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
  }, [canLoadViewerEmail]);

  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previews]);

  function setFilesWithPreviews(next: File[]) {
    previews.forEach((u) => URL.revokeObjectURL(u));
    const urls = next.map((f) => URL.createObjectURL(f));
    setFiles(next);
    setPreviews(urls);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    const merged = [...files, ...picked];

    if (merged.length > 6) setError("Max 6 photos per post.");

    const next = merged.slice(0, 6);

    const tooBig = next.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      setError("One of the photos is too large (max 5MB each).");
      return;
    }

    setFilesWithPreviews(next);
    e.currentTarget.value = "";
  }

  function removeFileAt(idx: number) {
    const next = files.filter((_, i) => i !== idx);
    setFilesWithPreviews(next);
  }

  async function createPostWithImages(args: {
    text: string;
    authorEmail: string;
    authorName: string;
    files: File[];
  }): Promise<PostDto> {
    const fd = new FormData();
    fd.append("text", args.text);
    fd.append("authorEmail", args.authorEmail);
    fd.append("authorName", args.authorName);
    args.files.forEach((f) => fd.append("files", f));

    const res = await axios.post("/posts", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data as PostDto;
  }

  async function handlePost() {
    const text = postText.trim();

    if (!text && files.length === 0) {
      setError("Write something or add a photo 🙂");
      return;
    }

    if (!user || !(user as any).email) {
      setError("You must be logged in.");
      return;
    }

    const authorEmail = (user as any).email;
    const authorName =
      (user as any).name || (user as any).firstName || authorEmail.split("@")[0];

    setLoading(true);
    setError(null);

    try {
      let created: PostDto;

      if (files.length > 0) {
        created = await createPostWithImages({ text, authorEmail, authorName, files });
      } else {
        created = await createPost({ text, authorEmail, authorName } as any);
      }

      setPosts((prev) => [mapPost(created), ...prev]);
      setPostText("");
      setFilesWithPreviews([]);

      void loadFeed({ silent: true });
    } catch {
      setError("Failed to create post.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(item: FeedItem) {
    if (item.kind !== "POST") return;
    if (!user || !(user as any).email) return;

    const email = (user as any).email;
    let prevLiked = false;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.kind === "POST" && p.postId === item.postId) {
          prevLiked = p.likedByViewer;
          const nextLiked = !p.likedByViewer;
          const nextCount = Math.max(0, (p.likeCount ?? 0) + (p.likedByViewer ? -1 : 1));
          return { ...p, likedByViewer: nextLiked, likeCount: nextCount };
        }
        return p;
      })
    );

    try {
      if (!prevLiked) {
        const res = await likePost(item.postId, email);
        setPosts((prev) =>
          prev.map((p) =>
            p.kind === "POST" && p.postId === item.postId
              ? { ...p, likedByViewer: !!res.liked, likeCount: Number(res.likeCount ?? 0) }
              : p
          )
        );
      } else {
        const res = await unlikePost(item.postId, email);
        setPosts((prev) =>
          prev.map((p) =>
            p.kind === "POST" && p.postId === item.postId
              ? { ...p, likedByViewer: !!res.liked, likeCount: Number(res.likeCount ?? 0) }
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
    if (!user || !(user as any).email) return;

    if (!confirm("Delete this post permanently?")) return;

    setPosts((prev) => prev.filter((p) => !(p.kind === "POST" && p.postId === item.postId)));

    try {
      await deletePost(item.postId, (user as any).email);
      void loadFeed({ silent: true });
    } catch {
      void loadFeed({ silent: true });
    }
  }

  async function loadComments(postId: number) {
    if (commentsLoading[postId]) return;

    setCommentsLoading((m) => ({ ...m, [postId]: true }));
    setCommentErrorByPost((m) => ({ ...m, [postId]: null }));

    try {
      const res = await axios.get(`/posts/${postId}/comments`, { params: { limit: 50 } });
      const list: CommentDto[] = Array.isArray(res.data) ? res.data : [];
      setCommentsByPost((m) => ({ ...m, [postId]: list }));
    } catch {
      setCommentErrorByPost((m) => ({ ...m, [postId]: "Could not load comments." }));
    } finally {
      setCommentsLoading((m) => ({ ...m, [postId]: false }));
    }
  }

  async function addComment(postId: number) {
    const text = (commentDraftByPost[postId] || "").trim();
    if (!text) return;

    if (!user || !(user as any).email) {
      setCommentErrorByPost((m) => ({ ...m, [postId]: "You must be logged in." }));
      return;
    }

    setCommentErrorByPost((m) => ({ ...m, [postId]: null }));

    try {
      const payload = {
        text,
        authorEmail: (user as any).email,
        authorName:
          (user as any).name ||
          (user as any).firstName ||
          (user as any).email.split("@")[0],
      };

      const res = await axios.post(`/posts/${postId}/comments`, payload);
      const created: CommentDto = res.data;

      setCommentsByPost((m) => ({
        ...m,
        [postId]: [created, ...(m[postId] || [])],
      }));

      setCommentDraftByPost((m) => ({ ...m, [postId]: "" }));

      setPosts((prev) =>
        prev.map((p) =>
          p.kind === "POST" && p.postId === postId
            ? { ...p, commentCount: (p.commentCount || 0) + 1 }
            : p
        )
      );
    } catch {
      setCommentErrorByPost((m) => ({ ...m, [postId]: "Failed to add comment." }));
    }
  }

  function toggleComments(postId: number) {
    const next = openCommentsFor === postId ? null : postId;
    setOpenCommentsFor(next);

    if (next !== null && !commentsByPost[next]) {
      void loadComments(next);
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
      <div className="feed-card">
        <div className="feed-headerRow">
          <div>
            <h1 className="feed-title">Wall</h1>
            <div className="feed-subtle">{items.length} items</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

            <button
              className="feed-btn feed-btnOutline"
              type="button"
              onClick={() => void loadFeed()}
              disabled={loading}
            >
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

      <div className="feed-card">
        <div className="feed-createRow">
          <AvatarWithBadge
            size={42}
            avatarUrl={(user as any)?.avatarUrl || null}
            name={meName}
            email={(user as any)?.email || null}
            showReferralBadge={!!(user as any)?.offersReferralFee}
          />

          <div className="feed-createRight">
            <textarea
              className="feed-textarea"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's new?"
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label className="feed-btn feed-btnOutline" style={{ cursor: "pointer" }}>
                📷 Photos (max 6)
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>

              {files.length > 0 && <div className="feed-subtle">{files.length} selected</div>}
            </div>

            {previews.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                  gap: 8,
                  marginTop: 12,
                  maxWidth: 420,
                }}
              >
                {previews.map((url, idx) => (
                  <div key={url} style={{ position: "relative" }}>
                    <img
                      src={url}
                      alt={`preview-${idx + 1}`}
                      style={{
                        width: "100%",
                        height: 90,
                        objectFit: "cover",
                        borderRadius: 10,
                        display: "block",
                      }}
                    />
                    <button
                      className="feed-btn feed-btnDanger"
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        padding: "4px 7px",
                        borderRadius: 999,
                        minWidth: "auto",
                      }}
                      onClick={() => removeFileAt(idx)}
                      type="button"
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="feed-error">{error}</div>}

            <div className="feed-actions">
              <button className="feed-btn feed-btnPrimary" type="button" onClick={handlePost} disabled={loading}>
                {loading ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="feed-list">
        {items.map((it) => (
          <div key={it.id} className="feed-card">
            {it.kind === "POST" && (
              <div className="feed-postTop">
                <AvatarWithBadge
                  size={42}
                  avatarUrl={it.authorAvatarUrl}
                  name={it.authorName}
                  email={it.authorEmail}
                  showReferralBadge={
                    !!(user as any)?.email &&
                    (user as any).email.toLowerCase() === it.authorEmail.toLowerCase() &&
                    !!(user as any)?.offersReferralFee
                  }
                />

                <div className="feed-postMeta" style={{ maxWidth: 760 }}>
                  <div className="feed-postNameRow">
                    <div>
                      <div className="feed-postName">{it.authorName}</div>
                      <div className="feed-postEmail">{it.authorEmail}</div>
                    </div>

                    <div className="feed-postTime">{formatTime(it.createdAt)}</div>
                  </div>

                  {!!it.text && <div className="feed-postBody">{it.text}</div>}

                  {Array.isArray(it.imageUrls) && it.imageUrls.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          it.imageUrls.length === 1
                            ? "1fr"
                            : it.imageUrls.length === 2
                            ? "1fr 1fr"
                            : "1fr 1fr",
                        gap: 8,
                        marginTop: 10,
                        maxWidth: 560,
                      }}
                    >
                      {it.imageUrls.slice(0, 6).map((url, idx) => (
                        <img
                          key={`${it.postId}-img-${idx}`}
                          src={url}
                          alt={`post-${it.postId}-img-${idx + 1}`}
                          onClick={() => window.open(url, "_blank")}
                          style={{
                            width: "100%",
                            maxHeight: 600,
                            objectFit: "contain",
                            borderRadius: 14,
                            display: "block",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            background: "#f8fafc",
                            cursor: "pointer",
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="feed-postActionsRow" style={{ position: "relative", zIndex: 5 }}>
                    <button
                      className="feed-btn feed-btnGhost"
                      type="button"
                      onClick={() => toggleLike(it)}
                      aria-label="Like post"
                      title={it.likedByViewer ? "Unlike" : "Like"}
                    >
                      👍 {it.likedByViewer ? "Liked" : "Like"}{" "}
                      <span style={{ opacity: 0.8 }}>({it.likeCount ?? 0})</span>
                    </button>

                    <button
                      className="feed-btn feed-btnGhost"
                      type="button"
                      onClick={() => toggleComments(it.postId)}
                      aria-label="Toggle comments"
                      title="Comments"
                    >
                      💬 Comments <span style={{ opacity: 0.8 }}>({it.commentCount ?? 0})</span>
                    </button>

                    {(user as any)?.email &&
                      (user as any).email.toLowerCase() === it.authorEmail.toLowerCase() && (
                        <button className="feed-btn feed-btnDanger" type="button" onClick={() => void handleDelete(it)}>
                          Delete
                        </button>
                      )}
                  </div>

                  {openCommentsFor === it.postId && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={commentDraftByPost[it.postId] || ""}
                          onChange={(e) =>
                            setCommentDraftByPost((m) => ({ ...m, [it.postId]: e.target.value }))
                          }
                          placeholder="Write a comment…"
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.15)",
                            outline: "none",
                          }}
                        />
                        <button className="feed-btn feed-btnPrimary" type="button" onClick={() => void addComment(it.postId)}>
                          Send
                        </button>
                      </div>

                      {commentErrorByPost[it.postId] && (
                        <div className="feed-error" style={{ marginTop: 8 }}>
                          {commentErrorByPost[it.postId]}
                        </div>
                      )}

                      <div style={{ marginTop: 10 }}>
                        {commentsLoading[it.postId] && <div className="feed-subtle">Loading comments…</div>}

                        {!commentsLoading[it.postId] && (commentsByPost[it.postId] || []).length === 0 && (
                          <div className="feed-subtle">No comments yet.</div>
                        )}

                        {(commentsByPost[it.postId] || []).map((c) => (
                          <div
                            key={c.id}
                            style={{
                              display: "flex",
                              gap: 10,
                              padding: "10px 0",
                              borderTop: "1px solid rgba(0,0,0,0.06)",
                            }}
                          >
                            <AvatarWithBadge
                              size={34}
                              avatarUrl={c.authorAvatarUrl}
                              name={c.authorName}
                              email={c.authorEmail}
                              showReferralBadge={false}
                            />

                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>
                                  {c.authorName}{" "}
                                  <span style={{ fontWeight: 400, opacity: 0.65 }}>{c.authorEmail}</span>
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.6 }}>{formatTime(c.createdAt)}</div>
                              </div>
                              <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{c.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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