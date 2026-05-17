import { useEffect, useState } from "react";

import { Eye, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { adminApi, resolveImage } from "../lib/api";
import { buildAutoSlug } from "../lib/slug";
import type { AdminBanner, AdminBannerPayload } from "../lib/types";

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <Label>
      {children}
      {required ? <span className="ml-1 text-[#dc2626]">*</span> : null}
    </Label>
  );
}

const emptyBannerForm: AdminBannerPayload = {
  title: "",
  slug: "",
  placement: "MAIN",
  media: {
    mediaType: "IMAGE",
    url: "",
    thumbnailUrl: "",
    altText: "",
  },
  redirectUrl: "",
  ctaLabel: "",
  active: true,
  displayOrder: 0,
  startsAt: "",
  endsAt: "",
};

export function Banners() {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<AdminBanner | null>(null);
  const [form, setForm] = useState<AdminBannerPayload>(emptyBannerForm);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const loadBanners = () => {
    adminApi.banners().then(setBanners).catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const openCreate = () => {
    setMode("create");
    setSelectedBanner(null);
    setForm(emptyBannerForm);
    setError("");
    setOpen(true);
  };

  const openFor = (banner: AdminBanner, nextMode: "edit" | "view") => {
    setMode(nextMode);
    setSelectedBanner(banner);
    setForm({
      title: banner.title,
      slug: banner.slug,
      placement: banner.placement,
      media: banner.media,
      redirectUrl: banner.redirectUrl || "",
      ctaLabel: banner.ctaLabel || "",
      active: banner.active,
      displayOrder: banner.displayOrder,
      startsAt: banner.startsAt || "",
      endsAt: banner.endsAt || "",
    });
    setError("");
    setOpen(true);
  };

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: buildAutoSlug(value),
    }));
  };

  const handleMediaFileChange = async (field: "url" | "thumbnailUrl", file: File | null) => {
    if (!file) {
      return;
    }

    const setUploading = field === "url" ? setIsUploadingMedia : setIsUploadingThumbnail;
    setUploading(true);
    setError("");

    try {
      const uploaded = await adminApi.uploadFile(file, "banners");
      setForm((prev) => ({
        ...prev,
        media: {
          ...prev.media,
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
      const payload = {
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };
      if (mode === "create") {
        await adminApi.createBanner(payload);
      }
      if (mode === "edit" && selectedBanner) {
        await adminApi.updateBanner(selectedBanner.id, payload);
      }
      setOpen(false);
      loadBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save banner");
    }
  };

  const remove = async (banner: AdminBanner) => {
    if (!window.confirm(`Delete banner "${banner.title}"?`)) {
      return;
    }
    try {
      await adminApi.deleteBanner(banner.id);
      loadBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete banner");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading mb-2">Banner Management</h1>
          <p className="text-[#5a6169]">Full banner CRUD with image/mp4 support</p>
        </div>
        <Button className="bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Banner
        </Button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="space-y-6">
        {banners.map((banner) => (
          <Card key={banner.id} className="overflow-hidden bg-white border-[rgba(6,20,27,0.1)] group">
            <div className="grid md:grid-cols-2 gap-6 p-6">
              <div className="relative rounded-lg overflow-hidden aspect-video bg-[#06141B]">
                {banner.media.mediaType === "MP4" ? (
                  <video src={banner.media.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={resolveImage(banner.media)} alt={banner.title} className="w-full h-full object-cover" />
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading">{banner.title}</h3>
                  <Badge className="bg-[rgba(237,217,135,0.2)] text-[#A36B31] border-0">{banner.placement}</Badge>
                </div>
                <p className="text-sm text-[#5a6169] font-data">/{banner.slug}</p>
                <p className="text-sm text-[#5a6169]">Display Order: {banner.displayOrder}</p>
                <p className="text-sm text-[#5a6169]">Active: {banner.active ? "Yes" : "No"}</p>
                <p className="text-sm text-[#5a6169]">
                  Schedule: {banner.startsAt ? format(new Date(banner.startsAt), "MMM dd, yyyy") : "Always"}
                  {banner.endsAt ? ` - ${format(new Date(banner.endsAt), "MMM dd, yyyy")}` : ""}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openFor(banner, "view")}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openFor(banner, "edit")}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(banner)}>
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
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {mode === "create" ? "Create Banner" : mode === "edit" ? "Edit Banner" : "Banner Detail"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Title</FieldLabel>
                <Input value={form.title} disabled={mode === "view"} onChange={(e) => handleTitleChange(e.target.value)} />
              </div>
              <div>
                <FieldLabel required>Slug</FieldLabel>
                <Input value={form.slug} disabled={mode === "view"} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Placement</FieldLabel>
                <Select disabled={mode === "view"} value={form.placement} onValueChange={(value) => setForm({ ...form, placement: value as AdminBannerPayload["placement"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAIN">MAIN</SelectItem>
                    <SelectItem value="SUB">SUB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel required>Media Type</FieldLabel>
                <Select disabled={mode === "view"} value={form.media.mediaType} onValueChange={(value) => setForm({ ...form, media: { ...form.media, mediaType: value as "IMAGE" | "MP4", url: "", thumbnailUrl: "" } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMAGE">IMAGE</SelectItem>
                    <SelectItem value="MP4">MP4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4">
              <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-[rgba(6,20,27,0.06)]">
                {form.media.url ? (
                  form.media.mediaType === "MP4" ? (
                    <video src={form.media.url} className="h-full w-full object-cover" muted controls />
                  ) : (
                    <img src={resolveImage(form.media)} alt={form.title || "banner"} className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#7b858e]">No media selected</div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel required>{form.media.mediaType === "MP4" ? "Browse Video" : "Browse Image"}</FieldLabel>
                  <Input
                    type="file"
                    accept={form.media.mediaType === "MP4" ? "video/mp4" : "image/*"}
                    disabled={mode === "view"}
                    onChange={(e) => handleMediaFileChange("url", e.target.files?.[0] || null)}
                  />
                  {isUploadingMedia ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5a6169]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Uploading media...
                    </p>
                  ) : null}
                </div>
                <div>
                  <FieldLabel>Browse Thumbnail</FieldLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={mode === "view"}
                    onChange={(e) => handleMediaFileChange("thumbnailUrl", e.target.files?.[0] || null)}
                  />
                  {isUploadingThumbnail ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5a6169]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Uploading thumbnail...
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Alt Text</FieldLabel>
                <Input value={form.media.altText || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, media: { ...form.media, altText: e.target.value } })} />
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>CTA Label</FieldLabel>
                <Input value={form.ctaLabel || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Redirect URL</FieldLabel>
                <Input value={form.redirectUrl || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel required>Display Order</FieldLabel>
                <Input type="number" value={form.displayOrder} disabled={mode === "view"} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
              </div>
              <div>
                <FieldLabel>Starts At</FieldLabel>
                <Input type="datetime-local" value={form.startsAt || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Ends At</FieldLabel>
                <Input type="datetime-local" value={form.endsAt || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} disabled={mode === "view"} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active banner
            </label>
            {mode !== "view" ? (
              <Button className="w-full bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={submit} disabled={isUploadingMedia || isUploadingThumbnail || !form.media.url}>
                {mode === "create" ? "Create Banner" : "Save Changes"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
