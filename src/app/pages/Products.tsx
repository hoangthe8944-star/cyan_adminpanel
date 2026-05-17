import { useEffect, useMemo, useState } from "react";

import { Eye, LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";
import { adminApi, formatCurrency, resolveImage } from "../lib/api";
import { buildAutoSlug } from "../lib/slug";
import type {
  AdminCategory,
  AdminProduct,
  AdminProductPayload,
  MediaAsset,
  ProductOption,
  ProductVariant,
  VariantSelection,
} from "../lib/types";

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <Label>
      {children}
      {required ? <span className="ml-1 text-[#dc2626]">*</span> : null}
    </Label>
  );
}

const createEmptyMedia = (): MediaAsset => ({
  mediaType: "IMAGE",
  url: "",
  thumbnailUrl: "",
  altText: "",
});

const createVariant = (): ProductVariant => ({
  variantCode: "",
  modelCode: "",
  styleCode: "",
  selections: [],
  price: 0,
  compareAtPrice: null,
  costPrice: null,
  stockQuantity: 0,
  weightInGram: null,
  active: true,
  media: [createEmptyMedia()],
});

const createEmptyProductForm = (): AdminProductPayload => ({
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  brand: "",
  material: "",
  gemstone: "",
  primaryCategoryId: "",
  categoryIds: [],
  tags: [],
  gallery: [createEmptyMedia()],
  options: [],
  variants: [createVariant()],
  featured: false,
  status: "DRAFT",
});

const VND_NUMBER_FORMAT = new Intl.NumberFormat("vi-VN");

function formatVndInput(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return VND_NUMBER_FORMAT.format(value);
}

function parseVndInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function buildOptionCode(label: string) {
  return buildAutoSlug(label)
    .replace(/_slug$/, "")
    .replace(/-/g, "_")
    .toUpperCase();
}

function parseOption(type: "MODEL" | "STYLE", name: string, value: string): ProductOption | null {
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((label) => ({
      code: buildOptionCode(label),
      label,
      swatchMedia: null,
    }));

  if (!values.length) {
    return null;
  }

  return { type, name, values };
}

function ensureRequiredOptions(modelValuesText: string, styleValuesText: string, sku: string) {
  const fallbackSeed = sku.trim() || "DEFAULT";
  const fallbackModelLabel = `${fallbackSeed} Model`;
  const fallbackStyleLabel = `${fallbackSeed} Style`;

  return [
    parseOption("MODEL", "Model", modelValuesText || fallbackModelLabel),
    parseOption("STYLE", "Style", styleValuesText || fallbackStyleLabel),
  ].filter(Boolean) as ProductOption[];
}

function buildSelections(variant: ProductVariant, options: ProductOption[]): VariantSelection[] {
  const resolveLabel = (type: string, code: string) => {
    const option = options.find((item) => item.type === type);
    return option?.values.find((value) => value.code === code)?.label || code;
  };

  return [
    {
      optionType: "MODEL",
      valueCode: variant.modelCode,
      valueLabel: resolveLabel("MODEL", variant.modelCode),
    },
    {
      optionType: "STYLE",
      valueCode: variant.styleCode,
      valueLabel: resolveLabel("STYLE", variant.styleCode),
    },
  ].filter((selection) => selection.valueCode);
}

function buildVariantCode(baseCode: string, modelCode: string, styleCode: string) {
  return [baseCode || "VARIANT", modelCode, styleCode].filter(Boolean).join("-");
}

