// Firestore database layer for Eviola.
// Uses Firebase Admin SDK (already initialized in firebase-admin.ts).
// Collections: products, orders, reviews, sections, customSections, users, settings

import { getAdmin } from './firebase-admin'

// firebase-admin's app object doesn't expose firestore() directly — it's added
// when you import firebase-admin/firestore. On Vercel Turbopack, the ESM import
// breaks the module. We use a lazy require() inside the db() function so it
// only runs at call-time (server-side, not during bundling).

// Local TypeScript interfaces so we don't need to import types from the
// broken firebase-admin/firestore module.

interface FirestoreLike {
  collection(path: string): CollectionRefLike
  batch(): BatchLike
  settings(opts: Record<string, unknown>): void
}

interface CollectionRefLike {
  doc(id?: string): DocRefLike
  add(data: Record<string, unknown>): Promise<{ id: string }>
  where(field: string, op: string, value: unknown): CollectionRefLike
  orderBy(field: string, direction?: string): CollectionRefLike
  limit(n: number): CollectionRefLike
  get(): Promise<{ empty: boolean; docs: DocSnapLike[]; size: number }>
}

interface DocRefLike {
  get(): Promise<DocSnapLike>
  set(data: Record<string, unknown>): Promise<unknown>
  update(data: Record<string, unknown>): Promise<unknown>
  delete(): Promise<unknown>
}

interface DocSnapLike {
  id: string
  exists: boolean
  data(): Record<string, unknown> | undefined
  ref: { delete(): Promise<unknown> }
}

interface BatchLike {
  set(ref: DocRefLike, data: Record<string, unknown>): BatchLike
  update(ref: DocRefLike, data: Record<string, unknown>): BatchLike
  delete(ref: DocRefLike): BatchLike
  commit(): Promise<unknown>
}

let dbInstance: FirestoreLike | null = null
let dbInitError: string | null = null

function db(): FirestoreLike | null {
  if (dbInstance) return dbInstance
  if (dbInitError) return null

  const app = getAdmin()
  if (!app) {
    dbInitError = 'Admin app not available'
    return null
  }

  try {
    // firebase-admin/firestore exports getFirestore(app) which returns the
    // Firestore instance directly — this avoids relying on prototype patching
    // of the app object (which doesn't work reliably on Vercel Turbopack).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firestoreMod = require('firebase-admin/firestore') as {
      getFirestore?: (app: unknown) => FirestoreLike
      Firestore?: new (opts?: unknown) => FirestoreLike
    }

    if (firestoreMod.getFirestore && typeof firestoreMod.getFirestore === 'function') {
      dbInstance = firestoreMod.getFirestore(app)
      return dbInstance
    }

    // Fallback: try app.firestore() (works when firebase-admin/firestore is
    // imported at module-load time, which patches the app prototype)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('firebase-admin/firestore')
    const firestoreFn = (app as unknown as { firestore?: () => FirestoreLike }).firestore
    if (firestoreFn) {
      dbInstance = firestoreFn.call(app)
      return dbInstance
    }

    dbInitError = `Neither getFirestore nor app.firestore() available. Module keys: ${Object.keys(firestoreMod).join(',')}`
    console.error(dbInitError)
    return null
  } catch (e) {
    dbInitError = `Failed to init Firestore: ${(e as Error).message}`
    console.error(dbInitError)
    return null
  }
}

export function isDbAvailable(): boolean {
  return db() !== null
}

export function getDbInitError(): string | null {
  db()
  return dbInitError
}

// --- Types (match what the frontend expects) ---

export interface ProductDoc {
  id: string
  title: string
  slug: string
  description: string
  longDescription?: string | null
  price: number
  comparedPrice?: number | null
  rating: number
  reviewCount: number
  stock: number
  category?: string | null
  isTrending: boolean
  isBestSeller: boolean
  specifications?: string | null // JSON string
  tags?: string | null // JSON string
  /**
   * Admin-controlled sort order (lower = earlier on home page).
   * 0 / unset = fall back to createdAt DESC.
   */
  sortOrder?: number
  createdAt: string
  updatedAt: string
  images: Array<{
    id: string
    url: string
    alt?: string | null
    position: number
  }>
  reviews?: ReviewDoc[]
}

