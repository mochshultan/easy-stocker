import type {
  DashboardMetrics,
  ImportSummary,
  StockItem,
  StockItemInput,
  StockItemPatch,
  StockMovement,
  StockMovementInput
} from "../shared/stock";

type ApiRequestOptions = RequestInit & {
  adminToken?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { adminToken, ...requestOptions } = options;
  const headers = new Headers(options.body instanceof FormData ? options.headers : { "Content-Type": "application/json" });
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  }
  if (adminToken) {
    headers.set("x-admin-token", adminToken);
  }

  const response = await fetch(url, {
    ...requestOptions,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(payload.error ?? "Request failed", response.status);
  }

  return response.json() as Promise<T>;
}

export type ItemQuery = {
  search?: string;
  status?: string;
};

export const api = {
  metrics: () => request<DashboardMetrics>("/api/metrics"),
  adminLogin: (payload: { username: string; password: string }) =>
    request<{ token: string; expiresAt: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  items: (query: ItemQuery = {}) => {
    const params = new URLSearchParams();
    if (query.search) {
      params.set("search", query.search);
    }
    if (query.status && query.status !== "ALL") {
      params.set("status", query.status);
    }
    return request<StockItem[]>(`/api/items${params.size ? `?${params}` : ""}`);
  },
  saveItem: (payload: StockItemInput, adminToken: string) =>
    request<StockItem>("/api/items", {
      method: "POST",
      body: JSON.stringify(payload),
      adminToken
    }),
  updateItem: (itemId: string, payload: StockItemPatch, adminToken: string) =>
    request<StockItem>(`/api/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      adminToken
    }),
  movement: (itemId: string, payload: StockMovementInput, adminToken: string) =>
    request<{ item: StockItem; movement: StockMovement }>(`/api/items/${itemId}/movements`, {
      method: "POST",
      body: JSON.stringify(payload),
      adminToken
    }),
  uploadImage: (itemId: string, file: File, adminToken: string) => {
    const body = new FormData();
    body.append("image", file);
    return request<StockItem>(`/api/items/${itemId}/image`, {
      method: "POST",
      body,
      adminToken
    });
  },
  importFile: (file: File, adminToken: string) => {
    const body = new FormData();
    body.append("file", file);
    return request<ImportSummary>("/api/import", {
      method: "POST",
      body,
      adminToken
    });
  }
};
