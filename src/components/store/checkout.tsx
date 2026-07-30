'use client'

import { useState } from 'react'
import {
  ChevronRight,
  Lock,
  Wallet,
  Banknote,
  CheckCircle2,
  Loader2,
  Tag,
  ArrowLeft,
  Building2,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
    addressType: 'home' as 'home' | 'office',
  })
  const [payment, setPayment] = useState<'prepaid' | 'cod'>('prepaid')
  const [placing, setPlacing] = useState(false)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [promo, setPromo] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPct: number } | null>(null)

  const sub = subtotal()
  const discount = appliedPromo ? Math.round((sub * appliedPromo.discountPct) / 100) : 0
  const shipping = sub - discount >= 1499 || sub === 0 ? 0 : 99
  const total = Math.max(0, sub - discount) + shipping

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }))

  /** Auto-fill city + state when pincode is entered (6 digits) */
  const handlePincodeChange = async (value: string) => {
    const pin = value.replace(/\D/g, '').slice(0, 6)
    set('pincode', pin)
    if (pin.length === 6) {
      setPincodeLoading(true)
      try {
        const res = await fetch(`/api/pincode?pin=${pin}`)
        const data = await res.json()
        if (data.status === 'Success' && data.district && data.state) {
          set('city', data.district)
          set('state', data.state)
          toast.success(`Delivering to ${data.district}, ${data.state}`)
        } else {
          toast.error('PIN code not found')
        }
      } catch {
        toast.error('Could not verify pincode')
      } finally {
        setPincodeLoading(false)
      }
    }
  }

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
    if (!form.name || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
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

        await loadRazorpayScript()

        const paymentSuccess = await new Promise<boolean>((resolve) => {
          const options = {
            key: razorpayKeyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'Aurora',
            description: 'Gift Hampers Order',
            order_id: orderData.orderId,
            prefill: {
              name: form.name,
              contact: form.phone,
            },
            theme: { color: '#f9758d' },
            handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
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

          const rzp = new (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void; on: (evt: string, cb: (err: { error: { description: string } }) => void) => void } }).Razorpay(options)
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

  async function loadRazorpayScript() {
    if (typeof window === 'undefined') return
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Razorpay script'))
      document.head.appendChild(script)
    })
  }

  async function createOrderRecord(method: string, paymentStatus: string) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: form.name,
        customerEmail: user?.email || '',
        customerPhone: form.phone,
        shippingAddress: {
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          addressType: form.addressType,
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
            <h2 className="text-base font-semibold mb-4">Contact details</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Full name"
                  className="h-11"
                />
              </div>
              <div>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="Phone"
                  className="h-11"
                />
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="rounded-xl border border-pink-100 p-5">
            <h2 className="text-base font-semibold mb-4">Address</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Input
                  id="line1"
                  value={form.line1}
                  onChange={(e) => set('line1', e.target.value)}
                  placeholder="Address line 1 (House no, building)"
                  className="h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  id="line2"
                  value={form.line2}
                  onChange={(e) => set('line2', e.target.value)}
                  placeholder="Address line 2 (Landmark, area) — optional"
                  className="h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="relative">
                  <Input
                    id="pincode"
                    value={form.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="Pincode"
                    maxLength={6}
                    className="h-11"
                    inputMode="numeric"
                  />
                  {pincodeLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-brand" />
                  )}
                </div>
              </div>
              <div>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="City / District"
                  className="h-11"
                />
              </div>
              <div>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                  placeholder="State"
                  className="h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Delivery notes (e.g. Leave at the door, call before delivery) — optional"
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* Address type */}
          <section className="rounded-xl border border-pink-100 p-5">
            <h2 className="text-base font-semibold mb-4">Address type</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set('addressType', 'home')}
                className={cn(
                  'flex items-center gap-3 p-4 border-2 rounded-lg transition-colors',
                  form.addressType === 'home' ? 'border-brand bg-brand-soft' : 'border-pink-100 hover:border-brand'
                )}
              >
                <Home className={cn('h-5 w-5', form.addressType === 'home' ? 'text-brand' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-medium', form.addressType === 'home' ? 'text-brand' : 'text-foreground')}>
                  Home
                </span>
              </button>
              <button
                type="button"
                onClick={() => set('addressType', 'office')}
                className={cn(
                  'flex items-center gap-3 p-4 border-2 rounded-lg transition-colors',
                  form.addressType === 'office' ? 'border-brand bg-brand-soft' : 'border-pink-100 hover:border-brand'
                )}
              >
                <Building2 className={cn('h-5 w-5', form.addressType === 'office' ? 'text-brand' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-medium', form.addressType === 'office' ? 'text-brand' : 'text-foreground')}>
                  Office
                </span>
              </button>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-pink-100 p-5">
            <h2 className="text-base font-semibold mb-4">Payment method</h2>
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
                      Pay in cash when your hamper is delivered. Available across India.
                    </p>
                  </div>
                </label>
              </div>
            </RadioGroup>
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
          </div>
        </aside>
      </div>
    </div>
  )
}