export interface ReviewDoc {
  id: string
  productId: string
  userId?: string | null
  userName: string
  rating: number
  title?: string | null
  comment?: string | null
  createdAt: string
}

export interface OrderDoc {
  id: string
  orderNumber: string
  userId?: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: string // JSON string
  subtotal: number
  shipping: number
  total: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  items: Array<{
    id: string
    productId?: string | null
    title: string
    price: number
    quantity: number
    image?: string | null
  }>
}

export interface SectionDoc {
  id: string
  type: string
  title?: string | null
  position: number
  visible: boolean
  config?: string | null
}

export interface CustomSectionDoc {
  id: string
  title: string
  code?: string
  html?: string
  css?: string | null
  js?: string | null
  position: number
  visible: boolean
  slot?: string
  location?: string
  /** After how many products to insert (for 'home-in-grid' slot) */
  insertAfterProducts?: number
  createdAt: string
  updatedAt: string
}

export interface UserDoc {
  id: string
  email: string
  name?: string | null
  image?: string | null
  role: string
  createdAt: string
  updatedAt: string
}

export interface SettingDoc {
  key: string
  value: string
}

// --- Helpers ---

function snapshotToProduct(snap: DocSnapLike): ProductDoc | null {
  if (!snap.exists) return null
  const data = snap.data()!
  return {
    id: snap.id,
    title: data.title || '',
    slug: data.slug || '',
    description: data.description || '',
    longDescription: data.longDescription || null,
    price: data.price || 0,
    comparedPrice: data.comparedPrice ?? null,
    rating: data.rating || 0,
    reviewCount: data.reviewCount || 0,
    stock: data.stock || 0,
    category: data.category || null,
    isTrending: !!data.isTrending,
    isBestSeller: !!data.isBestSeller,
    specifications: data.specifications || null,
    tags: data.tags || null,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt || new Date().toISOString(),
    images: (data.images || []).map((img: Record<string, unknown>, i: number) => ({
      id: img.id || `img-${i}`,
      url: img.url || '',
      alt: img.alt || null,
      position: img.position ?? i,
    })),
  }
}

// --- Products ---

export async function listProducts(opts: {
  search?: string
  category?: string
  trending?: boolean
  best?: boolean
} = {}): Promise<ProductDoc[]> {
  const database = db()
  if (!database) return []
  // NOTE: Do NOT combine .where() with .orderBy() — Firestore requires a
  // composite index for that, which would need manual creation in the console.
  // Instead, fetch with where() only (single-field indexes are auto-created)
  // and sort in memory.
  let q: CollectionRefLike = database.collection('products')
  if (opts.category) q = q.where('category', '==', opts.category)
  if (opts.trending) q = q.where('isTrending', '==', true)
  if (opts.best) q = q.where('isBestSeller', '==', true)
  const snap = await q.get()
  let products = snap.docs.map(snapshotToProduct).filter(Boolean) as ProductDoc[]
  // Sort in memory by sortOrder ASC (lower = earlier on home page),
  // then by createdAt DESC (newest first) as a tiebreaker.
  // Products with sortOrder 0 / unset naturally fall to the bottom of
  // the explicitly-ordered group but are still ordered by recency.
  products.sort((a, b) => {
    const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0
    const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0
    if (sa !== sb) return sa - sb
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return tb - ta
  })
  if (opts.search) {
    const s = opts.search.toLowerCase()
    products = products.filter(
      (p) => p.title.toLowerCase().includes(s) || p.description.toLowerCase().includes(s)
    )
  }
  return products
}

