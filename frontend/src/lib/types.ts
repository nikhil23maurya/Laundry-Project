export type Role = "admin" | "staff";

export type OrderStatus = "RECEIVED" | "PROCESSING" | "READY" | "DELIVERED";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type CatalogItem = {
  id: string;
  name: string;
  unitPrice: number;
  active: 0 | 1;
};

export type OrderListItem = {
  id: string;
  customerName: string;
  phone: string;
  status: OrderStatus;
  currency: string;
  totalAmount: number;
  estimatedReadyAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OrderListResponse = {
  data: OrderListItem[];
  pageInfo: PageInfo;
};

