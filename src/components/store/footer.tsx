'use client'

export function Footer() {
  return (
    <footer className="footer">
      {/* LOGO */}
      <div className="footer-logo">
        <img
          src="https://res.cloudinary.com/drlmgjt6p/image/upload/v1787595273/aurora/jxijf7182stgkbcsnibe.png"
          alt="Eviola Logo"
        />
      </div>

      {/* TAGLINE */}
      <p className="footer-tagline">
        Hand-curated jewelry for every occasion.
        <br />
        Designed, packed and shipped with love from Lucw, India.
      </p>

      {/* CONTACT */}
      <div className="footer-contact">
        <a
          href="https://maps.google.com/?q=Gomtinagar,Lucknow"
          className="contact-row"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Madiyaon, Lucknow 226021, India
        </a>

        <a href="tel:+917780022167" className="contact-row">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.95 3.4 2 2 0 0 1 3.93 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />
          </svg>
          +91 7780022167
        </a>

        <a href="mailto:contact@eviola.in" className="contact-row">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          support.eviola@gmail.com
        </a>
      </div>

      {/* LINKS */}
      <div className="footer-links">
        {/* COMPANY */}
        <div className="footer-col">
          <div className="footer-col-title">Company</div>
          <ul>
            <li>
              <a href="https://eviola.in/pages/about-us">About Us</a>
            </li>
            <li>
              <a href="https://eviola.in/collections/festive-hampers">Privacy Policy</a>
            </li>
            <li>
              <a href="https://eviola.in/collections/birthday-hampers">Return Policy</a>
            </li>
            <li>
              <a href="https://eviola.in/collections/birthday-hampers">Terms of Service</a>
            </li>
          </ul>
        </div>

        {/* HELP */}
        <div className="footer-col">
          <div className="footer-col-title">Help</div>
          <ul>
            <li>
              <a href="https://eviola.in/pages/track-order">Track Order</a>
            </li>
            <li>
              <a href="https://eviola.in/pages/shipping-policy">Shipping Policy</a>
            </li>
            <li>
              <a href="https://eviola.in/pages/returns-refunds">Returns & Refunds</a>
            </li>
            <li>
              <a href="https://eviola.in/pages/contact">Contact Us</a>
            </li>
          </ul>
        </div>
      </div>

      {/* SOCIAL ICONS */}
      <div className="footer-social">
        {/* Facebook */}
        <a href="#" className="social-icon" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </a>

        {/* Instagram */}
        <a href="#" className="social-icon" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="#fff" strokeWidth={2} />
            <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth={2} />
            <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" stroke="none" />
          </svg>
        </a>

        {/* X / Twitter */}
        <a href="#" className="social-icon" aria-label="X" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        {/* Pinterest */}
        <a href="#" className="social-icon" aria-label="Pinterest" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.598-.299-1.482c0-1.388.806-2.428 1.808-2.428.853 0 1.267.641 1.267 1.408 0 .858-.546 2.141-.828 3.329-.236.995.499 1.806 1.476 1.806 1.771 0 3.132-1.867 3.132-4.562 0-2.387-1.715-4.055-4.163-4.055-2.836 0-4.5 2.127-4.5 4.326 0 .856.33 1.775.741 2.276a.3.3 0 0 1 .069.286c-.076.314-.244.995-.277 1.134-.044.183-.146.222-.337.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.966-.527-2.292-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
          </svg>
        </a>
      </div>

      {/* COPYRIGHT */}
      <div className="footer-bottom">© 2026 Eviola. All rights reserved.</div>

      {/*
        Plain <style> tag (NOT <style jsx>).
        Next.js 16 dropped built-in styled-jsx support — <style jsx>
        silently emits the JSX class names but NOT the CSS rules, so the
        footer rendered unstyled on production. Using a regular <style>
        tag works everywhere and the rules are scoped by the unique
        class names (footer, footer-logo, footer-tagline, ...) which
        only exist in this component, so there is no leak risk.
      */}
      <style>{`
        .footer {
          background: #f9758d;
          color: #fff;
          padding: 32px 22px 0;
          font-family: 'Montserrat', Arial, sans-serif;
        }

        .footer-logo {
          margin-bottom: 16px;
        }

        .footer-logo img {
          width: 210px;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .footer-tagline {
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.88);
          line-height: 1.65;
          margin-bottom: 22px;
          max-width: 320px;
        }

        .footer-contact {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 30px;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.88);
          text-decoration: none;
        }

        .contact-row svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          stroke: rgba(255, 255, 255, 0.88);
        }

        .footer-links {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px 16px;
          margin-bottom: 28px;
        }

        .footer-col-title {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 14px;
          letter-spacing: 0.2px;
        }

        .footer-col ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin: 0;
          padding: 0;
        }

        .footer-col ul li a {
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.82);
          text-decoration: none;
          transition: color 0.15s;
        }

        .footer-col ul li a:hover {
          color: #fff;
        }

        .footer-social {
          display: flex;
          gap: 12px;
          margin-bottom: 28px;
        }

        .social-icon {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: background 0.18s;
          flex-shrink: 0;
        }

        .social-icon:hover {
          background: rgba(255, 255, 255, 0.38);
        }

        .social-icon svg {
          width: 18px;
          height: 18px;
          fill: #fff;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
          padding: 14px 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 400;
          margin: 0;
        }
      `}</style>
    </footer>
  )
}