export async function getProduct(id: string): Promise<ProductDoc | null> {
  const database = db()
  if (!database) return null
  const snap = await database.collection('products').doc(id).get()
  const product = snapshotToProduct(snap)
  if (!product) return null
  // Attach reviews — where() only (no orderBy) to avoid composite index requirement
  const reviewsSnap = await database
    .collection('reviews')
    .where('productId', '==', id)
    .get()
  const reviews: ReviewDoc[] = reviewsSnap.docs.map((d) => {
    const data = d.data()!
    return {
      id: d.id,
      productId: data.productId,
      userId: data.userId || null,
      userName: data.userName || '',
      rating: data.rating || 5,
      title: data.title || null,
      comment: data.comment || null,
      createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
    } as ReviewDoc
  })
  // Sort in memory by createdAt descending
  reviews.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return tb - ta
  })
  product.reviews = reviews
  return product
}

export async function createProduct(input: {
  title: string
  description: string
  longDescription?: string | null
  price: number
  comparedPrice?: number | null
  stock: number
  category?: string | null
  isTrending: boolean
  isBestSeller: boolean
  specifications?: string | null
  tags?: string | null
  sortOrder?: number
  images: Array<{ url: string; alt?: string }>
}): Promise<ProductDoc> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const now = new Date()
  const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // Ensure unique slug
  let finalSlug = slug
  let counter = 1
  while (true) {
    const existing = await database.collection('products').where('slug', '==', finalSlug).limit(1).get()
    if (existing.empty) break
    finalSlug = `${slug}-${counter++}`
  }
  const docData = {
    title: input.title,
    slug: finalSlug,
    description: input.description,
    longDescription: input.longDescription ?? null,
    price: Number(input.price),
    comparedPrice: input.comparedPrice ? Number(input.comparedPrice) : null,
    rating: 0,
    reviewCount: 0,
    stock: Number(input.stock),
    category: input.category ?? null,
    isTrending: !!input.isTrending,
    isBestSeller: !!input.isBestSeller,
    specifications: input.specifications ?? null,
    tags: input.tags ?? null,
    sortOrder: typeof input.sortOrder === 'number' ? input.sortOrder : 0,
    createdAt: now,
    updatedAt: now,
    images: input.images.map((img, i) => ({
      id: `img-${i}-${Date.now()}`,
      url: img.url,
      alt: img.alt ?? null,
      position: i,
    })),
  }
  const ref = await database.collection('products').add(docData)
  const snap = await ref.get()
  return snapshotToProduct(snap)!
}

export async function updateProduct(id: string, updates: Record<string, unknown>): Promise<ProductDoc | null> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date(),
  }
  // Normalize numeric fields
  if (updateData.price !== undefined) updateData.price = Number(updateData.price)
  if (updateData.comparedPrice !== undefined) updateData.comparedPrice = updateData.comparedPrice ? Number(updateData.comparedPrice) : null
  if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock)
  if (updateData.rating !== undefined) updateData.rating = Number(updateData.rating)
  if (updateData.reviewCount !== undefined) updateData.reviewCount = Number(updateData.reviewCount)
  if (updateData.isTrending !== undefined) updateData.isTrending = !!updateData.isTrending
  if (updateData.isBestSeller !== undefined) updateData.isBestSeller = !!updateData.isBestSeller
  // Replace images if provided
  if (Array.isArray(updateData.images)) {
    updateData.images = (updateData.images as Array<{ url: string; alt?: string }>).map((img, i) => ({
      id: `img-${i}-${Date.now()}`,
      url: img.url,
      alt: img.alt ?? null,
      position: i,
    }))
  }
  await database.collection('products').doc(id).update(updateData)
  const snap = await database.collection('products').doc(id).get()
  return snapshotToProduct(snap)
}

export async function deleteProduct(id: string): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  // Delete reviews for this product
  const reviewsSnap = await database.collection('reviews').where('productId', '==', id).get()
  const batch = database.batch()
  reviewsSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(database.collection('products').doc(id))
  await batch.commit()
}

// --- Reviews ---

