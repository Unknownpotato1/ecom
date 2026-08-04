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
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  User,
  StickyNote,
  ShoppingCart,
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
import { HOME_SLOTS, PRODUCT_SLOTS } from '@/lib/types'

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
  mode,
}: {
  section: CustomSection
  onToggle: (id: string, visible: boolean) => void
  onEdit: (s: CustomSection) => void
  onRemove: (id: string) => void
  mode: 'home' | 'product'
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
        <div className="flex items-center gap-2">
          {/* Title removed — show a short code snippet as the label instead. */}
          <p className="text-sm font-medium truncate">
            {(section.code || section.html || '').replace(/<[^>]+>/g, '').trim().slice(0, 40) || 'Empty section'}
          </p>
          <span className={cn(
            'px-1.5 py-0.5 text-[9px] font-semibold rounded-full uppercase tracking-wide',
            (section.slot || section.location) === 'storefront'
              ? 'bg-brand-soft text-brand'
              : 'bg-brand text-white'
          )}>
            {((mode === 'home' ? HOME_SLOTS : PRODUCT_SLOTS).find((s) => s.value === (section.slot || section.location || (mode === 'home' ? 'storefront' : 'product-after-buttons')))?.label || section.slot || section.location || '—').replace(/^[^\s]+ /, '')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {(section.code || section.html || '').substring(0, 80).replace(/<[^>]+>/g, '') || 'Empty section'}
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
        <Button className="mt-4 bg-brand text-white hover:shadow-lg" onClick={goHome}>
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
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-brand-soft text-brand text-[10px] font-semibold uppercase">
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
            <TabsTrigger value="orders" className="gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" /> Orders
            </TabsTrigger>
            <TabsTrigger value="abandoned" className="gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> Abandoned
            </TabsTrigger>
            <TabsTrigger value="hero" className="gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Hero & Banner
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> Home Sections
            </TabsTrigger>
            <TabsTrigger value="product-sections" className="gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> Product Sections
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
          <TabsContent value="orders" className="mt-6">
            <AdminOrders />
          </TabsContent>
          <TabsContent value="abandoned" className="mt-6">
            <AdminAbandonedCheckouts />
          </TabsContent>
          <TabsContent value="hero" className="mt-6">
            <AdminHero />
          </TabsContent>
          <TabsContent value="custom" className="mt-6">
            <AdminCustomSections mode="home" />
          </TabsContent>
          <TabsContent value="product-sections" className="mt-6">
            <AdminCustomSections mode="product" />
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
                    className="w-full text-left p-3 rounded-lg border border-pink-100 hover:bg-brand-soft"
                    onClick={() => addSection(s.type, s.label)}
                  >
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" className="bg-brand text-white hover:shadow-lg" disabled={saving} onClick={saveOrder}>
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
    toast.info('Uploading image...')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        set('imageUrl', data.url)
        toast.success('Image uploaded — click "Save changes" to apply')
      } else {
        toast.error('Upload failed: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      toast.error('Upload failed: ' + (e as Error).message)
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
          {/* Preview — clean image, no overlays, adaptive height */}
          <div className="rounded-lg overflow-hidden bg-pink-50 border border-pink-100">
            {config.imageUrl ? (
               
              <img src={config.imageUrl} alt="Hero" className="block w-full h-auto" style={{ display: 'block', width: '100%', height: 'auto' }} />
            ) : (
              <div className="flex items-center justify-center text-muted-foreground text-sm py-12">
                No hero image yet — upload below
              </div>
            )}
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
              <label className="inline-flex items-center justify-center px-4 h-10 rounded-md bg-brand text-white text-sm font-medium cursor-pointer hover:shadow-lg shrink-0">
                <ImageIcon className="h-4 w-4 mr-1.5" /> Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Upload any image — vertical or horizontal. It displays at its natural aspect ratio (no cropping). JPG/PNG/WebP, max 10MB.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-pink-100">
        <CardHeader>
          <CardTitle className="text-base">Announcement bar</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="ann" className="text-xs">Announcement text (top strip)</Label>
          <Input id="ann" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="mt-1" placeholder="e.g. Free shipping above ₹249" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-brand text-white hover:shadow-lg" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}

function AdminCustomSections({ mode }: { mode: 'home' | 'product' }) {
  const [sections, setSections] = useState<CustomSection[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CustomSection | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // New section draft — default slot depends on mode
  const emptyDraft: CustomSection = {
    id: '',
    title: '',
    code: '',
    html: '',
    css: '',
    js: '',
    position: 0,
    visible: true,
    slot: mode === 'home' ? 'home-above-products' : 'product-after-buttons',
    location: mode === 'home' ? 'home-above-products' : 'product-after-buttons',
    insertAfterProducts: 10,
    createdAt: '',
    updatedAt: '',
  }
  const [draft, setDraft] = useState<CustomSection>(emptyDraft)

  const load = () => {
    fetch('/api/custom-sections')
      .then((r) => r.json())
      .then((d) => {
        const all = d.sections || []
        // Filter by mode: home sections have home-* slots or legacy 'storefront',
        // product sections have product-* slots or legacy 'product-below-actions'
        const filtered = all.filter((s: CustomSection) => {
          const slot = s.slot || s.location || 'storefront'
          if (mode === 'home') {
            return slot.startsWith('home-') || slot === 'storefront'
          } else {
            return slot.startsWith('product-') || slot === 'product-below-actions'
          }
        })
        setSections(filtered)
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
     
  }, [mode])

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
    if (section) {
      // If section has legacy html/css/js but no code, combine them into code
      let code = section.code || ''
      if (!code && (section.html || section.css || section.js)) {
        code = section.html || ''
        if (section.css) code += `\n<style>\n${section.css}\n</style>`
        if (section.js) code += `\n<script>\n${section.js}\n</script>`
      }
      setDraft({
        ...section,
        code,
        slot: section.slot || section.location || 'storefront',
        insertAfterProducts: section.insertAfterProducts ?? 10,
      })
    } else {
      setDraft({ ...emptyDraft, position: sections.length })
    }
    setOpen(true)
  }

  const saveDraft = async () => {
    // Title is no longer required (or used) — custom sections render
    // their content only, no heading above. We pass an empty title
    // string to the API for backward compatibility with the schema.
    // Require code (or legacy html) so the section isn't empty.
    if (!draft.code && !draft.html) {
      toast.error('Code is required')
      return
    }
    setSaving(true)
    const url = editing ? `/api/custom-sections/${editing.id}` : '/api/custom-sections'
    const method = editing ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '', // no longer used — kept for schema compatibility
        code: draft.code || '',
        slot: draft.slot || draft.location || 'storefront',
        insertAfterProducts: (draft.slot === 'home-in-grid' || draft.slot === 'storefront')
          ? Number(draft.insertAfterProducts) || 10
          : null,
      }),
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
          <Button size="sm" className="bg-brand text-white hover:shadow-lg" onClick={() => openEditor(null)}>
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
            <Button className="mt-3 bg-brand text-white hover:shadow-lg" size="sm" onClick={() => openEditor(null)}>
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
                    mode={mode}
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
            {/* Title field removed — custom sections no longer show a
                title. Existing sections that have a title stored in
                Firestore will simply not render it (see custom-section-renderer.tsx). */}

            {/* Slot selector — free placement anywhere on product page */}
            <div>
              <Label className="text-xs font-medium">Where should this section appear?</Label>
              <select
                value={draft.slot || draft.location || 'storefront'}
                onChange={(e) => setDraft((d) => ({ ...d, slot: e.target.value, location: e.target.value }))}
                className="mt-1 w-full h-10 rounded-md border border-pink-200 bg-white px-3 text-sm"
              >
                {(mode === 'home' ? HOME_SLOTS : PRODUCT_SLOTS).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Place this section between any two elements on the product page, or on the home page. Choose the exact position from the list above.
              </p>
            </div>

            {/* Insert-after-N-products input — only shown for 'home-in-grid' and 'storefront' slots.
                These slots inject the section INTO the Explore Hampers product grid after a
                custom number of products (e.g. 2, 4, 6, 8, 10...). */}
            {(draft.slot === 'home-in-grid' || draft.slot === 'storefront') && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-soft/50 border border-pink-100">
                <Label className="text-xs font-medium whitespace-nowrap">
                  Insert after
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={draft.insertAfterProducts ?? 10}
                  onChange={(e) => setDraft((d) => ({ ...d, insertAfterProducts: Number(e.target.value) }))}
                  className="w-20 h-9"
                  placeholder="10"
                />
                <span className="text-xs text-muted-foreground">
                  products — this section will appear after the Nth product in the Explore Hampers grid.
                  Use 2, 4, 6, 8, 10, etc.
                </span>
              </div>
            )}

            {/* Single code box — HTML + CSS + JS all in one */}
            <div>
              <Label className="text-xs font-medium">Code (HTML + CSS + JS in one box)</Label>
              <Textarea
                value={draft.code || ''}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                rows={16}
                className="mt-1 font-mono text-xs"
                placeholder={'<!-- Write your HTML here -->\n<div class="offer-banner">\n  <h2>🎉 Festive Sale!</h2>\n  <p>Flat 20% off — use code FESTIVE20</p>\n  <button onclick="alert(\'Copied!\')">Copy code</button>\n</div>\n\n<!-- Your CSS here -->\n<style>\n.offer-banner {\n  background: linear-gradient(135deg, #f9758d, #ffb4c0);\n  color: white;\n  padding: 20px;\n  border-radius: 12px;\n  text-align: center;\n}\n.offer-banner h2 { font-size: 24px; margin: 0 0 8px; }\n.offer-banner button {\n  background: white;\n  color: #f9758d;\n  border: 0;\n  padding: 8px 20px;\n  border-radius: 8px;\n  font-weight: 600;\n  cursor: pointer;\n  margin-top: 8px;\n}\n</style>\n\n<!-- Your JS here (optional) -->\n<script>\nconsole.log("Offer banner loaded");\n</script>'}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Write everything in this one box. Use <code>&lt;style&gt;</code> tags for CSS and <code>&lt;script&gt;</code> tags for JS — they'll be automatically extracted and scoped.<br/>
                <strong>Tip:</strong> Use <code>document.getElementById()</code> and <code>document.querySelector()</code> normally — they work inside the section's shadow DOM. For API calls, use the built-in proxy <code>/api/pincode?pin=560001</code> (avoids CORS issues).
              </p>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Live preview</Label>
              <CustomSectionPreview section={draft} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-brand text-white hover:shadow-lg" disabled={saving} onClick={saveDraft}>
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
  const [freeThreshold, setFreeThreshold] = useState('249')
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setShippingFee(d.settings?.shippingFee || '99')
        setFreeThreshold(d.settings?.freeShippingThreshold || '249')
        setLogoUrl(d.settings?.logoUrl || '')
        setLoading(false)
      })
  }, [])

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    toast.info('Uploading logo...')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setLogoUrl(data.url)
        // Save immediately so the header updates on next page load
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: [{ key: 'logoUrl', value: data.url }],
          }),
        })
        toast.success('Logo uploaded and saved')
      } else {
        toast.error('Logo upload failed: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      toast.error('Logo upload failed: ' + (e as Error).message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [
          { key: 'shippingFee', value: shippingFee },
          { key: 'freeShippingThreshold', value: freeThreshold },
          { key: 'logoUrl', value: logoUrl },
        ],
      }),
    })
    setSaving(false)
    toast.success('Settings saved')
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-4">
      {/* Logo upload */}
      <Card className="border-pink-100">
        <CardHeader>
          <CardTitle className="text-base">Store logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview — adaptive dimensions like hero, no forced circle */}
          <div className="rounded-lg overflow-hidden bg-pink-50 border border-pink-100 flex items-center justify-center p-4 min-h-[80px]">
            {logoUrl ? (
               
              <img src={logoUrl} alt="Store logo" className="block max-h-24 w-auto" style={{ display: 'block', maxHeight: '96px', width: 'auto' }} />
            ) : (
              <div className="flex items-center justify-center text-muted-foreground text-sm py-6">
                No logo uploaded — header shows default "A" badge
              </div>
            )}
          </div>

          {/* Upload */}
          <div>
            <Label className="text-xs">Logo image</Label>
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="Image URL or upload below"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <label className="inline-flex items-center justify-center px-4 h-10 rounded-md bg-brand text-white text-sm font-medium cursor-pointer hover:shadow-lg shrink-0">
                {uploadingLogo ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
                {uploadingLogo ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleLogoUpload(f)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Upload any logo — square, horizontal, or vertical. It displays at its natural aspect ratio in the header center (not forced into a circle). JPG/PNG/WebP/SVG, max 10MB.</p>
          </div>

          {/* Clear logo */}
          {logoUrl && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={async () => {
                setLogoUrl('')
                await fetch('/api/settings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ updates: [{ key: 'logoUrl', value: '' }] }),
                })
                toast.success('Logo removed — header will show default badge')
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove logo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Shipping settings */}
      <Card className="border-pink-100">
        <CardHeader>
          <CardTitle className="text-base">Shipping settings</CardTitle>
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
          <Button className="bg-brand text-white hover:shadow-lg" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AdminOrders() {
  const [orders, setOrders] = useState<Array<{
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    customerPhone: string
    shippingAddress: string
    subtotal: number
    shipping: number
    total: number
    paymentMethod: string
    paymentStatus: string
    orderStatus: string
    notes?: string | null
    createdAt: string
    items: Array<{
      id: string
      title: string
      price: number
      quantity: number
      image?: string | null
    }>
  }>>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const formatPrice = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const parseAddress = (addrStr: string) => {
    try {
      return JSON.parse(addrStr)
    } catch {
      return {} as Record<string, string>
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading orders...</div>
  }

  if (orders.length === 0) {
    return (
      <Card className="border-pink-100">
        <CardContent className="py-12 text-center">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No orders yet</p>
          <p className="text-xs text-muted-foreground mt-1">Orders will appear here when customers place them.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const addr = parseAddress(order.shippingAddress)
        const isExpanded = expandedId === order.id
        const isPrepaid = order.paymentMethod === 'prepaid'
        const isPartialPaid = order.paymentStatus === 'partial_paid'
        const paidAmount = isPrepaid ? order.total : (isPartialPaid ? 49 : 0)
        const remainingAmount = isPrepaid ? 0 : Math.max(0, order.total - 49)

        return (
          <div key={order.id} className="rounded-xl border border-pink-100 overflow-hidden">
            {/* Order header — click to expand */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-brand-soft/30 transition-colors text-left"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{order.orderNumber}</span>
                <span className="text-xs text-muted-foreground">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-semibold text-price">{formatPrice(order.total)}</div>
                  <div className="text-xs text-muted-foreground">{order.paymentMethod.toUpperCase()}</div>
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                  order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                  order.paymentStatus === 'partial_paid' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {order.paymentStatus.replace('_', ' ')}
                </span>
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t border-pink-100 p-4 space-y-4 bg-muted/20">
                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Placed on {formatDate(order.createdAt)}</span>
                </div>

                {/* Customer + Address */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3.5 w-3.5 text-brand shrink-0" />
                      <span>{order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-brand shrink-0" />
                      <span>{order.customerPhone}</span>
                    </div>
                    {order.customerEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="truncate">{order.customerEmail}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</h4>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        {addr.line1 && <div>{addr.line1}</div>}
                        {addr.line2 && <div className="text-muted-foreground">{addr.line2}</div>}
                        <div>{addr.city}{addr.city && addr.state ? ', ' : ''}{addr.state} {addr.pincode}</div>
                        {addr.addressType && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-brand-soft text-brand font-medium capitalize">
                            {addr.addressType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-3.5 w-3.5 text-brand shrink-0" />
                    <span className="font-medium capitalize">{order.paymentMethod}</span>
                    <span className={cn(
                      'ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold',
                      order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      order.paymentStatus === 'partial_paid' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {order.paymentStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="rounded-lg bg-emerald-50 p-3 text-center">
                      <div className="text-xs text-muted-foreground">Paid</div>
                      <div className="text-base font-bold text-emerald-600">{formatPrice(paidAmount)}</div>
                    </div>
                    {remainingAmount > 0 ? (
                      <div className="rounded-lg bg-amber-50 p-3 text-center">
                        <div className="text-xs text-muted-foreground">Pending (COD)</div>
                        <div className="text-base font-bold text-amber-600">{formatPrice(remainingAmount)}</div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-muted p-3 text-center">
                        <div className="text-xs text-muted-foreground">Pending</div>
                        <div className="text-base font-bold text-muted-foreground">₹0</div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Subtotal: {formatPrice(order.subtotal)}</span>
                    <span>Shipping: {order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}</span>
                    <span>Total: {formatPrice(order.total)}</span>
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Products ({order.items.length})</h4>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-pink-100 p-2">
                      <div className="h-12 w-12 rounded-md overflow-hidden bg-pink-50 shrink-0">
                        {item.image && <img src={item.image} alt={item.title} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      <div className="text-sm font-semibold text-price shrink-0">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivery Notes</h4>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <StickyNote className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                      <span>{order.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Abandoned Checkouts ──────────────────────────────────────────────
// Shows customers who filled in their contact + shipping details on the
// checkout page but didn't complete the order. This helps the admin see
// how many customers changed their mind after seeing the ₹49 COD partial
// payment option.
function AdminAbandonedCheckouts() {
  const [checkouts, setCheckouts] = useState<Array<{
    id: string
    customerName: string
    customerPhone: string
    customerEmail: string
    shippingAddress: Record<string, string>
    items: Array<{ title: string; price: number; quantity: number; image?: string | null }>
    subtotal: number
    total: number
    paymentMethodViewed: string
    convertedToOrder: boolean
    createdAt: string
    updatedAt: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    fetch('/api/abandoned-checkouts', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setCheckouts(d.checkouts || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const formatPrice = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return iso }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await fetch(`/api/abandoned-checkouts?id=${id}`, { method: 'DELETE' })
      setCheckouts((c) => c.filter((x) => x.id !== id))
      toast.success('Abandoned checkout deleted')
    } catch {
      toast.error('Failed to delete')
    }
    setDeleting(false)
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading abandoned checkouts...</div>
  }

  if (checkouts.length === 0) {
    return (
      <Card className="border-pink-100">
        <CardContent className="py-12 text-center">
          <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No abandoned checkouts yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            When customers fill in their details but don't complete checkout, they'll appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200 mb-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">
            {checkouts.length} abandoned checkout{checkouts.length === 1 ? '' : 's'}
          </span>
        </div>
        <span className="text-xs text-amber-600">
          Total value: {formatPrice(checkouts.reduce((sum, c) => sum + c.total, 0))}
        </span>
      </div>

      {checkouts.map((checkout) => {
        const addr = checkout.shippingAddress || {}
        const isExpanded = expandedId === checkout.id
        const paymentLabel = checkout.paymentMethodViewed
          ? checkout.paymentMethodViewed === 'cod' ? 'Viewed COD (₹49)' : 'Viewed Prepaid'
          : 'Not viewed'

        return (
          <div key={checkout.id} className="rounded-xl border border-pink-100 overflow-hidden">
            {/* Row header — click to expand */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : checkout.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-brand-soft/30 transition-colors text-left"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{checkout.customerName}</span>
                <span className="text-xs text-muted-foreground">{checkout.customerPhone}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-semibold text-price">{formatPrice(checkout.total)}</div>
                  <div className="text-xs text-muted-foreground">
                    {checkout.items.length} item{checkout.items.length === 1 ? '' : 's'}
                  </div>
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap',
                  checkout.paymentMethodViewed === 'cod'
                    ? 'bg-amber-100 text-amber-700'
                    : checkout.paymentMethodViewed === 'prepaid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                )}>
                  {paymentLabel}
                </span>
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t border-pink-100 p-4 space-y-4 bg-muted/20">
                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Last updated {formatDate(checkout.updatedAt)}</span>
                </div>

                {/* Customer + Address */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3.5 w-3.5 text-brand shrink-0" />
                      <span>{checkout.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-brand shrink-0" />
                      <span>{checkout.customerPhone}</span>
                    </div>
                    {checkout.customerEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="truncate">{checkout.customerEmail}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shipping Address</h4>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        {addr.line1 && <div>{addr.line1}</div>}
                        {addr.line2 && <div className="text-muted-foreground">{addr.line2}</div>}
                        <div>{addr.city}{addr.city && addr.state ? ', ' : ''}{addr.state} {addr.pincode}</div>
                        {addr.addressType && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-brand-soft text-brand font-medium capitalize">
                            {addr.addressType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment method viewed */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-3.5 w-3.5 text-brand shrink-0" />
                    <span className="font-medium">{paymentLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      (Total: {formatPrice(checkout.total)})
                    </span>
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Products ({checkout.items.length})
                  </h4>
                  {checkout.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-pink-100 p-2">
                      <div className="h-12 w-12 rounded-md overflow-hidden bg-pink-50 shrink-0">
                        {item.image && <img src={item.image} alt={item.title} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      <div className="text-sm font-semibold text-price shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delete button */}
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    disabled={deleting}
                    onClick={() => handleDelete(checkout.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
