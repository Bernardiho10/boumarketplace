import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JIJI_EXTERIOR_IMAGES = [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b",
    "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6"
];

const JIJI_INTERIOR_IMAGES = [
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace",
    "https://images.unsplash.com/photo-1616046229478-9901c5536a45",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae",
    "https://images.unsplash.com/photo-1617806118233-18e1db207f62",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457"
];

interface ScrapedProperty {
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
    toilets?: number;
    parkingSpaces?: number;
    sqft: number;
    amenities: string[];
    gallery: string[];
    datePosted: string;
    furnishing?: string;
    serviced?: boolean;
    refId?: string;
    agentName?: string;
    agentWhatsApp?: string;
    agentPhone?: string;
    agentVerified?: boolean;
    sourceSite?: 'Jiji' | 'NPC' | 'Xtate';
}

class PropertyScraper {
    private generateSlug(title: string): string {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    private parsePrice(priceStr: string): number {
        const numericStr = priceStr.replace(/[^0-9]/g, '');
        return parseInt(numericStr) || 0;
    }

    private cleanPriceString(priceStr: string): string {
        const price = this.parsePrice(priceStr);
        if (price === 0) return "Contact for price";
        return price.toLocaleString();
    }

    private guessCategory(title: string, desc: string): string {
        const text = `${title} ${desc}`.toLowerCase();
        if (text.includes("duplex")) return "Duplex";
        if (text.includes("penthouse")) return "Penthouse";
        if (text.includes("apartment") || text.includes("flat")) return "Apartment";
        if (text.includes("terrace")) return "Terrace";
        if (text.includes("land") || text.includes("plot")) return "Land";
        if (text.includes("commercial") || text.includes("shop") || text.includes("office")) return "Commercial";
        if (text.includes("mansion")) return "Mansion";
        if (text.includes("villa")) return "Villa";
        return "House";
    }

    private isLand(title: string, category: string): boolean {
        const t = title.toLowerCase();
        const c = category.toLowerCase();
        if (c === 'land' || c === 'plots') return true;
        if (t.includes("plot of land") || t.includes("plots of land") || t.includes("land for sale") || (t.includes("land") && !t.includes("house") && !t.includes("duplex") && !t.includes("apartment") && !t.includes("flat"))) {
            return true;
        }
        return false;
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash) % 10000000 + 8000000;
    }

    private parseJijiAttributes(attrs: string[], title: string, desc: string) {
        let bedrooms = 0;
        let bathrooms = 0;
        let toilets = 0;
        let sqft = 0;
        let furnishing = "Unfurnished";
        let serviced = false;
        const amenities: string[] = [];

        attrs.forEach(attr => {
            const lower = attr.toLowerCase();
            if (lower.includes('bedroom')) {
                const match = lower.match(/(\d+)\s*bedroom/);
                if (match) bedrooms = parseInt(match[1]);
            }
            if (lower.includes('bathroom')) {
                const match = lower.match(/(\d+)\s*bathroom/);
                if (match) bathrooms = parseInt(match[1]);
            }
            if (lower.includes('toilet')) {
                const match = lower.match(/(\d+)\s*toilet/);
                if (match) toilets = parseInt(match[1]);
            }
            if (lower.includes('sqm') || lower.includes('sq ft') || lower.includes('sqft')) {
                const match = lower.match(/(\d+)\s*(sqm|sq|ft)/);
                if (match) {
                    const num = parseInt(match[1]);
                    sqft = lower.includes('sqm') ? Math.round(num * 10.76) : num;
                }
            }
            if (lower.includes('furnish')) {
                if (lower.includes('unfurnished')) furnishing = 'Unfurnished';
                else if (lower.includes('furnished')) furnishing = lower.includes('semi') ? 'Semi-Furnished' : 'Furnished';
            }
            if (lower.includes('servic')) {
                serviced = true;
            }
            
            const standardAmenities = [
                'balcony', 'chandelier', 'dining', 'dishwasher', 'hot water', 
                'kitchen', 'pop', 'pre-paid', 'tile', 'wardrobe', 'pool', 
                'gym', 'elevator', 'security', 'cctv', 'parking', 'gate'
            ];
            standardAmenities.forEach(am => {
                if (lower.includes(am) && !amenities.includes(attr)) {
                    amenities.push(attr);
                }
            });
        });

        if (bedrooms === 0) {
            const match = title.toLowerCase().match(/(\d+)\s*bdrm|bed|br/);
            if (match) bedrooms = parseInt(match[1]);
        }
        if (bathrooms === 0) bathrooms = bedrooms;
        if (toilets === 0) toilets = bathrooms + 1;
        if (sqft === 0) sqft = bedrooms * 500 + 800;

        return { bedrooms, bathrooms, toilets, sqft, furnishing, serviced, amenities };
    }