export async function createReview(input: {
  productId: string
  userName: string
  rating: number
  title?: string | null
  comment?: string | null
}): Promise<ReviewDoc> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const now = new Date()
  const docData = {
    productId: input.productId,
    userName: input.userName,
    rating: Number(input.rating),
    title: input.title ?? null,
    comment: input.comment ?? null,
    createdAt: now,
  }
  const ref = await database.collection('reviews').add(docData)
  // Update product aggregate
  const allReviews = await database.collection('reviews').where('productId', '==', input.productId).get()
  const count = allReviews.size
  const avg = count > 0 ? allReviews.docs.reduce((sum, d) => sum + (d.data().rating || 0), 0) / count : 0
  await database.collection('products').doc(input.productId).update({
    rating: Math.round(avg * 10) / 10,
    reviewCount: count,
  })
  return {
    id: ref.id,
    ...docData,
    createdAt: now.toISOString(),
  } as ReviewDoc
}

// --- Orders ---

export async function createOrder(input: {
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: Record<string, string>
  items: Array<{ productId?: string; title: string; price: number; quantity: number; image?: string }>
  subtotal: number
  shipping: number
  total: number
  paymentMethod: string
  notes?: string | null
  userId?: string | null
}): Promise<OrderDoc> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const now = new Date()
  const orderNumber = 'AUR-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 1000)
  const docData = {
    orderNumber,
    userId: input.userId ?? null,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    shippingAddress: JSON.stringify(input.shippingAddress),
    subtotal: Number(input.subtotal),
    shipping: Number(input.shipping),
    total: Number(input.total),
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentMethod === 'cod' ? 'pending' : 'paid',
    orderStatus: 'placed',
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
    items: input.items.map((it, i) => ({
      id: `item-${i}-${Date.now()}`,
      productId: it.productId ?? null,
      title: it.title,
      price: Number(it.price),
      quantity: Number(it.quantity),
      image: it.image ?? null,
    })),
  }
  const ref = await database.collection('orders').add(docData)
  return {
    id: ref.id,
    ...docData,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  } as OrderDoc
}

export async function listOrders(email?: string): Promise<OrderDoc[]> {
  const database = db()
  if (!database) return []
  // where() only (no orderBy) to avoid composite index requirement
  let q: CollectionRefLike = database.collection('orders')
  if (email) q = q.where('customerEmail', '==', email)
  const snap = await q.get()
  const orders = snap.docs.map((d) => {
    const data = d.data()!
    return {
      id: d.id,
      orderNumber: data.orderNumber || '',
      userId: data.userId || null,
      customerName: data.customerName || '',
      customerEmail: data.customerEmail || '',
      customerPhone: data.customerPhone || '',
      shippingAddress: data.shippingAddress || '{}',
      subtotal: data.subtotal || 0,
      shipping: data.shipping || 0,
      total: data.total || 0,
      paymentMethod: data.paymentMethod || '',
      paymentStatus: data.paymentStatus || 'pending',
      orderStatus: data.orderStatus || 'placed',
      notes: data.notes || null,
      createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt || new Date().toISOString(),
      items: data.items || [],
    } as OrderDoc
  })
  // Sort in memory by createdAt descending
  orders.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return tb - ta
  })
  return orders
}

// --- Sections ---

export async function listSections(all = false): Promise<SectionDoc[]> {
  const database = db()
  if (!database) return []
  // where() only (no orderBy) to avoid composite index requirement
  let q: CollectionRefLike = database.collection('sections')
  if (!all) q = q.where('visible', '==', true)
  const snap = await q.get()
  const sections = snap.docs.map((d) => {
    const data = d.data()!
    return {
      id: d.id,
      type: data.type || '',
      title: data.title || null,
      position: data.position ?? 0,
      visible: data.visible ?? true,
      config: data.config || null,
    } as SectionDoc
  })
  // Sort in memory by position ascending
  sections.sort((a, b) => a.position - b.position)
  return sections
}

