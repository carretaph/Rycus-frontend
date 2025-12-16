import axiosClient from "./axiosClient";

export interface Review {
  id: number;
  ratingOverall: number;
  ratingPayment: number;
  ratingBehavior: number;
  ratingCommunication: number;
  comment: string;
  createdAt: string;
  customerId: number;
  createdBy?: string;
}

export interface CreateReviewRequest {
  ratingOverall: number;
  ratingPayment: number;
  ratingBehavior: number;
  ratingCommunication: number;
  comment: string;
}

export async function getReviewsByCustomer(
  customerId: number
): Promise<Review[]> {
  const response = await axiosClient.get<Review[]>(
    `/customers/${customerId}/reviews`
  );
  return response.data;
}

export async function createReviewForCustomer(
  customerId: number,
  data: CreateReviewRequest
): Promise<Review> {
  const response = await axiosClient.post<Review>(
    `/customers/${customerId}/reviews`,
    data
  );
  return response.data;
}
