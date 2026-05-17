import { useEffect, useState } from "react";

import { Eye, Pencil, Plus, Trash2 } from "lucide-react";

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
import type { AdminEditorial, AdminEditorialPayload, EditorialSection } from "../lib/types";

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <Label>
      {children}
      {required ? <span className="ml-1 text-[#dc2626]">*</span> : null}
    </Label>
  );
}

const createEmptySection = (): EditorialSection => ({
  heading: "",
  subHeading: "",
  content: "",
  displayOrder: 0,
  media: [],
});

const emptyEditorialForm: AdminEditorialPayload = {
  title: "",
  slug: "",
  summary: "",
  body: "",
  topics: [],
  status: "DRAFT",
  publishedAt: "",
  coverMedia: {
    mediaType: "IMAGE",
    url: "",
    thumbnailUrl: "",
    altText: "",
  },
  sections: [],
};

export function Editorial() {
  const [articles, setArticles] = useState<AdminEditorial[]>([]);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [open, setOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<AdminEditorial | null>(null);
  const [form, setForm] = useState<AdminEditorialPayload>(emptyEditorialForm);
  const [topicsText, setTopicsText] = useState("");
  const [error, setError] = useState("");

  const loadEditorials = () => {
    adminApi.editorials().then(setArticles).catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadEditorials();
  }, []);

  const openCreate = () => {
    setMode("create");
    setSelectedArticle(null);
    setForm(emptyEditorialForm);
    setTopicsText("");
    setError("");
    setOpen(true);
  };

  const openFor = (article: AdminEditorial, nextMode: "edit" | "view") => {
    setMode(nextMode);
    setSelectedArticle(article);
    setForm({
      title: article.title,
      slug: article.slug,
      summary: article.summary || "",
      body: article.body || "",
      topics: article.topics,
      status: article.status,
      publishedAt: article.publishedAt || "",
      coverMedia: article.coverMedia || emptyEditorialForm.coverMedia,
      sections: article.sections,
    });
    setTopicsText(article.topics.join(", "));
    setError("");
    setOpen(true);
  };

  const submit = async () => {
    setError("");
    try {
      const payload: AdminEditorialPayload = {
        ...form,
        topics: topicsText.split(",").map((item) => item.trim()).filter(Boolean),
        sections: form.sections.map((section, index) => ({
          ...section,
          displayOrder: section.displayOrder || index,
          media: section.media.filter((item) => item.url.trim()),
        })),
        publishedAt: form.publishedAt || null,
      };
      if (mode === "create") {
        await adminApi.createEditorial(payload);
      }
      if (mode === "edit" && selectedArticle) {
        await adminApi.updateEditorial(selectedArticle.id, payload);
      }
      setOpen(false);
      loadEditorials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save editorial");
    }
  };

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: buildAutoSlug(value),
    }));
  };

  const updateSection = (sectionIndex: number, patch: Partial<EditorialSection>) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex ? { ...section, ...patch } : section
      ),
    }));
  };

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, { ...createEmptySection(), displayOrder: prev.sections.length }],
    }));
  };

  const removeSection = (sectionIndex: number) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, index) => index !== sectionIndex),
    }));
  };

  const addSectionMedia = (sectionIndex: number) => {
    updateSection(sectionIndex, {
      media: [
        ...(form.sections[sectionIndex]?.media || []),
        { mediaType: "IMAGE", url: "", thumbnailUrl: "", altText: "" },
      ],
    });
  };

  const updateSectionMedia = (
    sectionIndex: number,
    mediaIndex: number,
    field: "url" | "thumbnailUrl" | "altText",
    value: string
  ) => {
    const nextMedia = (form.sections[sectionIndex]?.media || []).map((media, index) =>
      index === mediaIndex ? { ...media, [field]: value } : media
    );
    updateSection(sectionIndex, { media: nextMedia });
  };

  const removeSectionMedia = (sectionIndex: number, mediaIndex: number) => {
    updateSection(sectionIndex, {
      media: (form.sections[sectionIndex]?.media || []).filter((_, index) => index !== mediaIndex),
    });
  };

  const remove = async (article: AdminEditorial) => {
    if (!window.confirm(`Delete article "${article.title}"?`)) {
      return;
    }
    try {
      await adminApi.deleteEditorial(article.id);
      loadEditorials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete article");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading mb-2">Editorial Content</h1>
          <p className="text-[#5a6169]">Manage create, edit, view and delete editorial content</p>
        </div>
        <Button className="bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Article
        </Button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Card key={article.id} className="overflow-hidden bg-white border-[rgba(6,20,27,0.1)] group hover:shadow-lg transition-shadow">
            <div className="aspect-video overflow-hidden">
              <img
                src={resolveImage(article.coverMedia)}
                alt={article.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="bg-[rgba(237,217,135,0.2)] text-[#A36B31] border-0">{article.status}</Badge>
                {article.topics.map((topic) => (
                  <span key={topic} className="text-xs text-[#5a6169] font-data">#{topic}</span>
                ))}
              </div>
              <h3 className="font-heading mb-3">{article.title}</h3>
              <p className="text-sm text-[#5a6169] mb-4">/{article.slug}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openFor(article, "view")}><Eye className="w-4 h-4 mr-2" />View</Button>
                <Button variant="outline" size="sm" onClick={() => openFor(article, "edit")}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => remove(article)}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {mode === "create" ? "Create Editorial" : mode === "edit" ? "Edit Editorial" : "Editorial Detail"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><FieldLabel required>Title</FieldLabel><Input value={form.title} disabled={mode === "view"} onChange={(e) => handleTitleChange(e.target.value)} /></div>
              <div><FieldLabel required>Slug</FieldLabel><Input value={form.slug} disabled={mode === "view"} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            </div>
            <div><FieldLabel>Summary</FieldLabel><Textarea value={form.summary || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            <div><FieldLabel required>Body</FieldLabel><Textarea className="min-h-32" value={form.body || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><FieldLabel>Topics</FieldLabel><Input value={topicsText} disabled={mode === "view"} onChange={(e) => setTopicsText(e.target.value)} placeholder="news, luxury, jewelry" /></div>
              <div>
                <FieldLabel required>Status</FieldLabel>
                <Select disabled={mode === "view"} value={form.status} onValueChange={(value) => setForm({ ...form, status: value as AdminEditorialPayload["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4">
              <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-[rgba(6,20,27,0.06)]">
                {form.coverMedia?.url ? (
                  <img src={resolveImage(form.coverMedia)} alt={form.title || "editorial"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#7b858e]">No cover image</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Cloudinary Cover URL</FieldLabel>
                  <Input
                    value={form.coverMedia?.url || ""}
                    disabled={mode === "view"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        coverMedia: {
                          ...(form.coverMedia || emptyEditorialForm.coverMedia!),
                          mediaType: "IMAGE",
                          url: e.target.value,
                        },
                      })
                    }
                    placeholder="https://res.cloudinary.com/.../image/upload/..."
                  />
                </div>
                <div>
                  <FieldLabel>Cloudinary Thumbnail URL</FieldLabel>
                  <Input
                    value={form.coverMedia?.thumbnailUrl || ""}
                    disabled={mode === "view"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        coverMedia: {
                          ...(form.coverMedia || emptyEditorialForm.coverMedia!),
                          mediaType: "IMAGE",
                          thumbnailUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://res.cloudinary.com/.../image/upload/..."
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><FieldLabel>Publish Time</FieldLabel><Input type="datetime-local" value={form.publishedAt || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} /></div>
              <div>
                <FieldLabel>Cover Alt Text</FieldLabel>
                <Input
                  value={form.coverMedia?.altText || ""}
                  disabled={mode === "view"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      coverMedia: {
                        ...(form.coverMedia || emptyEditorialForm.coverMedia!),
                        altText: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <FieldLabel>Sections</FieldLabel>
                  <p className="mt-1 text-sm text-[#5a6169]">Build editorial blocks directly from the backend section schema.</p>
                </div>
                {mode !== "view" ? (
                  <Button variant="outline" onClick={addSection}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                ) : null}
              </div>

              <div className="space-y-4">
                {form.sections.length ? (
                  form.sections.map((section, sectionIndex) => (
                    <div key={`${section.heading}-${sectionIndex}`} className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-white p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel required>Heading</FieldLabel>
                          <Input
                            value={section.heading}
                            disabled={mode === "view"}
                            onChange={(e) => updateSection(sectionIndex, { heading: e.target.value })}
                          />
                        </div>
                        <div>
                          <FieldLabel>Sub Heading</FieldLabel>
                          <Input
                            value={section.subHeading || ""}
                            disabled={mode === "view"}
                            onChange={(e) => updateSection(sectionIndex, { subHeading: e.target.value })}
                          />
                        </div>
                        <div>
                          <FieldLabel>Display Order</FieldLabel>
                          <Input
                            type="number"
                            value={section.displayOrder}
                            disabled={mode === "view"}
                            onChange={(e) => updateSection(sectionIndex, { displayOrder: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <FieldLabel>Content</FieldLabel>
                        <Textarea
                          className="min-h-28"
                          value={section.content || ""}
                          disabled={mode === "view"}
                          onChange={(e) => updateSection(sectionIndex, { content: e.target.value })}
                        />
                      </div>

                      <div className="mt-4 space-y-4">
                        {(section.media || []).map((media, mediaIndex) => {
                          const uploadKey = `${sectionIndex}-${mediaIndex}`;
                          return (
                            <div
                              key={`${uploadKey}-${media.url || "new"}`}
                              className="grid grid-cols-1 gap-4 rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4 md:grid-cols-[120px_1fr_1fr_auto]"
                            >
                              <div className="overflow-hidden rounded-xl bg-[rgba(6,20,27,0.06)]">
                                {media.url ? (
                                  <img src={resolveImage(media)} alt={media.altText || `section-${sectionIndex + 1}`} className="h-24 w-full object-cover" />
                                ) : (
                                  <div className="flex h-24 items-center justify-center text-sm text-[#7b858e]">No image</div>
                                )}
                              </div>
                              <div>
                                <FieldLabel>Cloudinary Image URL</FieldLabel>
                                <Input
                                  value={media.url}
                                  disabled={mode === "view"}
                                  onChange={(e) => updateSectionMedia(sectionIndex, mediaIndex, "url", e.target.value)}
                                  placeholder="https://res.cloudinary.com/.../image/upload/..."
                                />
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <FieldLabel>Cloudinary Thumbnail URL</FieldLabel>
                                  <Input
                                    value={media.thumbnailUrl || ""}
                                    disabled={mode === "view"}
                                    onChange={(e) =>
                                      updateSectionMedia(sectionIndex, mediaIndex, "thumbnailUrl", e.target.value)
                                    }
                                    placeholder="https://res.cloudinary.com/.../image/upload/..."
                                  />
                                </div>
                                <div>
                                  <FieldLabel>Alt Text</FieldLabel>
                                  <Input
                                    value={media.altText || ""}
                                    disabled={mode === "view"}
                                    onChange={(e) => updateSectionMedia(sectionIndex, mediaIndex, "altText", e.target.value)}
                                  />
                                </div>
                              </div>
                              {mode !== "view" ? (
                                <div className="flex items-end">
                                  <Button variant="ghost" size="sm" onClick={() => removeSectionMedia(sectionIndex, mediaIndex)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {mode !== "view" ? (
                        <div className="mt-4 flex gap-3">
                          <Button variant="outline" onClick={() => addSectionMedia(sectionIndex)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Media
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => removeSection(sectionIndex)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Section
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[rgba(6,20,27,0.12)] bg-white px-4 py-10 text-center text-sm text-[#7b858e]">
                    No sections yet
                  </div>
                )}
              </div>
            </div>
            {mode !== "view" ? (
              <Button className="w-full bg-[#06141B] hover:bg-[#0a1f29] text-white" onClick={submit}>
                {mode === "create" ? "Create Editorial" : "Save Changes"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
