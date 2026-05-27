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
  ConversationDetail,
  ConversationMessage,
  ConversationParticipant,
  ConversationSummary,
  SendConversationMessagePayload,
  UploadResponse,
} from "./types";

const LOCAL_API_BASE_URL = import.meta.env.VITE_LOCAL_API_BASE_URL ?? "http://localhost:8081";
const RENDER_API_BASE_URL = import.meta.env.VITE_RENDER_API_BASE_URL ?? "https://cyan-admin.onrender.com";
const EXPLICIT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();
const CHAT_API_PATH = import.meta.env.VITE_CHAT_API_PATH?.trim() || "/api/admin/chat/conversations";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getApiBaseUrls() {
  if (EXPLICIT_API_BASE_URL) {
    return [normalizeBaseUrl(EXPLICIT_API_BASE_URL)];
  }

  return [normalizeBaseUrl(RENDER_API_BASE_URL)];
}

function resolveAssetBaseUrl() {
  return getApiBaseUrls()[0] ?? "";
}

function normalizeAssetUrl(value?: string | null) {
  if (!value) {
    return value;
  }

  try {
    return new URL(value).toString();
  } catch {
    if (value.startsWith("/")) {
      return `${resolveAssetBaseUrl()}${value}`;
    }

    return value;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const baseUrls = [...new Set(getApiBaseUrls())];
  let lastNetworkError: unknown = null;
  const method = init?.method || "GET";
  const debugRequestBody =
    !init?.body
      ? null
      : isFormData
        ? "[FormData]"
        : typeof init.body === "string"
          ? (() => {
              try {
                return JSON.parse(init.body);
              } catch {
                return init.body;
              }
            })()
          : init.body;

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
        console.error("[adminApi] Request failed", {
          method,
          url: `${baseUrl}${path}`,
          status: response.status,
          requestBody: debugRequestBody,
          responseText: text,
        });
        throw new Error(text || `Request failed: ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof TypeError) {
        console.error("[adminApi] Network error", {
          method,
          url: `${baseUrl}${path}`,
          requestBody: debugRequestBody,
          error,
        });
        lastNetworkError = error;
        continue;
      }

      console.error("[adminApi] Unexpected error", {
        method,
        url: `${baseUrl}${path}`,
        requestBody: debugRequestBody,
        error,
      });
      throw error;
    }
  }

  if (lastNetworkError) {
    throw lastNetworkError;
  }

  throw new Error("No API base URL is configured");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeParticipant(input: unknown, fallbackName = "Unknown"): ConversationParticipant {
  const record = asRecord(input);
  return {
    id: asString(record?.id, asString(record?.senderId, asString(record?.customerId, fallbackName))),
    name: asString(
      record?.name,
      asString(record?.senderName, asString(record?.customerName, asString(record?.fullName, fallbackName)))
    ),
    role: record?.role == null ? asString(record?.senderRole, asString(record?.type, "")) || null : asString(record.role),
    avatarUrl: record?.avatarUrl == null ? null : asString(record.avatarUrl),
    email: record?.email == null ? null : asString(record.email),
    phoneNumber: record?.phoneNumber == null ? null : asString(record.phoneNumber),
    online: typeof record?.online === "boolean" ? record.online : undefined,
  };
}

function pickCollection<T>(payload: unknown, keys: string[], mapper: (item: unknown, index: number) => T): T[] {
  if (Array.isArray(payload)) {
    return payload.map(mapper);
  }

  const record = asRecord(payload);
  for (const key of keys) {
    const value = record?.[key];
    if (Array.isArray(value)) {
      return value.map(mapper);
    }
  }

  return [];
}

function normalizeConversationSummary(input: unknown, index: number): ConversationSummary {
  const record = asRecord(input);
  const participants = pickCollection(record?.participants, [], (item) => normalizeParticipant(item));
  const customer = record?.customer
    ? normalizeParticipant(record.customer, "Customer")
    : normalizeParticipant(
        {
          id: record?.customerId,
          name: record?.customerName,
          email: record?.customerEmail,
          phoneNumber: record?.customerPhoneNumber ?? record?.customerPhone,
        },
        "Customer"
      );
  const sender = record?.sender ? normalizeParticipant(record.sender, "Customer") : null;
  const mergedParticipants = participants.length ? participants : [customer, sender].filter(Boolean) as ConversationParticipant[];
  const title =
    asString(record?.title) ||
    asString(record?.name) ||
    mergedParticipants.map((participant) => participant.name).filter(Boolean).join(", ") ||
    `Conversation ${index + 1}`;

  return {
    id: asString(record?.id, asString(record?.conversationId, `conversation-${index + 1}`)),
    title,
    participants: mergedParticipants,
    lastMessage:
      record?.lastMessage == null
        ? asString(record?.lastMessagePreview, asString(record?.preview, asString(record?.content, "")))
        : asString(record.lastMessage),
    lastMessageAt:
      record?.lastMessageAt == null
        ? asString(record?.updatedAt, asString(record?.lastMessageCreatedAt, asString(record?.createdAt, "")))
        : asString(record.lastMessageAt),
    unreadCount: asNumber(record?.unreadCount, 0),
    status: record?.status == null ? null : asString(record.status),
    assignedAdminName:
      record?.assignedAdminName == null ? asString(record?.adminName, "") || null : asString(record.assignedAdminName),
  };
}

function normalizeConversationMessage(input: unknown, index: number, conversationId: string): ConversationMessage {
  const record = asRecord(input);
  const sender = normalizeParticipant(
    record?.sender ?? {
      id: record?.senderId,
      name: record?.senderName,
      role: record?.senderRole,
    },
    "Unknown"
  );

  return {
    id: asString(record?.id, `message-${index + 1}`),
    conversationId: asString(record?.conversationId, conversationId),
    sender,
    content: asString(record?.content, asString(record?.message, asString(record?.body))),
    createdAt: asString(record?.createdAt, asString(record?.sentAt, asString(record?.timestamp, new Date().toISOString()))),
  };
}

function normalizeConversationDetail(input: unknown, fallbackConversationId = ""): ConversationDetail {
  const record = asRecord(input);
  const conversation = normalizeConversationSummary(
    {
      ...record,
      id: record?.id ?? record?.conversationId ?? fallbackConversationId,
    },
    0
  );

  const messages = pickCollection(record?.messages, [], (item, index) =>
    normalizeConversationMessage(item, index, conversation.id)
  );

  if (!messages.length) {
    return {
      conversation,
      messages,
    };
  }

  const lastMessage = messages[messages.length - 1];
  return {
    conversation: {
      ...conversation,
      lastMessage: conversation.lastMessage || lastMessage.content,
      lastMessageAt: conversation.lastMessageAt || lastMessage.createdAt,
    },
    messages,
  };
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
  return normalizeAssetUrl(url?.thumbnailUrl) || normalizeAssetUrl(url?.url) || "https://placehold.co/800x600?text=Oriven";
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
  uploadFile: (file: File, folder = "general") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    return request<UploadResponse>("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });
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
  conversations: async () => {
    const raw = await request<unknown>(CHAT_API_PATH);
    return pickCollection(raw, ["conversations", "items", "data"], (item, index) =>
      normalizeConversationSummary(item, index)
    );
  },
  conversationDetail: async (conversationId: string) => {
    const raw = await request<unknown>(`${CHAT_API_PATH}/${conversationId}`);
    return normalizeConversationDetail(raw, conversationId);
  },
  sendConversationMessage: async (conversationId: string, payload: SendConversationMessagePayload) => {
    const raw = await request<unknown>(`${CHAT_API_PATH}/${conversationId}/reply`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeConversationDetail(raw, conversationId);
  },
  markConversationRead: async (conversationId: string) => {
    const raw = await request<unknown>(`${CHAT_API_PATH}/${conversationId}/read`, {
      method: "PATCH",
    });
    return normalizeConversationDetail(raw, conversationId);
  },
  deleteConversation: (conversationId: string) =>
    request<void>(`${CHAT_API_PATH}/${conversationId}`, {
      method: "DELETE",
    }),
};
