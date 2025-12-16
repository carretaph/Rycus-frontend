import axiosClient from "./axiosClient";

export interface AuthResponse {
  id: number;
  fullName: string;
  email: string;
}

export const register = async (
  fullName: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await axiosClient.post<AuthResponse>("/auth/register", {
    fullName,
    email,
    password,
  });
  return response.data;
};

export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await axiosClient.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return response.data;
};
