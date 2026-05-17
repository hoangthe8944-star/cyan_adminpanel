import { useEffect, useMemo, useState } from "react";

import { Eye, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { adminApi, resolveImage } from "../lib/api";
import { buildAutoSlug } from "../lib/slug";
import type { AdminCollection, AdminCollectionPayload, AdminProduct } from "../lib/types";

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <Label>
      {children}
      {required ? <span className="ml-1 text-[#dc2626]">*</span> : null}
    </Label>
  );
}

const emptyCollectionForm: AdminCollectionPayload = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  coverMedia: {
    mediaType: "IMAGE",
    url: "",
    thumbnailUrl: "",
    altText: "",
  },
  productIds: [],
  featured: false,
  displayOrder: 0,
  status: "DRAFT",
  publishedAt: "",
  seo: {
    title: "",
    description: "",
    keywords: [],
  },
};

export function Collections() {
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<AdminCollection | null>(null);
  const [form, setForm] = useState<AdminCollectionPayload>(emptyCollectionForm);
  const [keywordsText, setKeywordsText] = useState("");
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const loadData = () => {
    adminApi.collections().then(setCollections).catch((err: Error) => setError(err.message));
    adminApi.products().then(setProducts).catch(() => undefined);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProducts = useMemo(
    () => products.filter((product) => form.productIds.includes(product.id)),
    [form.productIds, products]
  );

  const openCreate = () => {
    setSelectedCollection(null);
    setForm(emptyCollectionForm);
    setKeywordsText("");
    setMode("create");
    setError("");
    setOpen(true);
  };

  const openFor = (collection: AdminCollection, nextMode: "edit" | "view") => {
    setSelectedCollection(collection);
    setForm({
      name: collection.name,
      slug: collection.slug,
      summary: collection.summary || "",
      description: collection.description || "",
      coverMedia: collection.coverMedia || emptyCollectionForm.coverMedia,
      productIds: collection.productIds,
      featured: collection.featured,
      displayOrder: collection.displayOrder,
      status: collection.status,
      publishedAt: collection.publishedAt || "",
      seo: collection.seo || emptyCollectionForm.seo,
    });
    setKeywordsText((collection.seo?.keywords || []).join(", "));
    setMode(nextMode);
    setError("");
    setOpen(true);
  };

  const toggleProduct = (productId: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      productIds: checked ? Array.from(new Set([...prev.productIds, productId])) : prev.productIds.filter((id) => id !== productId),
    }));
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: buildAutoSlug(value),
    }));
  };

  const handleCoverFileChange = async (field: "url" | "thumbnailUrl", file: File | null) => {
    if (!file) {
      return;
    }

    const setUploading = field === "url" ? setIsUploadingCover : setIsUploadingThumbnail;
    setUploading(true);
    setError("");

    try {
      const uploaded = await adminApi.uploadFile(file, "collections");
      setForm((prev) => ({
        ...prev,
        coverMedia: {
          ...(prev.coverMedia || emptyCollectionForm.coverMedia!),
          mediaType: "IMAGE",
          [field]: uploaded.url,
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload selected file");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError("");

    try {
      const payload: AdminCollectionPayload = {
        ...form,
        publishedAt: form.publishedAt || null,
        seo: {
          ...(form.seo || {}),
          keywords: keywordsText.split(",").map((item) => item.trim()).filter(Boolean),
        },
      };

      if (mode === "create") {
        await adminApi.createCollection(payload);
      }

      if (mode === "edit" && selectedCollection) {
        await adminApi.updateCollection(selectedCollection.id, payload);
      }

      setOpen(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save collection");
    }
  };

  const remove = async (collection: AdminCollection) => {
    if (!window.confirm(`Delete collection "${collection.name}"?`)) {
      return;
    }

    try {
      await adminApi.deleteCollection(collection.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading mb-2">Collection Management</h1>
          <p className="text-[#5a6169]">Manage new collections, featured drops, and curated product groups.</p>
        </div>
        <Button className="bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Collection
        </Button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {collections.map((collection) => (
          <Card key={collection.id} className="overflow-hidden bg-white border-[rgba(6,20,27,0.1)]">
            <div className="grid gap-5 p-5 md:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-2xl bg-[rgba(6,20,27,0.06)]">
                {collection.coverMedia?.url ? (
                  <img src={resolveImage(collection.coverMedia)} alt={collection.name} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center text-sm text-[#7b858e]">No cover image</div>
                )}
              </div>
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="font-heading">{collection.name}</h3>
                  <Badge className="bg-[rgba(237,217,135,0.2)] text-[#A36B31] border-0">{collection.status}</Badge>
                  {collection.featured ? <Badge className="bg-[#06141B] text-white border-0">Featured</Badge> : null}
                </div>
                <p className="text-sm text-[#5a6169] font-data">/{collection.slug}</p>
                <p className="mt-3 text-sm text-[#5a6169]">{collection.summary || "No summary yet"}</p>
                <div className="mt-4 space-y-2 text-sm text-[#5a6169]">
                  <p>Display Order: {collection.displayOrder}</p>
                  <p>Products: {collection.productIds.length}</p>
                  <p>Published At: {collection.publishedAt ? new Date(collection.publishedAt).toLocaleString() : "Not published"}</p>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openFor(collection, "view")}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openFor(collection, "edit")}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(collection)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {mode === "create" ? "Create Collection" : mode === "edit" ? "Edit Collection" : "Collection Detail"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required>Name</FieldLabel>
                <Input value={form.name} disabled={mode === "view"} onChange={(e) => handleNameChange(e.target.value)} />
              </div>
              <div>
                <FieldLabel required>Slug</FieldLabel>
                <Input value={form.slug} disabled={mode === "view"} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
            </div>

            <div>
              <FieldLabel>Summary</FieldLabel>
              <Textarea value={form.summary || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>

            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea className="min-h-32" value={form.description || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4">
              <div className="mb-4 aspect-[16/8] overflow-hidden rounded-xl bg-[rgba(6,20,27,0.06)]">
                {form.coverMedia?.url ? (
                  <img src={resolveImage(form.coverMedia)} alt={form.name || "collection"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#7b858e]">No cover image</div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Browse Cover</FieldLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={mode === "view" || isUploadingCover}
                    onChange={(e) => handleCoverFileChange("url", e.target.files?.[0] || null)}
                  />
                  {isUploadingCover ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5a6169]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Uploading cover...
                    </p>
                  ) : null}
                </div>
                <div>
                  <FieldLabel>Browse Thumbnail</FieldLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={mode === "view" || isUploadingThumbnail}
                    onChange={(e) => handleCoverFileChange("thumbnailUrl", e.target.files?.[0] || null)}
                  />
                  {isUploadingThumbnail ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5a6169]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Uploading thumbnail...
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4">
                <FieldLabel>Alt Text</FieldLabel>
                <Input
                  value={form.coverMedia?.altText || ""}
                  disabled={mode === "view"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      coverMedia: {
                        ...(form.coverMedia || emptyCollectionForm.coverMedia!),
                        altText: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <FieldLabel required>Status</FieldLabel>
                <Select disabled={mode === "view"} value={form.status} onValueChange={(value) => setForm({ ...form, status: value as AdminCollectionPayload["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel required>Display Order</FieldLabel>
                <Input type="number" value={form.displayOrder} disabled={mode === "view"} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
              </div>
              <div>
                <FieldLabel>Published At</FieldLabel>
                <Input type="datetime-local" value={form.publishedAt || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-3 rounded-full bg-[rgba(237,217,135,0.16)] px-4 py-3 text-sm font-medium text-[#7b5327]">
                  <input type="checkbox" checked={form.featured} disabled={mode === "view"} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                  Featured collection
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4">
              <FieldLabel>Products In Collection</FieldLabel>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-[#06141B]">
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(product.id)}
                      disabled={mode === "view"}
                      onChange={(e) => toggleProduct(product.id, e.target.checked)}
                    />
                    <span>{product.name}</span>
                  </label>
                ))}
              </div>
              {selectedProducts.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedProducts.map((product) => (
                    <Badge key={product.id} className="bg-[rgba(237,217,135,0.2)] text-[#A36B31] border-0">{product.name}</Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4">
              <h3 className="font-heading mb-4">SEO</h3>
              <div className="space-y-4">
                <div>
                  <FieldLabel>SEO Title</FieldLabel>
                  <Input value={form.seo?.title || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, seo: { ...(form.seo || {}), title: e.target.value } })} />
                </div>
                <div>
                  <FieldLabel>SEO Description</FieldLabel>
                  <Textarea value={form.seo?.description || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, seo: { ...(form.seo || {}), description: e.target.value } })} />
                </div>
                <div>
                  <FieldLabel>SEO Keywords</FieldLabel>
                  <Input value={keywordsText} disabled={mode === "view"} onChange={(e) => setKeywordsText(e.target.value)} placeholder="new collection, bridal, luxury jewelry" />
                </div>
              </div>
            </div>

            {mode !== "view" ? (
              <Button className="w-full bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={submit} disabled={isUploadingCover || isUploadingThumbnail}>
                {mode === "create" ? "Create Collection" : "Save Changes"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
