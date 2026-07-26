"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/hub/EmptyState";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconSave, IconPlus, IconArrowLeft, IconSearch } from "@/components/icons";
import { useRouter } from "next/navigation";

interface KeywordData {
  id: string;
  page_slug: string;
  page_title: string;
  url_path: string;
  primary_keyword: string | null;
  keyword_cluster: string[] | null;
  status: string;
  notes: string | null;
  updated_at: string;
}

interface BlockData {
  id: string;
  page_slug: string;
  block_key: string;
  label: string;
  content: string;
  version: number;
  updated_by: string | null;
  updated_at: string;
}

export function SiteContentEditor({
  keyword: initialKeyword,
  blocks: initialBlocks,
}: {
  keyword: KeywordData;
  blocks: BlockData[];
}) {
  const router = useRouter();

  // Keyword form state
  const [keyword, setKeyword] = useState<KeywordData>(initialKeyword);
  const [keywordSaving, setKeywordSaving] = useState(false);
  const [keywordDirty, setKeywordDirty] = useState(false);
  const [keywordJustSaved, setKeywordJustSaved] = useState(false);

  // Blocks state
  const [blocks, setBlocks] = useState<BlockData[]>(initialBlocks);
  const [savingBlock, setSavingBlock] = useState<string | null>(null);
  const [justSavedBlocks, setJustSavedBlocks] = useState<Set<string>>(new Set());

  // Add-block form state
  const [showAdd, setShowAdd] = useState(false);
  const [newBlockKey, setNewBlockKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newContent, setNewContent] = useState("");
  const [adding, setAdding] = useState(false);

  // Editable content per block
  const [contentEdits, setContentEdits] = useState<Record<string, string>>({});

  const handleKeywordChange = useCallback(
    (field: string, value: string | string[] | null) => {
      setKeyword((prev) => ({ ...prev, [field]: value }));
      setKeywordDirty(true);
      setKeywordJustSaved(false);
    },
    [],
  );

  const saveKeyword = async () => {
    setKeywordSaving(true);
    try {
      const res = await fetch("/api/page-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_slug: keyword.page_slug,
          primary_keyword: keyword.primary_keyword,
          keyword_cluster: keyword.keyword_cluster,
          status: keyword.status,
          notes: keyword.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save keyword");
      setKeywordDirty(false);
      setKeywordJustSaved(true);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setKeywordSaving(false);
    }
  };

  const saveBlock = async (block: BlockData) => {
    setSavingBlock(block.id);
    try {
      const updatedContent =
        contentEdits[block.id] !== undefined
          ? contentEdits[block.id]
          : block.content;
      const res = await fetch(`/api/page-content/${keyword.page_slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block_key: block.block_key,
          label: block.label,
          content: updatedContent,
        }),
      });
      if (!res.ok) throw new Error("Failed to save block");
      const saved = await res.json();
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? saved : b)),
      );
      setContentEdits((prev) => {
        const next = { ...prev };
        delete next[block.id];
        return next;
      });
      setJustSavedBlocks((prev) => new Set(prev).add(block.id));
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingBlock(null);
    }
  };

  const addBlock = async () => {
    if (!newBlockKey.trim() || !newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/page-content/${keyword.page_slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block_key: newBlockKey.trim(),
          label: newLabel.trim(),
          content: newContent,
        }),
      });
      if (!res.ok) throw new Error("Failed to create block");
      const created = await res.json();
      setBlocks((prev) => [...prev, created]);
      setNewBlockKey("");
      setNewLabel("");
      setNewContent("");
      setShowAdd(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const clusterString = (keyword.keyword_cluster ?? []).join(", ");
  const setClusterFromString = (val: string) => {
    const parts = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    handleKeywordChange("keyword_cluster", parts);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/hub/site-content"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <IconArrowLeft className="h-4 w-4" />
          Back to site content
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {keyword.page_title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {keyword.url_path} &middot; Edit the SEO metadata and the copy blocks that make up this page.
            </p>
          </div>
          <StatusBadge status={keyword.status} />
        </div>
      </div>

      {/* Keyword / SEO card */}
      <HubCard>
        <HubCardHeader
          icon={<IconSearch className="h-4 w-4" />}
          color="teal"
          title="SEO & Keywords"
          subtitle="What this page should rank for"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="primary_keyword">Primary keyword</Label>
              <Input
                id="primary_keyword"
                value={keyword.primary_keyword ?? ""}
                onChange={(e) =>
                  handleKeywordChange("primary_keyword", e.target.value || null)
                }
                placeholder="e.g. personal training Worthing"
                className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Review status</Label>
              <Select
                value={keyword.status}
                onValueChange={(val) => handleKeywordChange("status", val)}
              >
                <SelectTrigger id="status" className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="needs_writing">Needs Writing</SelectItem>
                  <SelectItem value="needs_updating">Needs Updating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="keyword_cluster">Keyword cluster</Label>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Comma-separated. Used to group related pages and check for cannibalisation.
            </p>
            <Input
              id="keyword_cluster"
              value={clusterString}
              onChange={(e) => setClusterFromString(e.target.value)}
              placeholder="Comma-separated keywords"
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={keyword.notes ?? ""}
              onChange={(e) =>
                handleKeywordChange("notes", e.target.value || null)
              }
              placeholder="Internal notes about this page's SEO strategy..."
              rows={3}
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={saveKeyword}
              disabled={!keywordDirty || keywordSaving}
              className={
                keywordJustSaved && !keywordDirty
                  ? "gap-1.5 rounded-lg bg-teal text-white"
                  : "gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white"
              }
            >
              <IconSave className="h-4 w-4" />
              {keywordSaving ? "Saving..." : keywordJustSaved && !keywordDirty ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </HubCard>

      {/* Editable content blocks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Content blocks</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each block saves independently — edit one at a time.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowAdd((s) => !s)}
          >
            <IconPlus className="h-4 w-4" />
            Add block
          </Button>
        </div>

        {showAdd && (
          <HubCard className="mb-4 border-dashed border-rose/30">
            <HubCardHeader title="New content block" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new_block_key">Block key</Label>
                  <Input
                    id="new_block_key"
                    value={newBlockKey}
                    onChange={(e) => setNewBlockKey(e.target.value)}
                    placeholder="e.g. hero_heading"
                    className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new_label">Label</Label>
                  <Input
                    id="new_label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Hero Heading"
                    className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_content">Initial content</Label>
                <Textarea
                  id="new_content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  placeholder="Content..."
                  className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => {
                    setShowAdd(false);
                    setNewBlockKey("");
                    setNewLabel("");
                    setNewContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white"
                  disabled={!newBlockKey.trim() || !newLabel.trim() || adding}
                  onClick={addBlock}
                >
                  {adding ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </HubCard>
        )}

        {blocks.length === 0 && !showAdd ? (
          <EmptyState
            icon={<IconSave className="h-6 w-6" />}
            title="No editable content blocks yet for this page"
            description="Add a block to start editing content that can be displayed on the live page."
            cta={{ label: "Add Block", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => {
              const editContent =
                contentEdits[block.id] !== undefined
                  ? contentEdits[block.id]
                  : block.content;
              const isSaving = savingBlock === block.id;
              const isDirty =
                (contentEdits[block.id] !== undefined &&
                  contentEdits[block.id] !== block.content) ||
                false;
              const justSaved = justSavedBlocks.has(block.id) && !isDirty;

              return (
                <HubCard key={block.id}>
                  <div className="flex flex-row items-start justify-between gap-3 pb-3 border-b border-[var(--hub-border)]">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{block.label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{block.block_key}</span> &middot; v{block.version}
                        {block.updated_by && (
                          <> &middot; by {block.updated_by}</>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className={
                        justSaved
                          ? "gap-1.5 rounded-lg bg-teal text-white shrink-0"
                          : "gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white shrink-0"
                      }
                      disabled={!isDirty || isSaving}
                      onClick={() => saveBlock(block)}
                    >
                      <IconSave className="h-4 w-4" />
                      {isSaving ? "Saving..." : justSaved ? "Saved" : "Save"}
                    </Button>
                  </div>
                  <div className="pt-4">
                    <Textarea
                      value={editContent}
                      onChange={(e) => {
                        setContentEdits((prev) => ({
                          ...prev,
                          [block.id]: e.target.value,
                        }));
                        setJustSavedBlocks((prev) => {
                          if (!prev.has(block.id)) return prev;
                          const next = new Set(prev);
                          next.delete(block.id);
                          return next;
                        });
                      }}
                      rows={4}
                      className="font-mono text-sm border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                    />
                  </div>
                </HubCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
