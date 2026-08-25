'use client'

import { useState } from 'react'

const CATEGORIES = [
  {
    name: 'Necklace',
    href: 'https://eviola.in/collection/necklace',
    img: 'https://raw.githubusercontent.com/Unknownpotato1/Storage-/main/IMG_20260819_233621.jpg',
  },
  {
    name: 'Rings',
    href: 'https://eviola.in/collection/rings',
    img: 'https://raw.githubusercontent.com/Unknownpotato1/Storage-/main/5498de311a4a8e51abe5c20ff38a0c5a.jpg',
  },
  {
    name: 'Earrings',
    href: 'https://eviola.in/collection/earrings',
    img: 'https://raw.githubusercontent.com/Unknownpotato1/Storage-/main/IMG_20260819_232759.jpg',
  },
  {
    name: 'Bracelets',
    href: 'https://eviola.in/collection/bracelets',
    img: 'https://raw.githubusercontent.com/Unknownpotato1/Storage-/main/IMG_20260819_233607.jpg',
  },
]

export function CategorySection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <section className="category-section" id="4collection">
      <div className="category-images">
        {CATEGORIES.map((cat) => (
          <a key={cat.name} href={cat.href} className="category-image-link">
            <img src={cat.img} alt={cat.name} />
          </a>
        ))}
      </div>

      <div className="category-buttons">
        {CATEGORIES.map((cat, index) => (
          <a
            key={cat.name}
            href={cat.href}
            className={`category-button ${activeIndex === index ? 'active' : ''}`}
            onClick={() => setActiveIndex(index)}
          >
            {cat.name}
          </a>
        ))}
      </div>

      <div className="category-line" />

      {/*
        Plain <style> tag (NOT <style jsx>).
        Next.js 16 dropped built-in styled-jsx support — <style jsx>
        silently emits the JSX class names but NOT the CSS rules, so the
        section would render unstyled on production. Using a regular
        <style> tag works everywhere. The rules are scoped by the unique
        class names (category-section, category-images, category-button,
        ...) which only exist in this component, so there's no leak risk.
      */}
      <style>{`
        .category-section {
          width: 100%;
          background: #fff;
        }

        .category-images {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }

        .category-image-link {
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
        }

        .category-image-link img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .category-buttons {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }

        .category-button {
          width: 100%;
          border: none;
          background: #fff;
          color: #000;
          padding: 8px 3px;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2px;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.25s ease, color 0.25s ease;
        }

        .category-button:hover {
          background: #f9758d;
          color: #fff;
        }

        .category-button.active {
          background: #f9758d;
          color: #fff;
        }

        .category-line {
          width: 100%;
          height: 1px;
          background: #ddd;
        }
      `}</style>
    </section>
  )
}