export async function createSection(input: {
  type: string
  title?: string | null
  position?: number
  visible?: boolean
  config?: string | null
}): Promise<SectionDoc> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const snap = await database.collection('sections').orderBy('position', 'desc').limit(1).get()
  const maxPos = snap.empty ? -1 : (snap.docs[0].data().position ?? 0)
  const docData = {
    type: input.type,
    title: input.title ?? null,
    position: input.position ?? maxPos + 1,
    visible: input.visible ?? true,
    config: input.config ?? null,
  }
  const ref = await database.collection('sections').add(docData)
  return { id: ref.id, ...docData } as SectionDoc
}

export async function updateSection(id: string, updates: Record<string, unknown>): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const updateData: Record<string, unknown> = { ...updates }
  if (updateData.position !== undefined) updateData.position = Number(updateData.position)
  if (updateData.visible !== undefined) updateData.visible = !!updateData.visible
  await database.collection('sections').doc(id).update(updateData)
}

export async function deleteSection(id: string): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  await database.collection('sections').doc(id).delete()
}

// --- Custom Sections ---

export async function listCustomSections(): Promise<CustomSectionDoc[]> {
  const database = db()
  if (!database) return []
  const snap = await database.collection('customSections').orderBy('position', 'asc').get()
  const sections = snap.docs.map((d) => {
    const data = d.data()!
    return {
      id: d.id,
      title: data.title || '',
      code: data.code || '',
      // Legacy fields (backward compat)
      html: data.html || '',
      css: data.css || null,
      js: data.js || null,
      position: data.position ?? 0,
      visible: data.visible ?? true,
      slot: data.slot || data.location || 'storefront',
      location: data.location || data.slot || 'storefront',
      insertAfterProducts: typeof data.insertAfterProducts === 'number' ? data.insertAfterProducts : undefined,
      createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt || new Date().toISOString(),
    } as CustomSectionDoc
  })
  sections.sort((a, b) => a.position - b.position)
  return sections
}

export async function createCustomSection(input: {
  title: string
  code?: string
  html?: string
  css?: string | null
  js?: string | null
  position?: number
  visible?: boolean
  slot?: string
  location?: string
  insertAfterProducts?: number
}): Promise<CustomSectionDoc> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const snap = await database.collection('customSections').orderBy('position', 'desc').limit(1).get()
  const maxPos = snap.empty ? -1 : (snap.docs[0].data()!.position ?? 0)
  const now = new Date()
  const slot = input.slot || input.location || 'storefront'
  const docData = {
    title: input.title,
    code: input.code || '',
    // Keep legacy fields for backward compat
    html: input.html || '',
    css: input.css ?? null,
    js: input.js ?? null,
    position: input.position ?? maxPos + 1,
    visible: input.visible ?? true,
    slot,
    location: slot,
    insertAfterProducts: typeof input.insertAfterProducts === 'number' ? input.insertAfterProducts : null,
    createdAt: now,
    updatedAt: now,
  }
  const ref = await database.collection('customSections').add(docData)
  return {
    id: ref.id,
    ...docData,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  } as CustomSectionDoc
}

export async function updateCustomSection(id: string, updates: Record<string, unknown>): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const updateData: Record<string, unknown> = { ...updates, updatedAt: new Date() }
  if (updateData.position !== undefined) updateData.position = Number(updateData.position)
  if (updateData.visible !== undefined) updateData.visible = !!updateData.visible
  if (updateData.insertAfterProducts !== undefined) {
    updateData.insertAfterProducts = updateData.insertAfterProducts === null
      ? null
      : Number(updateData.insertAfterProducts)
  }
  await database.collection('customSections').doc(id).update(updateData)
}

export async function deleteCustomSection(id: string): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  await database.collection('customSections').doc(id).delete()
}

// --- Users ---

