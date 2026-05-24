import { useEffect, useMemo, useState } from "react";

import { Eye, Grid3x3, List, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";

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
import type { AdminCategory, AdminCategoryPayload } from "../lib/types";

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <Label>
      {children}
      {required ? <span className="ml-1 text-[#dc2626]">*</span> : null}
    </Label>
  );
}

const emptyCategoryForm: AdminCategoryPayload = {
  name: "",
  slug: "",
  description: "",
  parentId: null,
  status: "ACTIVE",
  displayOrder: 0,
  coverMedia: {
    mediaType: "IMAGE",
    url: "",
    thumbnailUrl: "",
    altText: "",
  },
};

export function Categories() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<AdminCategoryPayload>(emptyCategoryForm);
  const [error, setError] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const rootCategories = useMemo(() => categories.filter((item) => item.level === 1), [categories]);

  const loadCategories = () => {
    adminApi.categories().then(setCategories).catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setMode("create");
    setSelectedCategory(null);
    setForm(emptyCategoryForm);
    setOpen(true);
  };

  const openView = (category: AdminCategory) => {
    setMode("view");
    setSelectedCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      parentId: category.parentId || null,
      status: category.status,
      displayOrder: category.displayOrder,
      coverMedia: category.coverMedia || emptyCategoryForm.coverMedia,
    });
    setOpen(true);
  };

  const openEdit = (category: AdminCategory) => {
    setMode("edit");
    setSelectedCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      parentId: category.parentId || null,
      status: category.status,
      displayOrder: category.displayOrder,
      coverMedia: category.coverMedia || emptyCategoryForm.coverMedia,
    });
    setOpen(true);
  };

  const submit = async () => {
    setError("");
    try {
      if (mode === "create") {
        await adminApi.createCategory(form);
      }
      if (mode === "edit" && selectedCategory) {
        await adminApi.updateCategory(selectedCategory.id, form);
      }
      setOpen(false);
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    }
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
      const uploaded = await adminApi.uploadFile(file, "categories");
      setForm((prev) => ({
        ...prev,
        coverMedia: {
          ...(prev.coverMedia || emptyCategoryForm.coverMedia!),
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

  const remove = async (category: AdminCategory) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) {
      return;
    }
    try {
      await adminApi.deleteCategory(category.id);
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading mb-2">Category Management</h1>
          <p className="text-[#5a6169]">Add, edit, view and delete category data</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white rounded-lg border border-[rgba(6,20,27,0.1)] p-1">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button className="bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden bg-white border-[rgba(6,20,27,0.1)] p-5">
              <div className="w-full h-40 rounded-lg overflow-hidden bg-[rgba(6,20,27,0.05)] mb-4">
                <img src={resolveImage(category.coverMedia)} alt={category.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading mb-1">{category.name}</h3>
                  <p className="text-sm text-[#5a6169] font-data">/{category.slug}</p>
                </div>
                <Badge className="bg-[rgba(237,217,135,0.2)] text-[#A36B31] border-0">Level {category.level}</Badge>
              </div>
              <div className="space-y-2 text-sm text-[#5a6169]">
                <p>Status: {category.status}</p>
                <p>Display Order: {category.displayOrder}</p>
                <p>Parent: {category.parentId || "Root category"}</p>
              </div>
              <div className="pt-4 mt-4 border-t border-[rgba(6,20,27,0.05)] flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openView(category)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(category)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => remove(category)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white">
          <div className="divide-y divide-[rgba(6,20,27,0.05)]">
            {categories.map((category) => (
              <div key={category.id} className="p-4 flex items-center justify-between hover:bg-[rgba(237,217,135,0.05)]">
                <div>
                  <h3 className="font-heading">{category.name}</h3>
                  <p className="text-sm text-[#5a6169] font-data">/{category.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openView(category)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(category)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(category)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(96vw,56rem)] max-w-none max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {mode === "create" ? "Create Category" : mode === "edit" ? "Edit Category" : "Category Detail"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel required>Name</FieldLabel>
              <Input value={form.name} disabled={mode === "view"} onChange={(e) => handleNameChange(e.target.value)} />
            </div>
            <div>
              <FieldLabel required>Slug</FieldLabel>
              <Input value={form.slug} disabled={mode === "view"} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea value={form.description || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Parent Category</FieldLabel>
                <Select
                  disabled={mode === "view"}
                  value={form.parentId || "ROOT"}
                  onValueChange={(value) => setForm({ ...form, parentId: value === "ROOT" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROOT">Root category</SelectItem>
                    {rootCategories
                      .filter((item) => item.id !== selectedCategory?.id)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel required>Status</FieldLabel>
                <Select disabled={mode === "view"} value={form.status} onValueChange={(value) => setForm({ ...form, status: value as AdminCategoryPayload["status"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FieldLabel required>Display Order</FieldLabel>
              <Input
                type="number"
                value={form.displayOrder}
                disabled={mode === "view"}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Browse Cover Image</FieldLabel>
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
            <div>
              <FieldLabel>Alt Text</FieldLabel>
              <Input
                value={form.coverMedia?.altText || ""}
                disabled={mode === "view"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    coverMedia: {
                      ...(form.coverMedia || emptyCategoryForm.coverMedia!),
                      altText: e.target.value,
                    },
                  })
                }
              />
            </div>
            {mode !== "view" ? (
              <Button
                className="w-full bg-[#06141B] hover:bg-[#0a1f29] text-white"
                onClick={submit}
                disabled={isUploadingCover || isUploadingThumbnail}
              >
                {mode === "create" ? "Create Category" : "Save Changes"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
