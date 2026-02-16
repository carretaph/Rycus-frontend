import axiosClient from "./axiosClient";

/* =========================================================
   DTOs
   ========================================================= */

export type PostDto = {
  id: number;
  text: string;

  authorEmail: string;
  authorName: string;

  // 👇 AQUI estaba el bug
  authorAvatarUrl?: string | null;

  createdAt: string;

  likeCount: number;
  likedByViewer: boolean;
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

/* =========================================================
   FETCH FEED
   ========================================================= */

export async function fetchFeed(
  limit: number = 50,
  viewerEmail?: string
): Promise<PostDto[]> {
  const params: Record<string, any> = { limit };

  if (viewerEmail) {
    params.viewerEmail = viewerEmail;
  }

  const res = await axiosClient.get<PostDto[]>(
    "/posts/feed",
    { params }
  );

  console.log("FEED RAW →", res.data);

  // 👇 FIX CLAVE
  return Array.isArray(res.data)
    ? res.data.map((p) => ({
        ...p,
        authorAvatarUrl:
          p.authorAvatarUrl ||
          (p as any).author_avatar_url ||
          null,
      }))
    : [];
}

/* =========================================================
   CREATE POST
   ========================================================= */

export async function createPost(
  body: CreatePostRequest
): Promise<PostDto> {
  const res = await axiosClient.post<PostDto>(
    "/posts",
    body
  );

  return {
    ...res.data,
    authorAvatarUrl:
      res.data.authorAvatarUrl ||
      (res.data as any).author_avatar_url ||
      null,
  };
}

/* =========================================================
   UPDATE POST
   ========================================================= */

export async function updatePost(
  postId: number,
  viewerEmail: string,
  text: string
): Promise<PostDto> {
  const res = await axiosClient.put<PostDto>(
    `/posts/${postId}`,
    { text },
    {
      params: { viewerEmail },
    }
  );

  return {
    ...res.data,
    authorAvatarUrl:
      res.data.authorAvatarUrl ||
      (res.data as any).author_avatar_url ||
      null,
  };
}

/* =========================================================
   DELETE POST
   ========================================================= */

export async function deletePost(
  postId: number,
  viewerEmail: string
): Promise<void> {
  await axiosClient.delete(
    `/posts/${postId}`,
    {
      params: { viewerEmail },
    }
  );
}

/* =========================================================
   LIKE
   ========================================================= */

export async function likePost(
  postId: number,
  viewerEmail: string
): Promise<LikeResponse> {
  const res = await axiosClient.post<LikeResponse>(
    `/posts/${postId}/like`,
    null,
    {
      params: { viewerEmail },
    }
  );

  return res.data;
}

/* =========================================================
   UNLIKE
   ========================================================= */

export async function unlikePost(
  postId: number,
  viewerEmail: string
): Promise<LikeResponse> {
  const res = await axiosClient.delete<LikeResponse>(
    `/posts/${postId}/like`,
    {
      params: { viewerEmail },
    }
  );

  return res.data;
}
