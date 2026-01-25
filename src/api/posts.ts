import axiosClient from "./axiosClient";

/* ========= DTOs ========= */

export type PostDto = {
  id: number;
  text: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;

  likeCount: number;
  likedByViewer: boolean;
};

export type CreatePostRequest = {
  text: string;
  authorEmail: string;
  authorName: string;
};

export type LikeStatusDto = {
  postId: number;
  liked: boolean;
  likeCount: number;
};

/* ========= API ========= */

export async function fetchFeed(
  limit: number = 50,
  viewerEmail?: string
): Promise<PostDto[]> {
  const res = await axiosClient.get<PostDto[]>("/posts/feed", {
    params: { limit, viewerEmail },
  });

  return Array.isArray(res.data) ? res.data : [];
}

export async function createPost(req: CreatePostRequest): Promise<PostDto> {
  const res = await axiosClient.post<PostDto>("/posts", req);
  return res.data;
}

export async function likePost(
  postId: number,
  email: string
): Promise<LikeStatusDto> {
  const res = await axiosClient.post<LikeStatusDto>(
    `/posts/${postId}/like`,
    null,
    { params: { email } }
  );
  return res.data;
}

export async function unlikePost(
  postId: number,
  email: string
): Promise<LikeStatusDto> {
  const res = await axiosClient.delete<LikeStatusDto>(
    `/posts/${postId}/like`,
    { params: { email } }
  );
  return res.data;
}

// ✅ HARD DELETE (only author)
// DELETE /posts/{postId}?email=...
export async function deletePost(postId: number, email: string): Promise<void> {
  await axiosClient.delete(`/posts/${postId}`, { params: { email } });
}

// ✅ EDIT (only author)
// PUT /posts/{postId}?email=...
// Body: { "text": "..." }
export async function updatePost(
  postId: number,
  email: string,
  text: string
): Promise<PostDto> {
  const res = await axiosClient.put<PostDto>(
    `/posts/${postId}`,
    { text },
    { params: { email } }
  );
  return res.data;
}
