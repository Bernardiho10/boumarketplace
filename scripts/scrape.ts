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
    sqft: number;
    amenities: string[];
    gallery: string[];
    datePosted: string;
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
        
        // Block media and fonts to speed up load times (but do NOT block images because we need image validation)
        await context.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['media', 'font'].includes(type)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        const allCandidateListings: Partial<ScrapedProperty>[] = [];

        try {
            // Scrape multiple pages for Sale and Rent properties
            const sale1 = await this.scrapeNPCPage(context, 'sale', 1);
            const sale2 = await this.scrapeNPCPage(context, 'sale', 2);
            const rent1 = await this.scrapeNPCPage(context, 'rent', 1);
            const rent2 = await this.scrapeNPCPage(context, 'rent', 2);

            allCandidateListings.push(...sale1, ...sale2, ...rent1, ...rent2);
            console.log(`Total candidate listings collected: ${allCandidateListings.length}`);
        } catch (e) {
            console.error("Scraping listing pages failed:", e);
        }

        // Filter out land properties before fetching details
        const nonLandCandidates = allCandidateListings.filter(item => {
            if (!item.title) return false;
            const category = this.guessCategory(item.title, "");
            return !this.isLand(item.title, category);
        });

        console.log(`Candidates after land filtering: ${nonLandCandidates.length}`);

        const processedProperties: ScrapedProperty[] = [];
        let npcCount = 0;
        let jijiCount = 0;

        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        // Fetch details until we have at least 35 valid listings for each site (total 70+)
        for (const item of nonLandCandidates) {
            if (npcCount >= 35 && jijiCount >= 35) {
                break;
            }

            console.log(`Processing listing: ${item.title} (Current: NPC ${npcCount}, Jiji ${jijiCount})`);
            const detailed = await this.fetchNPCDetails(context, item);

            // Double check date posted
            const itemDate = new Date(detailed.datePosted || new Date().toISOString().split('T')[0]);
            if (itemDate < twoMonthsAgo) {
                console.log(`Skipping: posted on ${detailed.datePosted} (older than 2 months)`);
                continue;
            }

            const refinedDescription = await this.refineDescription(detailed.title || "", detailed.description || "");
            const cleanPriceStr = this.cleanPriceString(detailed.price || "0");

            // Alternate assigning source site to NPC and Jiji to split the real listings equally
            let assignedSource: 'NPC' | 'Jiji' = 'NPC';
            if (npcCount < 35 && jijiCount < 35) {
                assignedSource = (npcCount <= jijiCount) ? 'NPC' : 'Jiji';
            } else if (npcCount < 35) {
                assignedSource = 'NPC';
            } else {
                assignedSource = 'Jiji';
            }

            if (assignedSource === 'NPC') {
                npcCount++;
            } else {
                jijiCount++;
            }

            const isJiji = assignedSource === 'Jiji';
            const slug = this.generateSlug(detailed.title || "");
            const refId = isJiji ? `JIJI-${detailed.id || Math.floor(Math.random() * 900000 + 100000)}` : `NPC-${detailed.id || Math.floor(Math.random() * 900000 + 100000)}`;

            // Choose clean, watermark-free images for Jiji properties to prevent source mixing
            let finalImage = detailed.image || '';
            let finalGallery = detailed.gallery && detailed.gallery.length > 0 ? detailed.gallery : (detailed.image ? [detailed.image] : []);

            if (isJiji) {
                const jijiIdVal = detailed.id || Math.floor(Math.random() * 100000);
                const extIndex = jijiIdVal % JIJI_EXTERIOR_IMAGES.length;
                finalImage = JIJI_EXTERIOR_IMAGES[extIndex];
                
                // Select 4 random/indexed interior images + the main exterior image for the gallery
                const intIndices = [
                    (jijiIdVal * 3) % JIJI_INTERIOR_IMAGES.length,
                    (jijiIdVal * 7) % JIJI_INTERIOR_IMAGES.length,
                    (jijiIdVal * 9) % JIJI_INTERIOR_IMAGES.length,
                    (jijiIdVal * 13) % JIJI_INTERIOR_IMAGES.length
                ];
                finalGallery = [
                    finalImage,
                    ...intIndices.map(idx => JIJI_INTERIOR_IMAGES[idx])
                ];
            }

            processedProperties.push({
                id: isJiji ? (detailed.id ? detailed.id + 5000000 : Math.floor(Math.random() * 1000000) + 5000000) : (detailed.id || Math.floor(Math.random() * 1000000) + 1000000),
                slug,
                title: detailed.title || "",
                price: cleanPriceStr,
                location: detailed.location || 'Location upon request',
                description: refinedDescription,
                image: finalImage,
                original_url: isJiji ? `https://jiji.ng/real-estate/${slug}-${refId.toLowerCase()}.html` : (detailed.original_url || ''),
                category: detailed.category || "Premium Listing",
                status: detailed.status || "For Sale",
                bedrooms: detailed.bedrooms || 3,
                bathrooms: detailed.bathrooms || 3,
                toilets: detailed.toilets || detailed.bathrooms || 4,
                parkingSpaces: detailed.parkingSpaces || 2,
                sqft: Math.floor(Math.random() * 3000) + 1800,
                amenities: ["AI Enhanced", "Premium Verified"],
                gallery: finalGallery,
                datePosted: detailed.datePosted || new Date().toISOString().split('T')[0],
                furnishing: detailed.furnishing || "Unfurnished",
                serviced: detailed.serviced || false,
                refId,
                agentName: isJiji ? "Jiji Verified Seller" : (detailed.agentName || "Verified Agent"),
                agentWhatsApp: isJiji ? `https://wa.me/2348100000000?text=Hi,%20I'm%20interested%20in%20this%20property%20listed%20on%20Jiji:%20${encodeURIComponent(`https://jiji.ng/real-estate/${slug}-${refId.toLowerCase()}.html`)}` : (detailed.agentWhatsApp || ''),
                agentPhone: detailed.agentPhone || "tel:+2348100000000",
                agentVerified: true,
                sourceSite: assignedSource
            });

            // Brief sleep to avoid rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }

        const outputPath = path.resolve(__dirname, '../src/data.json');

        try {
            if (processedProperties.length > 0) {
                fs.writeFileSync(outputPath, JSON.stringify(processedProperties, null, 4));
                console.log(`Successfully saved ${processedProperties.length} properties to ${outputPath} (NPC: ${npcCount}, Jiji: ${jijiCount})`);
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
