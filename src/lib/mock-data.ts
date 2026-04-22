export interface Property {
    id: number;
    title: string;
    price: string;
    location: string;
    description: string;
    image: string;
    original_url: string;
}

export const MOCK_PROPERTIES: Property[] = [
    {
        id: 1,
        title: "The Glass House Terrace",
        price: "150,000,000",
        location: "Ikate, Lekki, Lagos",
        description: "Experience the pinnacle of urban luxury in this architectural masterpiece. Featuring 4 oversized bedrooms, panoramic floor-to-ceiling windows, and a bespoke Italian kitchen. This smart-home integrated terrace offers 24/7 autonomous security and a private rooftop lounge overlooking the Lekki skyline.",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-1"
    },
    {
        id: 2,
        title: "Zenith Heights Penthouse",
        price: "4,500,000 / year",
        location: "Guzape, Abuja",
        description: "A sanctuary in the sky. This 3-bedroom penthouse in Guzape combines minimalist Zen aesthetics with high-performance living. Enjoy a private elevator entrance, a temperature-controlled wine cellar, and wrap-around balconies offering breathtaking views of the capital city's rolling hills.",
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-2"
    },
    {
        id: 3,
        title: "Heritage Loft Apartments",
        price: "2,200,000 / year",
        location: "Yaba, Lagos",
        description: "Where history meets innovation. Located in the vibrant heart of Yaba's tech corridor, these 2-bedroom lofts feature industrial exposed brick, ultra-high ceilings, and high-speed fiber optic integration. Perfect for the modern creative professional seeking a blend of character and connectivity.",
        image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-3"
    },
    {
        id: 4,
        title: "Royal Palms Estate",
        price: "250,000,000",
        location: "Maitama, Abuja",
        description: "An enclave of absolute privacy. This palatial 5-bedroom detached duplex is situated within one of Maitama's most exclusive estates. Features include a gold-leafed foyer, an olympic-sized swimming pool, and dedicated staff quarters, all surrounded by lush, manicured tropical gardens.",
        image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-4"
    },
    {
        id: 5,
        title: "Ocean Breeze Villa",
        price: "85,000,000",
        location: "VGC, Lekki, Lagos",
        description: "Catch the Atlantic rhythm in this contemporary 4-bedroom villa. Designed for seamless indoor-outdoor living, the property boasts a state-of-the-art home theater, a sun-drenched infinity pool, and sustainable solar power integration. A true masterclass in coastal sophistication.",
        image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-5"
    },
    {
        id: 6,
        title: "The Nexus Studio",
        price: "1,200,000 / year",
        location: "Ikeja, Lagos",
        description: "Compact, efficient, and undeniably sleek. This executive studio in Ikeja GRA is the ultimate urban base. Featuring modular furniture solutions, integrated high-spec appliances, and access to a shared premium co-working space and rooftop gym. Designed for the high-velocity professional.",
        image: "https://images.unsplash.com/photo-1536376073347-4573914a1fa4?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-6"
    }
];
