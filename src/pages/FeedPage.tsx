// src/pages/FeedPage.tsx
import { useEffect, useMemo, useState } from "react";
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

  const [postText, setPostText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [posting, setPosting] = useState(false);

  async function loadFeed() {
    setLoadingFeed(true);
    setError(null);

    try {
      const viewerEmail = user?.email ?? undefined;
      const data = await fetchFeed(50, viewerEmail);
      setPosts(Array.isArray(data) ? data.map(mapPost) : []);
    } catch {
      setError("Could not load the wall.");
      setPosts([]);
    } finally {
      setLoadingFeed(false);
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

    const authorName = (user.name || user.firstName || user.email.split("@")[0]).trim();

    setPosting(true);
    setError(null);

    try {
      const created = await createPost({
        text,
        authorEmail: user.email,
        authorName,
      });

      setPosts((prev) => [mapPost(created), ...prev]);
      setPostText("");
    } catch {
      setError("Failed to create post.");
    } finally {
      setPosting(false);
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
      void loadFeed();
    }
  }

  async function handleDelete(item: FeedItem) {
    if (item.kind !== "POST") return;
    if (!user?.email) return;

    if (!confirm("Delete this post permanently?")) return;

    // optimistic remove
    setPosts((prev) => prev.filter((p) => !(p.kind === "POST" && p.postId === item.postId)));

    try {
      await deletePost(item.postId, user.email);
    } catch {
      void loadFeed();
    }
  }

  const fullFeed = useMemo(() => {
    return [...posts, ...STATIC_ITEMS].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts]);

  const meName =
    user?.name || user?.firstName || (user?.email ? user.email.split("@")[0] : "You");

  const myOffersRF = !!(user as any)?.offersReferralFee;

  return (
    <div className="feed-wrap">
      {/* HEADER */}
      <div className="feed-card">
        <div className="feed-headerRow">
          <div>
            <h1 className="feed-title">Wall</h1>
            <div className="feed-subtle">{fullFeed.length} items</div>
          </div>

          <button
            className="feed-btn feed-btnOutline"
            onClick={loadFeed}
            disabled={loadingFeed}
            title={loadingFeed ? "Loading…" : "Refresh"}
          >
            {loadingFeed ? "Loading…" : "Refresh"}
          </button>
        </div>
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
            showReferralBadge={myOffersRF}
          />

          <div className="feed-createRight">
            <textarea
              className="feed-textarea"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's new?"
              rows={3}
            />

            {error && <div className="feed-error">{error}</div>}

            <div className="feed-actions">
              <button
                className="feed-btn feed-btnPrimary"
                onClick={handlePost}
                disabled={posting || !postText.trim()}
                title={posting ? "Posting…" : "Post"}
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POSTS */}
      <div className="feed-list">
        {fullFeed.map((it) => (
          <div key={it.id} className="feed-card">
            {it.kind === "POST" && (
              <div className="feed-postTop">
                {/* ✅ FIX: badge shows if THIS post belongs to current user */}
                <AvatarWithBadge
                  size={42}
                  avatarUrl={it.authorAvatarUrl || null}
                  name={it.authorName}
                  email={it.authorEmail}
                  showReferralBadge={
                    !!user?.email &&
                    user.email.toLowerCase() === it.authorEmail.toLowerCase() &&
                    myOffersRF
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
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        className="feed-btn feed-btnGhost"
                        onClick={() => toggleLike(it)}
                        title={it.likedByViewer ? "Unlike" : "Like"}
                      >
                        {it.likedByViewer ? "👍 Liked" : "👍 Like"}
                      </button>

                      <div className="feed-likesCount">{it.likeCount} likes</div>
                    </div>

                    {user?.email &&
                      user.email.toLowerCase() === it.authorEmail.toLowerCase() && (
                        <button
                          className="feed-btn feed-btnDanger"
                          onClick={() => handleDelete(it)}
                        >
                          Delete
                        </button>
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
          </div>
        ))}
      </div>
    </div>
  );
}