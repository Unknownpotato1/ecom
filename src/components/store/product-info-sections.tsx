'use client'

import { useEffect, useRef, useState } from 'react'

/* ============================================================
   SHARED TYPES
============================================================ */

type ChatMessage = {
  type: 'user' | 'bot'
  text: string
  isWhatsapp?: boolean
}

const QUICK_OPTIONS = [
  '📦 Where is my order?',
  '📍 How to track my order?',
  '↩ Returns & Refunds',
  '🚚 Delivery Information',
  '🎁 Product Questions',
  '💳 Payment Help',
  '👩 Talk to our team',
]

const RESPONSES: Record<string, string> = {
  '📦 Where is my order?': "Please enter your Order ID and we'll look it up for you.",
  '📍 How to track my order?':
    'You can track your order anytime via My Orders in the menu. You should also have received a confirmation email with a tracking link.',
  '↩ Returns & Refunds': 'Returns are accepted within 7 days of delivery. Please reach out with your order details.',
  '🚚 Delivery Information': 'Delivery usually takes 3–7 business days across India.',
  '🎁 Product Questions': "Ask us anything about our artificial jewelry — we're happy to help!",
  '💳 Payment Help': 'We accept UPI, Credit/Debit Cards, and Cash on Delivery (COD).',
  '👩 Talk to our team': 'https://wa.me/917780022167',
}

/* ============================================================
   QUICK CHAT + QUANTITY PICKER
============================================================ */

