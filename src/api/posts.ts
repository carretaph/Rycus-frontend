// src/api/posts.ts
import axiosClient from "./axiosClient";

/* =========================================================
   DTOs
   ========================================================= */

export type PostDto = {
  id: number;
  text: string;

  authorEmail: string;
  authorName: string;

  // avatar (tu fix)
  authorAvatarUrl?: string | null;

  createdAt: string;

  likeCount: number;
  likedByViewer: boolean;

  // NEW (cuando backend lo devuelva)
  commentCount?: number;
  imageUrls?: string[];
};

export type CreatePostRequest = {
  text: string;
  authorEmail: string;
  authorName: string;
};

export type LikeResponse = {
  likeCount: number;
  liked: boolean;
};

/* ===== COMMENTS (NEW) ===== */

export type CommentDto = {
  id: number;
  postId: number;
  createdAt: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl?: string | null;
  text: string;
};

export type CreateCommentRequest = {
  text: string;
  authorEmail: string;
  authorName: string;
};

/* =========================================================
   FETCH FEED
   GET /posts/feed?limit=50&viewerEmail=...
   ========================================================= */

export async function fetchFeed(limit: number = 50, viewerEmail?: string): Promise<PostDto[]> {
  const params: Record<string, any> = { limit };
  if (viewerEmail) params.viewerEmail = viewerEmail;

  const res = await axiosClient.get<PostDto[]>("/posts/feed", { params });

  // console.log("FEED RAW →", res.data);

  return Array.isArray(res.data)
    ? res.data.map((p) => ({
        ...p,
        authorAvatarUrl: p.authorAvatarUrl || (p as any).author_avatar_url || null,
        imageUrls: Array.isArray((p as any).imageUrls) ? (p as any).imageUrls : (p as any).image_urls,
        commentCount: (p as any).commentCount ?? (p as any).comment_count ?? 0,
      }))
    : [];
}

/* =========================================================
   CREATE POST (JSON)
   POST /posts
   ========================================================= */

export async function createPost(body: CreatePostRequest): Promise<PostDto> {
  const res = await axiosClient.post<PostDto>("/posts", body);

  return {
    ...res.data,
    authorAvatarUrl: res.data.authorAvatarUrl || (res.data as any).author_avatar_url || null,
    imageUrls: Array.isArray((res.data as any).imageUrls) ? (res.data as any).imageUrls : (res.data as any).image_urls,
    commentCount: (res.data as any).commentCount ?? (res.data as any).comment_count ?? 0,
  };
}

/* =========================================================
   CREATE POST (MULTIPART) - when backend supports it
   POST /posts (multipart/form-data)
   ========================================================= */

export async function createPostWithImages(args: {
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

  const res = await axiosClient.post<PostDto>("/posts", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return {
    ...res.data,
    authorAvatarUrl: res.data.authorAvatarUrl || (res.data as any).author_avatar_url || null,
    imageUrls: Array.isArray((res.data as any).imageUrls) ? (res.data as any).imageUrls : (res.data as any).image_urls,
    commentCount: (res.data as any).commentCount ?? (res.data as any).comment_count ?? 0,
  };
}

/* =========================================================
   UPDATE POST
   PUT /posts/{postId}?email=...
   Body: { text }
   ========================================================= */

export async function updatePost(postId: number, email: string, text: string): Promise<PostDto> {
  const res = await axiosClient.put<PostDto>(
    `/posts/${postId}`,
    { text },
    {
      params: { email }, // ✅ backend expects "email"
    }
  );

  return {
    ...res.data,
    authorAvatarUrl: res.data.authorAvatarUrl || (res.data as any).author_avatar_url || null,
    imageUrls: Array.isArray((res.data as any).imageUrls) ? (res.data as any).imageUrls : (res.data as any).image_urls,
    commentCount: (res.data as any).commentCount ?? (res.data as any).comment_count ?? 0,
  };
}

/* =========================================================
   DELETE POST
   DELETE /posts/{postId}?email=...
   ========================================================= */

export async function deletePost(postId: number, email: string): Promise<void> {
  await axiosClient.delete(`/posts/${postId}`, {
    params: { email }, // ✅ backend expects "email"
  });
}

/* =========================================================
   LIKE
   POST /posts/{postId}/like?email=...
   ========================================================= */

export async function likePost(postId: number, email: string): Promise<LikeResponse> {
  const res = await axiosClient.post<LikeResponse>(`/posts/${postId}/like`, null, {
    params: { email }, // ✅ backend expects "email"
  });

  return res.data;
}

/* =========================================================
   UNLIKE
   DELETE /posts/{postId}/like?email=...
   ========================================================= */

export async function unlikePost(postId: number, email: string): Promise<LikeResponse> {
  const res = await axiosClient.delete<LikeResponse>(`/posts/${postId}/like`, {
    params: { email }, // ✅ backend expects "email"
  });

  return res.data;
}

/* =========================================================
   COMMENTS (when backend supports)
   GET /posts/{postId}/comments?limit=50
   POST /posts/{postId}/comments
   ========================================================= */

export async function fetchComments(postId: number, limit: number = 50): Promise<CommentDto[]> {
  const res = await axiosClient.get<CommentDto[]>(`/posts/${postId}/comments`, {
    params: { limit },
  });

  return Array.isArray(res.data)
    ? res.data.map((c) => ({
        ...c,
        authorAvatarUrl: c.authorAvatarUrl || (c as any).author_avatar_url || null,
      }))
    : [];
}

export async function addComment(postId: number, body: CreateCommentRequest): Promise<CommentDto> {
  const res = await axiosClient.post<CommentDto>(`/posts/${postId}/comments`, body);

  return {
    ...res.data,
    authorAvatarUrl: res.data.authorAvatarUrl || (res.data as any).author_avatar_url || null,
  };
}