import { useEffect, useMemo, useState } from "react";

import { CheckCircle2, Eye, LoaderCircle, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { adminApi, resolveImage } from "../lib/api";
import { buildAutoSlug } from "../lib/slug";
import type { AdminLandingTheme, AdminLandingThemePayload, MediaAsset } from "../lib/types";

interface LandingThemeForm {
  name: string;
  slug: string;
  active: boolean;
  eyebrow: string;
  headline: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  media: MediaAsset | null;
}

const emptyThemeForm = (): LandingThemeForm => ({
  name: "",
  slug: "",
  active: false,
  eyebrow: "",
  headline: "",
  description: "",
  primaryCtaLabel: "",
  primaryCtaHref: "",
  secondaryCtaLabel: "",
  secondaryCtaHref: "",
  media: null,
});

function getThemeLabel(theme: AdminLandingTheme) {
  const rawLabel = theme.name ?? theme.title ?? theme.slug ?? theme.id;
  return typeof rawLabel === "string" && rawLabel.trim() ? rawLabel.trim() : theme.id;
}

function isThemeActive(theme: AdminLandingTheme) {
  const candidates = [theme.active, theme.isActive, theme.enabled, theme.published];
  return candidates.some((value) => value === true);
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "";
}

function pickMedia(...values: unknown[]): MediaAsset | null {
  for (const value of values) {
    if (value && typeof value === "object" && "url" in value) {
      return value as MediaAsset;
    }
  }
  return null;
}

function extractMedia(theme: AdminLandingTheme): MediaAsset | null {
  const directCandidates = [
    theme.media,
    theme.heroMedia,
    theme.coverMedia,
    theme.backgroundMedia,
    theme.desktopMedia,
    theme.mobileMedia,
  ];

  const directMedia = pickMedia(...directCandidates);
  if (directMedia) {
    return directMedia;
  }

  const sections = Array.isArray(theme.sections) ? theme.sections : [];
  for (const section of sections) {
    if (!section || typeof section !== "object" || !("media" in section)) {
      continue;
    }
    const media = Array.isArray((section as { media?: unknown[] }).media)
      ? (section as { media?: unknown[] }).media
      : [];
    const first = media.find((item) => item && typeof item === "object" && "url" in item);
    if (first) {
      return first as MediaAsset;
    }
  }

  return null;
}

function themeToForm(theme: AdminLandingTheme): LandingThemeForm {
  const hero = theme.hero && typeof theme.hero === "object" ? (theme.hero as Record<string, unknown>) : {};
  const content = theme.content && typeof theme.content === "object" ? (theme.content as Record<string, unknown>) : {};
  const ctas = Array.isArray(theme.ctas) ? theme.ctas : [];
  const primaryCta =
    (theme.primaryCta && typeof theme.primaryCta === "object" ? (theme.primaryCta as Record<string, unknown>) : null) ??
    (ctas[0] && typeof ctas[0] === "object" ? (ctas[0] as Record<string, unknown>) : null);
  const secondaryCta =
    (theme.secondaryCta && typeof theme.secondaryCta === "object" ? (theme.secondaryCta as Record<string, unknown>) : null) ??
    (ctas[1] && typeof ctas[1] === "object" ? (ctas[1] as Record<string, unknown>) : null);

  return {
    name: pickString(theme.name, theme.title),
    slug: pickString(theme.slug),
    active: isThemeActive(theme),
    eyebrow: pickString(theme.eyebrow, hero.eyebrow, content.eyebrow, theme.tagline),
    headline: pickString(theme.headline, theme.title, hero.headline, hero.title, content.headline),
    description: pickString(theme.description, hero.description, hero.subheadline, content.description, theme.summary),
    primaryCtaLabel: pickString(theme.ctaLabel, primaryCta?.label, primaryCta?.text),
    primaryCtaHref: pickString(theme.ctaHref, primaryCta?.href, primaryCta?.url),
    secondaryCtaLabel: pickString(secondaryCta?.label, secondaryCta?.text),
    secondaryCtaHref: pickString(secondaryCta?.href, secondaryCta?.url),
    media: extractMedia(theme),
  };
}

function buildThemePayload(form: LandingThemeForm, existingTheme?: AdminLandingTheme | null): AdminLandingThemePayload {
  const heroMedia = form.media
    ? {
        mediaType: form.media.mediaType,
        url: form.media.url,
        thumbnailUrl: form.media.thumbnailUrl || form.media.url,
        altText: form.media.altText || form.headline || form.name,
      }
    : null;

  const payload: AdminLandingThemePayload = {
    ...(existingTheme ?? {}),
    name: form.name.trim(),
    slug: buildAutoSlug(form.slug || form.name),
    active: form.active,
    title: form.headline.trim() || form.name.trim(),
    eyebrow: form.eyebrow.trim() || null,
    headline: form.headline.trim() || form.name.trim(),
    description: form.description.trim() || null,
    summary: form.description.trim() || null,
    media: heroMedia,
    heroMedia,
    coverMedia: heroMedia,
    desktopMedia: heroMedia,
    mobileMedia: heroMedia,
    ctaLabel: form.primaryCtaLabel.trim() || null,
    ctaHref: form.primaryCtaHref.trim() || null,
    primaryCta: {
      label: form.primaryCtaLabel.trim() || "Shop now",
      href: form.primaryCtaHref.trim() || `/${buildAutoSlug(form.slug || form.name)}`,
      style: "primary",
    },
    secondaryCta:
      form.secondaryCtaLabel.trim() || form.secondaryCtaHref.trim()
        ? {
            label: form.secondaryCtaLabel.trim() || "Explore collection",
            href: form.secondaryCtaHref.trim() || "/collections",
            style: "secondary",
          }
        : null,
    ctas: [
      {
        label: form.primaryCtaLabel.trim() || "Shop now",
        href: form.primaryCtaHref.trim() || `/${buildAutoSlug(form.slug || form.name)}`,
        style: "primary",
      },
      ...(form.secondaryCtaLabel.trim() || form.secondaryCtaHref.trim()
        ? [
            {
              label: form.secondaryCtaLabel.trim() || "Explore collection",
              href: form.secondaryCtaHref.trim() || "/collections",
              style: "secondary",
            },
          ]
        : []),
    ],
    hero: {
      eyebrow: form.eyebrow.trim() || "New season",
      headline: form.headline.trim() || form.name.trim(),
      description: form.description.trim() || "Crafted to elevate your storefront with a premium first impression.",
      media: heroMedia,
      alignment: "left",
      overlay: "soft-dark",
    },
    content: {
      eyebrow: form.eyebrow.trim() || "New season",
      headline: form.headline.trim() || form.name.trim(),
      description: form.description.trim() || "Crafted to elevate your storefront with a premium first impression.",
    },
    seo: {
      title: form.headline.trim() || form.name.trim(),
      description: form.description.trim() || `${form.name.trim()} landing page theme`,
      keywords: [form.name.trim(), buildAutoSlug(form.slug || form.name)].filter(Boolean),
    },
    themeConfig: {
      version: 1,
      preset: "luxury-dark",
      layout: "immersive-hero",
      contrast: "high",
    },
    sections: [
      {
        type: "hero",
        displayOrder: 0,
        eyebrow: form.eyebrow.trim() || "New season",
        heading: form.headline.trim() || form.name.trim(),
        content: form.description.trim() || "Crafted to elevate your storefront with a premium first impression.",
        media: heroMedia ? [heroMedia] : [],
        actions: [
          {
            label: form.primaryCtaLabel.trim() || "Shop now",
            href: form.primaryCtaHref.trim() || `/${buildAutoSlug(form.slug || form.name)}`,
            style: "primary",
          },
          ...(form.secondaryCtaLabel.trim() || form.secondaryCtaHref.trim()
            ? [
                {
                  label: form.secondaryCtaLabel.trim() || "Explore collection",
                  href: form.secondaryCtaHref.trim() || "/collections",
                  style: "secondary",
                },
              ]
            : []),
        ],
      },
    ],
  };

  return payload;
}

export function LandingThemes() {
  const [themes, setThemes] = useState<AdminLandingTheme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<AdminLandingTheme | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LandingThemeForm>(emptyThemeForm());
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivatingId, setIsActivatingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadThemes = async () => {
    try {
      const [themeList, activeTheme] = await Promise.all([
        adminApi.landingThemes(),
        adminApi.activeLandingTheme().catch(() => null),
      ]);
      setThemes(themeList);
      setActiveThemeId(activeTheme?.id ?? themeList.find((theme) => isThemeActive(theme))?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load landing themes");
    }
  };

  useEffect(() => {
    loadThemes();
  }, []);

  const sortedThemes = useMemo(
    () =>
      [...themes].sort((first, second) => {
        if (first.id === activeThemeId) {
          return -1;
        }
        if (second.id === activeThemeId) {
          return 1;
        }
        return getThemeLabel(first).localeCompare(getThemeLabel(second));
      }),
    [activeThemeId, themes]
  );

  const openCreate = () => {
    setMode("create");
    setSelectedTheme(null);
    setForm(emptyThemeForm());
    setUploadError("");
    setError("");
    setOpen(true);
  };

  const openFor = (theme: AdminLandingTheme, nextMode: "edit" | "view") => {
    setMode(nextMode);
    setSelectedTheme(theme);
    setForm(themeToForm(theme));
    setUploadError("");
    setError("");
    setOpen(true);
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: prev.slug ? prev.slug : buildAutoSlug(value),
      headline: prev.headline ? prev.headline : value,
    }));
  };

  const handleUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      const response = await adminApi.uploadLandingThemeMedia(file, "landing-themes", form.headline || form.name);
      setForm((prev) => ({
        ...prev,
        media: response.media,
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload media");
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const payload = buildThemePayload(form, mode === "edit" ? selectedTheme : null);
      if (mode === "create") {
        await adminApi.createLandingTheme(payload);
      }
      if (mode === "edit" && selectedTheme) {
        await adminApi.updateLandingTheme(selectedTheme.id, payload);
      }
      setOpen(false);
      await loadThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save landing theme");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activateTheme = async (theme: AdminLandingTheme) => {
    setError("");
    setIsActivatingId(theme.id);
    try {
      await adminApi.activateLandingTheme(theme.id);
      await loadThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate landing theme");
    } finally {
      setIsActivatingId(null);
    }
  };

  const removeTheme = async (theme: AdminLandingTheme) => {
    if (!window.confirm(`Delete landing theme "${getThemeLabel(theme)}"?`)) {
      return;
    }

    setError("");
    try {
      await adminApi.deleteLandingTheme(theme.id);
      await loadThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete landing theme");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 font-heading">Landing Theme Management</h1>
          <p className="text-[#5a6169]">Admin chỉ nhập dữ liệu quan trọng, phần cấu hình còn lại được tự động sinh khi gửi lên backend.</p>
        </div>
        <Button className="bg-[#06141B] text-white hover:bg-[#0a1f29]" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Theme
        </Button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="space-y-6">
        {sortedThemes.length ? (
          sortedThemes.map((theme) => {
            const media = extractMedia(theme);
            const active = theme.id === activeThemeId || isThemeActive(theme);
            const headline = pickString(theme.headline, theme.title, (theme.hero as { headline?: string } | undefined)?.headline);
            const description = pickString(theme.description, theme.summary, (theme.hero as { description?: string } | undefined)?.description);

            return (
              <Card key={theme.id} className="overflow-hidden border-[rgba(6,20,27,0.1)] bg-white">
                <div className="grid gap-6 p-6 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[rgba(6,20,27,0.08)]">
                    {media?.url ? (
                      media.mediaType === "MP4" ? (
                        <video src={media.url} className="h-full w-full object-cover" muted controls />
                      ) : (
                        <img src={resolveImage(media)} alt={media.altText || getThemeLabel(theme)} className="h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#7b858e]">
                        No media preview found in this theme payload
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading">{getThemeLabel(theme)}</h3>
                      {active ? (
                        <Badge className="border-0 bg-[rgba(237,217,135,0.2)] text-[#A36B31]">
                          <Sparkles className="mr-1 h-3.5 w-3.5" />
                          Active
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-1 text-sm text-[#5a6169]">
                      <p>Slug: /{theme.slug}</p>
                      {headline ? <p>Headline: {headline}</p> : null}
                      {description ? <p className="line-clamp-2">{description}</p> : null}
                      {theme.updatedAt ? <p>Updated: {theme.updatedAt}</p> : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openFor(theme, "view")}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openFor(theme, "edit")}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#06141B] text-white hover:bg-[#0a1f29]"
                        disabled={active || isActivatingId === theme.id}
                        onClick={() => activateTheme(theme)}
                      >
                        {isActivatingId === theme.id ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Activate
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => removeTheme(theme)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="border-dashed border-[rgba(6,20,27,0.16)] bg-white p-10 text-center text-sm text-[#7b858e]">
            No landing themes found yet
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(96vw,72rem)] max-w-none overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {mode === "create" ? "Create Landing Theme" : mode === "edit" ? "Edit Landing Theme" : "Landing Theme Detail"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4 text-sm text-[#5a6169]">
              Form này chỉ hiện các field quan trọng. Khi lưu, hệ thống tự dựng `hero`, `sections`, `seo`, `cta` và config mặc định để giảm thao tác cho admin.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={form.name} disabled={mode === "view"} onChange={(event) => handleNameChange(event.target.value)} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  disabled={mode === "view"}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Eyebrow</Label>
                <Input
                  value={form.eyebrow}
                  disabled={mode === "view"}
                  onChange={(event) => setForm((prev) => ({ ...prev, eyebrow: event.target.value }))}
                  placeholder="New season"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-[#06141B]">
                  <input
                    type="checkbox"
                    checked={form.active}
                    disabled={mode === "view"}
                    onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                  />
                  Active theme
                </label>
              </div>
            </div>

            <div>
              <Label>Headline</Label>
              <Input
                value={form.headline}
                disabled={mode === "view"}
                onChange={(event) => setForm((prev) => ({ ...prev, headline: event.target.value }))}
                placeholder="Timeless jewelry for modern icons"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                disabled={mode === "view"}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="A short hero description for the landing page"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Primary CTA Label</Label>
                <Input
                  value={form.primaryCtaLabel}
                  disabled={mode === "view"}
                  onChange={(event) => setForm((prev) => ({ ...prev, primaryCtaLabel: event.target.value }))}
                  placeholder="Shop now"
                />
              </div>
              <div>
                <Label>Primary CTA Link</Label>
                <Input
                  value={form.primaryCtaHref}
                  disabled={mode === "view"}
                  onChange={(event) => setForm((prev) => ({ ...prev, primaryCtaHref: event.target.value }))}
                  placeholder="/collections/new-arrivals"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Secondary CTA Label</Label>
                <Input
                  value={form.secondaryCtaLabel}
                  disabled={mode === "view"}
                  onChange={(event) => setForm((prev) => ({ ...prev, secondaryCtaLabel: event.target.value }))}
                  placeholder="Explore collection"
                />
              </div>
              <div>
                <Label>Secondary CTA Link</Label>
                <Input
                  value={form.secondaryCtaHref}
                  disabled={mode === "view"}
                  onChange={(event) => setForm((prev) => ({ ...prev, secondaryCtaHref: event.target.value }))}
                  placeholder="/collections"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(6,20,27,0.08)] bg-[#fbfbfa] p-4">
              <div className="mb-4">
                <h3 className="font-heading">Hero Media</h3>
                <p className="mt-1 text-sm text-[#5a6169]">Upload image hoặc MP4 video. Hệ thống sẽ tự map sang `media`, `heroMedia`, `coverMedia`, `desktopMedia`, `mobileMedia`.</p>
              </div>

              <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-[rgba(6,20,27,0.08)]">
                {form.media?.url ? (
                  form.media.mediaType === "MP4" ? (
                    <video src={form.media.url} className="h-full w-full object-cover" muted controls />
                  ) : (
                    <img src={resolveImage(form.media)} alt={form.media.altText || form.headline || form.name} className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#7b858e]">No media selected</div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Upload Image or Video</Label>
                  <Input
                    type="file"
                    accept="image/*,video/mp4"
                    disabled={mode === "view" || isUploading}
                    onChange={(event) => handleUpload(event.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label>Alt Text</Label>
                  <Input
                    value={form.media?.altText || ""}
                    disabled={mode === "view" || !form.media}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        media: prev.media ? { ...prev.media, altText: event.target.value } : prev.media,
                      }))
                    }
                  />
                </div>
              </div>

              {isUploading ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-[#5a6169]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Uploading media...
                </p>
              ) : null}

              {uploadError ? <p className="mt-3 text-sm text-red-600">{uploadError}</p> : null}
            </div>

            {mode !== "view" ? (
              <Button className="w-full bg-[#06141B] text-white hover:bg-[#0a1f29]" disabled={isSubmitting || isUploading || !form.name.trim()} onClick={submit}>
                {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === "create" ? "Create Theme" : "Save Changes"}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
