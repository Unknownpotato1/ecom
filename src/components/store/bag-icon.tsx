import type { SVGProps } from 'react'

/**
 * BagIcon — the custom shopping bag icon used throughout the store.
 *
 * A clean, minimal bag with a handle arc — thin 1.7px strokes, no fill.
 * Used in: header (bag button), product cards (Add button), cart drawer
 * (empty state), and anywhere else a bag/cart icon is needed.
 *
 * Replaces the old lucide-react ShoppingBag icon with a more refined,
 * premium look.
 */
export function BagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Bag body */}
      <rect
        x="4"
        y="8"
        width="16"
        height="13"
        stroke="currentColor"
        strokeWidth="1.7"
        fill="none"
        {...(props.stroke ? {} : {})}
      />
      {/* Handle */}
      <path
        d="M8 8V6.5C8 4.57 9.57 3 11.5 3H12.5C14.43 3 16 4.57 16 6.5V8"
        stroke="currentColor"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