function QuickChatSection() {
  const [qty, setQty] = useState(1)
  const [liked, setLiked] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typing, setTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [fileName, setFileName] = useState('')

  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, typing])

  const reply = (text: string) => {
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      if (text.startsWith('http')) {
        setMessages((prev) => [...prev, { type: 'bot', text, isWhatsapp: true }])
      } else {
        setMessages((prev) => [...prev, { type: 'bot', text }])
      }
    }, 800)
  }

  const handleOptionClick = (option: string) => {
    setMessages((prev) => [...prev, { type: 'user', text: option }])
    reply(RESPONSES[option])
  }

  const handleSend = () => {
    if (!inputValue.trim()) return
    setMessages((prev) => [...prev, { type: 'user', text: inputValue }])
    reply('Thanks! Our team will get back to you shortly.')
    setInputValue('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFileName(e.target.files[0].name)
    } else {
      setFileName('')
    }
  }

  return (
    <div className="quick-chat-root">
      <div className="action-row">
        <div className="qty-picker">
          <button onClick={() => setQty((q) => (q > 1 ? q - 1 : q))}>−</button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)}>+</button>
        </div>

        <button className="wishlist-btn" onClick={() => setLiked((l) => !l)}>
          <svg
            viewBox="0 0 24 24"
            fill={liked ? '#f9758d' : 'none'}
            stroke={liked ? '#f9758d' : '#444'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <button className="chat-btn" onClick={() => setChatOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            <path d="M8 10h8" />
            <path d="M8 14h5" />
          </svg>
          <span>Quick Chat</span>
        </button>
      </div>

      <div className={`chat-window ${chatOpen ? 'show' : ''}`}>
        <div className="chat-header">
          <strong>Eviola Support</strong>
          <button className="close-btn" aria-label="Close chat" onClick={() => setChatOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="messages" ref={messagesRef}>
          <div className="intro-text">
            Hello from Eviola! Need help, tips, or just curious? We&apos;re always here to chat! ♥️
            <br />
            You might be wondering
          </div>

          <div className="quick-options">
            {QUICK_OPTIONS.map((option) => (
              <button key={option} onClick={() => handleOptionClick(option)}>
                {option}
              </button>
            ))}
          </div>

          {messages.map((msg, i) =>
            msg.type === 'user' ? (
              <div className="user-message" key={i}>
                {msg.text}
              </div>
            ) : msg.isWhatsapp ? (
              <div className="bot-message" key={i}>
                Our team is ready to help you!
                <a href={msg.text} target="_blank" rel="noopener noreferrer" className="wa-link">
                  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Chat on WhatsApp
                </a>
              </div>
            ) : (
              <div className="bot-message" key={i}>
                {msg.text}
              </div>
            )
          )}
        </div>

        {typing && <div className="typing">Eviola is typing...</div>}

        <div className="chat-input">
          <input
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
          />

          <div className={`upload-wrap ${fileName ? 'has-file' : ''}`}>
            <label className="upload-label" htmlFor="uploadImage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </label>
            <input id="uploadImage" type="file" onChange={handleFileChange} />
            <span className="file-name">{fileName}</span>
          </div>

          <button id="sendMessage" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>

      {/*
        Plain <style> tags (NOT <style jsx>).
        Next.js 16 dropped built-in styled-jsx support — <style jsx>
        silently emits the JSX class names but NOT the CSS rules, so the
        section would render unstyled on production. Using regular
        <style> tags works everywhere. The rules are scoped by unique
        class names (quick-chat-root, action-row, qty-picker, chat-window,
        ...) which only exist in this component, so there's no leak risk.
      */}
      <style>{`
        .quick-chat-root .action-row {
          display: flex;
          gap: 8px;
        }
        .quick-chat-root .qty-picker {
          flex: 4;
          height: 48px;
          border: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
        }
        .quick-chat-root .qty-picker button {
          width: 42px;
          height: 100%;
          border: none;
          background: #fff;
          font-size: 22px;
          cursor: pointer;
        }
        .quick-chat-root .wishlist-btn {
          flex: 1;
          min-width: 48px;
          border: 1px solid #ddd;
          background: #fff;
        }
        .quick-chat-root .chat-btn {
          flex: 4.5;
          border: none;
          background: #f9758d;
          color: #fff;
          font-weight: 600;
          gap: 8px;
        }
        .quick-chat-root .wishlist-btn,
        .quick-chat-root .chat-btn {
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .quick-chat-root .wishlist-btn svg {
          width: 20px;
          height: 20px;
        }
        .quick-chat-root .chat-btn svg {
          width: 19px;
          height: 19px;
          flex-shrink: 0;
        }
        .quick-chat-root .chat-btn span {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .quick-chat-root .chat-window {
          position: fixed;
          right: 18px;
          bottom: 80px;
          width: 360px;
          height: 620px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9999;
          opacity: 0;
          transform: translateY(24px) scale(0.96);
          pointer-events: none;
          visibility: hidden;
          transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), visibility 0s linear 0.28s;
        }
        .quick-chat-root .chat-window.show {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
          visibility: visible;
          transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), visibility 0s linear 0s;
        }

        @media (max-width: 480px) {
          .quick-chat-root .chat-window {
            right: 10px;
            left: 10px;
            bottom: 76px;
            width: auto;
            height: min(620px, 78vh);
          }
          .quick-chat-root .chat-btn {
            font-size: 14px;
          }
        }

        .quick-chat-root .chat-header {
          background: #f9758d;
          color: #fff;
          padding: 16px 16px 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .quick-chat-root .chat-header strong {
          font-size: 16px;
          letter-spacing: 0.2px;
        }

        .quick-chat-root .close-btn {
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.18s ease, transform 0.18s ease;
        }
        .quick-chat-root .close-btn svg {
          width: 14px;
          height: 14px;
        }
        .quick-chat-root .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .quick-chat-root .close-btn:active {
          transform: scale(0.9);
        }

        .quick-chat-root .messages {
          flex: 1;
          padding: 16px;
          overflow: auto;
          background: #fafafa;
        }
        .quick-chat-root .intro-text {
          font-size: 14px;
          line-height: 1.5;
          color: #333;
          margin-bottom: 14px;
        }
        .quick-chat-root .bot-message,
        .quick-chat-root .user-message {
          padding: 12px 14px;
          border-radius: 14px;
          margin-bottom: 10px;
          max-width: 85%;
          line-height: 1.4;
          font-size: 14px;
        }
        .quick-chat-root .bot-message {
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
        }
        .quick-chat-root .user-message {
          background: #f9758d;
          color: #fff;
          margin-left: auto;
        }
        .quick-chat-root .quick-options button {
          display: block;
          width: 100%;
          margin: 8px 0;
          padding: 12px;
          border: 1px solid #eee;
          background: #fff;
          border-radius: 12px;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .quick-chat-root .quick-options button:hover {
          background: #fff5f6;
          border-color: #f9758d;
        }
        .quick-chat-root .typing {
          padding: 10px 16px;
          font-size: 13px;
          color: #777;
        }

        .quick-chat-root .chat-input {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid #eee;
          background: #fff;
        }
        .quick-chat-root .chat-input input[type='text'] {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .quick-chat-root .chat-input input[type='text']:focus {
          border-color: #f9758d;
        }

        .quick-chat-root .upload-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .quick-chat-root .upload-wrap input[type='file'] {
          position: absolute;
          inset: 0;
          width: 36px;
          height: 36px;
          opacity: 0;
          cursor: pointer;
        }
        .quick-chat-root .upload-label {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #ddd;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #888;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        .quick-chat-root .upload-label svg {
          width: 18px;
          height: 18px;
        }
        .quick-chat-root .upload-wrap:hover .upload-label {
          border-color: #f9758d;
          color: #f9758d;
          background: #fff5f6;
        }
        .quick-chat-root .upload-wrap.has-file .upload-label {
          border-color: #f9758d;
          color: #f9758d;
          background: #fff5f6;
        }
        .quick-chat-root .file-name {
          position: absolute;
          bottom: -20px;
          left: 0;
          font-size: 11px;
          color: #f9758d;
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .quick-chat-root .chat-input button#sendMessage {
          border: none;
          background: #f9758d;
          color: #fff;
          font-weight: 600;
          padding: 0 16px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .quick-chat-root .chat-input button#sendMessage:hover {
          background: #f45f7a;
        }

        .quick-chat-root .wa-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #25d366;
          color: #fff;
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          margin-top: 4px;
        }
        .quick-chat-root .wa-link svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

/* ============================================================
   OFFERS BANNER + VIDEO
============================================================ */

function OffersVideo() {
  return (
    <div className="offers-video-root">
      <div className="offers-section">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.99 14.993 6-6m6 3.001c0 1.268-.63 2.39-1.593 3.069a3.746 3.746 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043 3.745 3.745 0 0 1-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.297 3.746 3.746 0 0 1-1.593-3.068c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 0 1 1.043-3.297 3.745 3.745 0 0 1 3.296-1.042 3.745 3.745 0 0 1 3.068-1.594c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.297 3.746 3.746 0 0 1 1.593 3.068ZM9.74 9.743h.008v.007H9.74v-.007Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
        Available Offers
      </div>

      <div className="video-wrapper">
        <video autoPlay muted loop playsInline>
          <source src="https://cdn.shopify.com/videos/c/o/v/c7a1eaa754a94e799cc461d05a288f68.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <style>{`
        .offers-video-root .offers-section {
          width: 100%;
          max-width: 100%;
          margin: 0;
          background-color: #f9758d;
          color: #fff;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          padding: 8px 0;
          line-height: 1.2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .offers-video-root .offers-section svg {
          width: 20px;
          height: 20px;
          stroke: #fff;
          flex-shrink: 0;
        }
        .offers-video-root .video-wrapper {
          width: 100%;
          max-width: 100%;
          margin: 0;
          overflow: hidden;
          border: 1px solid #f9758d;
          background: transparent;
        }
        .offers-video-root .video-wrapper video {
          width: 100%;
          display: block;
          height: auto;
        }
      `}</style>
    </div>
  )
}

/* ============================================================
   DELIVERY INFO
============================================================ */

function DeliveryInfo() {
  const [pincode, setPincode] = useState('')
  const [resultColor, setResultColor] = useState('#555')
  const [resultHtml, setResultHtml] = useState<React.ReactNode>(null)

  const checkPincode = async () => {
    if (!/^[0-9]{6}$/.test(pincode)) {
      setResultColor('#d32f2f')
      setResultHtml('Please enter a valid 6-digit pincode.')
      return
    }

    setResultColor('#555')
    setResultHtml('Checking...')

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()

      if (data[0].Status !== 'Success') {
        setResultColor('#d32f2f')
        setResultHtml('Delivery unavailable for this pincode.')
        return
      }

      const office = data[0].PostOffice[0]

      const delivery = new Date()
      delivery.setDate(delivery.getDate() + 5)

      const formatted = delivery.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })

      setResultColor('#222')
      setResultHtml(
        <>
          <strong>
            {office.District}, {office.State}
          </strong>
          <br />
          Estimated Delivery: <strong>{formatted}</strong>
        </>
      )
    } catch {
      setResultColor('#d32f2f')
      setResultHtml('Unable to check delivery.')
    }
  }

  return (
    <div className="delivery-info-root">
      <div className="delivery-heading">
        <h3>Delivery Info</h3>
      </div>

      <div className="pincode-box">
        <input
          type="text"
          maxLength={6}
          placeholder="Enter a pincode to check"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
        />
        <button onClick={checkPincode}>Check</button>
      </div>

      <div className="delivery-result" style={{ color: resultColor }}>
        {resultHtml}
      </div>

      <div className="delivery-item">
        <div className="icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M13 2L4 14H11L10 22L20 9H13V2Z" fill="#FFD54F" />
          </svg>
        </div>
        <div className="text">
          <strong>Fast Delivery available</strong>
          <br /> Enter your pincode to check fast delivery availability.
        </div>
      </div>

      <div className="delivery-item">
        <div className="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="5" width="13" height="11" rx="2" />
            <path d="M14 8H18L22 12V16H14" />
            <circle cx="6" cy="18" r="2" />
            <circle cx="18" cy="18" r="2" />
          </svg>
        </div>
        <div className="text">
          <strong>Standard Delivery</strong>
          <br />
          Free shipping on orders above ₹249. Delivery date will appear after checking your pincode.
        </div>
      </div>

      <div className="delivery-item">
        <div className="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7L12 3L21 7L12 11L3 7Z" />
            <path d="M3 7V17L12 21L21 17V7" />
            <path d="M8 13H16" />
            <path d="M8 13L10 11" />
            <path d="M8 13L10 15" />
          </svg>
        </div>
        <div className="text">7 days easy return with pickup available.</div>
      </div>

      <div className="delivery-item">
        <div className="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M6 9H6.01" />
            <path d="M18 15H18.01" />
          </svg>
        </div>
        <div className="text">Cash on Delivery available in most areas.</div>
      </div>

      <style>{`
        .delivery-info-root {
          width: 100%;
          max-width: 500px;
          margin: auto;
        }
        .delivery-info-root .delivery-heading {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .delivery-info-root .delivery-heading h3 {
          font-size: 22px;
          font-weight: 600;
        }
        .delivery-info-root .pincode-box {
          display: flex;
          border: 1px solid #ddd;
          border-radius: 0px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .delivery-info-root .pincode-box input {
          flex: 1;
          border: none;
          outline: none;
          padding: 13px 16px;
          font-size: 15px;
        }
        .delivery-info-root .pincode-box button {
          width: 95px;
          border: none;
          background: #f9758d;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.25s;
        }
        .delivery-info-root .pincode-box button:hover {
          background: #f55f7b;
        }
        .delivery-info-root .delivery-result {
          margin: 12px 0 16px;
          font-size: 14px;
          line-height: 1.45;
        }
        .delivery-info-root .delivery-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .delivery-info-root .icon {
          width: 20px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .delivery-info-root .icon svg {
          width: 19px;
          height: 19px;
        }
        .delivery-info-root .text {
          font-size: 14px;
          line-height: 1.45;
          color: #555;
        }
        .delivery-info-root .text strong {
          color: #111;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}

/* ============================================================
   COMBINED EXPORT — order: Quick Chat/Qty → Offers Video → Delivery Info
============================================================ */

export function ProductInfoSections() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <QuickChatSection />
      <OffersVideo />
      <DeliveryInfo />
    </div>
  )
}
