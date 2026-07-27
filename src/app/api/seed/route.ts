import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SAMPLE_PRODUCTS = [
  {
    title: 'Midnight Bliss Chocolate Hamper',
    description: 'Premium dark chocolates, roasted almonds and a hand-poured soy candle for cosy evenings.',
    longDescription:
      'A curated gift for the chocolate lover. Includes single-origin 70% dark chocolate bars, chocolate-dipped almonds, a silk-wrapped soy candle, and a reusable kraft gift box. Every item is hand-picked and packed with a personalised note card.',
    price: 1899,
    comparedPrice: 2499,
    category: 'Chocolate',
    isTrending: true,
    isBestSeller: true,
    specifications: JSON.stringify([
      { key: 'Items', value: '6 chocolates, 1 candle, 1 almonds jar' },
      { key: 'Weight', value: '650 g' },
      { key: 'Shelf life', value: '6 months' },
      { key: 'Veg', value: 'Yes' },
    ]),
    tags: JSON.stringify(['New Arrival']),
    image: 'https://images.unsplash.com/photo-1545366789-15e8f9b24d6c?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Rose Petal Spa Hamper',
    description: 'Rose-scented bath salts, body scrub, hand cream and a soy candle in a vintage basket.',
    longDescription:
      'A pampering hamper for someone who deserves to slow down. Includes rose bath salts, sugar body scrub, shea hand cream, soy candle, and a wooden massage comb. Beautifully wrapped in a reusable willow basket.',
    price: 2499,
    comparedPrice: 3299,
    category: 'Spa',
    isTrending: true,
    isBestSeller: false,
    specifications: JSON.stringify([
      { key: 'Items', value: '5 spa essentials' },
      { key: 'Fragrance', value: 'Rose' },
      { key: 'Skin type', value: 'All' },
    ]),
    tags: JSON.stringify(['Limited']),
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Festive Sweets & Dry Fruits Hamper',
    description: 'Kaju katli, motichoor laddoo, premium California almonds and pistachios in a brass diya box.',
    longDescription:
      'Celebrate the festival of lights with this royal hamper. Includes 250g kaju katli, 250g motichoor laddoo, 200g roasted almonds, 200g pistachios, two handcrafted brass diyas, and a pack of decorative tea lights.',
    price: 2199,
    comparedPrice: 2799,
    category: 'Festive',
    isTrending: false,
    isBestSeller: true,
    specifications: JSON.stringify([
      { key: 'Sweets', value: '500 g' },
      { key: 'Dry fruits', value: '400 g' },
      { key: 'Includes', value: '2 brass diyas + tea lights' },
    ]),
    tags: JSON.stringify(['Festive Special']),
    image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Coffee Lover Morning Hamper',
    description: 'Single-origin arabica beans, French press, ceramic mug and biscotti for the perfect morning.',
    longDescription:
      'Curated for the coffee connoisseur. Includes 250g single-origin arabica beans from Coorg, a 350ml borosilicate French press, a 300ml stoneware mug, artisanal biscotti, and a copper measuring scoop.',
    price: 1799,
    comparedPrice: 2299,
    category: 'Coffee',
    isTrending: true,
    isBestSeller: false,
    specifications: JSON.stringify([
      { key: 'Coffee', value: '250 g arabica' },
      { key: 'Mug', value: '300 ml stoneware' },
      { key: 'Roast', value: 'Medium' },
    ]),
    tags: JSON.stringify(['Best Pick']),
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Birthday Surprise Box',
    description: 'Confetti cake jar, balloon, scented candle, chocolates and a hand-written greeting card.',
    longDescription:
      'Everything you need to make a birthday special. Includes a confetti cake jar, a helium balloon (delivered inflated), scented candle, assorted chocolates, and a customised greeting card with your message.',
    price: 1499,
    comparedPrice: 1999,
    category: 'Birthday',
    isTrending: false,
    isBestSeller: true,
    specifications: JSON.stringify([
      { key: 'Cake jar', value: '180 g' },
      { key: 'Card', value: 'Customisable' },
      { key: 'Balloon', value: 'Helium inflated' },
    ]),
    tags: JSON.stringify(['Gift Card']),
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Tea Time Essentials Hamper',
    description: 'Darjeeling first flush, masala chai, shortbread cookies and a porcelain tea cup set.',
    longDescription:
      'A timeless gift for tea enthusiasts. Includes 100g Darjeeling first flush tea, 100g masala chai, artisanal shortbread cookies, a pair of porcelain tea cups with saucers, and a stainless steel infuser.',
    price: 1599,
    comparedPrice: 2099,
    category: 'Tea',
    isTrending: false,
    isBestSeller: false,
    specifications: JSON.stringify([
      { key: 'Tea', value: '200 g total' },
      { key: 'Cups', value: '2 porcelain' },
      { key: 'Cookies', value: '150 g' },
    ]),
    tags: JSON.stringify(['Classic']),
    image: 'https://images.unsplash.com/photo-1582793988951-9aed5509eb97?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'New Baby Welcome Hamper',
    description: 'Organic baby onesie, soft blanket, rattle, baby wash and a congratulatory note for new parents.',
    longDescription:
      'Welcome the newest member of the family with this tender hamper. Includes 100% organic cotton onesie (0-3m), soft muslin blanket, wooden rattle, gentle baby wash, and a personalised welcome card for the parents.',
    price: 2599,
    comparedPrice: 3199,
    category: 'Baby',
    isTrending: true,
    isBestSeller: false,
    specifications: JSON.stringify([
      { key: 'Onesie size', value: '0-3 months' },
      { key: 'Blanket', value: '60x80 cm muslin' },
      { key: 'Material', value: 'Organic cotton' },
    ]),
    tags: JSON.stringify(['Premium']),
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Anniversary Wine & Cheese Hamper',
    description: 'Red wine, aged cheddar, crackers, dark chocolate and two crystal wine glasses in a wooden crate.',
    longDescription:
      'Toast to forever with this elegant anniversary hamper. Includes a bottle of red wine, 200g aged cheddar, artisanal crackers, dark chocolate bar, two crystal wine glasses, and a satin-lined wooden crate.',
    price: 3499,
    comparedPrice: 4499,
    category: 'Anniversary',
    isTrending: true,
    isBestSeller: true,
    specifications: JSON.stringify([
      { key: 'Wine', value: '750 ml red' },
      { key: 'Glasses', value: '2 crystal' },
      { key: 'Cheese', value: '200 g aged cheddar' },
    ]),
    tags: JSON.stringify(['Premium']),
    image: 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=800&q=80&auto=format&fit=crop',
  },
]

