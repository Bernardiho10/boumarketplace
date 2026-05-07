import { DataProvider } from "./lib/data-provider";
import { MOCK_PROPERTIES, type Property } from "./lib/mock-data";

type SpeechRecognitionResultLike = {
    readonly 0?: { transcript: string };
};

type SpeechRecognitionEventLike = {
    results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

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
    private recognition: SpeechRecognitionLike | null = null;

    async init() {
        const dataProvider = DataProvider.getInstance();
        await dataProvider.init();
        const properties = dataProvider.getAllProperties();
        this.properties = properties.length > 0 ? properties : MOCK_PROPERTIES;
        this.bindControls();
        this.render();
    }

    private bindControls() {
        this.getInput("listing-search-input")?.addEventListener("input", () => this.render());
        this.getSelect("listing-location-filter")?.addEventListener("change", () => this.render());
        this.getSelect("listing-type-filter")?.addEventListener("change", () => this.render());
        this.getSelect("listing-price-filter")?.addEventListener("change", () => this.render());
        this.getSelect("listing-status-filter")?.addEventListener("change", () => this.render());
        document.getElementById("listing-clear-btn")?.addEventListener("click", () => this.clearFilters());
        document.getElementById("listing-voice-btn")?.addEventListener("click", () => this.startVoiceSearch());
        document.querySelectorAll<HTMLButtonElement>(".listing-quick-prompts button").forEach(button => {
            button.addEventListener("click", () => {
                const input = this.getInput("listing-search-input");
                if (!input) return;
                input.value = button.dataset.query || "";
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

            const matchedTokens = tokens.filter(token => searchable.includes(token));
            const score = tokens.length === 0 ? 1 : matchedTokens.length;
            return { property, score };
        })
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(result => result.property);
    }

    private renderCard(property: Property) {
        const source = this.getSourceLabel(property.original_url);
        const specText = property.bedrooms > 0
            ? `${property.bedrooms} beds · ${property.bathrooms} baths · ${property.sqft.toLocaleString()} sqft`
            : `${property.sqft.toLocaleString()} sqft · ${property.category}`;

        return `
            <article class="listing-card">
                <a href="property.html?id=${property.id}" class="listing-image-link" aria-label="View ${property.title}">
                    <img src="${property.image || FALLBACK_PROPERTY_IMAGE}" alt="${property.title}" loading="lazy" onerror="this.src='${FALLBACK_PROPERTY_IMAGE}'">
                    <span class="listing-card-status">${property.status}</span>
                    <span class="listing-card-source">${source}</span>
                </a>
                <div class="listing-card-body">
                    <div class="listing-card-price">₦${property.price}</div>
                    <h2>${property.title}</h2>
                    <p class="listing-card-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
                    <p class="listing-card-specs">${specText}</p>
                    <p class="listing-card-desc">${property.description}</p>
                    <div class="listing-card-actions">
                        <a href="property.html?id=${property.id}" class="listing-view-btn">View property</a>
                        <a href="${property.original_url}" target="_blank" rel="noopener noreferrer" class="listing-source-link">Source</a>
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
        recognition.onresult = event => {
            const transcript = Array.from(event.results)
                .map(result => result[0]?.transcript || "")
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
        ["listing-location-filter", "listing-type-filter", "listing-price-filter", "listing-status-filter"].forEach(id => {
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
        return "Verified source";
    }
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const page = new ListingPage();
    void page.init();
});
