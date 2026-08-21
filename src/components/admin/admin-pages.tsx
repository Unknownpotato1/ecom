'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Loader2, ExternalLink, Eye, EyeOff, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { slugify, RESERVED_PAGE_SLUGS } from '@/lib/types'

interface PageDoc {
  id: string
  title: string
  slug: string
  code: string
  published: boolean
  position: number
  createdAt: string
  updatedAt: string
}

interface PageDraft {
  id?: string
  title: string
  slug: string
  code: string
  published: boolean
}

const DEFAULT_CODE = `<style>
  .eviola-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 60px 24px;
    font-family: 'Montserrat', sans-serif;
    color: #1f2937;
  }
  .eviola-page h1 {
    font-size: 40px;
    margin-bottom: 16px;
  }
  .eviola-page p {
    font-size: 16px;
    line-height: 1.7;
    color: #4b5563;
  }
</style>

<div class="eviola-page">
  <h1>Your page title</h1>
  <p>Write your HTML, CSS, and JavaScript here. This will render at <strong>/your-slug</strong> on your storefront.</p>
</div>
`

export function AdminPages() {
  const [pages, setPages] = useState<PageDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<PageDraft>({
    title: '',
    slug: '',
    code: DEFAULT_CODE,
    published: true,
  })

  const load = () => {
    setLoading(true)
    fetch('/api/pages?all=1')
      .then((r) => r.json())
      .then((data) => {
        setPages(data.pages || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setDraft({ title: '', slug: '', code: DEFAULT_CODE, published: true })
    setOpen(true)
  }

  const openEdit = (p: PageDoc) => {
    setDraft({
      id: p.id,
      title: p.title,
      slug: p.slug,
      code: p.code,
      published: p.published,
    })
    setOpen(true)
  }

  const save = async () => {
    if (!draft.title.trim()) {
      toast.error('Page name is required')
      return
    }
    const computedSlug = slugify(draft.slug || draft.title)
    if (!computedSlug) {
      toast.error('Slug must contain at least one letter or digit')
      return
    }
    if ((RESERVED_PAGE_SLUGS as readonly string[]).includes(computedSlug)) {
      toast.error(`The slug "/${computedSlug}" is reserved and cannot be used`)
      return
    }
    setSaving(true)
    const url = draft.id ? `/api/pages/${draft.id}` : '/api/pages'
    const method = draft.id ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: draft.title.trim(),
        slug: computedSlug,
        code: draft.code,
        published: draft.published,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(data.error || 'Failed to save page')
      return
    }
    setOpen(false)
    toast.success(draft.id ? 'Page updated' : 'Page created')
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this page? This cannot be undone.')) return
    const res = await fetch(`/api/pages/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || 'Failed to delete page')
      return
    }
    setPages((p) => p.filter((x) => x.id !== id))
    toast.success('Page deleted')
  }

  const togglePublished = async (p: PageDoc, published: boolean) => {
    setPages((arr) => arr.map((x) => (x.id === p.id ? { ...x, published } : x)))
    await fetch(`/api/pages/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    })
  }

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  const computedSlugPreview = slugify(draft.slug || draft.title)
  const isReservedSlug = (RESERVED_PAGE_SLUGS as readonly string[]).includes(computedSlugPreview)

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading pages...</div>
  }

  return (
    <Card className="border-pink-100">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Pages {pages.length > 0 && <span className="text-muted-foreground font-normal">({pages.length})</span>}
        </CardTitle>
        <Button size="sm" className="bg-brand text-white hover:shadow-lg" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create a page
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Create standalone landing pages (e.g. /valentines-day-sale, /corporate-gifting) with custom HTML, CSS, and JavaScript.
          Pages are rendered in an isolated shadow DOM.
        </p>

        {pages.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-pink-200 rounded-lg">
            <p className="text-sm font-medium">No pages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first page to add a custom landing page to your store.</p>
            <Button size="sm" className="mt-3 bg-brand text-white hover:shadow-lg" onClick={openNew}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create a page
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-pink-100 bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{p.title}</p>
                    {!p.published && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold uppercase">
                        Draft
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => copyLink(p.slug)}
                    className="text-xs text-brand hover:underline inline-flex items-center gap-1 mt-0.5"
                    title="Copy link"
                  >
                    /{p.slug} <Copy className="h-3 w-3" />
                  </button>
                </div>
                <Switch checked={p.published} onCheckedChange={(v) => togglePublished(p, v)} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/${p.slug}`, '_blank')}
                  title="Open page in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => remove(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Editor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit page' : 'Create a page'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Page Name */}
            <div>
              <Label className="text-xs font-medium">Page name</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Valentine's Day Sale, About Us, Corporate Gifting"
                className="mt-1 h-11"
                autoFocus
              />
            </div>

            {/* Slug */}
            <div>
              <Label className="text-xs font-medium">Page URL (slug)</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                The page will be live at <strong>eviola.in/{computedSlugPreview || 'your-slug'}</strong>.
                Leave blank to auto-generate from the page name.
              </p>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                placeholder={slugify(draft.title) || 'your-slug'}
                className="font-mono text-sm"
              />
              {isReservedSlug && computedSlugPreview && (
                <p className="text-[11px] text-destructive mt-1">
                  The slug &quot;/{computedSlugPreview}&quot; is reserved and cannot be used.
                </p>
              )}
            </div>

            {/* Code Box */}
            <div>
              <Label className="text-xs font-medium">HTML / CSS / JavaScript</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                Paste your full HTML code here. Use <code>&lt;style&gt;</code> and <code>&lt;script&gt;</code> tags for CSS/JS.
                The code runs in an isolated shadow DOM.
              </p>
              <Textarea
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                placeholder={DEFAULT_CODE}
                className="font-mono text-xs min-h-[400px] resize-y"
                spellCheck={false}
              />
            </div>

            {/* Published toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={draft.published}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, published: v }))}
              />
              <span className="text-sm flex items-center gap-1">
                {draft.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {draft.published ? 'Published (live on storefront)' : 'Draft (not visible)'}
              </span>
            </label>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background py-3 -mx-2 px-2 border-t border-pink-100">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                className="bg-brand text-white hover:shadow-lg"
                disabled={saving || isReservedSlug || !draft.title.trim()}
                onClick={save}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {draft.id ? 'Save changes' : 'Create page'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