export async function upsertUser(input: {
  email: string
  name?: string | null
  image?: string | null
  role: string
}): Promise<{ email: string; name: string | null; image: string | null; role: string }> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const snap = await database.collection('users').where('email', '==', input.email).limit(1).get()
  const now = new Date()
  if (snap.empty) {
    const docData = {
      email: input.email,
      name: input.name ?? null,
      image: input.image ?? null,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    }
    await database.collection('users').add(docData)
    return { email: input.email, name: input.name ?? null, image: input.image ?? null, role: input.role }
  }
  const doc = snap.docs[0]
  await doc.ref.update({
    name: input.name ?? null,
    image: input.image ?? null,
    role: input.role,
    updatedAt: now,
  })
  return { email: input.email, name: input.name ?? null, image: input.image ?? null, role: input.role }
}

// --- Settings (key-value) ---

export async function getAllSettings(): Promise<Record<string, string>> {
  const database = db()
  if (!database) return {}
  const snap = await database.collection('settings').get()
  const settings: Record<string, string> = {}
  snap.docs.forEach((d) => {
    const data = d.data()
    settings[data.key || d.id] = data.value || ''
  })
  return settings
}

export async function upsertSettings(updates: Array<{ key: string; value: string }>): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const batch = database.batch()
  for (const u of updates) {
    const snap = await database.collection('settings').where('key', '==', u.key).limit(1).get()
    if (snap.empty) {
      const ref = database.collection('settings').doc()
      batch.set(ref, { key: u.key, value: u.value })
    } else {
      batch.update(snap.docs[0].ref, { key: u.key, value: u.value })
    }
  }
  await batch.commit()
}

// --- Seed helpers ---

export async function clearAllData(): Promise<void> {
  const database = db()
  if (!database) return
  const collections = ['products', 'orders', 'reviews', 'sections', 'customSections', 'users', 'settings', 'abandonedCheckouts']
  for (const col of collections) {
    const snap = await database.collection(col).get()
    const batch = database.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

// --- Abandoned Checkouts ---

export interface AbandonedCheckoutDoc {
  id: string
  sessionKey: string
  customerName: string
  customerPhone: string
  customerEmail: string
  shippingAddress: Record<string, unknown>
  items: Array<{ title: string; price: number; quantity: number; image?: string | null }>
  subtotal: number
  total: number
  paymentMethodViewed: string
  convertedToOrder: boolean
  createdAt: string
  updatedAt: string
}

export async function listAbandonedCheckouts(): Promise<AbandonedCheckoutDoc[]> {
  const database = db()
  if (!database) return []
  const snap = await database.collection('abandonedCheckouts').orderBy('updatedAt', 'desc').get()
  return snap.docs.map((d) => {
    const data = d.data()!
    return {
      id: d.id,
      sessionKey: data.sessionKey || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      customerEmail: data.customerEmail || '',
      shippingAddress: data.shippingAddress || {},
      items: data.items || [],
      subtotal: data.subtotal || 0,
      total: data.total || 0,
      paymentMethodViewed: data.paymentMethodViewed || '',
      convertedToOrder: !!data.convertedToOrder,
      createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt || new Date().toISOString(),
    } as AbandonedCheckoutDoc
  })
}

export async function createOrUpdateAbandonedCheckout(input: {
  sessionKey: string
  customerName: string
  customerPhone: string
  customerEmail: string
  shippingAddress: Record<string, unknown>
  items: Array<{ title: string; price: number; quantity: number; image?: string | null }>
  subtotal: number
  total: number
  paymentMethodViewed: string
}): Promise<{ id: string; action: 'created' | 'updated' }> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const now = new Date()

  // Check if a record with this sessionKey already exists
  const existing = await database.collection('abandonedCheckouts')
    .where('sessionKey', '==', input.sessionKey)
    .limit(1)
    .get()

  const docData = {
    sessionKey: input.sessionKey,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    shippingAddress: input.shippingAddress,
    items: input.items,
    subtotal: Number(input.subtotal) || 0,
    total: Number(input.total) || 0,
    paymentMethodViewed: input.paymentMethodViewed,
    convertedToOrder: false,
    updatedAt: now,
  }

  if (!existing.empty) {
    const docId = existing.docs[0].id
    const existingData = existing.docs[0].data()!
    await database.collection('abandonedCheckouts').doc(docId).update({
      ...docData,
      createdAt: existingData.createdAt || now,
    })
    return { id: docId, action: 'updated' }
  } else {
    const fullData = { ...docData, createdAt: now }
    const ref = await database.collection('abandonedCheckouts').add(fullData)
    return { id: ref.id, action: 'created' }
  }
}

export async function deleteAbandonedCheckout(id: string): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  await database.collection('abandonedCheckouts').doc(id).delete()
}

