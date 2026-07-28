'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  ImageIcon,
  Star,
  Search,
} from 'lucide-react'
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
import { formatPrice, parseJson, type Product } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DraftImage {
  url: string
  alt?: string
}

interface Draft {
  id?: string
  title: string
  description: string
  longDescription: string
  price: string
  comparedPrice: string
  stock: string
  category: string
  isTrending: boolean
  isBestSeller: boolean
  specifications: string // raw spec text - one per line "Key: Value"
  tags: string // comma separated
  images: DraftImage[]
}

const EMPTY: Draft = {
  title: '',
  description: '',
  longDescription: '',
  price: '',
  comparedPrice: '',
  stock: '25',
  category: '',
  isTrending: false,
  isBestSeller: false,
  specifications: '',
  tags: '',
  images: [],
}

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState('')

  const load = () => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || [])
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
     
  }, [])

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditing(null)
    setDraft(EMPTY)
    setOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    const specs = parseJson<Array<{ key: string; value: string }>>(p.specifications, [])
    const tags = parseJson<string[]>(p.tags, [])
    setDraft({
      id: p.id,
      title: p.title,
      description: p.description || '',
      longDescription: p.longDescription || '',
      price: String(p.price),
      comparedPrice: p.comparedPrice ? String(p.comparedPrice) : '',
      stock: String(p.stock),
      category: p.category || '',
      isTrending: p.isTrending,
      isBestSeller: p.isBestSeller,
      specifications: specs.map((s) => `${s.key}: ${s.value}`).join('\n'),
      tags: tags.join(', '),
      images: p.images.map((img) => ({ url: img.url, alt: img.alt || undefined })),
    })
    setOpen(true)
  }

  const uploadImage = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) {
      setDraft((d) => ({ ...d, images: [...d.images, { url: data.url }] }))
      toast.success('Image added')
    } else {
      toast.error('Upload failed')
    }
  }

  const addImageUrl = () => {
    if (!imageUrlInput.trim()) return
    setDraft((d) => ({ ...d, images: [...d.images, { url: imageUrlInput.trim() }] }))
    setImageUrlInput('')
  }

  const removeImage = (idx: number) => {
    setDraft((d) => ({ ...d, images: d.images.filter((_, i) => i !== idx) }))
  }

  const moveImage = (idx: number, dir: -1 | 1) => {
    setDraft((d) => {
      const next = [...d.images]
      const target = idx + dir
      if (target < 0 || target >= next.length) return d
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...d, images: next }
    })
  }

  const save = async () => {
    if (!draft.title || !draft.price) {
      toast.error('Title and price are required')
      return
    }
    setSaving(true)
    const specs = draft.specifications
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const idx = l.indexOf(':')
        if (idx === -1) return { key: l, value: '' }
        return { key: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() }
      })
    const tags = draft.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const body = {
      title: draft.title,
      description: draft.description || '',
      longDescription: draft.longDescription || null,
      price: Number(draft.price),
      comparedPrice: draft.comparedPrice ? Number(draft.comparedPrice) : null,
      stock: Number(draft.stock || 0),
      category: draft.category || null,
      isTrending: draft.isTrending,
      isBestSeller: draft.isBestSeller,
      specifications: JSON.stringify(specs),
      tags: JSON.stringify(tags),
      images: draft.images,
    }

    try {
      const url = editing ? `/api/products/${editing.id}` : '/api/products'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editing ? 'Product updated' : 'Product created')
        setOpen(false)
        load()
      } else {
        toast.error('Failed to save')
      }
    } catch (e) {
      console.error(e)
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    await fetch(`/api/products/${p.id}`, { method: 'DELETE' })
    setProducts((list) => list.filter((x) => x.id !== p.id))
    toast.success('Product deleted')
  }

  return (
    <Card className="border-pink-100">
      <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <CardTitle className="text-base">
          Products <span className="text-muted-foreground font-normal text-sm">({products.length})</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-brand text-white hover:shadow-lg" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add product
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading products...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-pink-200 rounded-lg">
            <p className="text-sm font-medium">No products yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first hamper to start selling.</p>
            <Button size="sm" className="mt-3 bg-brand text-white hover:shadow-lg" onClick={openNew}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add product
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-pink-100 bg-card">
                <div className="h-14 w-14 rounded-md overflow-hidden bg-pink-50 shrink-0">
                  {p.images[0] ? (
                     
                    <img src={p.images[0].url} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{p.title}</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
                    <span className="font-semibold text-price">{formatPrice(p.price)}</span>
                    {p.comparedPrice && <span className="line-through text-compared-price">{formatPrice(p.comparedPrice)}</span>}
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.rating.toFixed(1)} ({p.reviewCount})
                    </span>
                    {p.category && <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{p.category}</span>}
                    {p.isTrending && <span className="px-1.5 py-0.5 rounded bg-brand text-white text-[10px] font-medium">Trending</span>}
                    {p.isBestSeller && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-medium">Best</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit product' : 'New product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Images */}
            <div>
              <Label className="text-xs">Product photos (multiple)</Label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {draft.images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-pink-100 group">
                    { }
                    <img src={img.url} alt={img.alt || `image ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-brand text-white text-[9px] font-bold">
                        COVER
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={() => moveImage(i, -1)}
                        className="h-6 w-6 rounded bg-white/90 text-foreground text-xs font-bold disabled:opacity-30"
                        disabled={i === 0}
                        aria-label="Move left"
                      >←</button>
                      <button
                        onClick={() => moveImage(i, 1)}
                        className="h-6 w-6 rounded bg-white/90 text-foreground text-xs font-bold disabled:opacity-30"
                        disabled={i === draft.images.length - 1}
                        aria-label="Move right"
                      >→</button>
                      <button
                        onClick={() => removeImage(i)}
                        className="h-6 w-6 rounded bg-destructive text-white inline-flex items-center justify-center"
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <label className="aspect-square rounded-md border-2 border-dashed border-pink-200 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-soft text-muted-foreground text-xs gap-1">
                  <ImageIcon className="h-5 w-5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      files.forEach(uploadImage)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Or paste image URL..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addImageUrl()
                    }
                  }}
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={addImageUrl}>Add URL</Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="p-title" className="text-xs">Title *</Label>
                <Input id="p-title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="mt-1" placeholder="e.g. Midnight Bliss Chocolate Hamper" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-long" className="text-xs">Description</Label>
                <Textarea id="p-long" value={draft.longDescription} onChange={(e) => setDraft((d) => ({ ...d, longDescription: e.target.value }))} rows={3} className="mt-1" placeholder="Shown on product detail page" />
              </div>
              <div>
                <Label htmlFor="p-price" className="text-xs">Price (₹) *</Label>
                <Input id="p-price" type="number" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="p-compare" className="text-xs">Compared at price (₹)</Label>
                <Input id="p-compare" type="number" value={draft.comparedPrice} onChange={(e) => setDraft((d) => ({ ...d, comparedPrice: e.target.value }))} className="mt-1" placeholder="Original price for discount" />
              </div>
              <div>
                <Label htmlFor="p-stock" className="text-xs">Stock</Label>
                <Input id="p-stock" type="number" value={draft.stock} onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="p-cat" className="text-xs">Category</Label>
                <Input id="p-cat" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} className="mt-1" placeholder="Chocolate, Festive, Birthday..." />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-specs" className="text-xs">Specifications (one per line, format: Key: Value)</Label>
                <Textarea
                  id="p-specs"
                  rows={4}
                  value={draft.specifications}
                  onChange={(e) => setDraft((d) => ({ ...d, specifications: e.target.value }))}
                  className="mt-1 font-mono text-xs"
                  placeholder={'Items: 6 chocolates, 1 candle\nWeight: 650 g\nShelf life: 6 months\nVeg: Yes'}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-tags" className="text-xs font-medium">Tags (shown on product image — comma separated)</Label>
                <Input id="p-tags" value={draft.tags} onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} className="mt-1" placeholder="e.g. New Arrival, Limited Edition, 20% OFF" />
                <p className="text-[11px] text-muted-foreground mt-1">Only these tags will appear on the product image. Enter any custom tags you want — they show as pink badges on the product photo.</p>
              </div>
              <div className="sm:col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={draft.isTrending} onCheckedChange={(v) => setDraft((d) => ({ ...d, isTrending: v }))} />
                  <span className="text-sm">Trending</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={draft.isBestSeller} onCheckedChange={(v) => setDraft((d) => ({ ...d, isBestSeller: v }))} />
                  <span className="text-sm">Best Seller</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-brand text-white hover:shadow-lg" disabled={saving} onClick={save}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editing ? 'Save changes' : 'Create product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
