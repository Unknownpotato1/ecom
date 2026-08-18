'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Loader2, X, Search, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product, Collection } from '@/lib/types'

interface CollectionDraft {
  id?: string
  name: string
  productIds: string[]
  featuredProductIds: string[]
  visible: boolean
}

export function AdminCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Collection | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<CollectionDraft>({
    name: '',
    productIds: [],
    featuredProductIds: [],
    visible: true,
  })
  const [productSearch, setProductSearch] = useState('')

  const load = () => {
    Promise.all([
      fetch('/api/collections?all=1').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([collData, prodData]) => {
        setCollections(collData.collections || [])
        setAllProducts(prodData.products || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditing(null)
    setDraft({ name: '', productIds: [], featuredProductIds: [], visible: true })
    setOpen(true)
  }

  const openEdit = (c: Collection) => {
    setEditing(c)
    setDraft({
      id: c.id,
      name: c.name,
      productIds: c.productIds || [],
      featuredProductIds: c.featuredProductIds || [],
      visible: c.visible,
    })
    setOpen(true)
  }

  const toggleProduct = (productId: string) => {
    setDraft((d) => {
      const has = d.productIds.includes(productId)
      const productIds = has
        ? d.productIds.filter((id) => id !== productId)
        : [...d.productIds, productId]
      // Remove from featured if removed from collection
      const featuredProductIds = has
        ? d.featuredProductIds.filter((id) => id !== productId)
        : d.featuredProductIds
      return { ...d, productIds, featuredProductIds }
    })
  }

  const toggleFeatured = (productId: string) => {
    setDraft((d) => {
      const isInCollection = d.productIds.includes(productId)
      if (!isInCollection) return d
      const has = d.featuredProductIds.includes(productId)
      const featuredProductIds = has
        ? d.featuredProductIds.filter((id) => id !== productId)
        : [...d.featuredProductIds, productId].slice(0, 5)
      return { ...d, featuredProductIds }
    })
  }

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error('Collection name is required')
      return
    }
    setSaving(true)
    const url = editing ? `/api/collections/${editing.id}` : '/api/collections'
    const method = editing ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name,
        productIds: draft.productIds,
        featuredProductIds: draft.featuredProductIds,
        visible: draft.visible,
      }),
    })
    setSaving(false)
    setOpen(false)
    toast.success(editing ? 'Collection updated' : 'Collection created')
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this collection?')) return
    await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    setCollections((c) => c.filter((x) => x.id !== id))
    toast.success('Collection deleted')
  }

  const toggleVisible = async (id: string, visible: boolean) => {
    setCollections((c) => c.map((x) => (x.id === id ? { ...x, visible } : x)))
    await fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    })
  }

  const moveCollection = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= collections.length) return
    const reordered = [...collections]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)
    // Update positions locally
    const withPositions = reordered.map((c, i) => ({ ...c, position: i }))
    setCollections(withPositions)
    // Save positions to server
    await Promise.all(
      withPositions.map((c) =>
        fetch(`/api/collections/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: c.position }),
        })
      )
    )
    toast.success('Collection order updated')
  }

  const filteredProducts = allProducts.filter((p) =>
    p.title.toLowerCase().includes(productSearch.toLowerCase())
  )

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading collections...</div>
  }

  return (
    <Card className="border-pink-100">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Collections {collections.length > 0 && <span className="text-muted-foreground font-normal">({collections.length})</span>}
        </CardTitle>
        <Button size="sm" className="bg-brand text-white hover:shadow-lg" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Collection
        </Button>
      </CardHeader>
      <CardContent>
        {collections.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-pink-200 rounded-lg">
            <p className="text-sm font-medium">No collections yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a collection to group products on your homepage.</p>
            <Button size="sm" className="mt-3 bg-brand text-white hover:shadow-lg" onClick={openNew}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create collection
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {collections.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-2 p-3 rounded-lg border border-pink-100 bg-card">
                {/* Up/Down buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    disabled={idx === 0}
                    onClick={() => moveCollection(idx, 'up')}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    disabled={idx === collections.length - 1}
                    onClick={() => moveCollection(idx, 'down')}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.productIds.length} product{c.productIds.length === 1 ? '' : 's'}
                    {c.featuredProductIds.length > 0 && ` • ${c.featuredProductIds.length} featured`}
                  </p>
                </div>
                <Switch checked={c.visible} onCheckedChange={(v) => toggleVisible(c.id, v)} />
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Editor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit collection' : 'New collection'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label className="text-xs font-medium">Collection name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Festive Specials, Best for Birthdays"
                className="mt-1 h-11"
              />
            </div>

            {/* Product search */}
            <div>
              <Label className="text-xs font-medium">Products ({draft.productIds.length} selected)</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                Check products to add them to this collection. Then mark up to 5 as "Featured" — these show on the homepage carousel.
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-8 h-10"
                />
              </div>

              {/* Product list */}
              <div className="max-h-64 overflow-y-auto fancy-scroll border border-pink-100 rounded-lg">
                {filteredProducts.map((p) => {
                  const isSelected = draft.productIds.includes(p.id)
                  const isFeatured = draft.featuredProductIds.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center gap-3 p-2 border-b border-pink-50 last:border-0',
                        isSelected ? 'bg-brand-soft/30' : ''
                      )}
                    >
                      <div className="h-10 w-10 rounded-md overflow-hidden bg-pink-50 shrink-0">
                        {p.images[0] && <img src={p.images[0].url} alt={p.title} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground">₹{p.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleProduct(p.id)}
                        className={cn(
                          'px-2 py-1 text-[10px] font-semibold rounded transition-colors',
                          isSelected ? 'bg-brand text-white' : 'bg-pink-100 text-muted-foreground hover:bg-brand-soft'
                        )}
                      >
                        {isSelected ? 'In collection' : 'Add'}
                      </button>
                      {isSelected && (
                        <button
                          type="button"
                          onClick={() => toggleFeatured(p.id)}
                          className={cn(
                            'px-2 py-1 text-[10px] font-semibold rounded transition-colors',
                            isFeatured ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          )}
                          title="Mark as featured (shows on homepage carousel)"
                        >
                          {isFeatured ? '★ Featured' : 'Feature'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Visible toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={draft.visible} onCheckedChange={(v) => setDraft((d) => ({ ...d, visible: v }))} />
              <span className="text-sm">Visible on homepage</span>
            </label>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-brand text-white hover:shadow-lg" disabled={saving} onClick={save}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editing ? 'Save changes' : 'Create collection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
