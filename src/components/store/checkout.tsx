'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronRight,
  Wallet,
  Banknote,
  CheckCircle2,
  Loader2,
  Tag,
  ArrowLeft,
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
import { trackInitiateCheckout, trackPurchase } from '@/lib/meta-pixel'

export function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const { goOrderSuccess, goHome } = useUI()
  const { user } = useAuth()
  const checkoutTracked = useRef(false)

  // Fire InitiateCheckout once when the checkout page loads with items
  useEffect(() => {
    if (!checkoutTracked.current && items.length > 0) {
      checkoutTracked.current = true
      trackInitiateCheckout({
        total: subtotal(),
        numItems: items.reduce((a, i) => a + i.quantity, 0),
      })
    }
  }, [items, subtotal])

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
  // Payment method — empty string means NOTHING is preselected.
  // The user must explicitly pick Prepaid or COD before placing the order.
  // This avoids biasing the customer toward any particular payment option.
  const [payment, setPayment] = useState<'prepaid' | 'cod' | ''>('')
  const [placing, setPlacing] = useState(false)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [promo, setPromo] = useState('')
  /**
   * Applied discount code state (from /api/discount-codes/validate).
   * Supports percentage and fixed amount discounts, with server-side
   * validation for usage limits, expiry, min subtotal, etc.
   */
  const [appliedPromo, setAppliedPromo] = useState<
    { code: string; discountAmount: number; type: string; value: number } | null
  >(null)
  const [promoLoading, setPromoLoading] = useState(false)

  const sub = subtotal()
  const promoDiscount = appliedPromo?.discountAmount || 0
  const prepaidExtraDiscount = payment === 'prepaid' ? Math.round((sub - promoDiscount) * 0.10) : 0
  const discount = promoDiscount + prepaidExtraDiscount
  const FREE_SHIPPING_THRESHOLD = 249
  const shipping = sub - discount >= FREE_SHIPPING_THRESHOLD || sub === 0 ? 0 : 99
  const codPartial = 49
  const total = Math.max(0, sub - discount) + shipping
  const codRemaining = Math.max(0, total - codPartial)

  // ── Abandoned checkout tracking ──────────────────────────────────
  // Save the checkout form to the server whenever the customer types
  // their details. If they leave without completing the order, the
  // admin panel shows it under the "Abandoned" tab.
  // Debounced: saves 3s after the last keystroke to avoid spamming.
  const abandonSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!form.name && !form.phone && !form.line1 && !form.pincode) return
    if (items.length === 0) return

    if (abandonSaveTimer.current) clearTimeout(abandonSaveTimer.current)

    abandonSaveTimer.current = setTimeout(() => {
      // Generate or reuse a stable session ID
      if (typeof window !== 'undefined' && !sessionStorage.getItem('aurora:session-id')) {
        sessionStorage.setItem('aurora:session-id', Math.random().toString(36).slice(2))
      }
      fetch('/api/abandoned-checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey: 'session_' + (typeof window !== 'undefined' ? sessionStorage.getItem('aurora:session-id') || 'unknown' : 'unknown'),
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: user?.email || '',
          shippingAddress: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            addressType: form.addressType,
          },
          items: items.map((i) => ({
            title: i.title,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
          })),
          subtotal: sub,
          total,
          paymentMethodViewed: payment || '',
        }),
      }).catch(() => {})
    }, 3000)

    return () => {
      if (abandonSaveTimer.current) clearTimeout(abandonSaveTimer.current)
    }
  }, [form, items, sub, total, payment, user])

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

  const applyPromo = async () => {
    const code = promo.trim()
    if (!code) return
    setPromoLoading(true)
    try {
      const res = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: sub, customerPhone: form.phone }),
      })
      const data = await res.json()
      if (data.valid && data.discountCode) {
        setAppliedPromo({
          code: data.discountCode.code,
          discountAmount: data.discountAmount || 0,
          type: data.discountCode.type,
          value: data.discountCode.value,
        })
        toast.success(`Discount code ${data.discountCode.code} applied!`)
      } else {
        toast.error(data.error || 'Invalid discount code')
        setAppliedPromo(null)
      }
    } catch {
      toast.error('Failed to validate discount code')
    }
    setPromoLoading(false)
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
    // No payment method preselected — require the user to pick one.
    if (payment !== 'prepaid' && payment !== 'cod') {
      toast.error('Please select a payment method')
      return
    }

    // For prepaid orders, process via Razorpay first (full amount)
    if (payment === 'prepaid') {
      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!razorpayKeyId) {
        toast.error('Online payment is not configured. Please try again later.')
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

        const paymentSuccess = await openRazorpayCheckout(razorpayKeyId, orderData, total, 'Full payment')

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

    // For COD: pay ₹49 partial payment via Razorpay to confirm order
    if (payment === 'cod') {
      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!razorpayKeyId) {
        toast.error('Online payment is not configured. Please try again later.')
        return
      }

      setPlacing(true)
      try {
        const createRes = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: codPartial }),
        })
        const orderData = await createRes.json()
        if (!createRes.ok || !orderData.orderId) {
          toast.error(orderData.error || 'Failed to initiate payment')
          setPlacing(false)
          return
        }

        await loadRazorpayScript()

        const paymentSuccess = await openRazorpayCheckout(razorpayKeyId, orderData, codPartial, 'COD confirmation')

        if (!paymentSuccess) {
          setPlacing(false)
          return
        }

        // ₹49 paid — create order with COD for the remaining amount
        await createOrderRecord('cod', 'partial_paid')
      } catch (e) {
        console.error(e)
        toast.error('Payment error — please try again')
        setPlacing(false)
      }
      return
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

  /** Opens Razorpay checkout modal, returns true if payment succeeded */
  async function openRazorpayCheckout(
    keyId: string,
    orderData: { orderId: string; amount: number; currency: string },
    amount: number,
    description: string
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Eviola',
        description: description + ' • ₹' + amount,
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
        discountCode: appliedPromo?.code || null,
        discountAmount: promoDiscount || 0,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      // Increment the discount code usage counter
      if (appliedPromo?.code) {
        fetch('/api/discount-codes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: appliedPromo.code, incrementUsage: true }),
        }).catch(() => {})
      }
      // Fire Purchase event for Meta Pixel (only after order is confirmed)
      trackPurchase({
        total: data.order.total,
        orderId: data.order.orderNumber,
        numItems: data.order.items.reduce((a: number, i: { quantity: number }) => a + i.quantity, 0),
      })
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
            <h2 className="text-base font-semibold mb-4">Contact</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Name"
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
                  placeholder="Full Address"
                  className="h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  id="line2"
                  value={form.line2}
                  onChange={(e) => set('line2', e.target.value)}
                  placeholder="Landmark — Optional"
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
              {/* City + State — always side by side (grid-cols-2),
                  even on mobile screens. Was sm:grid-cols-2 which stacked
                  them on mobile; user requested they stay in one row. */}
              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="City / District"
                  className="h-11"
                />
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
                  placeholder="Delivery Notes — Optional"
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-pink-100 p-5">
            <h2 className="text-base font-semibold mb-4">Payment method</h2>
            <RadioGroup value={payment} onValueChange={(v) => setPayment(v as 'prepaid' | 'cod')}>
              <div className="space-y-2">
                {/* Prepaid */}
                <label
                  className={cn(
                    'block p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    payment === 'prepaid' ? 'border-brand bg-brand-soft' : 'border-pink-100 hover:border-brand'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="prepaid" />
                    <Wallet className="h-4 w-4 text-brand shrink-0" />
                    <span className="text-sm font-medium">Prepaid <span className="text-emerald-600">— Extra 10% Off</span></span>
                  </div>
                  {/*
                    Smooth dropdown animation for the payment description.
                    Uses the CSS grid-template-rows 0fr → 1fr trick instead of
                    a fixed maxHeight — this animates the ACTUAL content height
                    smoothly regardless of how much text/icons are inside.
                    No dropdown arrow icon is rendered (per user request).
                  */}
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{
                      gridTemplateRows: payment === 'prepaid' ? '1fr' : '0fr',
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-3 pl-7">
                        <p className="text-xs text-muted-foreground mb-2">
                          Pay securely online. Extra 10% discount applied on this order.
                        </p>
                        <div className="flex items-center gap-2">
                          {[
                            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/UPI_logo.svg/1920px-UPI_logo.svg.png',
                            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Phonepe-blue.svg/1920px-Phonepe-blue.svg.png',
                            'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Google_Pay_2018_icon.svg/1920px-Google_Pay_2018_icon.svg.png',
                            'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Cib-cc-amazon-pay_%28CoreUI_Icons_v1.0.0%29.svg/1920px-Cib-cc-amazon-pay_%28CoreUI_Icons_v1.0.0%29.svg.png',
                            'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/1920px-Paytm_Logo_%28standalone%29.svg.png',
                          ].map((src, i) => (
                            <div key={i} className="h-6 px-1.5 rounded border border-pink-100 bg-white flex items-center shrink-0">
                              <img src={src} alt="payment" className="h-4 w-auto object-contain" loading="lazy" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </label>

                {/* COD */}
                <label
                  className={cn(
                    'block p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    payment === 'cod' ? 'border-brand bg-brand-soft' : 'border-pink-100 hover:border-brand'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="cod" />
                    <Banknote className="h-4 w-4 text-brand shrink-0" />
                    <span className="text-sm font-medium">Cash On Delivery</span>
                  </div>
                  {/* Same smooth grid-rows animation, no dropdown arrow. */}
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{
                      gridTemplateRows: payment === 'cod' ? '1fr' : '0fr',
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-3 pl-7">
                        <p className="text-xs text-muted-foreground">
                          Pay <span className="font-semibold text-brand">₹49 now</span> to confirm your COD order and{' '}
                          <span className="font-semibold text-foreground">{formatPrice(codRemaining)}</span> when your hamper is delivered.
                        </p>
                      </div>
                    </div>
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
                <CheckCircle2 className="h-3.5 w-3.5" /> {appliedPromo.code} applied
                {appliedPromo.type === 'percentage'
                  ? ` (${appliedPromo.value}% off)`
                  : ` (₹${appliedPromo.value} off)`}
              </div>
            )}

            <Separator className="my-3" />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-price">{formatPrice(sub)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Promo discount</span>
                  <span>− {formatPrice(promoDiscount)}</span>
                </div>
              )}
              {prepaidExtraDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Prepaid 10% off</span>
                  <span>− {formatPrice(prepaidExtraDiscount)}</span>
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
            {payment === 'cod' && (
              <div className="mt-2 rounded-lg bg-brand-soft p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pay now (confirm)</span>
                  <span className="font-semibold text-brand">₹49</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pay on delivery</span>
                  <span className="font-semibold">{formatPrice(codRemaining)}</span>
                </div>
              </div>
            )}

            {/*
              Place Order button — simple, clean text only.
              No lock icon, no amount displayed. Just "Place Order" in
              a larger size (h-13) and bolder weight (font-semibold).
              The button is full-width and uses the brand pink color.
              The placing spinner state still shows "Placing order...".
            */}
            <Button
              className="w-full mt-4 h-13 bg-brand text-white hover:shadow-lg text-base font-semibold"
              disabled={placing}
              onClick={placeOrder}
            >
              {placing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing order...
                </>
              ) : (
                <>Place Order</>
              )}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
