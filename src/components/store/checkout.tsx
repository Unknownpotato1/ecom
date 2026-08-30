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
  X,
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
import { optimizeCloudinaryUrl } from '@/lib/cloudinary-utils'

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

  // COD confirmation bottom-sheet state.
  // When the customer picks COD and taps "Place Order", we intercept the
  // order placement and show a slide-in card offering them to switch to
  // prepaid for an extra 10% off. This nudges customers toward prepaid
  // (lower RTO, lower COD handling cost) WITHOUT removing the COD option.
  const [showCodConfirm, setShowCodConfirm] = useState(false)

  const sub = subtotal()
  const promoDiscount = appliedPromo?.discountAmount || 0

  // FS2 is a special flat-price promo code: when applied, the total
  // becomes ₹2 regardless of subtotal, shipping, or payment method.
  // Even COD orders (which normally have a ₹49 partial payment) charge
  // only ₹2 with no remaining COD amount. This is handled as a special
  // case because it doesn't fit the existing percentage/fixed discount
  // model — FS2 overrides the ENTIRE total, not just a discount amount.
  const isFS2 = appliedPromo?.code === 'FS2'

  const prepaidExtraDiscount = isFS2 ? 0 : (payment === 'prepaid' ? Math.round((sub - promoDiscount) * 0.10) : 0)
  const discount = isFS2 ? Math.max(0, sub - 2) : promoDiscount + prepaidExtraDiscount
  const FREE_SHIPPING_THRESHOLD = 249
  const shipping = isFS2 ? 0 : (sub - discount >= FREE_SHIPPING_THRESHOLD || sub === 0 ? 0 : 99)
  const codPartial = isFS2 ? 2 : 49
  const total = isFS2 ? 2 : (Math.max(0, sub - discount) + shipping)
  const codRemaining = isFS2 ? 0 : Math.max(0, total - codPartial)

  // The extra amount the customer would save by switching from COD to
  // prepaid (10% of the post-promo subtotal). Used to display a concrete
  // ₹ saving amount on the COD→prepaid slide-in card. When FS2 is applied,
  // there's no extra prepaid saving (the price is already ₹2 flat).
  const onlineSaving = isFS2 ? 0 : Math.round((sub - promoDiscount) * 0.10)

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

  // ── Cashfree redirect-back handler ──────────────────────────────
  // After Cashfree payment, the browser redirects back to:
  //   https://eviola.in/checkout?cf_order_id=eviola_12345_6789
  // This useEffect detects that query param on page load, reads the
  // pending order data from sessionStorage, verifies the payment with
  // Cashfree's API, and creates the order record.
  const [cfProcessing, setCfProcessing] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const cfOrderId = urlParams.get('cf_order_id')

    if (!cfOrderId) return

    // Read the pending order data from sessionStorage
    const pendingRaw = sessionStorage.getItem('cf_pending_order')
    if (!pendingRaw) {
      // No pending order data — the user might have navigated here
      // manually or the session was cleared. Show an error.
      toast.error('Payment session expired. Please try placing your order again.')
      // Clean the URL
      window.history.replaceState({}, '', '/checkout')
      return
    }

    let pending: {
      cashfreeOrderId: string
      method: string
      paymentStatus: string
      subtotal: number
      shipping: number
      total: number
      discountCode: string | null
      discountAmount: number
      items: Array<{ productId: string; title: string; price: number; quantity: number; image: string }>
      form: typeof form
      useremail: string
    }
    try {
      pending = JSON.parse(pendingRaw)
    } catch {
      toast.error('Payment session data corrupted. Please try again.')
      sessionStorage.removeItem('cf_pending_order')
      window.history.replaceState({}, '', '/checkout')
      return
    }

    // Prevent double-processing (React StrictMode runs effects twice in dev)
    if (cfProcessing) return
    setCfProcessing(true)
    setPlacing(true)

    // Show a loading toast
    const loadingToast = toast.loading('Verifying your payment...')

    // Verify the payment with Cashfree (with retries, since the payment
    // status may take a few seconds to update after the redirect-back)
    const verifyWithRetry = async (): Promise<boolean> => {
      const MAX_RETRIES = 6
      const RETRY_DELAY_MS = 2000

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const verifyRes = await fetch('/api/cashfree/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: cfOrderId }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.verified) {
            return true
          }
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
          }
        } catch {
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
          }
        }
      }
      return false
    }

    const completeOrder = async () => {
      const success = await verifyWithRetry()
      toast.dismiss(loadingToast)

      if (success) {
        // Payment verified — create the order record
        try {
          // Temporarily set the form + items from the pending data so
          // createOrderRecord uses the correct values. We call the API
          // directly instead of using createOrderRecord to avoid state
          // timing issues after a full page redirect.
          const orderRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: pending.form.name,
              customerEmail: pending.useremail,
              customerPhone: pending.form.phone,
              shippingAddress: {
                line1: pending.form.line1,
                line2: pending.form.line2,
                city: pending.form.city,
                state: pending.form.state,
                pincode: pending.form.pincode,
                addressType: pending.form.addressType,
              },
              items: pending.items,
              subtotal: pending.subtotal,
              shipping: pending.shipping,
              total: pending.total,
              paymentMethod: pending.method,
              notes: pending.form.notes,
              userId: pending.useremail,
              discountCode: pending.discountCode,
              discountAmount: pending.discountAmount,
            }),
          })

          if (orderRes.ok) {
            const data = await orderRes.json()
            // Increment discount code usage if applicable
            if (pending.discountCode) {
              fetch('/api/discount-codes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: pending.discountCode, incrementUsage: true }),
              }).catch(() => {})
            }
            // Clear the cart and pending order data
            clearCart()
            sessionStorage.removeItem('cf_pending_order')
            // Save the order for the success page
            sessionStorage.setItem('aurora:last-order', JSON.stringify(data.order))
            // Navigate to order success
            toast.success('Payment successful! Order confirmed.')
            goOrderSuccess()
          } else {
            toast.error('Payment verified but order creation failed. Please contact support.')
            setPlacing(false)
            setCfProcessing(false)
          }
        } catch {
          toast.error('Order creation error. Please contact support.')
          setPlacing(false)
          setCfProcessing(false)
        }
      } else {
        // Verification timed out — but the user was redirected back,
        // which means Cashfree completed the flow. Proceed with order
        // creation anyway (better than leaving them stuck after paying).
        try {
          const orderRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: pending.form.name,
              customerEmail: pending.useremail,
              customerPhone: pending.form.phone,
              shippingAddress: {
                line1: pending.form.line1,
                line2: pending.form.line2,
                city: pending.form.city,
                state: pending.form.state,
                pincode: pending.form.pincode,
                addressType: pending.form.addressType,
              },
              items: pending.items,
              subtotal: pending.subtotal,
              shipping: pending.shipping,
              total: pending.total,
              paymentMethod: pending.method,
              notes: pending.form.notes,
              userId: pending.useremail,
              discountCode: pending.discountCode,
              discountAmount: pending.discountAmount,
            }),
          })

          if (orderRes.ok) {
            const data = await orderRes.json()
            if (pending.discountCode) {
              fetch('/api/discount-codes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: pending.discountCode, incrementUsage: true }),
              }).catch(() => {})
            }
            clearCart()
            sessionStorage.removeItem('cf_pending_order')
            sessionStorage.setItem('aurora:last-order', JSON.stringify(data.order))
            toast.info('Payment received. Order confirmed.')
            goOrderSuccess()
          } else {
            toast.error('Payment received but order creation failed. Please contact support.')
            setPlacing(false)
            setCfProcessing(false)
          }
        } catch {
          toast.error('Order creation error. Please contact support.')
          setPlacing(false)
          setCfProcessing(false)
        }
      }

      // Clean the URL (remove cf_order_id so a refresh doesn't re-trigger)
      window.history.replaceState({}, '', '/checkout')
    }

    completeOrder()
  }, [])

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

    // PAYMENT_PROVIDER env var controls which payment gateway is used.
    // Default is 'razorpay' (backward compatible). Set to 'cashfree' to switch.
    const useCashfree = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === 'cashfree'

    // Prepaid — proceed directly.
    if (payment === 'prepaid') {
      return useCashfree ? placePrepaidOrderCashfree() : placePrepaidOrder()
    }

    // COD — intercept with a slide-in card that nudges the customer
    // toward prepaid (extra 10% off). They can still confirm COD or
    // switch to prepaid from the card. The actual COD flow runs only
    // when they tap "Confirm & place order" on the card.
    if (payment === 'cod') {
      setShowCodConfirm(true)
      return
    }
  }

  // Prepaid order flow — extracted from placeOrder so it can be
  // triggered both from the "Place Order" button (when the customer
  // already has prepaid selected) AND from the COD confirmation card's
  // "Pay online" button.
  //
  // When invoked from the COD card, the outer `payment` state may still
  // be 'cod', so the outer `total` variable does NOT yet include the
  // prepaid extra 10% discount (the state update from
  // setPayment('prepaid') hasn't flushed). We therefore recompute the
  // prepaid total locally to make sure Razorpay charges the correct
  // (discounted) amount and the order record stores the correct totals.
  const placePrepaidOrder = async () => {
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    if (!razorpayKeyId) {
      toast.error('Online payment is not configured. Please try again later.')
      return
    }

    // FS2 flat-price override: total is ₹2 regardless of subtotal.
    if (isFS2) {
      setPlacing(true)
      try {
        const createRes = await fetch('/api/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 2 }),
        })
        const orderData = await createRes.json()
        if (!createRes.ok || !orderData.orderId) {
          toast.error(orderData.error || 'Failed to initiate payment')
          setPlacing(false)
          return
        }

        await loadRazorpayScript()

        const paymentSuccess = await openRazorpayCheckout(razorpayKeyId, orderData, 2, 'Full payment')

        if (!paymentSuccess) {
          setPlacing(false)
          return
        }

        await createOrderRecord('prepaid', 'paid', {
          subtotal: 2,
          shipping: 0,
          total: 2,
        })
      } catch (e) {
        console.error(e)
        toast.error('Payment error — please try again')
        setPlacing(false)
      }
      return
    }

    // Normal prepaid flow — recompute totals with the prepaid extra 10%
    // discount included.
    const prepaidExtra = Math.round((sub - promoDiscount) * 0.10)
    const prepaidDiscountTotal = promoDiscount + prepaidExtra
    const prepaidShipping =
      sub - prepaidDiscountTotal >= FREE_SHIPPING_THRESHOLD || sub === 0 ? 0 : 99
    const prepaidTotal = Math.max(0, sub - prepaidDiscountTotal) + prepaidShipping

    setPlacing(true)
    try {
      const createRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: prepaidTotal }),
      })
      const orderData = await createRes.json()
      if (!createRes.ok || !orderData.orderId) {
        toast.error(orderData.error || 'Failed to initiate payment')
        setPlacing(false)
        return
      }

      await loadRazorpayScript()

      const paymentSuccess = await openRazorpayCheckout(
        razorpayKeyId,
        orderData,
        prepaidTotal,
        'Full payment'
      )

      if (!paymentSuccess) {
        setPlacing(false)
        return
      }

      await createOrderRecord('prepaid', 'paid', {
        subtotal: sub - prepaidDiscountTotal,
        shipping: prepaidShipping,
        total: prepaidTotal,
      })
    } catch (e) {
      console.error(e)
      toast.error('Payment error — please try again')
      setPlacing(false)
    }
  }

  // COD order flow — extracted from placeOrder so it can be triggered
  // from the COD confirmation card's "Confirm & place order" button.
  // Uses the outer-scope `total` and `codPartial` which are correctly
  // computed when `payment === 'cod'` (the only state in which this
  // function is reachable).
  const placeCodOrder = async () => {
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

      const paymentSuccess = await openRazorpayCheckout(
        razorpayKeyId,
        orderData,
        codPartial,
        'COD confirmation'
      )

      if (!paymentSuccess) {
        setPlacing(false)
        return
      }

      // Partial paid (normally ₹49, or ₹2 when FS2 promo is applied) —
      // create order with COD for the remaining amount (₹0 when FS2).
      await createOrderRecord('cod', 'partial_paid')
    } catch (e) {
      console.error(e)
      toast.error('Payment error — please try again')
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

  // ── Cashfree payment flow ──────────────────────────────────────
  // The Cashfree flow mirrors the Razorpay flow but uses Cashfree's API
  // and JS SDK. Both flows coexist — the PAYMENT_PROVIDER env var controls
  // which one is active. Default is 'razorpay' (backward compatible).
  // Set PAYMENT_PROVIDER=cashfree to switch.

  async function loadCashfreeScript(): Promise<void> {
    if (typeof window === 'undefined') return
    const w = window as unknown as { Cashfree?: unknown }
    if (w.Cashfree) return
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Cashfree script'))
      document.head.appendChild(script)
    })
  }

  /**
   * Opens the Cashfree checkout using full-page redirect (_self).
   *
   * Why _self (redirect) instead of _modal:
   * The _modal approach works for cards/netbanking but BREAKS for UPI
   * app redirects (PhonePe, GPay, Paytm). When the browser switches to
   * the UPI app and comes back, the JavaScript context is lost and the
   * onSuccess callback never fires — leaving the customer stuck on
   * "Placing order" after paying.
   *
   * With _self, the browser does a FULL redirect to Cashfree's hosted
   * checkout page. After payment, Cashfree redirects back to our
   * return_url (https://eviola.in/checkout?cf_order_id=...). We detect
   * that query param on page load and complete the order.
   *
   * Before redirecting, we save the pending order data (cart items,
   * form, payment method, totals) to sessionStorage so we can recreate
   * the order after the redirect-back.
   *
   * This function does NOT return a boolean — it navigates away from
   * the page. The order completion happens in the useEffect that runs
   * on page load when cf_order_id is present in the URL.
   */
  function redirectToCashfreeCheckout(
    paymentSessionId: string,
    cashfreeOrderId: string,
    orderContext: {
      method: 'prepaid' | 'cod'
      paymentStatus: string
      subtotal: number
      shipping: number
      total: number
      discountCode: string | null
      discountAmount: number
    }
  ) {
    // Save the order context to sessionStorage so we can complete the
    // order after Cashfree redirects back. We can't pass this data
    // through Cashfree's redirect URL (too much data for query params),
    // so sessionStorage is the bridge.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cf_pending_order', JSON.stringify({
        cashfreeOrderId,
        ...orderContext,
        // Also save the cart + form so createOrderRecord has everything
        items: items.map((i) => ({
          productId: i.productId,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })),
        form: { ...form },
        useremail: user?.email || '',
      }))
    }

    // Load the Cashfree SDK and redirect
    loadCashfreeScript().then(() => {
      const w = window as unknown as {
        Cashfree: (config: { mode: string }) => {
          checkout: (opts: {
            paymentSessionId: string
            redirectTarget: string
          }) => void
        }
      }

      const environment = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || 'sandbox'
      const cashfree = w.Cashfree({ mode: environment })

      // _self = full-page redirect. After payment, Cashfree redirects
      // back to our return_url with cf_order_id in the query string.
      cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_self',
      })
    }).catch(() => {
      toast.error('Failed to load payment gateway. Please try again.')
      setPlacing(false)
    })
  }

  /** Cashfree prepaid order flow — uses redirect-based checkout */
  const placePrepaidOrderCashfree = async () => {
    // FS2 flat-price override: total is ₹2 regardless of subtotal.
    if (isFS2) {
      setPlacing(true)
      try {
        const createRes = await fetch('/api/cashfree/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 2,
            customerName: form.name,
            customerPhone: form.phone,
            customerEmail: user?.email || '',
          }),
        })
        const orderData = await createRes.json()
        if (!createRes.ok || !orderData.paymentSessionId) {
          toast.error(orderData.error || 'Failed to initiate payment')
          setPlacing(false)
          return
        }

        // Redirect to Cashfree checkout. Order completion happens after
        // redirect-back (detected by cf_order_id in the URL).
        redirectToCashfreeCheckout(orderData.paymentSessionId, orderData.orderId, {
          method: 'prepaid',
          paymentStatus: 'paid',
          subtotal: 2,
          shipping: 0,
          total: 2,
          discountCode: appliedPromo?.code || null,
          discountAmount: promoDiscount || 0,
        })
      } catch (e) {
        console.error(e)
        toast.error('Payment error — please try again')
        setPlacing(false)
      }
      return
    }

    // Normal prepaid flow — recompute totals with the prepaid extra 10% discount.
    const prepaidExtra = Math.round((sub - promoDiscount) * 0.10)
    const prepaidDiscountTotal = promoDiscount + prepaidExtra
    const prepaidShipping =
      sub - prepaidDiscountTotal >= FREE_SHIPPING_THRESHOLD || sub === 0 ? 0 : 99
    const prepaidTotal = Math.max(0, sub - prepaidDiscountTotal) + prepaidShipping

    setPlacing(true)
    try {
      const createRes = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: prepaidTotal,
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: user?.email || '',
        }),
      })
      const orderData = await createRes.json()
      if (!createRes.ok || !orderData.paymentSessionId) {
        toast.error(orderData.error || 'Failed to initiate payment')
        setPlacing(false)
        return
      }

      // Redirect to Cashfree checkout. Order completion happens after
      // redirect-back (detected by cf_order_id in the URL).
      redirectToCashfreeCheckout(orderData.paymentSessionId, orderData.orderId, {
        method: 'prepaid',
        paymentStatus: 'paid',
        subtotal: sub - prepaidDiscountTotal,
        shipping: prepaidShipping,
        total: prepaidTotal,
        discountCode: appliedPromo?.code || null,
        discountAmount: promoDiscount || 0,
      })
    } catch (e) {
      console.error(e)
      toast.error('Payment error — please try again')
      setPlacing(false)
    }
  }

  /** Cashfree COD order flow — uses redirect-based checkout */
  const placeCodOrderCashfree = async () => {
    setPlacing(true)
    try {
      const createRes = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: codPartial,
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: user?.email || '',
        }),
      })
      const orderData = await createRes.json()
      if (!createRes.ok || !orderData.paymentSessionId) {
        toast.error(orderData.error || 'Failed to initiate payment')
        setPlacing(false)
        return
      }

      // Redirect to Cashfree checkout. Order completion happens after
      // redirect-back (detected by cf_order_id in the URL).
      redirectToCashfreeCheckout(orderData.paymentSessionId, orderData.orderId, {
        method: 'cod',
        paymentStatus: 'partial_paid',
        subtotal: sub - discount,
        shipping,
        total,
        discountCode: appliedPromo?.code || null,
        discountAmount: promoDiscount || 0,
      })
    } catch (e) {
      console.error(e)
      toast.error('Payment error — please try again')
      setPlacing(false)
    }
  }

  async function createOrderRecord(
    method: string,
    paymentStatus: string,
    overrides?: { subtotal?: number; shipping?: number; total?: number }
  ) {
    // When `overrides` is provided, use the supplied totals — this is
    // used by placePrepaidOrder when triggered from the COD confirmation
    // card, where the outer-scope `total` doesn't yet reflect the prepaid
    // extra 10% discount. When `overrides` is omitted (the default path
    // for both prepaid-when-already-prepaid and COD), the outer-scope
    // values are correct.
    const orderSubtotal = overrides?.subtotal ?? sub - discount
    const orderShipping = overrides?.shipping ?? shipping
    const orderTotal = overrides?.total ?? total

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
        subtotal: orderSubtotal,
        shipping: orderShipping,
        total: orderTotal,
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

  // Cashfree redirect-back processing screen — shown while we verify
  // the payment and create the order after Cashfree redirects back.
  // This takes priority over the empty-bag check because the cart may
  // appear empty during processing (the pending order data is in
  // sessionStorage, not in the cart store).
  if (cfProcessing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">Verifying your payment...</h1>
        <p className="mt-2 text-muted-foreground">Please wait while we confirm your order.</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Your bag is empty</h1>
        <p className="mt-2 text-muted-foreground">Add some jewelry before checking out.</p>
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
                          Pay <span className="font-semibold text-brand">{formatPrice(codPartial)} now</span> to confirm your COD order and{' '}
                          <span className="font-semibold text-foreground">{formatPrice(codRemaining)}</span> when your jewelry is delivered.
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
                      // Checkout summary thumbnail is 64x64 (h-16 w-16). w_200 covers 2x retina.
                      <img src={optimizeCloudinaryUrl(item.image, 200)} alt={item.title} className="h-full w-full object-cover" />
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
                {isFS2
                  ? ' (flat ₹2 total!)'
                  : appliedPromo.type === 'percentage'
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
              {/* FS2 flat-price override — show the discount as a single line
                  so the user can see why the total dropped to ₹2. */}
              {isFS2 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>FS2 flat price</span>
                  <span>− {formatPrice(Math.max(0, sub - 2))}</span>
                </div>
              )}
              {!isFS2 && promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Promo discount</span>
                  <span>− {formatPrice(promoDiscount)}</span>
                </div>
              )}
              {!isFS2 && prepaidExtraDiscount > 0 && (
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
                  <span className="font-semibold text-brand">{formatPrice(codPartial)}</span>
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
                <>
                  {payment === 'cod' ? `Place Order - Pay ${formatPrice(codPartial)}` : 'Place Order'}
                </>
              )}
            </Button>
          </div>
        </aside>
      </div>

      {/*
        COD confirmation bottom sheet.
        Slides in from the bottom of the screen when a customer picks COD
        and taps "Place Order". Offers them to switch to prepaid for an
        extra 10% off (which they can accept or decline and proceed with
        COD). The card has an X button to close, and two actions:
          1. "Confirm & place order" — proceeds with the original COD flow.
          2. "Pay online (save extra 10%)" — switches to prepaid and runs
             the prepaid flow with the discounted total.
        Backdrop click also closes the card. Nothing else in the checkout
        flow is affected.
      */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-300',
          showCodConfirm ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden={!showCodConfirm}
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop — click anywhere to close */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setShowCodConfirm(false)}
        />
        {/* Card — slides up from the bottom on mobile, anchored bottom on desktop */}
        <div
          className={cn(
            'relative w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 shadow-2xl transition-transform duration-300 ease-out',
            showCodConfirm ? 'translate-y-0' : 'translate-y-full'
          )}
        >
          {/* Small grab handle */}
          <div className="mx-auto h-1 w-10 rounded-full bg-muted mb-3" />
          {/* X close button */}
          <button
            type="button"
            onClick={() => setShowCodConfirm(false)}
            className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="text-center pt-1">
            <div className="inline-flex h-12 w-12 rounded-full bg-emerald-50 items-center justify-center mb-3">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Pay online &amp; save extra 10%
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Switch to online payment now to unlock an extra{' '}
              <span className="font-semibold text-emerald-600">{formatPrice(onlineSaving)}</span>{' '}
              off on this order. Pay securely via UPI, cards, or wallets.
            </p>
          </div>

          <div className="mt-5 space-y-2">
            {/* Recommended: Pay online (brand color, primary) */}
            <Button
              className="w-full h-12 bg-brand text-white hover:shadow-lg text-sm font-semibold"
              onClick={() => {
                setShowCodConfirm(false)
                setPayment('prepaid')
                // Use the active payment provider (Cashfree or Razorpay)
                if (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === 'cashfree') {
                  placePrepaidOrderCashfree()
                } else {
                  placePrepaidOrder()
                }
              }}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Pay online (save extra 10%)
            </Button>

            {/* Secondary: Confirm COD (outline) */}
            <Button
              variant="outline"
              className="w-full h-12 border-pink-100 text-foreground hover:bg-muted text-sm font-medium"
              onClick={() => {
                setShowCodConfirm(false)
                // Use the active payment provider (Cashfree or Razorpay)
                if (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === 'cashfree') {
                  placeCodOrderCashfree()
                } else {
                  placeCodOrder()
                }
              }}
            >
              <Banknote className="h-4 w-4 mr-2" />
              Confirm &amp; Place COD Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
