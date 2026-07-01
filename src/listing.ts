import { DataProvider } from "./lib/data-provider";
import { MOCK_PROPERTIES, type Property } from "./lib/mock-data";
import { getCoordinatesWithJitter } from "./property";

declare let L: any;

class PlaceholderRotator {
    private element: HTMLInputElement;
    private suggestions: string[];
    private currentIndex = 0;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isTyping = false;

    constructor(element: HTMLInputElement, suggestions: string[]) {
        this.element = element;
        this.suggestions = suggestions;
        this.start();
        this.bindEvents();
    }

    start() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.element.placeholder = "e.g. " + this.suggestions[this.currentIndex];
        this.intervalId = setInterval(() => {
            if (!this.isTyping && document.activeElement !== this.element && !this.element.value) {
                this.currentIndex = (this.currentIndex + 1) % this.suggestions.length;
                this.element.placeholder = "e.g. " + this.suggestions[this.currentIndex];
            }
        }, 3500);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private bindEvents() {
        this.element.addEventListener("focus", () => {
            this.isTyping = true;
            this.element.placeholder = "";
        });
        this.element.addEventListener("blur", () => {
            this.isTyping = false;
            if (!this.element.value) {
                this.start();
            }
        });
        this.element.addEventListener("input", () => {
            if (this.element.value) {
                this.element.placeholder = "";
            }
        });
    }
}

const FALLBACK_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=900";

const PROPERTY_TERMS = [
    "house", "flat", "apartment", "duplex", "land", "plot", "villa", "mansion", "penthouse", "studio",
    "office", "commercial", "rent", "sale", "buy", "bed", "bedroom", "property", "estate", "bungalow",
    "terrace", "detached", "lekki", "ikoyi", "lagos", "abuja", "ikeja", "victoria island", "port harcourt",
    "ibadan", "enugu", "guzape", "maitama", "asokoro", "wuse", "banana island"
];

const PROPERTY_SEARCH_EXAMPLES = [
    "4 bedroom duplex in Lekki under 200M",
    "penthouse for rent in Abuja",
    "waterfront mansion in Ikoyi",
    "commercial property in Victoria Island"
];
const SEARCH_STOP_WORDS = new Set(["in", "at", "for", "the", "and", "or", "me", "show", "find", "under", "over", "above", "below", "around", "about"]);

function isPropertySearchQuery(query: string): boolean {
    const lower = query.toLowerCase().trim();
    if (lower.length === 0) return true;
    const hasPropertyTerm = PROPERTY_TERMS.some(term => lower.includes(term));
    const hasPriceSignal = /\b\d+\s*(m|million|k|thousand)\b/.test(lower);
    return hasPropertyTerm || hasPriceSignal;
}

class ListingPage {
    private properties: Property[] = [];
    private recognition: any = null;
    private map: any = null;
    private markerLayer: any = null;
    private rotator: PlaceholderRotator | null = null;

    async init() {
        const dataProvider = DataProvider.getInstance();
        await dataProvider.init();
        const properties = dataProvider.getAllProperties();
        this.properties = properties.length > 0 ? properties : MOCK_PROPERTIES;
        
        this.initMap();
        this.bindControls();

        const searchInput = this.getInput("listing-search-input");
        if (searchInput) {
            this.rotator = new PlaceholderRotator(searchInput, PROPERTY_SEARCH_EXAMPLES);
        }
        this.renderRecentSearches();

        this.render();
    }

