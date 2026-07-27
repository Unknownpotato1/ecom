'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Package,
  LayoutGrid,
  Code2,
  Image as ImageIcon,
  Settings,
  Trash2,
  Plus,
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useUI } from '@/lib/ui-store'
import { useAuth, ADMIN_EMAIL } from '@/lib/auth-store'
import { AdminProducts } from './admin-products'
import { CustomSectionPreview } from '@/components/store/custom-section-renderer'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Section, CustomSection, HeroConfig } from '@/lib/types'

type SectionItem = Section

function SortableRow({
  section,
  onToggle,
  onRemove,
}: {
  section: SectionItem
  onToggle: (id: string, visible: boolean) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 rounded-lg border border-pink-100 bg-card">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-brand touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize">
          {section.title || section.type}{' '}
          <span className="text-xs text-muted-foreground ml-1">({section.type})</span>
        </p>
        <p className="text-xs text-muted-foreground">Position {section.position}</p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={section.visible} onCheckedChange={(v) => onToggle(section.id, v)} />
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRemove(section.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function SortableCustomRow({
  section,
  onToggle,
  onEdit,
  onRemove,
}: {
  section: CustomSection
  onToggle: (id: string, visible: boolean) => void
  onEdit: (s: CustomSection) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 rounded-lg border border-pink-100 bg-card">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-brand touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{section.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {section.html.substring(0, 80).replace(/<[^>]+>/g, '') || 'Empty section'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={section.visible} onCheckedChange={(v) => onToggle(section.id, v)} />
        <Button size="sm" variant="outline" onClick={() => onEdit(section)}>
          Edit
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRemove(section.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function AdminPanel() {
  const { goHome } = useUI()
  const { user, isAdmin } = useAuth()

  // Guard — only admin can render
  if (!user || !isAdmin()) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground mt-2">
          The admin panel is restricted to <span className="font-mono text-brand">{ADMIN_EMAIL}</span>.
        </p>
        <Button className="mt-4 bg-brand text-white hover:bg-brand/90" onClick={goHome}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to store
        </Button>
      </div>
    )
  }

  return <AdminPanelInner />
}

function AdminPanelInner() {
  const { goHome } = useUI()

  const [tab, setTab] = useState('sections')

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="bg-card border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goHome} aria-label="Back to store">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base sm:text-lg font-semibold">Admin Panel</h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-brand-soft text-brand-deep text-[10px] font-semibold uppercase">
              Aurora
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={goHome}>
              <Eye className="h-3.5 w-3.5 mr-1" /> View store
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-card border border-pink-100 h-auto flex-wrap">
            <TabsTrigger value="sections" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Sections
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5">
              <Package className="h-3.5 w-3.5" /> Products
            </TabsTrigger>
            <TabsTrigger value="hero" className="gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Hero & Banner
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> Custom Code
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="mt-6">
            <AdminSections />
          </TabsContent>
          <TabsContent value="products" className="mt-6">
            <AdminProducts />
          </TabsContent>
          <TabsContent value="hero" className="mt-6">
            <AdminHero />
          </TabsContent>
          <TabsContent value="custom" className="mt-6">
            <AdminCustomSections />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function AdminSections() {
  const [sections, setSections] = useState<SectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = () => {
    fetch('/api/sections?all=1')
      .then((r) => r.json())
      .then((d) => {
        setSections(d.sections || [])
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
     
  }, [])

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setSections((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      return arrayMove(items, oldIndex, newIndex).map((s, i) => ({ ...s, position: i }))
    })
  }

  const saveOrder = async () => {
    setSaving(true)
    await fetch('/api/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sections.map((s, i) => ({ id: s.id, position: i }))),
    })
    setSaving(false)
    toast.success('Section order saved')
  }

  const toggle = async (id: string, visible: boolean) => {
    setSections((s) => s.map((x) => (x.id === id ? { ...x, visible } : x)))
    await fetch(`/api/sections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    })
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this section from the storefront?')) return
    await fetch(`/api/sections/${id}`, { method: 'DELETE' })
    setSections((s) => s.filter((x) => x.id !== id))
    toast.success('Section removed')
  }

  const addSection = async (type: string, title: string) => {
    await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        title,
        config: JSON.stringify({ filter: type === 'products' ? 'all' : undefined }),
      }),
    })
    load()
    toast.success('Section added')
  }

  return (
    <Card className="border-pink-100">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Storefront sections</CardTitle>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a section</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {[
                  { type: 'hero', label: 'Hero Banner', desc: 'Large image with text overlay' },
                  { type: 'products', label: 'Product Grid', desc: 'Best sellers / trending / all' },
                  { type: 'text', label: 'Text Block', desc: 'Custom title + paragraph' },
                ].map((s) => (
                  <button
                    key={s.type}
                    className="w-full text-left p-3 rounded-lg border border-pink-100 hover:bg-brand-soft/40"
                    onClick={() => addSection(s.type, s.label)}
                  >
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" className="bg-brand text-white hover:bg-brand/90" disabled={saving} onClick={saveOrder}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save order
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Drag to reorder, toggle visibility, or remove. Changes appear on the storefront immediately after saving.
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading sections...</div>
        ) : sections.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-pink-200 rounded-lg text-sm text-muted-foreground">
            No sections yet. Add your first one.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map((s) => (
                  <SortableRow key={s.id} section={s} onToggle={toggle} onRemove={remove} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}

function AdminHero() {
  const [config, setConfig] = useState<HeroConfig>({
    imageUrl: '',
    title: '',
    subtitle: '',
    ctaText: '',
    badge: '',
  })
  const [announcement, setAnnouncement] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        const hero = d.settings?.hero
        if (hero) {
          try {
            setConfig(JSON.parse(hero))
          } catch {
            // ignore
          }
        }
        setAnnouncement(d.settings?.announcement || '')
        setLoading(false)
      })
  }, [])

  const set = (k: keyof HeroConfig, v: string) => setConfig((s) => ({ ...s, [k]: v }))

  const handleFile = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) {
      set('imageUrl', data.url)
      toast.success('Hero image uploaded')
    } else {
      toast.error('Upload failed')
    }
  }

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [
          { key: 'hero', value: JSON.stringify(config) },
          { key: 'announcement', value: announcement },
        ],
      }),
    })
    setSaving(false)
    toast.success('Hero & announcement saved')
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-4">
      <Card className="border-pink-100">
        <CardHeader>
          <CardTitle className="text-base">Hero banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview */}
          <div className="relative h-48 rounded-lg overflow-hidden bg-pink-50 border border-pink-100">
            {config.imageUrl ? (
               
              <img src={config.imageUrl} alt="Hero" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                No hero image yet
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent flex flex-col justify-center px-6">
              {config.badge && (
                <span className="inline-block w-fit px-2 py-0.5 mb-1 rounded-full bg-white/20 text-white text-[10px]">
                  {config.badge}
                </span>
              )}
              <p className="text-white font-bold text-xl">{config.title || 'Your headline'}</p>
              <p className="text-white/80 text-xs line-clamp-2">{config.subtitle}</p>
            </div>
          </div>

          {/* Upload */}
          <div>
            <Label className="text-xs">Hero image</Label>
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="Image URL or upload below"
                value={config.imageUrl}
                onChange={(e) => set('imageUrl', e.target.value)}
              />
              <label className="inline-flex items-center justify-center px-4 h-10 rounded-md bg-brand text-white text-sm font-medium cursor-pointer hover:bg-brand/90">
                <ImageIcon className="h-4 w-4 mr-1.5" /> Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Recommended: 1600×600px, JPG/PNG/WebP, max 5MB.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hero-badge" className="text-xs">Badge text</Label>
              <Input id="hero-badge" value={config.badge || ''} onChange={(e) => set('badge', e.target.value)} className="mt-1" placeholder="e.g. New Spring Collection" />
            </div>
            <div>
              <Label htmlFor="hero-cta" className="text-xs">Button text</Label>
              <Input id="hero-cta" value={config.ctaText || ''} onChange={(e) => set('ctaText', e.target.value)} className="mt-1" placeholder="e.g. Shop Best Sellers" />
            </div>
          </div>
          <div>
            <Label htmlFor="hero-title" className="text-xs">Headline</Label>
            <Input id="hero-title" value={config.title || ''} onChange={(e) => set('title', e.target.value)} className="mt-1" placeholder="e.g. Gifts that glow" />
          </div>
          <div>
            <Label htmlFor="hero-sub" className="text-xs">Subtitle</Label>
            <Textarea id="hero-sub" value={config.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} rows={2} className="mt-1" placeholder="Short description..." />
          </div>
        </CardContent>
      </Card>

      <Card className="border-pink-100">
        <CardHeader>
          <CardTitle className="text-base">Announcement bar</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="ann" className="text-xs">Announcement text (top strip)</Label>
          <Input id="ann" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="mt-1" placeholder="e.g. Free shipping above ₹1499" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-brand text-white hover:bg-brand/90" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}

function AdminCustomSections() {
  const [sections, setSections] = useState<CustomSection[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CustomSection | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // New section draft
  const emptyDraft: CustomSection = {
    id: '',
    title: '',
    html: '',
    css: '',
    js: '',
    position: 0,
    visible: true,
    createdAt: '',
    updatedAt: '',
  }
  const [draft, setDraft] = useState<CustomSection>(emptyDraft)

  const load = () => {
    fetch('/api/custom-sections')
      .then((r) => r.json())
      .then((d) => {
        setSections(d.sections || [])
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
     
  }, [])

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setSections((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      return arrayMove(items, oldIndex, newIndex).map((s, i) => ({ ...s, position: i }))
    })
  }

  const saveOrder = async () => {
    setSaving(true)
    await fetch('/api/custom-sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sections.map((s, i) => ({ id: s.id, position: i }))),
    })
    setSaving(false)
    toast.success('Order saved')
  }

  const toggle = async (id: string, visible: boolean) => {
    setSections((s) => s.map((x) => (x.id === id ? { ...x, visible } : x)))
    await fetch(`/api/custom-sections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    })
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this custom section?')) return
    await fetch(`/api/custom-sections/${id}`, { method: 'DELETE' })
    setSections((s) => s.filter((x) => x.id !== id))
    toast.success('Deleted')
  }

  const openEditor = (section: CustomSection | null) => {
    setEditing(section)
    setDraft(section ? { ...section } : { ...emptyDraft, position: sections.length })
    setOpen(true)
  }

  const saveDraft = async () => {
    if (!draft.title || !draft.html) {
      toast.error('Title and HTML are required')
      return
    }
    setSaving(true)
    const url = editing ? `/api/custom-sections/${editing.id}` : '/api/custom-sections'
    const method = editing ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draft.title, html: draft.html, css: draft.css, js: draft.js }),
    })
    setSaving(false)
    setOpen(false)
    toast.success(editing ? 'Section updated' : 'Section created')
    load()
  }

  return (
    <Card className="border-pink-100">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Custom code sections</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Add HTML/CSS/JS in a single editor. Sections render on your storefront inside an isolated sandbox.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={saveOrder} disabled={saving || sections.length === 0}>
            Save order
          </Button>
          <Button size="sm" className="bg-brand text-white hover:bg-brand/90" onClick={() => openEditor(null)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New section
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-pink-200 rounded-lg">
            <Code2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No custom sections yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create one to embed widgets, banners, video embeds, calendars and more.
            </p>
            <Button className="mt-3 bg-brand text-white hover:bg-brand/90" size="sm" onClick={() => openEditor(null)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create first section
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map((s) => (
                  <SortableCustomRow
                    key={s.id}
                    section={s}
                    onToggle={toggle}
                    onEdit={(sec) => openEditor(sec)}
                    onRemove={remove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit custom section' : 'New custom section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title (shown above the section on storefront)</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Spring Festive Banner"
                className="mt-1"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">HTML</Label>
                <Textarea
                  value={draft.html}
                  onChange={(e) => setDraft((d) => ({ ...d, html: e.target.value }))}
                  rows={10}
                  className="mt-1 font-mono text-xs"
                  placeholder={'<div class="banner">\n  <h2>Big Festive Sale</h2>\n  <p>Up to 40% off</p>\n</div>'}
                />
              </div>
              <div>
                <Label className="text-xs">CSS (scoped)</Label>
                <Textarea
                  value={draft.css || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, css: e.target.value }))}
                  rows={10}
                  className="mt-1 font-mono text-xs"
                  placeholder={'.banner {\n  background: #f9758d;\n  color: white;\n  padding: 24px;\n  border-radius: 12px;\n  text-align: center;\n}'}
                />
              </div>
              <div>
                <Label className="text-xs">JS (optional)</Label>
                <Textarea
                  value={draft.js || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, js: e.target.value }))}
                  rows={10}
                  className="mt-1 font-mono text-xs"
                  placeholder={'root.querySelector("h2").addEventListener("click", () => {\n  alert("Sale clicked!");\n});'}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Live preview</Label>
              <CustomSectionPreview section={draft} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-brand text-white hover:bg-brand/90" disabled={saving} onClick={saveDraft}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editing ? 'Save changes' : 'Create section'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function AdminSettings() {
  const [shippingFee, setShippingFee] = useState('99')
  const [freeThreshold, setFreeThreshold] = useState('1499')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setShippingFee(d.settings?.shippingFee || '99')
        setFreeThreshold(d.settings?.freeShippingThreshold || '1499')
        setLoading(false)
      })
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [
          { key: 'shippingFee', value: shippingFee },
          { key: 'freeShippingThreshold', value: freeThreshold },
        ],
      }),
    })
    setSaving(false)
    toast.success('Settings saved')
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  return (
    <Card className="border-pink-100">
      <CardHeader>
        <CardTitle className="text-base">Store settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="ship-fee" className="text-xs">Shipping fee (₹)</Label>
          <Input id="ship-fee" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="free-ship" className="text-xs">Free shipping threshold (₹)</Label>
          <Input id="free-ship" value={freeThreshold} onChange={(e) => setFreeThreshold(e.target.value)} className="mt-1" />
          <p className="text-[11px] text-muted-foreground mt-1">Orders above this amount ship free.</p>
        </div>
        <Button className="bg-brand text-white hover:bg-brand/90" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save settings
        </Button>
      </CardContent>
    </Card>
  )
}
