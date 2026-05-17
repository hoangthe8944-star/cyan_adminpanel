import type {
  AdminBanner,
  AdminBannerPayload,
  AdminCategory,
  AdminCategoryPayload,
  AdminCollection,
  AdminCollectionPayload,
  AdminDashboardResponse,
  AdminEditorial,
  AdminEditorialPayload,
  AdminOrder,
  AdminProduct,
  AdminProductPayload,
  UploadResponse,
} from "./types";

const LOCAL_API_BASE_URL = import.meta.env.VITE_LOCAL_API_BASE_URL ?? "http://localhost:8081";
const RENDER_API_BASE_URL = import.meta.env.VITE_RENDER_API_BASE_URL ?? "https://cyan-admin.onrender.com";
const EXPLICIT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getApiBaseUrls() {
  if (EXPLICIT_API_BASE_URL) {
    return [normalizeBaseUrl(EXPLICIT_API_BASE_URL)];
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return [normalizeBaseUrl(LOCAL_API_BASE_URL), normalizeBaseUrl(RENDER_API_BASE_URL)];
    }
  }

  return [normalizeBaseUrl(RENDER_API_BASE_URL)];
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read selected file"));
    reader.readAsDataURL(file);
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const baseUrls = [...new Set(getApiBaseUrls())];
  let lastNetworkError: unknown = null;

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(init?.headers ?? {}),
        },
        ...init,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof TypeError) {
        lastNetworkError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastNetworkError) {
    throw lastNetworkError;
  }

  throw new Error("No API base URL is configured");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function resolveImage(url?: { url?: string | null; thumbnailUrl?: string | null } | null) {
  return url?.thumbnailUrl || url?.url || "https://placehold.co/800x600?text=Cyan";
}

export function parseJsonField<T>(value: string, fallback: T): T {
  if (!value.trim()) {
    return fallback;
  }
  return JSON.parse(value) as T;
}

export function formatJsonField(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

export const adminApi = {
  dashboard: () => request<AdminDashboardResponse>("/api/admin/dashboard"),

  categories: () => request<AdminCategory[]>("/api/admin/categories"),
  createCategory: (payload: AdminCategoryPayload) =>
    request<AdminCategory>("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCategory: (id: string, payload: AdminCategoryPayload) =>
    request<AdminCategory>(`/api/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCategory: (id: string) =>
    request<void>(`/api/admin/categories/${id}`, {
      method: "DELETE",
    }),

  products: () => request<AdminProduct[]>("/api/admin/products"),
  createProduct: (payload: AdminProductPayload) =>
    request<AdminProduct>("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProduct: (id: string, payload: AdminProductPayload) =>
    request<AdminProduct>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteProduct: (id: string) =>
    request<void>(`/api/admin/products/${id}`, {
      method: "DELETE",
    }),

  orders: () => request<AdminOrder[]>("/api/admin/orders"),
  updateOrderStatus: (id: string, orderStatus: string, paymentStatus: string) =>
    request<AdminOrder>(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ orderStatus, paymentStatus }),
    }),
  updateOrderMomoCallback: (
    id: string,
    payload: {
      paymentStatus: string;
      resultCode?: number | null;
      transId?: number | null;
      message?: string | null;
      payUrl?: string | null;
      deeplink?: string | null;
      qrCodeUrl?: string | null;
    }
  ) =>
    request<AdminOrder>(`/api/admin/orders/${id}/momo-callback`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  collections: () => request<AdminCollection[]>("/api/admin/collections"),
  createCollection: (payload: AdminCollectionPayload) =>
    request<AdminCollection>("/api/admin/collections", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCollection: (id: string, payload: AdminCollectionPayload) =>
    request<AdminCollection>(`/api/admin/collections/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCollection: (id: string) =>
    request<void>(`/api/admin/collections/${id}`, {
      method: "DELETE",
    }),

  banners: () => request<AdminBanner[]>("/api/admin/banners"),
  createBanner: (payload: AdminBannerPayload) =>
    request<AdminBanner>("/api/admin/banners", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateBanner: (id: string, payload: AdminBannerPayload) =>
    request<AdminBanner>(`/api/admin/banners/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteBanner: (id: string) =>
    request<void>(`/api/admin/banners/${id}`, {
      method: "DELETE",
    }),
  uploadFile: async (file: File, folder = "general") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      return await request<UploadResponse>("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      // This repo only ships the admin frontend, so local previews keep working
      // even when no upload server is running during development.
      if (error instanceof TypeError) {
        const url = await readFileAsDataUrl(file);
        return {
          url,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        };
      }

      throw error;
    }
  },

  editorials: () => request<AdminEditorial[]>("/api/admin/editorials"),
  createEditorial: (payload: AdminEditorialPayload) =>
    request<AdminEditorial>("/api/admin/editorials", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateEditorial: (id: string, payload: AdminEditorialPayload) =>
    request<AdminEditorial>(`/api/admin/editorials/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteEditorial: (id: string) =>
    request<void>(`/api/admin/editorials/${id}`, {
      method: "DELETE",
    }),
};