// --- Visitor Analytics ---

/**
 * Record a visit. Called from the client on page load.
 * Updates both daily and lifetime stats.
 */
export async function recordVisit(visitorId: string): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD

  // --- Update daily stats ---
  const dailyRef = database.collection('visitorStats').doc(dateStr)
  const dailySnap = await dailyRef.get()
  if (dailySnap.exists) {
    const data = dailySnap.data()!
    const visitorIds: string[] = data.visitorIds || []
    const isNew = !visitorIds.includes(visitorId)
    await dailyRef.update({
      totalVisits: (data.totalVisits || 0) + 1,
      uniqueVisitors: isNew ? (data.uniqueVisitors || 0) + 1 : data.uniqueVisitors || 0,
      visitorIds: isNew ? [...visitorIds, visitorId] : visitorIds,
      updatedAt: now,
    })
  } else {
    await dailyRef.set({
      date: dateStr, totalVisits: 1, uniqueVisitors: 1,
      visitorIds: [visitorId], createdAt: now, updatedAt: now,
    })
  }

  // --- Update lifetime stats ---
  const lifeRef = database.collection('visitorStats').doc('lifetime')
  const lifeSnap = await lifeRef.get()
  if (lifeSnap.exists) {
    const data = lifeSnap.data()!
    const visitorIds: string[] = data.visitorIds || []
    const isNew = !visitorIds.includes(visitorId)
    await lifeRef.update({
      totalVisits: (data.totalVisits || 0) + 1,
      uniqueVisitors: isNew ? (data.uniqueVisitors || 0) + 1 : data.uniqueVisitors || 0,
      visitorIds: isNew ? [...visitorIds, visitorId] : visitorIds,
      updatedAt: now,
    })
  } else {
    await lifeRef.set({
      totalVisits: 1, uniqueVisitors: 1,
      visitorIds: [visitorId], createdAt: now, updatedAt: now,
    })
  }
}

export interface VisitorStats {
  lifetime: { totalVisits: number; uniqueVisitors: number }
  today: { totalVisits: number; uniqueVisitors: number }
  daily: Array<{ date: string; totalVisits: number; uniqueVisitors: number }>
  returningVisitors: number
}

/**
 * Fetch visitor stats for the admin panel.
 * Returns lifetime totals, today's stats, and last 30 days breakdown.
 */