function generateVariants(
  template: ProductVariant,
  options: ProductOption[],
  fallbackMedia: MediaAsset
): ProductVariant[] {
  const modelValues = options.find((item) => item.type === "MODEL")?.values ?? [];
  const styleValues = options.find((item) => item.type === "STYLE")?.values ?? [];
  const modelChoices = modelValues.length ? modelValues : [{ code: "", label: "", swatchMedia: null }];
  const styleChoices = styleValues.length ? styleValues : [{ code: "", label: "", swatchMedia: null }];
  const templateMedia = template.media.filter((item) => item.url.trim());
  const media = templateMedia.length ? templateMedia : fallbackMedia.url.trim() ? [fallbackMedia] : [];
  const baseCode = template.variantCode.trim();

  return modelChoices.flatMap((modelValue) =>
    styleChoices.map((styleValue) => {
      const variant: ProductVariant = {
        ...template,
        variantCode: buildVariantCode(baseCode, modelValue.code, styleValue.code),
        modelCode: modelValue.code,
        styleCode: styleValue.code,
        media,
      };

      return {
        ...variant,
        selections: buildSelections(variant, options),
      };
    })
  );
}

export function Products() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [form, setForm] = useState<AdminProductPayload>(createEmptyProductForm());
  const [tagsText, setTagsText] = useState("");
  const [modelValuesText, setModelValuesText] = useState("");
  const [styleValuesText, setStyleValuesText] = useState("");
  const [priceText, setPriceText] = useState("0");
  const [compareAtPriceText, setCompareAtPriceText] = useState("");
  const [costPriceText, setCostPriceText] = useState("");
  const [error, setError] = useState("");
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [uploadingVariantMediaIndex, setUploadingVariantMediaIndex] = useState<number | null>(null);

  const loadData = () => {
    adminApi.products().then(setProducts).catch((err: Error) => setError(err.message));
    adminApi.categories().then(setCategories).catch(() => undefined);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const keyword = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(keyword) ||
          product.sku.toLowerCase().includes(keyword) ||
          (product.material || "").toLowerCase().includes(keyword)
        );
      }),
    [products, searchQuery]
  );

  const primaryMedia = form.gallery[0] || createEmptyMedia();
  const primaryVariant = form.variants[0] || createVariant();

  const openCreate = () => {
    setMode("create");
    setSelectedProduct(null);
    setForm(createEmptyProductForm());
    setTagsText("");
    setModelValuesText("");
    setStyleValuesText("");
    setPriceText("0");
    setCompareAtPriceText("");
    setCostPriceText("");
    setError("");
    setOpen(true);
  };

  const openFor = (product: AdminProduct, nextMode: "edit" | "view") => {
    const modelOption = product.options.find((item) => item.type === "MODEL");
    const styleOption = product.options.find((item) => item.type === "STYLE");
    const firstVariant = product.variants[0] || createVariant();

    setMode(nextMode);
    setSelectedProduct(product);
    setForm({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      brand: product.brand || "",
      material: product.material || "",
      gemstone: product.gemstone || "",
      primaryCategoryId: product.primaryCategoryId,
      categoryIds: product.categoryIds,
      tags: product.tags,
      gallery: [product.gallery[0] || createEmptyMedia()],
      options: product.options,
      variants: [firstVariant],
      featured: product.featured,
      status: product.status,
    });
    setTagsText(product.tags.join(", "));
    setModelValuesText((modelOption?.values || []).map((item) => item.label).join(", "));
    setStyleValuesText((styleOption?.values || []).map((item) => item.label).join(", "));
    setPriceText(formatVndInput(firstVariant.price));
    setCompareAtPriceText(formatVndInput(firstVariant.compareAtPrice));
    setCostPriceText(formatVndInput(firstVariant.costPrice));
    setError("");
    setOpen(true);
  };

  const updatePrimaryVariant = (patch: Partial<ProductVariant>) => {
    setForm((prev) => ({
      ...prev,
      variants: [{ ...(prev.variants[0] || createVariant()), ...patch }],
    }));
  };

  const toggleCategory = (categoryId: string, checked: boolean) => {
    setForm((prev) => {
      const nextCategoryIds = checked
        ? Array.from(new Set([...prev.categoryIds, categoryId]))
        : prev.categoryIds.filter((id) => id !== categoryId);

      return {
        ...prev,
        primaryCategoryId:
          prev.primaryCategoryId === categoryId && !checked ? nextCategoryIds[0] || "" : prev.primaryCategoryId,
        categoryIds: nextCategoryIds,
      };
    });
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: buildAutoSlug(value),
    }));
  };

  const handleMediaFileChange = async (field: "url" | "thumbnailUrl", file: File | null) => {
    if (!file) {
      return;
    }

    setIsUploadingGallery(true);
    setError("");

    try {
      const uploaded = await adminApi.uploadFile(file, "products");
      setForm((prev) => ({
        ...prev,
        gallery: [{ ...(prev.gallery[0] || createEmptyMedia()), [field]: uploaded.url }],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload selected file");
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleVariantMediaFileChange = async (
    mediaIndex: number,
    field: "url" | "thumbnailUrl",
    file: File | null
  ) => {
    if (!file) {
      return;
    }

    setUploadingVariantMediaIndex(mediaIndex);
    setError("");

    try {
      const uploaded = await adminApi.uploadFile(file, "products");
      const currentMedia = primaryVariant.media.length ? primaryVariant.media : [createEmptyMedia()];
      updatePrimaryVariant({
        media: currentMedia.map((item, index) =>
          index === mediaIndex ? { ...item, [field]: uploaded.url } : item
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload selected file");
    } finally {
      setUploadingVariantMediaIndex(null);
    }
  };

  const submit = async () => {
    setError("");

    try {
      if (!form.primaryCategoryId.trim()) {
        throw new Error("Primary category is required");
      }

      if (!form.name.trim() || !form.slug.trim() || !form.sku.trim()) {
        throw new Error("Name, slug, and SKU are required");
      }

      const options = ensureRequiredOptions(modelValuesText.trim(), styleValuesText.trim(), form.sku);

      const gallery = primaryMedia.url.trim() ? [primaryMedia] : [];
      const variantTemplate: ProductVariant = {
        ...primaryVariant,
        variantCode: primaryVariant.variantCode.trim() || form.sku.trim() || "VARIANT",
      };
      const variants = generateVariants(variantTemplate, options, primaryMedia);

      if (!variants.length) {
        throw new Error("At least one product variant is required");
      }

      const payload: AdminProductPayload = {
        ...form,
        tags: tagsText.split(",").map((item) => item.trim()).filter(Boolean),
        shortDescription: form.shortDescription?.trim() || "",
        categoryIds: Array.from(new Set([form.primaryCategoryId, ...form.categoryIds].filter(Boolean))),
        gallery,
        options,
        variants,
      };

      if (mode === "create") {
        await adminApi.createProduct(payload);
      }

      if (mode === "edit" && selectedProduct) {
        await adminApi.updateProduct(selectedProduct.id, payload);
      }

      setOpen(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const remove = async (product: AdminProduct) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) {
      return;
    }

    try {
      await adminApi.deleteProduct(product.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading mb-2">Product Management</h1>
          <p className="text-[#5a6169]">Quick product form focused on the fields you actually need every day.</p>
        </div>
        <Button className="bg-[#06141B] text-white hover:bg-[#0a1f29]" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <Card className="mb-6 border-[rgba(6,20,27,0.1)] bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a6169]" />
          <Input
            placeholder="Search by name, SKU, or material..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card className="border-[rgba(6,20,27,0.1)] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-[rgba(6,20,27,0.05)] hover:bg-transparent">
              <TableHead className="font-data">Product</TableHead>
              <TableHead className="font-data">SKU</TableHead>
              <TableHead className="font-data">Material</TableHead>
              <TableHead className="font-data">Price</TableHead>
              <TableHead className="font-data">Stock</TableHead>
              <TableHead className="font-data">Status</TableHead>
              <TableHead className="font-data">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id} className="border-[rgba(6,20,27,0.05)] hover:bg-[rgba(237,217,135,0.05)]">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveImage(product.gallery[0])}
                      alt={product.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div>
                      <div className="font-data">{product.name}</div>
                      <div className="text-xs text-[#5a6169]">{product.brand || "Cyan Jewelry"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-data text-[#5a6169]">{product.sku}</TableCell>
                <TableCell className="font-data text-[#5a6169]">{product.material || "-"}</TableCell>
                <TableCell className="font-data text-[#A36B31]">
                  {formatCurrency(product.minPrice)} - {formatCurrency(product.maxPrice)}
                </TableCell>
                <TableCell className="font-data">{product.totalStock}</TableCell>
                <TableCell>
                  <Badge className="border-0 bg-[rgba(237,217,135,0.2)] text-[#A36B31]">{product.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openFor(product, "view")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openFor(product, "edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => remove(product)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-[28px] border border-[rgba(6,20,27,0.08)] bg-[#fcfcfb] p-0">
          <DialogHeader className="border-b border-[rgba(6,20,27,0.08)] px-8 py-6">
            <DialogTitle className="font-heading text-[28px]">
              {mode === "create" ? "Create Product" : mode === "edit" ? "Edit Product" : "Product Detail"}
            </DialogTitle>
            <DialogDescription className="text-[#5a6169]">
              Keep it simple: one main image, one pricing template, then model and style values are generated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-8 py-8">
            <section className="rounded-3xl border border-[rgba(6,20,27,0.08)] bg-white p-6">
              <h3 className="font-heading mb-5 text-[20px]">Basic Details</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <FieldLabel required>Product Name</FieldLabel>
                  <Input value={form.name} disabled={mode === "view"} onChange={(e) => handleNameChange(e.target.value)} />
                </div>
                <div>
                  <FieldLabel required>Slug</FieldLabel>
                  <Input value={form.slug} disabled={mode === "view"} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div>
                  <FieldLabel required>SKU</FieldLabel>
                  <Input value={form.sku} disabled={mode === "view"} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Brand</FieldLabel>
                  <Input value={form.brand || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Material</FieldLabel>
                  <Input value={form.material || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, material: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Gemstone</FieldLabel>
                  <Input value={form.gemstone || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, gemstone: e.target.value })} />
                </div>
              </div>
              <div className="mt-5">
                <FieldLabel>Short Description</FieldLabel>
                <Textarea
                  className="min-h-24"
                  value={form.shortDescription || ""}
                  disabled={mode === "view"}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-[rgba(6,20,27,0.08)] bg-white p-6">
              <h3 className="font-heading mb-5 text-[20px]">Merchandising</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <FieldLabel required>Primary Category</FieldLabel>
                  <Select
                    disabled={mode === "view"}
                    value={form.primaryCategoryId || "UNSET"}
                    onValueChange={(value) => setForm({ ...form, primaryCategoryId: value === "UNSET" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNSET">Select category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel required>Status</FieldLabel>
                  <Select
                    disabled={mode === "view"}
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value as AdminProductPayload["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="OUT_OF_STOCK">OUT_OF_STOCK</SelectItem>
                      <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-5 md:max-w-md">
                <FieldLabel>Tags</FieldLabel>
                <Input
                  value={tagsText}
                  disabled={mode === "view"}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="luxury, gold, bridal"
                />
              </div>

              <div className="mt-5">
                <FieldLabel>Category Coverage</FieldLabel>
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4 md:grid-cols-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-[#06141B]">
                      <input
                        type="checkbox"
                        checked={form.primaryCategoryId === category.id || form.categoryIds.includes(category.id)}
                        disabled={mode === "view"}
                        onChange={(e) => toggleCategory(category.id, e.target.checked)}
                      />
                      <span>{category.name}{form.primaryCategoryId === category.id ? " (primary)" : ""}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="mt-5 inline-flex items-center gap-3 rounded-full bg-[rgba(237,217,135,0.16)] px-4 py-3 text-sm font-medium text-[#7b5327]">
                <input
                  type="checkbox"
                  checked={form.featured}
                  disabled={mode === "view"}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />
                Featured product
              </label>
            </section>

            <section className="rounded-3xl border border-[rgba(6,20,27,0.08)] bg-white p-6">
              <h3 className="font-heading mb-5 text-[20px]">Main Media</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[160px_1fr_1fr]">
                <div className="overflow-hidden rounded-2xl bg-[rgba(6,20,27,0.06)]">
                  {primaryMedia.url ? (
                    <img src={resolveImage(primaryMedia)} alt={form.name || "product"} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-sm text-[#7b858e]">No image</div>
                  )}
                </div>
                <div>
                  <FieldLabel required>Browse Main Image</FieldLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={mode === "view" || isUploadingGallery}
                    onChange={(e) => handleMediaFileChange("url", e.target.files?.[0] || null)}
                  />
                  {isUploadingGallery ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5a6169]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Uploading main image...
                    </p>
                  ) : null}
                </div>
                <div>
                  <FieldLabel>Browse Thumbnail</FieldLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={mode === "view" || isUploadingGallery}
                    onChange={(e) => handleMediaFileChange("thumbnailUrl", e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <div className="mt-5">
                <FieldLabel>Image Alt Text</FieldLabel>
                <Input
                  value={primaryMedia.altText || ""}
                  disabled={mode === "view"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      gallery: [{ ...(prev.gallery[0] || createEmptyMedia()), altText: e.target.value }],
                    }))
                  }
                />
              </div>
            </section>

            <section className="rounded-3xl border border-[rgba(6,20,27,0.08)] bg-white p-6">
              <h3 className="font-heading mb-5 text-[20px]">Pricing And Stock</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <FieldLabel>Base Variant Code</FieldLabel>
                  <Input
                    value={primaryVariant.variantCode}
                    disabled={mode === "view"}
                    onChange={(e) => updatePrimaryVariant({ variantCode: e.target.value })}
                    placeholder="Defaults to SKU"
                  />
                </div>
                <div>
                  <FieldLabel required>Price (VND)</FieldLabel>
                  <Input
                    inputMode="numeric"
                    value={priceText}
                    disabled={mode === "view"}
                    onChange={(e) => {
                      const nextValue = parseVndInput(e.target.value);
                      setPriceText(formatVndInput(nextValue));
                      updatePrimaryVariant({ price: nextValue });
                    }}
                    placeholder="1.250.000"
                  />
                </div>
                <div>
                  <FieldLabel>Compare At Price (VND)</FieldLabel>
                  <Input
                    inputMode="numeric"
                    value={compareAtPriceText}
                    disabled={mode === "view"}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, "");
                      setCompareAtPriceText(digits ? formatVndInput(Number(digits)) : "");
                      updatePrimaryVariant({ compareAtPrice: digits ? Number(digits) : null });
                    }}
                    placeholder="1.500.000"
                  />
                </div>
                <div>
                  <FieldLabel>Cost Price (VND)</FieldLabel>
                  <Input
                    inputMode="numeric"
                    value={costPriceText}
                    disabled={mode === "view"}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, "");
                      setCostPriceText(digits ? formatVndInput(Number(digits)) : "");
                      updatePrimaryVariant({ costPrice: digits ? Number(digits) : null });
                    }}
                    placeholder="900.000"
                  />
                </div>
                <div>
                  <FieldLabel required>Stock Quantity</FieldLabel>
                  <Input
                    type="number"
                    value={primaryVariant.stockQuantity}
                    disabled={mode === "view"}
                    onChange={(e) => updatePrimaryVariant({ stockQuantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <FieldLabel>Weight (g)</FieldLabel>
                  <Input
                    type="number"
                    value={primaryVariant.weightInGram ?? ""}
                    disabled={mode === "view"}
                    onChange={(e) =>
                      updatePrimaryVariant({ weightInGram: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
              </div>

              <label className="mt-5 inline-flex items-center gap-3 rounded-full bg-[rgba(237,217,135,0.16)] px-4 py-3 text-sm font-medium text-[#7b5327]">
                <input
                  type="checkbox"
                  checked={primaryVariant.active}
                  disabled={mode === "view"}
                  onChange={(e) => updatePrimaryVariant({ active: e.target.checked })}
                />
                Active variant template
              </label>

              <div className="mt-6 rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-heading text-[18px]">Variant Images</h4>
                    <p className="text-sm text-[#5a6169]">Add more images if this product has many styles or looks.</p>
                  </div>
                  {mode !== "view" ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        updatePrimaryVariant({
                          media: [...(primaryVariant.media.length ? primaryVariant.media : [createEmptyMedia()]), createEmptyMedia()],
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Image
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {(primaryVariant.media.length ? primaryVariant.media : [createEmptyMedia()]).map((media, mediaIndex) => (
                    <div
                      key={`variant-media-${mediaIndex}`}
                      className="grid grid-cols-1 gap-4 rounded-2xl border border-[rgba(6,20,27,0.08)] bg-white p-4 md:grid-cols-[120px_1fr_1fr_auto]"
                    >
                      <div className="overflow-hidden rounded-xl bg-[rgba(6,20,27,0.06)]">
                        {media.url ? (
                          <img src={resolveImage(media)} alt={`variant-${mediaIndex + 1}`} className="h-24 w-full object-cover" />
                        ) : (
                          <div className="flex h-24 items-center justify-center text-sm text-[#7b858e]">No image</div>
                        )}
                      </div>
                      <div>
                        <FieldLabel>Browse Variant Image</FieldLabel>
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={mode === "view" || uploadingVariantMediaIndex === mediaIndex}
                          onChange={(e) => handleVariantMediaFileChange(mediaIndex, "url", e.target.files?.[0] || null)}
                        />
                        {uploadingVariantMediaIndex === mediaIndex ? (
                          <p className="mt-2 flex items-center gap-2 text-sm text-[#5a6169]">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Uploading variant media...
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <FieldLabel>Browse Variant Thumbnail</FieldLabel>
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={mode === "view" || uploadingVariantMediaIndex === mediaIndex}
                          onChange={(e) =>
                            handleVariantMediaFileChange(mediaIndex, "thumbnailUrl", e.target.files?.[0] || null)
                          }
                        />
                      </div>
                      {mode !== "view" ? (
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updatePrimaryVariant({
                                media: (primaryVariant.media.length ? primaryVariant.media : [createEmptyMedia()]).filter(
                                  (_, index) => index !== mediaIndex
                                ),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[rgba(6,20,27,0.08)] bg-white p-6">
              <h3 className="font-heading mb-5 text-[20px]">Product Choices</h3>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel>Model Values</FieldLabel>
                  <Input
                    value={modelValuesText}
                    disabled={mode === "view"}
                    onChange={(e) => setModelValuesText(e.target.value)}
                    placeholder="Classic, Premium, Limited"
                  />
                </div>
                <div>
                  <FieldLabel>Style Values</FieldLabel>
                  <Input
                    value={styleValuesText}
                    disabled={mode === "view"}
                    onChange={(e) => setStyleValuesText(e.target.value)}
                    placeholder="Round, Oval, Heart"
                  />
                </div>
              </div>
              <p className="mt-4 text-sm text-[#5a6169]">
                Separate values with commas. Variants will be generated automatically from these choices using the price
                and stock template above. If you leave one side empty, admin will create a single default MODEL or STYLE for you.
              </p>
            </section>

            <section className="rounded-3xl border border-[rgba(6,20,27,0.08)] bg-white p-6">
              <h3 className="font-heading mb-5 text-[20px]">Description</h3>
              <div className="space-y-5">
                <div>
                  <FieldLabel>Full Description</FieldLabel>
                  <Textarea
                    className="min-h-32"
                    value={form.description || ""}
                    disabled={mode === "view"}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {mode !== "view" ? (
              <Button
                className="h-12 w-full rounded-2xl bg-[#06141B] text-sm font-semibold text-white hover:bg-[#0a1f29]"
                onClick={submit}
                disabled={isUploadingGallery || uploadingVariantMediaIndex !== null}
              >
                {mode === "create" ? "Create Product" : "Save Changes"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