export async function POST() {
  // Reset
  await db.review.deleteMany()
  await db.productImage.deleteMany()
  await db.product.deleteMany()
  await db.section.deleteMany()
  await db.customSection.deleteMany()
  await db.siteSetting.deleteMany()

  // Seed products
  for (const p of SAMPLE_PRODUCTS) {
    await db.product.create({
      data: {
        title: p.title,
        slug: p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: p.description,
        longDescription: p.longDescription,
        price: p.price,
        comparedPrice: p.comparedPrice,
        rating: 4 + Math.random(),
        reviewCount: Math.floor(Math.random() * 80) + 12,
        stock: 25,
        category: p.category,
        isTrending: p.isTrending,
        isBestSeller: p.isBestSeller,
        specifications: p.specifications,
        tags: p.tags,
        images: {
          create: [
            { url: p.image, alt: p.title, position: 0 },
            {
              url: p.image.replace('w=800', 'w=1200'),
              alt: p.title + ' - alt view',
              position: 1,
            },
          ],
        },
      },
    })
  }

  // Seed default sections
  await db.section.createMany({
    data: [
      { type: 'hero', position: 0, visible: true, title: 'Hero Banner', config: JSON.stringify({ imageUrl: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1600&q=80&auto=format&fit=crop', title: 'Gifts that glow', subtitle: 'Thoughtfully curated hampers for every occasion — hand-packed with love.', ctaText: 'Shop Best Sellers', badge: 'New Spring Collection' }) },
      { type: 'products', position: 1, visible: true, title: 'Best Sellers', config: JSON.stringify({ filter: 'best' }) },
      { type: 'products', position: 2, visible: true, title: 'Trending Now', config: JSON.stringify({ filter: 'trending' }) },
      { type: 'products', position: 3, visible: true, title: 'All Hampers', config: JSON.stringify({ filter: 'all' }) },
    ],
  })

  // Seed site settings
  await db.siteSetting.createMany({
    data: [
      { key: 'announcement', value: 'Free shipping on orders above ₹1,499 — hand-packed with love.' },
      { key: 'shippingFee', value: '99' },
      { key: 'freeShippingThreshold', value: '1499' },
    ],
  })

  return NextResponse.json({ ok: true, message: 'Seeded successfully' })
}