export async function getVisitorStats(): Promise<VisitorStats> {
  const database = db()
  if (!database) return {
    lifetime: { totalVisits: 0, uniqueVisitors: 0 },
    today: { totalVisits: 0, uniqueVisitors: 0 },
    daily: [],
    returningVisitors: 0,
  }

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // Fetch lifetime + today
  const [lifeSnap, todaySnap] = await Promise.all([
    database.collection('visitorStats').doc('lifetime').get(),
    database.collection('visitorStats').doc(todayStr).get(),
  ])

  const lifetime = {
    totalVisits: lifeSnap.exists ? (lifeSnap.data()!.totalVisits || 0) : 0,
    uniqueVisitors: lifeSnap.exists ? (lifeSnap.data()!.uniqueVisitors || 0) : 0,
  }
  const today = {
    totalVisits: todaySnap.exists ? (todaySnap.data()!.totalVisits || 0) : 0,
    uniqueVisitors: todaySnap.exists ? (todaySnap.data()!.uniqueVisitors || 0) : 0,
  }

  // Fetch last 30 days
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const dailySnap = await database.collection('visitorStats')
    .orderBy('date', 'desc')
    .limit(30)
    .get()

  const daily: Array<{ date: string; totalVisits: number; uniqueVisitors: number }> = []
  const allVisitorIds: Set<string> = new Set()
  let totalUniqueAcrossDays = 0

  for (const doc of dailySnap.docs) {
    const data = doc.data()
    if (doc.id === 'lifetime') continue // skip the lifetime doc
    daily.push({
      date: data.date || doc.id,
      totalVisits: data.totalVisits || 0,
      uniqueVisitors: data.uniqueVisitors || 0,
    })
    // Count unique visitors across all days for "returning" calculation
    const ids: string[] = data.visitorIds || []
    for (const id of ids) {
      if (allVisitorIds.has(id)) {
        // This visitor appeared on multiple days — they're a returning visitor
      } else {
        allVisitorIds.add(id)
      }
    }
    totalUniqueAcrossDays += ids.length
  }

  // Returning visitors = total unique across days - lifetime unique
  // (If someone visited on 3 different days, they count as 1 lifetime unique
  //  but 3 daily uniques — the difference is "returning")
  const returningVisitors = Math.max(0, totalUniqueAcrossDays - lifetime.uniqueVisitors)

  return { lifetime, today, daily, returningVisitors }
}

// --- Collections ---

export interface CollectionDoc {
  id: string
  name: string
  slug: string
  productIds: string[]
  featuredProductIds: string[]
  visible: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export async function listCollections(all = false): Promise<CollectionDoc[]> {
  const database = db()
  if (!database) return []
  const snap = await database.collection('collections').orderBy('position', 'asc').get()
  const collections = snap.docs.map((d) => {
    const data = d.data()!
    return {
      id: d.id,
      name: data.name || '',
      slug: data.slug || '',
      productIds: data.productIds || [],
      featuredProductIds: data.featuredProductIds || [],
      visible: data.visible ?? true,
      position: data.position ?? 0,
      createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt || new Date().toISOString(),
    } as CollectionDoc
  })
  if (!all) return collections.filter((c) => c.visible)
  return collections
}

export async function getCollection(id: string): Promise<CollectionDoc | null> {
  const database = db()
  if (!database) return null
  const snap = await database.collection('collections').doc(id).get()
  if (!snap.exists) return null
  const data = snap.data()!
  return {
    id: snap.id,
    name: data.name || '',
    slug: data.slug || '',
    productIds: data.productIds || [],
    featuredProductIds: data.featuredProductIds || [],
    visible: data.visible ?? true,
    position: data.position ?? 0,
    createdAt: data.createdAt?.toISOString?.() || data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt?.toISOString?.() || data.updatedAt || new Date().toISOString(),
  }
}

export async function createCollection(input: {
  name: string
  productIds?: string[]
  featuredProductIds?: string[]
  visible?: boolean
}): Promise<CollectionDoc> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const snap = await database.collection('collections').orderBy('position', 'desc').limit(1).get()
  const maxPos = snap.empty ? -1 : (snap.docs[0].data()!.position ?? 0)
  const now = new Date()
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const docData = {
    name: input.name,
    slug,
    productIds: input.productIds || [],
    featuredProductIds: input.featuredProductIds || [],
    visible: input.visible ?? true,
    position: maxPos + 1,
    createdAt: now,
    updatedAt: now,
  }
  const ref = await database.collection('collections').add(docData)
  return {
    id: ref.id,
    ...docData,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  } as CollectionDoc
}

export async function updateCollection(id: string, updates: Record<string, unknown>): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  const updateData: Record<string, unknown> = { ...updates, updatedAt: new Date() }
  if (updateData.position !== undefined) updateData.position = Number(updateData.position)
  if (updateData.visible !== undefined) updateData.visible = !!updateData.visible
  await database.collection('collections').doc(id).update(updateData)
}

export async function deleteCollection(id: string): Promise<void> {
  const database = db()
  if (!database) throw new Error('Database not available')
  await database.collection('collections').doc(id).delete()
}