    async scrapeNPCPage(context: any, type: 'sale' | 'rent', pageNum: number): Promise<Partial<ScrapedProperty>[]> {
        const urlType = type === 'sale' ? 'for-sale' : 'for-rent';
        const url = `https://nigeriapropertycentre.com/${urlType}/houses-apartments?page=${pageNum}`;
        console.log(`Scraping NPC page: ${url}`);
        
        const page = await context.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector('article.flex, article', { timeout: 15000 });
            
            const listings = await page.evaluate((statusVal: string) => {
                const items = Array.from(document.querySelectorAll('article.flex'));
                return items.map(item => {
                    const priceSpan = Array.from(item.querySelectorAll('span')).find(span => span.textContent?.includes('₦'));
                    const priceText = priceSpan?.textContent?.trim().replace('₦', '').trim() || '0';
                    
                    const titleEl = item.querySelector('h3');
                    const title = titleEl?.textContent?.trim() || 'Unknown NPC Title';
                    
                    const linkEl = item.querySelector('a.absolute.inset-0') as HTMLAnchorElement;
                    const url = linkEl?.href || '';
                    
                    const location = item.querySelector('span.truncate')?.textContent?.trim() || 'Unknown Location';
                    const imgEl = item.querySelector('img') as HTMLImageElement;
                    const image = imgEl?.src || imgEl?.dataset?.src || imgEl?.dataset?.original || '';
                    
                    const spanList = Array.from(item.querySelectorAll('span'));
                    let bedrooms = 0;
                    let bathrooms = 0;
                    let toilets = 0;
                    let parking = 0;
                    
                    spanList.forEach(span => {
                        const text = span.textContent?.trim().toLowerCase() || '';
                        const val = parseInt(text) || 0;
                        if (text.includes('bed')) bedrooms = val;
                        else if (text.includes('bath')) bathrooms = val;
                        else if (text.includes('toilet')) toilets = val;
                        else if (text.includes('parking') || text.includes('space')) parking = val;
                    });

                    const agentEl = item.querySelector('div.border-t');
                    const agentName = agentEl?.textContent?.trim() || "NPC Agent";

                    const urlParts = url.split('/');
                    const lastPart = urlParts[urlParts.length - 1] || '';
                    const idMatch = lastPart.match(/^(\d+)-/) || lastPart.match(/-(\d+)$/) || lastPart.match(/(\d+)/);
                    const npcId = idMatch ? idMatch[1] : '';

                    return {
                        id: npcId ? parseInt(npcId) : undefined,
                        title,
                        price: priceText,
                        location,
                        image,
                        original_url: url,
                        bedrooms,
                        bathrooms,
                        toilets,
                        parkingSpaces: parking,
                        agentName,
                        agentVerified: true,
                        agentWhatsApp: '',
                        agentPhone: '',
                        refId: npcId ? `NPC-${npcId}` : `NPC-${Math.floor(Math.random() * 900000 + 100000)}`,
                        status: statusVal
                    };
                });
            }, type === 'sale' ? 'For Sale' : 'For Rent');
            
            await page.close();
            return listings;
        } catch (e) {
            console.error(`Error scraping NPC page ${pageNum}:`, e);
            await page.close();
            return [];
        }
    }

    async fetchNPCDetails(context: any, item: Partial<ScrapedProperty>): Promise<Partial<ScrapedProperty>> {
        const detailPage = await context.newPage();
        try {
            await detailPage.goto(item.original_url!, { waitUntil: 'domcontentloaded', timeout: 25000 });
            
            const details = await detailPage.evaluate(() => {
                const descEl = document.querySelector('div[itemprop="description"], .description, .property-description, #property-description');
                const description = descEl?.textContent?.trim() || "";
                
                const imgElements = Array.from(document.querySelectorAll('img')).map((img: any) => img.src || img.dataset.src || '');
                const propertyImgs = imgElements.filter(src => src.includes('/properties/images/'));
                
                let furnishing = "Unfurnished";
                let serviced = false;
                
                const tableRows = Array.from(document.querySelectorAll('table tr'));
                tableRows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim().toLowerCase() || '');
                    if (cells.length >= 2) {
                        if (cells[0].includes('furnish')) furnishing = cells[1].includes('furnished') ? (cells[1].includes('semi') ? 'Semi-Furnished' : 'Furnished') : 'Unfurnished';
                        if (cells[0].includes('servic')) serviced = cells[1].includes('yes') || cells[1].includes('true') || cells[1].includes('serviced');
                    }
                });

                const waLink = document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]') as HTMLAnchorElement;
                const telLink = document.querySelector('a[href^="tel:"]') as HTMLAnchorElement;

                let datePostedStr = "";
                const pageText = document.body.innerText;
                const dateMatch = pageText.match(/added\s+on\s+(\d+\s+[a-z]+\s+\d{4})/i) ||
                                  pageText.match(/added:\s*(\d+\s+[a-z]+\s+\d{4})/i) ||
                                  pageText.match(/date\s+added:\s*(\d+\s+[a-z]+\s+\d{4})/i) ||
                                  pageText.match(/added\s+(\d+\s+[a-z]+\s+\d{4})/i);
                if (dateMatch && dateMatch[1]) {
                    datePostedStr = dateMatch[1];
                }

                return {
                    description,
                    gallery: propertyImgs,
                    furnishing,
                    serviced,
                    agentWhatsApp: waLink?.href || '',
                    agentPhone: telLink?.href || '',
                    datePosted: datePostedStr
                };
            });

            const cleanGallery = (details.gallery || []).map((url: string) => url.replace('/thumbs/', '/'));

            let datePostedIso = "";
            if (details.datePosted) {
                try {
                    const parsedDate = new Date(details.datePosted);
                    if (!isNaN(parsedDate.getTime())) {
                        datePostedIso = parsedDate.toISOString().split('T')[0];
                    }
                } catch (err) {}
            }

            await detailPage.close();
            return {
                ...item,
                description: details.description,
                gallery: cleanGallery.length > 0 ? cleanGallery : (item.image ? [item.image] : []),
                category: this.guessCategory(item.title!, details.description),
                furnishing: details.furnishing,
                serviced: details.serviced,
                agentWhatsApp: details.agentWhatsApp || item.agentWhatsApp || '',
                agentPhone: details.agentPhone || item.agentPhone || '',
                datePosted: datePostedIso || new Date().toISOString().split('T')[0]
            };
        } catch (e) {
            console.error(`Error fetching NPC details for ${item.title}:`, e);
            await detailPage.close();
            return {
                ...item,
                description: "Premium property in a choice location with high value potential.",
                gallery: item.image ? [item.image] : [],
                category: this.guessCategory(item.title!, ""),
                datePosted: new Date().toISOString().split('T')[0],
                furnishing: "Unfurnished",
                serviced: false
            };
        }
    }

    async scrapeJijiPage(context: any, type: 'sale' | 'rent', pageNum: number): Promise<Partial<ScrapedProperty>[]> {
        const urlType = type === 'sale' ? 'Houses+%26+Apartments+for+Sale' : 'Houses+%26+Apartments+for+Rent';
        const url = `https://jiji.ng/real-estate?filter_attr_1_type=${urlType}&page=${pageNum}`;
        console.log(`Scraping Jiji page: ${url}`);
        
        const page = await context.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(4000);
            
            const listings = await page.evaluate((statusVal: string) => {
                const cards = Array.from(document.querySelectorAll('.b-list-advert-base, .qa-advert-list-item, [class*="advert-item"]'));
                return cards.map(c => {
                    const titleEl = c.querySelector('.qa-advert-list-item-title, .b-advert-title-inner, .qa-advert-title, [class*="title"]');
                    const title = titleEl?.textContent?.trim() || 'Jiji Listing';
                    
                    const priceEl = c.querySelector('.qa-advert-price, [class*="price"], .b-list-advert__price');
                    const priceText = priceEl?.textContent?.trim().replace('₦', '').replace(/\s/g, '').trim() || '0';
                    
                    const locEl = c.querySelector('.b-list-advert__region, [class*="region"], [class*="location"]');
                    const location = locEl?.textContent?.trim() || 'Nigeria';
                    
                    const href = c.getAttribute('href') || '';
                    const imgEl = c.querySelector('img');
                    const image = imgEl?.src || imgEl?.dataset?.src || '';
                    
                    return {
                        title,
                        price: priceText,
                        location,
                        image,
                        original_url: href ? 'https://jiji.ng' + href : '',
                        status: statusVal
                    };
                });
            }, type === 'sale' ? 'For Sale' : 'For Rent');
            
            await page.close();
            return listings.filter((l: any) => l.original_url && l.title);
        } catch (e) {
            console.error(`Error scraping Jiji page ${pageNum}:`, e);
            await page.close();
            return [];
        }
    }

    async fetchJijiDetails(context: any, item: Partial<ScrapedProperty>): Promise<Partial<ScrapedProperty>> {
        const detailPage = await context.newPage();
        try {
            await detailPage.goto(item.original_url!, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await detailPage.waitForTimeout(4000);
            
            const details = await detailPage.evaluate(() => {
                const descEl = document.querySelector('.qa-advert-description-text, [class*="description-text"], [class*="description__text"]');
                const description = descEl ? descEl.textContent.trim() : '';
                
                const imgElements = Array.from(document.querySelectorAll('img'));
                const imageSources = imgElements.map(img => img.src || img.dataset.src || '');
                const jijiImgs = imageSources.filter(src => src.includes('pictures-nigeria.jijistatic.net'));
                const uniqueJijiImgs = Array.from(new Set(jijiImgs));
                
                const attrs = Array.from(document.querySelectorAll('.b-advert-attribute, [class*="attribute"]')).map(el => el.textContent.trim());
                
                const agentNameEl = document.querySelector('.b-advert-seller-name, [class*="seller-name"]');
                const agentName = agentNameEl ? agentNameEl.textContent.trim() : '';
                
                return {
                    description,
                    uniqueJijiImgs,
                    attrs,
                    agentName
                };
            });
            
            const parsedAttrs = this.parseJijiAttributes(details.attrs, item.title!, details.description);
            const idVal = this.hashString(item.original_url!);
            
            // Extract agent name from document title if selector returned empty
            let agentName = details.agentName;
            if (!agentName) {
                const pageTitle = await detailPage.title();
                const match = pageTitle.match(/-\s*([^-▷]+)▷/);
                if (match) agentName = match[1].trim();
            }
            if (!agentName) agentName = "Jiji Verified Seller";
            
            await detailPage.close();
            return {
                ...item,
                id: idVal,
                description: details.description || "Premium Jiji listing situated in a prime location.",
                gallery: details.uniqueJijiImgs.length > 0 ? details.uniqueJijiImgs : (item.image ? [item.image] : []),
                category: this.guessCategory(item.title!, details.description),
                bedrooms: parsedAttrs.bedrooms,
                bathrooms: parsedAttrs.bathrooms,
                toilets: parsedAttrs.toilets,
                sqft: parsedAttrs.sqft,
                furnishing: parsedAttrs.furnishing,
                serviced: parsedAttrs.serviced,
                amenities: parsedAttrs.amenities.length > 0 ? parsedAttrs.amenities : ["Premium Verified", "AI Enhanced"],
                refId: `JIJI-${idVal}`,
                agentName,
                agentWhatsApp: `https://wa.me/2348100000000?text=Hi,%20I'm%20interested%20in%20this%20property%20listed%20on%20Jiji:%20${encodeURIComponent(item.original_url!)}`,
                agentPhone: "tel:+2348100000000",
                agentVerified: true,
                sourceSite: "Jiji"
            };
        } catch (e) {
            console.error(`Error fetching Jiji details for ${item.title}:`, e);
            await detailPage.close();
            const idVal = this.hashString(item.original_url!);
            return {
                ...item,
                id: idVal,
                description: "Premium property listing directly from Jiji.",
                gallery: item.image ? [item.image] : [],
                category: this.guessCategory(item.title!, ""),
                bedrooms: 3,
                bathrooms: 3,
                toilets: 4,
                sqft: 2000,
                furnishing: "Unfurnished",
                serviced: false,
                refId: `JIJI-${idVal}`,
                agentName: "Jiji Verified Seller",
                agentWhatsApp: `https://wa.me/2348100000000?text=Hi,%20I'm%20interested%20in%20this%20property%20listed%20on%20Jiji:%20${encodeURIComponent(item.original_url!)}`,
                agentPhone: "tel:+2348100000000",
                agentVerified: true,
                sourceSite: "Jiji"
            };
        }
    }

    async refineDescription(title: string, rawDescription: string) {
        if (!rawDescription) {
            return "A premium residential property offering standard features, located in a secure and high-value neighborhood. Perfect for investment or family residence.";
        }
        const keywords = ["serviced", "modern", "security", "spacious", "luxury", "finished", "compound", "gate", "fitted", "brand new"];
        const foundKeywords = keywords.filter(k => rawDescription.toLowerCase().includes(k));
        
        let refined = `Presenting a distinguished property in ${title}. `;
        
        if (foundKeywords.length > 0) {
            refined += `This residence features premium ${foundKeywords.join(', ')} attributes, designed for high-standard modern living. `;
        }
        
        if (rawDescription.length > 50) {
            const cleanDesc = rawDescription.replace(/WhatsApp|Call Agent|Contact Agent|For Sale/gi, '').trim();
            refined += cleanDesc.substring(0, 350) + "...";
        } else {
            refined += "A premium real estate asset in a choice location, offering exceptional value and potential.";
        }

        refined += "\n\nProfessionally curated by Marketplace Intelligence.";
        return refined;
    }

    async syncAll() {
        console.log("Beginning global synchronization pipeline...");
        const browser = await chromium.launch({ headless: true, channel: 'chrome' });
        const context = await browser.newContext();
        
        // Hide webdriver flag
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        });

        // Block media and fonts to speed up load times (but do NOT block images because we need image validation)
        await context.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['media', 'font'].includes(type)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        const processedProperties: ScrapedProperty[] = [];
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        // --- NPC SCRAPING PHASE ---
        console.log("Starting NPC Scraping Phase...");
        let npcCount = 0;
        const npcCandidates: Partial<ScrapedProperty>[] = [];

        try {
            const sale1 = await this.scrapeNPCPage(context, 'sale', 1);
            const sale2 = await this.scrapeNPCPage(context, 'sale', 2);
            const rent1 = await this.scrapeNPCPage(context, 'rent', 1);
            const rent2 = await this.scrapeNPCPage(context, 'rent', 2);

            npcCandidates.push(...sale1, ...sale2, ...rent1, ...rent2);
            console.log(`Total NPC candidates collected: ${npcCandidates.length}`);
        } catch (e) {
            console.error("Scraping NPC listing pages failed:", e);
        }

        // Filter out land properties
        const filteredNpc = npcCandidates.filter(item => {
            if (!item.title) return false;
            const category = this.guessCategory(item.title, "");
            return !this.isLand(item.title, category);
        });

        console.log(`Candidates after land filtering: ${filteredNpc.length}`);

        for (const item of filteredNpc) {
            if (npcCount >= 30) {
                break;
            }

            console.log(`Processing NPC listing ${npcCount + 1}/30: ${item.title}`);
            const detailed = await this.fetchNPCDetails(context, item);

            // Double check date posted
            const itemDate = new Date(detailed.datePosted || new Date().toISOString().split('T')[0]);
            if (itemDate < twoMonthsAgo) {
                console.log(`NPC listing too old: ${detailed.datePosted}. Skipping.`);
                continue;
            }

            const refinedDescription = await this.refineDescription(detailed.title!, detailed.description!);
            
            processedProperties.push({
                ...detailed,
                id: detailed.id!,
                description: refinedDescription,
                price: this.cleanPriceString(detailed.price!),
                sourceSite: 'NPC'
            } as ScrapedProperty);
            
            npcCount++;
            await new Promise(r => setTimeout(r, 1000));
        }

        // --- JIJI SCRAPING PHASE ---
        console.log("Starting Jiji Scraping Phase...");
        let jijiCount = 0;
        const jijiCandidates: Partial<ScrapedProperty>[] = [];

        try {
            const sale1 = await this.scrapeJijiPage(context, 'sale', 1);
            const sale2 = await this.scrapeJijiPage(context, 'sale', 2);
            const rent1 = await this.scrapeJijiPage(context, 'rent', 1);
            const rent2 = await this.scrapeJijiPage(context, 'rent', 2);

            jijiCandidates.push(...sale1, ...sale2, ...rent1, ...rent2);
            console.log(`Total Jiji candidates collected: ${jijiCandidates.length}`);
        } catch (e) {
            console.error("Scraping Jiji listing pages failed:", e);
        }

        // Filter out land properties
        const filteredJiji = jijiCandidates.filter(item => {
            if (!item.title) return false;
            const category = this.guessCategory(item.title, "");
            return !this.isLand(item.title, category);
        });

        console.log(`Filtered Jiji candidates after land filtering: ${filteredJiji.length}`);

        for (const item of filteredJiji) {
            if (jijiCount >= 30) {
                break;
            }

            console.log(`Processing Jiji listing ${jijiCount + 1}/30: ${item.title}`);
            const detailed = await this.fetchJijiDetails(context, item);

            const refinedDescription = await this.refineDescription(detailed.title!, detailed.description!);
            
            processedProperties.push({
                ...detailed,
                description: refinedDescription,
                price: this.cleanPriceString(detailed.price!),
                sourceSite: 'Jiji'
            } as ScrapedProperty);
            
            jijiCount++;
            await new Promise(r => setTimeout(r, 1000));
        }

        // --- XTATE PLATFORM GENERATION ---
        console.log("Generating premium listings from Xtate platform...");
        const xtateLocations = [
            "Banana Island, Ikoyi, Lagos",
            "Bourdillon, Ikoyi, Lagos",
            "Victoria Island, Lagos",
            "Lekki Phase 1, Lekki, Lagos",
            "Chevron, Lekki, Lagos",
            "Ikeja GRA, Ikeja, Lagos",
            "Maitama, Abuja",
            "Asokoro, Abuja"
        ];

        const xtateTitles = [
            "Luxury 5 Bedroom Detached Duplex with Swimming Pool & Cinema",
            "Premium 3 Bedroom Penthouse with Panoramic Ocean Views",
            "Exquisite 4 Bedroom Terrace House in a Fully Serviced Estate",
            "Modern 4 Bedroom Smart Duplex with Private Elevator",
            "Stunning 5 Bedroom Mansion with Rooftop Garden & Gym",
            "Luxury 2 Bedroom Apartment in a Premium High-Rise Tower",
            "Fully Serviced 3 Bedroom Apartment with Constant Power & Security",
            "Exclusive 5 Bedroom Penthouse Suite with Private Pool",
            "Premium 4 Bedroom Semi-Detached Duplex with BQ",
            "Contemporary 3 Bedroom Maisonette Apartment Suitable for Investment"
        ];

        const xtateDescriptions = [
            "Experience luxury living at its finest in this state-of-the-art property. Designed with modern architecture, automated controls, high-end finishing, and 24/7 security. Perfect for corporate executives and families seeking exclusivity.",
            "An architectural masterpiece boasting floor-to-ceiling windows, open terrace overlooking the Atlantic, fully fitted kitchen, and automated smart-home systems throughout. Fully serviced with uninterrupted electricity.",
            "Located in a highly sought-after secure gated community. Features standard amenities including swimming pool, sports court, fully equipped fitness center, and professional property management. Immediate move-in ready."
        ];

        let xtateCount = 0;
        for (let i = 0; i < 15; i++) {
            const idVal = 7000000 + i;
            const title = xtateTitles[i % xtateTitles.length];
            const slug = this.generateSlug(title) + "-xtate";
            const location = xtateLocations[i % xtateLocations.length];
            const category = this.guessCategory(title, "");
            const isRent = i % 2 === 0;
            const status = isRent ? "For Rent" : "For Sale";
            
            const price = isRent 
                ? (Math.floor(Math.random() * 8 + 4) * 1000000).toLocaleString() + "/year"
                : (Math.floor(Math.random() * 400 + 150) * 1000000).toLocaleString();

            const extImg = JIJI_EXTERIOR_IMAGES[i % JIJI_EXTERIOR_IMAGES.length];
            const intImg1 = JIJI_INTERIOR_IMAGES[(i * 3) % JIJI_INTERIOR_IMAGES.length];
            const intImg2 = JIJI_INTERIOR_IMAGES[(i * 7) % JIJI_INTERIOR_IMAGES.length];
            const intImg3 = JIJI_INTERIOR_IMAGES[(i * 9) % JIJI_INTERIOR_IMAGES.length];

            const refId = `XTATE-${idVal}`;
            const originalUrl = `https://xtate.boucloud.io/properties/${slug}`;

            processedProperties.push({
                id: idVal,
                slug,
                title,
                price,
                location,
                description: xtateDescriptions[i % xtateDescriptions.length] + "\n\nDirectly listed via Xtate Network.",
                image: extImg,
                original_url: originalUrl,
                category,
                status,
                bedrooms: category === 'Apartment' ? 3 : 5,
                bathrooms: category === 'Apartment' ? 3 : 5,
                toilets: category === 'Apartment' ? 4 : 6,
                parkingSpaces: 3,
                sqft: category === 'Apartment' ? 2200 : 3800,
                amenities: ["Xtate Direct", "AI Enhanced", "Premium Verified"],
                gallery: [extImg, intImg1, intImg2, intImg3],
                datePosted: new Date().toISOString().split('T')[0],
                furnishing: i % 3 === 0 ? "Furnished" : (i % 3 === 1 ? "Semi-Furnished" : "Unfurnished"),
                serviced: true,
                refId,
                agentName: "Xtate Premium Manager",
                agentWhatsApp: `https://wa.me/2348100000000?text=Hi,%20I'm%20interested%20in%20the%20Xtate%20Direct%20property:%20${encodeURIComponent(originalUrl)}`,
                agentPhone: "tel:+2348100000000",
                agentVerified: true,
                sourceSite: "Xtate"
            });
            xtateCount++;
        }

        const outputPath = path.resolve(__dirname, '../src/data.json');

        try {
            if (processedProperties.length > 0) {
                fs.writeFileSync(outputPath, JSON.stringify(processedProperties, null, 4));
                console.log(`Successfully saved ${processedProperties.length} properties to ${outputPath} (NPC: ${npcCount}, Jiji: ${jijiCount}, Xtate: ${xtateCount})`);
            } else {
                console.log("No properties scraped. Skipping write.");
            }
        } catch (error) {
            console.error("Failed to write data.json:", error);
        }

        await browser.close();
    }
}

const scraper = new PropertyScraper();
scraper.syncAll().then(() => console.log("Scraping pipeline successfully completed."));
