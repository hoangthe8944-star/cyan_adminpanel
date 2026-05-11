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
import { adminApi, formatJsonField, parseJsonField, resolveImage } from "../lib/api";
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read selected file"));
    reader.readAsDataURL(file);
  });
}

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
  const [sectionsJson, setSectionsJson] = useState("[]");
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
    setSectionsJson("[]");
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
    setSectionsJson(formatJsonField(article.sections));
    setError("");
    setOpen(true);
  };

  const submit = async () => {
    setError("");
    try {
      const payload: AdminEditorialPayload = {
        ...form,
        topics: topicsText.split(",").map((item) => item.trim()).filter(Boolean),
        sections: parseJsonField<EditorialSection[]>(sectionsJson, []),
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

  const handleCoverFileChange = async (field: "url" | "thumbnailUrl", file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((prev) => ({
        ...prev,
        coverMedia: {
          ...(prev.coverMedia || emptyEditorialForm.coverMedia!),
          mediaType: "IMAGE",
          [field]: dataUrl,
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read image file");
    }
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
                <div><FieldLabel>Browse Cover Image</FieldLabel><Input type="file" accept="image/*" disabled={mode === "view"} onChange={(e) => handleCoverFileChange("url", e.target.files?.[0] || null)} /></div>
                <div><FieldLabel>Browse Thumbnail</FieldLabel><Input type="file" accept="image/*" disabled={mode === "view"} onChange={(e) => handleCoverFileChange("thumbnailUrl", e.target.files?.[0] || null)} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><FieldLabel>Publish Time</FieldLabel><Input type="datetime-local" value={form.publishedAt || ""} disabled={mode === "view"} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} /></div>
              <div />
            </div>
            <div>
              <FieldLabel>Sections JSON</FieldLabel>
              <Textarea className="min-h-48 font-mono text-xs" value={sectionsJson} disabled={mode === "view"} onChange={(e) => setSectionsJson(e.target.value)} />
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
