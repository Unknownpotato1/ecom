'use client'

import { useState } from 'react'
import {
  ChevronRight,
  Lock,
  Truck,
  Wallet,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Tag,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/lib/cart-store'
import { useUI } from '@/lib/ui-store'
import { useAuth } from '@/lib/auth-store'
import { formatPrice } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const { goOrderSuccess, goHome } = useUI()
  const { user } = useAuth()

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  })
  const [payment, setPayment] = useState<'prepaid' | 'cod'>('prepaid')
  const [placing, setPlacing] = useState(false)
  const [promo, setPromo] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPct: number } | null>(null)

  const sub = subtotal()
  const discount = appliedPromo ? Math.round((sub * appliedPromo.discountPct) / 100) : 0
  const shipping = sub - discount >= 1499 || sub === 0 ? 0 : 99
  const total = Math.max(0, sub - discount) + shipping

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }))

  const applyPromo = () => {
    const code = promo.trim().toUpperCase()
    if (!code) return
    if (code === 'AURORA10') {
      setAppliedPromo({ code, discountPct: 10 })
      toast.success('Promo AURORA10 applied — 10% off!')
    } else if (code === 'FESTIVE15') {
      setAppliedPromo({ code, discountPct: 15 })
      toast.success('Promo FESTIVE15 applied — 15% off!')
    } else {
      toast.error('Invalid promo code')
    }
  }

  const placeOrder = async () => {
    if (!form.name || !form.email || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      toast.error('Please complete all required fields')
      return
    }
    if (items.length === 0) {
      toast.error('Your bag is empty')
      return
    }

    // For prepaid orders, process via Razorpay first
    if (payment === 'prepaid') {
      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!razorpayKeyId) {
        toast.error('Online payment is not configured. Please choose Cash on Delivery.')
        return
      }

      setPlacing(true)
      try {
        // Step 1: Create a Razorpay order on the server
        const createRes = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total }),
        })
        const orderData = await createRes.json()
        if (!createRes.ok || !orderData.orderId) {
          toast.error(orderData.error || 'Failed to initiate payment')
          setPlacing(false)
          return
        }

        // Step 2: Load Razorpay checkout script
        await loadRazorpayScript()

        // Step 3: Open Razorpay checkout modal
        const paymentSuccess = await new Promise<boolean>((resolve) => {
          const options = {
            key: razorpayKeyId,
            amount: orderData.amount, // in paise
            currency: orderData.currency,
            name: 'Aurora',
            description: 'Gift Hampers Order',
            order_id: orderData.orderId,
            prefill: {
              name: form.name,
              email: form.email,
              contact: form.phone,
            },
            theme: { color: '#f9758d' },
            handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
              // Step 4: Verify the payment signature on the server
              try {
                const verifyRes = await fetch('/api/razorpay/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                })
                const verifyData = await verifyRes.json()
                if (verifyData.verified) {
                  resolve(true)
                } else {
                  toast.error('Payment verification failed. Please contact support.')
                  resolve(false)
                }
              } catch {
                toast.error('Could not verify payment. Please contact support.')
                resolve(false)
              }
            },
            modal: {
              ondismiss: () => {
                toast.info('Payment cancelled')
                resolve(false)
              },
            },
          }

           
          const rzp = new (window as any).Razorpay(options)
          rzp.on('payment.failed', (err: { error: { description: string } }) => {
            toast.error('Payment failed: ' + (err.error?.description || 'Unknown error'))
            resolve(false)
          })
          rzp.open()
        })

        if (!paymentSuccess) {
          setPlacing(false)
          return
        }

        // Step 5: Payment verified — create the order in Firestore
        await createOrderRecord('prepaid', 'paid')
      } catch (e) {
        console.error(e)
        toast.error('Payment error — please try again')
        setPlacing(false)
      }
      return
    }

    // For COD: create order directly
    setPlacing(true)
    try {
      await createOrderRecord('cod', 'pending')
    } catch (e) {
      console.error(e)
      toast.error('Network error — please try again')
    } finally {
      setPlacing(false)
    }
  }

  /** Loads the Razorpay checkout script if not already loaded */
  async function loadRazorpayScript() {
    if (typeof window === 'undefined') return
     
    if ((window as any).Razorpay) return
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Razorpay script'))
      document.head.appendChild(script)
    })
  }

  /** Creates the order record in Firestore and redirects to success page */
  async function createOrderRecord(method: string, paymentStatus: string) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        shippingAddress: {
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        items: items.map((i) => ({
          productId: i.productId,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })),
        subtotal: sub - discount,
        shipping,
        total,
        paymentMethod: method,
        notes: form.notes,
        userId: user?.email,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      clearCart()
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('aurora:last-order', JSON.stringify(data.order))
      }
      goOrderSuccess()
    } else {
      toast.error('Failed to place order')
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Your bag is empty</h1>
        <p className="mt-2 text-muted-foreground">Add some hampers before checking out.</p>
        <Button className="mt-4 bg-brand text-white hover:shadow-lg" onClick={goHome}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to shop
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 fade-up">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <button onClick={goHome} className="hover:text-brand">Home</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Checkout</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Checkout</h1>

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
        {/* Left: form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Contact */}
          <section className="rounded-xl border border-pink-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">1</span>
              <h2 className="text-base font-semibold">Contact details</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name" className="text-xs">Full name *</Label>
                <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs">Phone *</Label>
                <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email" className="text-xs">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="mt-1" />
              </div>
            </div>
          </section>

          {/* Shipping */}
          <section className="rounded-xl border border-pink-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">2</span>
              <h2 className="text-base font-semibold">Shipping address</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="line1" className="text-xs">Address line 1 *</Label>
                <Input id="line1" value={form.line1} onChange={(e) => set('line1', e.target.value)} placeholder="House no, building" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line2" className="text-xs">Address line 2 (optional)</Label>
                <Input id="line2" value={form.line2} onChange={(e) => set('line2', e.target.value)} placeholder="Landmark, area" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="city" className="text-xs">City *</Label>
                <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="state" className="text-xs">State *</Label>
                <Input id="state" value={form.state} onChange={(e) => set('state', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="pincode" className="text-xs">Pincode *</Label>
                <Input id="pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} maxLength={6} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes" className="text-xs">Delivery notes (optional)</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Leave at the door, call before delivery..." rows={2} className="mt-1" />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-pink-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">3</span>
              <h2 className="text-base font-semibold">Payment method</h2>
            </div>
            <RadioGroup value={payment} onValueChange={(v) => setPayment(v as 'prepaid' | 'cod')}>
              <div className="space-y-2">
                <label
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    payment === 'prepaid' ? 'border-brand bg-brand-soft' : 'border-pink-100 hover:border-brand'
                  )}
                >
                  <RadioGroupItem value="prepaid" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-brand" />
                      <span className="text-sm font-medium">Prepaid — UPI / Card / Net banking</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pay securely online via Razorpay. UPI, credit/debit cards, wallets and net banking supported.
                    </p>
                    <div className="flex gap-1 mt-2">
                      {['UPI', 'VISA', 'MC', 'RUP'].map((p) => (
                        <span key={p} className="px-1.5 py-0.5 text-[9px] rounded bg-foreground/5 text-muted-foreground border border-pink-100 font-semibold">{p}</span>
                      ))}
                    </div>
                  </div>
                </label>
                <label
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    payment === 'cod' ? 'border-brand bg-brand-soft' : 'border-pink-100 hover:border-brand'
                  )}
                >
                  <RadioGroupItem value="cod" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-brand" />
                      <span className="text-sm font-medium">Cash on Delivery (COD)</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pay in cash when your hamper is delivered. A small handling fee of ₹0 applies. Available across India.
                    </p>
                  </div>
                </label>
              </div>
            </RadioGroup>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-brand-soft rounded-md p-3">
              <ShieldCheck className="h-4 w-4 text-brand shrink-0" />
              <span>All transactions are secured. Aurora never stores your card details.</span>
            </div>
          </section>
        </div>

        {/* Right: summary */}
        <aside className="lg:col-span-2">
          <div className="rounded-xl border border-pink-100 p-5 lg:sticky lg:top-20">
            <h2 className="text-base font-semibold mb-4">Order summary</h2>
            <div className="space-y-3 max-h-72 overflow-y-auto fancy-scroll mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-16 rounded-md overflow-hidden bg-pink-50 shrink-0">
                    {item.image && (
                       
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    )}
                    <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-brand text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-price">{formatPrice(item.price)}</span>
                      {item.comparedPrice && (
                        <span className="text-[10px] text-compared-price line-through">
                          {formatPrice(item.comparedPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-price">{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            {/* Promo */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Promo code"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                className="text-sm"
              />
              <Button variant="outline" size="sm" onClick={applyPromo} className="border-brand text-brand hover:bg-brand-soft">
                <Tag className="h-3.5 w-3.5 mr-1" /> Apply
              </Button>
            </div>
            {appliedPromo && (
              <div className="mb-4 text-xs text-emerald-600 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {appliedPromo.code} applied ({appliedPromo.discountPct}% off)
              </div>
            )}

            <Separator className="my-3" />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-price">{formatPrice(sub)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>− {formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? <span className="text-emerald-600 font-medium">FREE</span> : formatPrice(shipping)}</span>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-price">{formatPrice(total)}</span>
            </div>

            <Button
              className="w-full mt-4 h-11 bg-brand text-white hover:shadow-lg"
              disabled={placing}
              onClick={placeOrder}
            >
              {placing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing order...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" /> Place order • {formatPrice(total)}
                </>
              )}
            </Button>

            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <Truck className="h-3.5 w-3.5" /> Free shipping on orders above ₹1,499
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
