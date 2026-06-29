export interface Property {
    id: number;
    slug: string;
    title: string;
    price: string;
    location: string;
    description: string;
    image: string;
    original_url: string;
    category: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    amenities: string[];
    gallery: string[];
    datePosted: string; // ISO date string e.g. "2026-04-28"
    toilets?: number;
    parkingSpaces?: number;
    furnishing?: string;
    serviced?: boolean;
    refId?: string;
    agentName?: string;
    agentWhatsApp?: string;
    agentPhone?: string;
    agentVerified?: boolean;
    sourceSite?: 'Jiji' | 'NPC';
}

export const MOCK_PROPERTIES: Property[] = [
    {
        id: 1,
        slug: "the-glass-house-terrace",
        title: "The Glass House Terrace",
        price: "150,000,000",
        location: "Ikate, Lekki, Lagos",
        description: "Experience the pinnacle of urban luxury in this architectural masterpiece. Featuring 4 oversized bedrooms, panoramic floor-to-ceiling windows, and a bespoke Italian kitchen. This smart-home integrated terrace offers 24/7 autonomous security and a private rooftop lounge overlooking the Lekki skyline.",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-1",
        category: "Terrace",
        status: "For Sale",
        bedrooms: 4,
        bathrooms: 4.5,
        sqft: 3500,
        amenities: ["Smart Home", "Rooftop Lounge", "24/7 Security", "Italian Kitchen", "Pool"],
        gallery: [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-25"
    },
    {
        id: 2,
        slug: "zenith-heights-penthouse",
        title: "Zenith Heights Penthouse",
        price: "4,500,000 / year",
        location: "Guzape, Abuja",
        description: "A sanctuary in the sky. This 3-bedroom penthouse in Guzape combines minimalist Zen aesthetics with high-performance living. Enjoy a private elevator entrance, a temperature-controlled wine cellar, and wrap-around balconies offering breathtaking views of the capital city's rolling hills.",
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-2",
        category: "Penthouse",
        status: "For Rent",
        bedrooms: 3,
        bathrooms: 3.5,
        sqft: 2800,
        amenities: ["Private Elevator", "Wine Cellar", "Wrap-around Balcony", "City Views"],
        gallery: [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-22"
    },
    {
        id: 3,
        slug: "heritage-loft-apartments",
        title: "Heritage Loft Apartments",
        price: "2,200,000 / year",
        location: "Yaba, Lagos",
        description: "Where history meets innovation. Located in the vibrant heart of Yaba's tech corridor, these 2-bedroom lofts feature industrial exposed brick, ultra-high ceilings, and high-speed fiber optic integration. Perfect for the modern creative professional seeking a blend of character and connectivity.",
        image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-3",
        category: "Apartment",
        status: "For Rent",
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1500,
        amenities: ["Exposed Brick", "High Ceilings", "Fiber Optic Internet", "Co-working space"],
        gallery: [
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1502672260266-1c1f52d36214?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-20"
    },
    {
        id: 4,
        slug: "royal-palms-estate",
        title: "Royal Palms Estate",
        price: "250,000,000",
        location: "Maitama, Abuja",
        description: "An enclave of absolute privacy. This palatial 5-bedroom detached duplex is situated within one of Maitama's most exclusive estates. Features include a gold-leafed foyer, an olympic-sized swimming pool, and dedicated staff quarters, all surrounded by lush, manicured tropical gardens.",
        image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-4",
        category: "Duplex",
        status: "For Sale",
        bedrooms: 5,
        bathrooms: 6,
        sqft: 5000,
        amenities: ["Swimming Pool", "Staff Quarters", "Tropical Gardens", "Gated Estate"],
        gallery: [
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-18"
    },
    {
        id: 5,
        slug: "ocean-breeze-villa",
        title: "Ocean Breeze Villa",
        price: "85,000,000",
        location: "VGC, Lekki, Lagos",
        description: "Catch the Atlantic rhythm in this contemporary 4-bedroom villa. Designed for seamless indoor-outdoor living, the property boasts a state-of-the-art home theater, a sun-drenched infinity pool, and sustainable solar power integration. A true masterclass in coastal sophistication.",
        image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-5",
        category: "Detached Villa",
        status: "For Sale",
        bedrooms: 4,
        bathrooms: 4.5,
        sqft: 4000,
        amenities: ["Home Theater", "Infinity Pool", "Solar Power", "Ocean Views"],
        gallery: [
            "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-15"
    },
    {
        id: 6,
        slug: "the-nexus-studio",
        title: "The Nexus Studio",
        price: "1,200,000 / year",
        location: "Ikeja, Lagos",
        description: "Compact, efficient, and undeniably sleek. This executive studio in Ikeja GRA is the ultimate urban base. Featuring modular furniture solutions, integrated high-spec appliances, and access to a shared premium co-working space and rooftop gym. Designed for the high-velocity professional.",
        image: "https://images.unsplash.com/photo-1536376073347-4573914a1fa4?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-6",
        category: "Studio",
        status: "For Rent",
        bedrooms: 1,
        bathrooms: 1,
        sqft: 600,
        amenities: ["Modular Furniture", "Co-working Space", "Rooftop Gym", "High-spec Appliances"],
        gallery: [
            "https://images.unsplash.com/photo-1536376073347-4573914a1fa4?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-12"
    },
    {
        id: 7,
        slug: "banana-island-mansion",
        title: "Banana Island Waterfront Mansion",
        price: "1,500,000,000",
        location: "Banana Island, Ikoyi, Lagos",
        description: "The epitome of Nigerian luxury. This 7-bedroom waterfront mansion in Banana Island features a private boat jetty, a 20-seat private cinema, and an Italian marble finished interior. The ultimate statement home.",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-7",
        category: "Mansion",
        status: "For Sale",
        bedrooms: 7,
        bathrooms: 8,
        sqft: 12000,
        amenities: ["Private Boat Jetty", "Private Cinema", "Italian Marble", "Waterfront"],
        gallery: [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-10"
    },
    {
        id: 8,
        slug: "asokoro-diplomatic-residence",
        title: "Asokoro Diplomatic Residence",
        price: "600,000,000",
        location: "Asokoro, Abuja",
        description: "A secure and elegant 6-bedroom residence in Abuja's most exclusive district. Features bulletproof windows, a panic room, and a massive compound suitable for diplomatic engagements.",
        image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-8",
        category: "Detached Villa",
        status: "For Sale",
        bedrooms: 6,
        bathrooms: 7,
        sqft: 8000,
        amenities: ["High Security", "Panic Room", "Large Compound", "Diplomatic Zone"],
        gallery: [
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-08"
    },
    {
        id: 9,
        slug: "port-harcourt-creek-view",
        title: "Creek View Estate",
        price: "120,000,000",
        location: "GRA Phase 2, Port Harcourt",
        description: "Modern 5-bedroom duplex with stunning views of the creek. Located in a secure gated community with consistent power supply and premium finishing.",
        image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-9",
        category: "Duplex",
        status: "For Sale",
        bedrooms: 5,
        bathrooms: 5.5,
        sqft: 4500,
        amenities: ["Creek Views", "Gated Community", "Consistent Power", "Premium Finishing"],
        gallery: [
            "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-05"
    },
    {
        id: 10,
        slug: "ibadan-bodija-bungalow",
        title: "Classic Bodija Bungalow",
        price: "45,000,000",
        location: "Bodija, Ibadan",
        description: "A beautifully renovated 3-bedroom bungalow in the heart of historic Bodija. Features a large garden, modern kitchen, and mature fruit trees.",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-10",
        category: "Bungalow",
        status: "For Sale",
        bedrooms: 3,
        bathrooms: 2,
        sqft: 2000,
        amenities: ["Large Garden", "Renovated", "Fruit Trees", "Historic Area"],
        gallery: [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-02"
    },
    {
        id: 11,
        slug: "enugu-independence-layout",
        title: "Independence Layout Mansion",
        price: "85,000,000",
        location: "Independence Layout, Enugu",
        description: "Spacious 6-bedroom mansion with a sprawling court yard. This property offers a blend of traditional eastern luxury and modern amenities.",
        image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-11",
        category: "Mansion",
        status: "For Sale",
        bedrooms: 6,
        bathrooms: 6,
        sqft: 5500,
        amenities: ["Courtyard", "Spacious", "Secure Area"],
        gallery: [
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-28"
    },
    {
        id: 12,
        slug: "victoria-island-commercial",
        title: "Prime VI Office Space",
        price: "15,000,000 / year",
        location: "Victoria Island, Lagos",
        description: "Grade A office space in the heart of Victoria Island. Open plan layout, raised floors, central air conditioning, and ample parking space.",
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-12",
        category: "Commercial",
        status: "For Rent",
        bedrooms: 0,
        bathrooms: 4,
        sqft: 8000,
        amenities: ["Grade A Office", "Raised Floors", "Central AC", "Ample Parking"],
        gallery: [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-25"
    },
    {
        id: 13,
        slug: "lekki-phase-1-land",
        title: "Lekki Phase 1 Prime Plot",
        price: "200,000,000",
        location: "Lekki Phase 1, Lagos",
        description: "1000 sqm of prime, dry land in a fully developed area of Lekki Phase 1. Perfect for a luxury residential development or mixed-use commercial building.",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-13",
        category: "Land",
        status: "For Sale",
        bedrooms: 0,
        bathrooms: 0,
        sqft: 10763,
        amenities: ["Dry Land", "Fenced", "Good Title"],
        gallery: [
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-20"
    },
    {
        id: 14,
        slug: "ikoyi-luxury-flat",
        title: "Bourdillon Luxury Flat",
        price: "15,000,000 / year",
        location: "Bourdillon, Ikoyi, Lagos",
        description: "Opulent 3-bedroom flat on Bourdillon Road. Offers stunning views, a fully equipped gym, Olympic size swimming pool, and round-the-clock concierge services.",
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-14",
        category: "Flat",
        status: "For Rent",
        bedrooms: 3,
        bathrooms: 3.5,
        sqft: 2500,
        amenities: ["Gym", "Pool", "Concierge", "Ocean View"],
        gallery: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-15"
    },
    {
        id: 15,
        slug: "wuse-2-commercial",
        title: "Wuse 2 Retail Space",
        price: "8,000,000 / year",
        location: "Wuse 2, Abuja",
        description: "High visibility retail space on a major road in Wuse 2. Ideal for a boutique, high-end salon, or showroom. Large glass display windows and dedicated customer parking.",
        image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-15",
        category: "Commercial",
        status: "For Rent",
        bedrooms: 0,
        bathrooms: 2,
        sqft: 1500,
        amenities: ["High Visibility", "Glass Display", "Customer Parking"],
        gallery: [
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-10"
    }
];
