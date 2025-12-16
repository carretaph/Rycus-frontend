import axiosClient from "./axiosClient";

export type CustomerType = "HOMEOWNER" | "BUSINESS" | "OTHER";

export interface Customer {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  customerType: CustomerType;
  tags: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  customerType: CustomerType;
  tags: string;
}

// GET all customers
export async function getCustomers(): Promise<Customer[]> {
  const response = await axiosClient.get<Customer[]>("/customers");
  return response.data;
}

// POST create customer
export async function createCustomer(
  data: CreateCustomerRequest
): Promise<Customer> {
  const response = await axiosClient.post<Customer>("/customers", data);
  return response.data;
}
