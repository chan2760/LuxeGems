import { connectDB } from "../../../lib/mongodb";
import { hashPassword } from "../../../lib/auth";

export async function GET() {
  const db = await connectDB();

  await Promise.all([
    db.collection("materials").deleteMany({}),
    db.collection("jewelryTypes").deleteMany({}),
    db.collection("stones").deleteMany({}),
    db.collection("customizationOptions").deleteMany({}),
    db.collection("users").deleteMany({}),
    db.collection("sessions").deleteMany({}),
    db.collection("products").deleteMany({}),
    db.collection("cart").deleteMany({})
  ]);

  await db.collection("materials").insertMany([
    { name: "Gold", pricePerGram: 70 },
    { name: "Silver", pricePerGram: 25 },
    { name: "Platinum", pricePerGram: 90 }
  ]);

  await db.collection("jewelryTypes").insertMany([
    { name: "Ring", baseWeight: 5 },
    { name: "Bracelet", baseWeight: 15 },
    { name: "Necklace", baseWeight: 25 },
    { name: "Earring", baseWeight: 3 }
  ]);

  await db.collection("stones").insertMany([
    {
      name: "Diamond",
      grades: [
        { grade: "A", price: 500 },
        { grade: "B", price: 300 }
      ]
    },
    {
      name: "Opal",
      grades: [
        { grade: "Premium", price: 200 },
        { grade: "Standard", price: 120 }
      ]
    }
  ]);

  const defaultDesigns = [
    {
      id: "bracelet-chain",
      title: "Chain Bracelet",
      category: "Bracelet",
      image: "/products/auric-chain-bracelet.webp",
      allowed: true,
      productId: ""
    },
    {
      id: "bracelet-alt",
      title: "Bracelet Alt",
      category: "Bracelet",
      image: "/products/bracelet-new.jpg",
      allowed: true,
      productId: ""
    },
    {
      id: "ring-sapphire",
      title: "Sapphire Ring",
      category: "Ring",
      image: "/products/midnight-sapphire-ring.jpg",
      allowed: true,
      productId: ""
    },
    {
      id: "necklace-pearl",
      title: "Pearl Necklace",
      category: "Necklace",
      image: "/products/velvet-pearl-necklace.jpg",
      allowed: true,
      productId: ""
    },
    {
      id: "earring-stud",
      title: "Stud Earrings",
      category: "Earring",
      image: "/products/nova-stud-earrings.jpg",
      allowed: true,
      productId: ""
    }
  ];

  await db.collection("customizationOptions").insertOne({
    qualities: [
      { label: "19k", multiplier: 1.05 },
      { label: "22k", multiplier: 1.15 },
      { label: "24k", multiplier: 1.25 }
    ],
    designs: defaultDesigns,
    allowedDesigns: defaultDesigns.map((item) => ({
      id: item.id,
      allowed: item.allowed
    })),
    sliderItems: [
      {
        id: "auric-chain-bracelet",
        title: "Auric Chain Bracelet",
        image: "/products/auric-chain-bracelet.webp",
        description: "Chunky gold chain bracelet with polished links.",
        price: 730,
        productId: ""
      },
      {
        id: "midnight-sapphire-ring",
        title: "Midnight Sapphire Ring",
        image: "/products/midnight-sapphire-ring.jpg",
        description: "Platinum ring with deep sapphire centerpiece.",
        price: 1250,
        productId: ""
      },
      {
        id: "nova-stud-earrings",
        title: "Nova Stud Earrings",
        image: "/products/nova-stud-earrings.jpg",
        description: "Minimal stud earrings with a bright crystal cut.",
        price: 420,
        productId: ""
      }
    ]
  });

  await db.collection("users").insertMany([
    {
      username: "admin",
      usernameLower: "admin",
      email: "admin@gmail.com",
      emailLower: "admin@gmail.com",
      passwordHash: hashPassword("admin123"),
      isAdmin: true,
      firstName: "Admin",
      lastName: "User",
      phone: "",
      birthday: "",
      province: "",
      gender: "",
      country: "Thailand",
      the1Number: "",
      marketingOptIn: false,
      createdAt: new Date()
    },
    {
      username: "user",
      usernameLower: "user",
      email: "user@gmail.com",
      emailLower: "user@gmail.com",
      passwordHash: hashPassword("user123"),
      isAdmin: false,
      firstName: "Customer",
      lastName: "User",
      phone: "",
      birthday: "",
      province: "",
      gender: "",
      country: "Thailand",
      the1Number: "",
      marketingOptIn: false,
      createdAt: new Date()
    }
  ]);

  await db.collection("products").insertMany([
    {
      name: "Classic Gold Ring",
      category: "Ring",
      price: 800,
      material: "Gold",
      quality: "22k",
      gemQuality: "Premium",
      image: "https://images.unsplash.com/photo-1662376993778-1a1e6ecd9df2?auto=format&fit=crop&fm=jpg&q=80&w=1200",
      description: "Elegant handcrafted gold ring.",
      showInSlider: true
    },
    {
      name: "Silver Diamond Bracelet",
      category: "Bracelet",
      price: 450,
      material: "Silver",
      quality: "19k",
      gemQuality: "Standard",
      image: "/products/silver-diamond-bracelet.jpg",
      description: "Stylish silver bracelet.",
      showInSlider: true
    },
    {
      name: "Pearl Drop Earring",
      category: "Earring",
      price: 520,
      material: "Gold",
      quality: "19k",
      gemQuality: "Standard",
      image: "https://images.unsplash.com/photo-1615146038229-c19e993f49a3?auto=format&fit=crop&fm=jpg&q=80&w=1200",
      description: "Minimal pearl drop earrings for daily wear.",
      showInSlider: true
    },
    {
      name: "Royal Platinum Necklace",
      category: "Necklace",
      price: 1490,
      material: "Platinum",
      quality: "24k",
      gemQuality: "Premium",
      image: "https://images.unsplash.com/photo-1763256614589-199db7a3bd51?auto=format&fit=crop&fm=jpg&q=80&w=1200",
      description: "Premium platinum necklace with modern finish.",
      showInSlider: true
    },
    {
      name: "Rose Gold Charm Bracelet",
      category: "Bracelet",
      price: 680,
      material: "Gold",
      quality: "22k",
      gemQuality: "Standard",
      image: "https://source.unsplash.com/1200x1400/?gold,bracelet,jewelry",
      description: "Rose gold bracelet with signature charm details."
    },
    {
      name: "Twilight Opal Ring",
      category: "Ring",
      price: 930,
      material: "Gold",
      quality: "24k",
      gemQuality: "Premium",
      image: "https://source.unsplash.com/1200x1400/?ring,jewelry,diamond",
      description: "Opal center stone with handcrafted gold setting."
    },
    {
      name: "Celeste Diamond Necklace",
      category: "Necklace",
      price: 1790,
      material: "Platinum",
      quality: "24k",
      gemQuality: "Premium",
      image: "https://images.unsplash.com/photo-1589128784765-a69d61ed9c39?auto=format&fit=crop&fm=jpg&q=80&w=1200",
      description: "Diamond necklace designed for formal events."
    },
    {
      name: "Luna Hoop Earring",
      category: "Earring",
      price: 390,
      material: "Silver",
      quality: "19k",
      gemQuality: "Standard",
      image: "https://source.unsplash.com/1200x1400/?earring,jewelry,silver",
      description: "Lightweight hoops with polished silver tone."
    },
    {
      name: "Aurora Tennis Bracelet",
      category: "Bracelet",
      price: 860,
      material: "Gold",
      quality: "22k",
      gemQuality: "Standard",
      image: "https://source.unsplash.com/1200x1400/?tennis,bracelet,jewelry",
      description: "Diamond-style tennis bracelet with secure clasp."
    },
    {
      name: "Starlight Pendant Necklace",
      category: "Necklace",
      price: 1120,
      material: "Silver",
      quality: "22k",
      gemQuality: "Standard",
      image: "https://source.unsplash.com/1200x1400/?pendant,necklace,jewelry",
      description: "Elegant pendant necklace for everyday and evening wear."
    },
    {
      name: "Crystal Bloom Earrings",
      category: "Earring",
      price: 540,
      material: "Gold",
      quality: "19k",
      gemQuality: "Premium",
      image: "https://source.unsplash.com/1200x1400/?gold,earring,jewelry",
      description: "Floral-inspired earrings with bright crystal accents.",
      showInSlider: true
    },
    {
      name: "Midnight Sapphire Ring",
      category: "Ring",
      price: 1250,
      material: "Platinum",
      quality: "24k",
      gemQuality: "Premium",
      image: "https://source.unsplash.com/1200x1400/?sapphire,ring,jewelry",
      description: "Platinum ring with deep sapphire centerpiece."
    },
    {
      name: "Velvet Pearl Necklace",
      category: "Necklace",
      price: 980,
      material: "Silver",
      quality: "22k",
      gemQuality: "Standard",
      image: "https://source.unsplash.com/1200x1400/?pearl,necklace,jewelry",
      description: "Elegant pearl necklace for classic styling."
    },
    {
      name: "Auric Chain Bracelet",
      category: "Bracelet",
      price: 730,
      material: "Gold",
      quality: "22k",
      gemQuality: "Standard",
      image: "/products/auric-chain-bracelet.webp",
      description: "Chunky gold chain bracelet with polished links."
    },
    {
      name: "Nova Stud Earrings",
      category: "Earring",
      price: 420,
      material: "Silver",
      quality: "19k",
      gemQuality: "Standard",
      image: "https://source.unsplash.com/1200x1400/?stud,earring,jewelry",
      description: "Minimal stud earrings with a bright crystal cut."
    }
  ]);

  const usersCount = await db.collection("users").countDocuments({});
  const productsCount = await db.collection("products").countDocuments({});

  return Response.json({
    message: "Database Seeded 💎",
    usersCount,
    productsCount
  });
}
