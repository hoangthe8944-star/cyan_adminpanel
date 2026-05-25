export interface MediaAsset {
  mediaType: "IMAGE" | "MP4";
  url: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
}

export interface AdminDashboardResponse {
  totalCategories: number;
  activeCategories: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  paidOrders: number;
  totalBanners: number;
  activeBanners: number;
  totalEditorials: number;
  publishedEditorials: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  rootCategoryId?: string | null;
  level: number;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: number;
  coverMedia?: MediaAsset | null;
}

export interface AdminCategoryPayload {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: number;
  coverMedia?: MediaAsset | null;
}

export interface ProductOptionValue {
  code: string;
  label: string;
  swatchMedia?: MediaAsset | null;
}

export interface ProductOption {
  type: string;
  name: string;
  values: ProductOptionValue[];
}

export interface VariantSelection {
  optionType: string;
  valueCode: string;
  valueLabel: string;
}

export interface ProductVariant {
  variantCode: string;
  modelCode: string;
  styleCode: string;
  description?: string | null;
  selections: VariantSelection[];
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  stockQuantity: number;
  weightInGram?: number | null;
  active: boolean;
  media: MediaAsset[];
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string | null;
  description?: string | null;
  brand?: string | null;
  material?: string | null;
  gemstone?: string | null;
  primaryCategoryId: string;
  categoryIds: string[];
  tags: string[];
  gallery: MediaAsset[];
  options: ProductOption[];
  variants: ProductVariant[];
  minPrice: number;
  maxPrice: number;
  totalStock: number;
  featured: boolean;
  status: "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
}

export interface AdminProductPayload {
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string | null;
  description?: string | null;
  brand?: string | null;
  material?: string | null;
  gemstone?: string | null;
  primaryCategoryId: string;
  categoryIds: string[];
  tags: string[];
  gallery: MediaAsset[];
  options: ProductOption[];
  variants: ProductVariant[];
  featured: boolean;
  status: "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
}

export interface AdminOrder {
  id: string;
  orderCode: string;
  customer: {
    fullName: string;
    phoneNumber: string;
    email?: string | null;
  };
  shippingAddress: {
    fullName: string;
    phoneNumber: string;
    line1: string;
    line2?: string | null;
    ward?: string | null;
    district?: string | null;
    city: string;
    country: string;
    postalCode?: string | null;
  };
  billingAddress?: {
    fullName: string;
    phoneNumber: string;
    line1: string;
    line2?: string | null;
    ward?: string | null;
    district?: string | null;
    city: string;
    country: string;
    postalCode?: string | null;
  } | null;
  items: {
    productId: string;
    productName: string;
    variantCode: string;
    thumbnailUrl?: string | null;
    quantity: number;
    unitPrice?: number | null;
    lineTotal?: number | null;
  }[];
  subtotal?: number | null;
  shippingFee?: number | null;
  discountAmount?: number | null;
  totalAmount: number;
  currency?: string | null;
  paymentStatus: "UNPAID" | "PENDING" | "PAID" | "REFUNDED" | "FAILED";
  orderStatus: "PENDING" | "AWAITING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELED" | "FAILED";
  paymentMethod: "COD" | "MOMO";
  note?: string | null;
  momoPayment?: {
    partnerCode?: string | null;
    requestId?: string | null;
    momoOrderId?: string | null;
    orderInfo?: string | null;
    amount?: number | null;
    requestType?: string | null;
    redirectUrl?: string | null;
    ipnUrl?: string | null;
    payUrl?: string | null;
    deeplink?: string | null;
    qrCodeUrl?: string | null;
    extraData?: string | null;
    lang?: string | null;
    message?: string | null;
    transId?: number | null;
    resultCode?: number | null;
    responseTime?: string | null;
  } | null;
  createdAt?: string | null;
}

export interface SeoMetadata {
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
}

export interface AdminCollection {
  id: string;
  name: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  coverMedia?: MediaAsset | null;
  productIds: string[];
  featured: boolean;
  displayOrder: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string | null;
  seo?: SeoMetadata | null;
}

export interface AdminCollectionPayload {
  name: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  coverMedia?: MediaAsset | null;
  productIds: string[];
  featured: boolean;
  displayOrder: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string | null;
  seo?: SeoMetadata | null;
}

export interface AdminBanner {
  id: string;
  title: string;
  slug: string;
  placement: "MAIN" | "SUB";
  media: MediaAsset;
  redirectUrl?: string | null;
  ctaLabel?: string | null;
  active: boolean;
  displayOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface AdminBannerPayload {
  title: string;
  slug: string;
  placement: "MAIN" | "SUB";
  media: MediaAsset;
  redirectUrl?: string | null;
  ctaLabel?: string | null;
  active: boolean;
  displayOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface EditorialSection {
  heading: string;
  subHeading?: string | null;
  content?: string | null;
  displayOrder: number;
  media: MediaAsset[];
}

export interface AdminEditorial {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  body?: string | null;
  topics: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string | null;
  coverMedia?: MediaAsset | null;
  sections: EditorialSection[];
}

export interface AdminEditorialPayload {
  title: string;
  slug: string;
  summary?: string | null;
  body?: string | null;
  topics: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string | null;
  coverMedia?: MediaAsset | null;
  sections: EditorialSection[];
}

export interface UploadResponse {
  url: string;
  filename: string;
  contentType: string;
  size: number;
}