    private initMap() {
        const mapContainer = document.getElementById("listings-map");
        if (mapContainer && typeof L !== 'undefined') {
            try {
                this.map = L.map("listings-map", {
                    zoomControl: true,
                    attributionControl: false
                }).setView([6.4431, 3.4883], 12);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    maxZoom: 20
                }).addTo(this.map);

                this.markerLayer = L.layerGroup().addTo(this.map);
            } catch (err) {
                console.error("Leaflet map initialization failed on listings page:", err);
            }
        }
    }

    private bindControls() {
        this.getInput("listing-search-input")?.addEventListener("input", () => this.render());
        this.getInput("listing-search-input")?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const query = this.getInput("listing-search-input")?.value.trim() || "";
                if (query.length >= 3) {
                    this.saveRecentSearch(query);
                }
                this.render();
            }
        });
        this.getSelect("listing-location-filter")?.addEventListener("change", () => this.render());
        this.getSelect("listing-type-filter")?.addEventListener("change", () => this.render());
        this.getSelect("listing-price-filter")?.addEventListener("change", () => this.render());
        this.getSelect("listing-status-filter")?.addEventListener("change", () => this.render());
        this.getSelect("listing-source-filter")?.addEventListener("change", () => this.render());
        document.getElementById("listing-clear-btn")?.addEventListener("click", () => this.clearFilters());
        document.getElementById("listing-voice-btn")?.addEventListener("click", () => this.startVoiceSearch());
        document.querySelectorAll<HTMLButtonElement>(".listing-quick-prompts button").forEach(button => {
            button.addEventListener("click", () => {
                const input = this.getInput("listing-search-input");
                if (!input) return;
                input.value = button.dataset.query || "";
                this.saveRecentSearch(input.value);
                this.render();
            });
        });
    }

    private render() {
        const filtered = this.getFilteredProperties();
        const grid = document.getElementById("listing-grid");
        const count = document.getElementById("listing-result-count");
        const total = document.getElementById("listing-total-count");

        if (total) total.textContent = this.properties.length.toString();
        if (count) count.textContent = `${filtered.length} RESULT${filtered.length === 1 ? "" : "S"}`;
        this.renderFeedback(filtered.length);

        this.updateMapMarkers(filtered);

        if (!grid) return;

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="listing-empty-state">
                    <i class="fas fa-compass"></i>
                    <h2>No matching property found</h2>
                    <p>Try a clearer location, property type, budget range, or status.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(property => this.renderCard(property)).join("");
    }

    private getFilteredProperties() {
        const query = this.getInput("listing-search-input")?.value.trim().toLowerCase() || "";
        const location = this.getSelect("listing-location-filter")?.value || "";
        const type = this.getSelect("listing-type-filter")?.value || "";
        const status = this.getSelect("listing-status-filter")?.value || "";
        const priceRange = this.getSelect("listing-price-filter")?.value || "";
        const sourceVal = this.getSelect("listing-source-filter")?.value || "";
        const [minPrice, maxPrice] = priceRange ? priceRange.split("-").map(Number) : [0, Number.POSITIVE_INFINITY];
        const tokens = query.split(/\s+/).filter(token => token.length >= 2 && !SEARCH_STOP_WORDS.has(token));

        if (query.length >= 2 && !isPropertySearchQuery(query)) {
            return [];
        }

        return this.properties.map(property => {
            const searchable = `${property.title} ${property.location} ${property.description} ${property.category} ${property.status}`.toLowerCase();
            const numericPrice = this.toNumericPrice(property.price);

            if (location && !property.location.toLowerCase().includes(location)) return { property, score: 0 };
            if (type && !searchable.includes(type)) return { property, score: 0 };
            if (status && property.status.toLowerCase() !== status) return { property, score: 0 };
            if (numericPrice < minPrice || numericPrice > maxPrice) return { property, score: 0 };
            if (sourceVal && (property.sourceSite || "").toLowerCase() !== sourceVal) return { property, score: 0 };

            const matchedTokens = tokens.filter(token => searchable.includes(token));
            const score = tokens.length === 0 ? 1 : matchedTokens.length;
            return { property, score };
        })
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(result => result.property);
    }

    private renderCard(property: Property) {
        const source = property.sourceSite || this.getSourceLabel(property.original_url);
        const isXtate = property.sourceSite === 'Xtate';
        
        // Build specs text including toilets and parking spaces
        const specs: string[] = [];
        if (property.bedrooms > 0) specs.push(`${property.bedrooms} beds`);
        if (property.bathrooms > 0) specs.push(`${property.bathrooms} baths`);
        if (property.toilets !== undefined) specs.push(`${property.toilets} toilets`);
        if (property.parkingSpaces !== undefined) specs.push(`${property.parkingSpaces} parking`);
        if (property.sqft > 0) specs.push(`${property.sqft.toLocaleString()} sqft`);
        
        const specText = specs.length > 0 ? specs.join(" · ") : `${property.category}`;
        const verifiedBadge = property.agentVerified ? ' <i class="fas fa-check-circle" style="color:#00e676; font-size: 0.7rem;" title="Verified Agent"></i>' : '';
        const agentHtml = property.agentName ? `<p class="listing-card-agent" style="font-size: 0.75rem; color:#00e676; margin: 0.25rem 0 0.5rem 0; font-weight: 600;">Marketed by: ${property.agentName}${verifiedBadge}</p>` : '';

        return `
            <article class="listing-card">
                <a href="property.html?id=${property.id}" class="listing-image-link" aria-label="View ${property.title}">
                    <img src="${property.image || FALLBACK_PROPERTY_IMAGE}" alt="${property.title}" loading="lazy" onerror="this.src='${FALLBACK_PROPERTY_IMAGE}'">
                    <span class="listing-card-status">${property.status}</span>
                    <span class="listing-card-source">${source}</span>
                </a>
                <div class="listing-card-body">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                        <span class="listing-card-price">₦${property.price}</span>
                        <span style="font-size: 0.65rem; opacity: 0.5; font-family: monospace;">REF: ${property.refId || '—'}</span>
                    </div>
                    <h2>${property.title}</h2>
                    <p class="listing-card-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
                    ${agentHtml}
                    <p class="listing-card-specs">${specText}</p>
                    <p class="listing-card-desc">${property.description}</p>
                    <div class="listing-card-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
                        <a href="property.html?id=${property.id}" class="listing-view-btn" style="flex: 1; text-align: center;">View details</a>
                        <a href="${isXtate ? (property.agentWhatsApp || '#') : (property.original_url || '#')}" target="_blank" class="listing-whatsapp-btn"><i class="fab fa-whatsapp"></i> Chat</a>
                        <a href="${isXtate ? (property.agentPhone || '#') : (property.original_url || '#')}" ${isXtate ? '' : 'target="_blank"'} class="listing-call-btn"><i class="fas fa-phone"></i> Call</a>
                    </div>
                </div>
            </article>
        `;
    }

    private renderFeedback(resultCount: number) {
        const feedback = document.getElementById("listing-feedback");
        const query = this.getInput("listing-search-input")?.value.trim().toLowerCase() || "";
        if (!feedback) return;

        if (query.length >= 3 && !isPropertySearchQuery(query)) {
            feedback.classList.remove("d-none");
            feedback.innerHTML = `
                <i class="fas fa-compass"></i> Keep the search focused on property type, location, budget, beds, or status.
                <div class="feedback-chips">
                    ${PROPERTY_SEARCH_EXAMPLES.map(example => `<span class="feedback-chip" data-query="${example}">${example}</span>`).join("")}
                </div>
            `;
            feedback.querySelectorAll<HTMLElement>(".feedback-chip").forEach(chip => {
                chip.addEventListener("click", () => {
                    const input = this.getInput("listing-search-input");
                    if (!input) return;
                    input.value = chip.dataset.query || "";
                    this.render();
                });
            });
            return;
        }

        if (query.length >= 3 && resultCount === 0) {
            feedback.classList.remove("d-none");
            feedback.innerHTML = `<i class="fas fa-lightbulb"></i> No match yet. Try a broader location like Lagos, Lekki, Ikoyi, Abuja, or Port Harcourt.`;
            return;
        }

        feedback.classList.add("d-none");
    }

    private startVoiceSearch() {
        const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
        const input = this.getInput("listing-search-input");
        const voiceButton = document.getElementById("listing-voice-btn");

        if (!SpeechRecognitionConstructor || !input) {
            const feedback = document.getElementById("listing-feedback");
            if (feedback) {
                feedback.classList.remove("d-none");
                feedback.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Voice search is not supported here. Type a property search instead.`;
            }
            return;
        }

        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
            voiceButton?.classList.remove("recording");
            return;
        }

        const recognition = new SpeechRecognitionConstructor();
        this.recognition = recognition;
        recognition.lang = "en-NG";
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => voiceButton?.classList.add("recording");
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0]?.transcript || "")
                .join(" ")
                .trim();
            if (transcript) {
                input.value = transcript;
                this.render();
                if (!isPropertySearchQuery(transcript)) {
                    const feedback = document.getElementById("listing-feedback");
                    if (feedback) {
                        feedback.classList.remove("d-none");
                        feedback.innerHTML = `<i class="fas fa-microphone-slash"></i> I heard "${transcript}". Please say a property request like "duplex in Lekki under 200M".`;
                    }
                }
            }
        };
        recognition.onend = () => {
            voiceButton?.classList.remove("recording");
            this.recognition = null;
        };
        recognition.onerror = () => {
            voiceButton?.classList.remove("recording");
            this.recognition = null;
        };
        recognition.start();
    }

    private clearFilters() {
        const input = this.getInput("listing-search-input");
        if (input) input.value = "";
        ["listing-location-filter", "listing-type-filter", "listing-price-filter", "listing-status-filter", "listing-source-filter"].forEach(id => {
            const select = this.getSelect(id);
            if (select) select.value = "";
        });
        this.render();
    }

    private getInput(id: string) {
        return document.getElementById(id) as HTMLInputElement | null;
    }

    private getSelect(id: string) {
        return document.getElementById(id) as HTMLSelectElement | null;
    }

    private toNumericPrice(price: string) {
        return Number(price.replace(/[^\d]/g, "")) || 0;
    }

    private getSourceLabel(url: string) {
        if (url.includes("jiji")) return "Jiji";
        if (url.includes("nigeriapropertycentre")) return "NPC";
        if (url.includes("propertypro")) return "PropertyPro";
        if (url.includes("xtate")) return "Xtate";
        return "Verified source";
    }

    private updateMapMarkers(filtered: Property[]) {
        if (!this.markerLayer || !this.map) return;
        this.markerLayer.clearLayers();

        if (filtered.length === 0) return;

        const bounds: any[] = [];
        filtered.forEach(property => {
            const coords = getCoordinatesWithJitter(property.location, property.id);
            bounds.push(coords);

            const priceAbbr = property.price.split(' ')[0];
            let markerStyle = '';
            let iconStyle = '';
            if (property.sourceSite === 'Xtate') {
                markerStyle = 'style="border-color: #9B5DE5; box-shadow: 0 4px 15px rgba(155, 93, 229, 0.35);"';
                iconStyle = 'style="color: #9B5DE5;"';
            } else if (property.sourceSite === 'Jiji') {
                markerStyle = 'style="border-color: #007bff; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);"';
                iconStyle = 'style="color: #007bff;"';
            }

            const customIcon = L.divIcon({
                className: 'custom-price-marker',
                html: `<div class="map-price-badge" ${markerStyle}><i class="fas fa-store map-marketplace-icon" ${iconStyle}></i> ₦${priceAbbr}</div>`,
                iconSize: [80, 30],
                iconAnchor: [40, 15]
            });

            const marker = L.marker(coords, { icon: customIcon });
            const popupContent = `
                <div class="map-popup-card">
                    <img src="${property.image || FALLBACK_PROPERTY_IMAGE}" class="map-popup-img" alt="${property.title}" onerror="this.src='${FALLBACK_PROPERTY_IMAGE}'">
                    <div class="map-popup-price">₦${property.price}</div>
                    <h4 class="map-popup-title">${property.title}</h4>
                    <a href="property.html?id=${property.id}" class="map-popup-link">View Details</a>
                </div>
            `;
            marker.bindPopup(popupContent);
            marker.addTo(this.markerLayer);
        });

        if (bounds.length > 0) {
            try {
                this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
            } catch (e) {
                console.error("Leaflet fitBounds failed:", e);
            }
        }
    }

    private saveRecentSearch(query: string) {
        let searches: string[] = JSON.parse(localStorage.getItem("recent_searches") || "[]");
        searches = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
        searches.unshift(query);
        if (searches.length > 5) searches.pop();
        localStorage.setItem("recent_searches", JSON.stringify(searches));
        this.renderRecentSearches();
    }

    private renderRecentSearches() {
        const container = document.getElementById("listing-recent-searches-container");
        const list = document.getElementById("listing-recent-searches-list");
        if (!container || !list) return;

        const searches: string[] = JSON.parse(localStorage.getItem("recent_searches") || "[]");
        if (searches.length === 0) {
            container.classList.add("d-none");
            return;
        }

        container.classList.remove("d-none");
        list.innerHTML = searches.map(query => `
            <span class="recent-search-chip" data-query="${query}">
                <i class="fas fa-history"></i>
                <span>${query}</span>
                <span class="recent-chip-remove" data-remove-query="${query}"><i class="fas fa-times-circle"></i></span>
            </span>
        `).join('') + `<span class="recent-search-clear-all" id="listing-recent-clear-all-btn">Clear all</span>`;

        list.querySelectorAll(".recent-search-chip").forEach(chip => {
            chip.addEventListener("click", (e) => {
                const target = e.target as HTMLElement;
                if (target.closest(".recent-chip-remove")) {
                    const removeQuery = target.closest(".recent-chip-remove")!.getAttribute("data-remove-query") || "";
                    this.removeRecentSearch(removeQuery);
                    e.stopPropagation();
                    return;
                }
                const input = this.getInput("listing-search-input");
                if (input) {
                    input.value = (chip as HTMLElement).dataset.query || "";
                    this.saveRecentSearch(input.value);
                    this.render();
                }
            });
        });

        document.getElementById("listing-recent-clear-all-btn")?.addEventListener("click", () => {
            localStorage.setItem("recent_searches", "[]");
            this.renderRecentSearches();
        });
    }

    private removeRecentSearch(query: string) {
        let searches: string[] = JSON.parse(localStorage.getItem("recent_searches") || "[]");
        searches = searches.filter(s => s !== query);
        localStorage.setItem("recent_searches", JSON.stringify(searches));
        this.renderRecentSearches();
    }
}

declare global {
    interface Window {
        SpeechRecognition?: any;
        webkitSpeechRecognition?: any;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const page = new ListingPage();
    void page.init();
});
