import { MagicElement, MagicView, MagicViewModel, MagicEvent } from "../../magicui/src/index.ts";
import { MOCK_PROPERTIES } from "./lib/mock-data.ts";

/**
 * Neural Intelligence ViewModel
 */
class NeuralViewModel extends MagicViewModel {
    constructor() {
        super();
        this.set("is_stage_active", false);
        this.set("location", "ENCRYPTION_NODE_07");
        this.set("device", this.detectDevice());
        this.set("intent", {
            location: null,
            price: null,
            type: null,
            bed: null
        });
    }

    detectDevice() {
        const ua = navigator.userAgent;
        if (/mobile/i.test(ua)) return "Mobile Node";
        return "Command Station";
    }

    async resolveNode() {
        try {
            const resp = await fetch('https://ipapi.co/json/');
            const data = await resp.json();
            this.set("location", `${data.city.toUpperCase()}, ${data.country_code}`);
        } catch { /* Fail silently */ }
    }
}

/**
 * Neural Marketplace View
 */
class NeuralMarketView extends MagicView {
    declare viewModel: NeuralViewModel;

    constructor(id: string) {
        super(id);
        this.viewModel = new NeuralViewModel();

        // Conversational Input
        this.registerElement("search_input", "search-input").addEventTrigger("input", this.parseConversationalIntent);
    }

    parseConversationalIntent(event: MagicEvent) {
        const input = event.target as HTMLInputElement;
        const raw = input.value.toLowerCase();
        const intent = { ...this.viewModel.get("intent") };

        // 1. Precise Location Mapping
        const cities = ["lagos", "abuja", "lekki", "ikeja", "ikoyi", "yaba", "vgc"];
        intent.location = cities.find(c => raw.includes(c)) || null;

        // 2. Budget Detection
        const priceMatch = raw.match(/(\d+)\s*(m|million|k)/);
        intent.price = priceMatch ? priceMatch[0] : null;

        // 3. Property Type Detection
        const types = ["duplex", "terrace", "flat", "apartment", "studio", "penthouse"];
        intent.type = types.find(t => raw.includes(t)) || null;

        // 4. Bedroom Count Detection
        const bedMatch = raw.match(/(\d+)\s*bed/);
        intent.bed = bedMatch ? bedMatch[0] : null;

        this.viewModel.set("intent", intent);
        this.updateIntentUI(intent);

        // Result Reveal (Top-Down)
        const resultsArea = document.getElementById("search-results-dropdown");
        const resultsList = document.getElementById("results-list");
        const stationMeta = document.getElementById("station-id");
        
        if (raw.length > 2) {
            resultsArea?.classList.remove("d-none");
            if (stationMeta) stationMeta.innerHTML = `<span class="text-accent animate-pulse">ANALYZING SIGNAL...</span>`;
            
            // Artificial delay to simulate "Neural Analysis"
            setTimeout(() => {
                this.renderBentoGrid(raw, resultsList);
                if (stationMeta) stationMeta.innerText = `STATION: ${this.viewModel.get("device").toUpperCase()}`;
            }, 600);
        } else {
            resultsArea?.classList.add("d-none");
        }
    }

    updateIntentUI(intent: any) {
        document.getElementById("badge-location")?.classList.toggle("active", !!intent.location);
        document.getElementById("badge-price")?.classList.toggle("active", !!intent.price);
        document.getElementById("badge-type")?.classList.toggle("active", !!intent.type);
        document.getElementById("badge-bed")?.classList.toggle("active", !!intent.bed);
    }

    renderBentoGrid(query: string, container: HTMLElement | null) {
        if (!container) return;

        const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        
        const filtered = MOCK_PROPERTIES.filter(p => {
            const content = `${p.title} ${p.location} ${p.description}`.toLowerCase();
            // If no significant tokens, show everything
            if (tokens.length === 0) return true;
            // Match if ANY significant token is found (conversational style)
            return tokens.some(t => content.includes(t));
        });

        container.innerHTML = filtered.map((p, i) => `
            <div class="bento-card animate-reveal" 
                 style="animation-delay: ${i * 0.05}s"
                 onclick="window.dispatchEvent(new CustomEvent('enter-stage', {detail: ${p.id}}))">
                <div class="position-relative">
                    <img src="${p.image}" class="bento-img">
                    <div class="position-absolute bottom-0 start-0 p-3 w-100" style="background:linear-gradient(transparent, rgba(0,0,0,0.8))">
                        <span class="text-accent small fw-bold uppercase tracking-widest">BOU Verified</span>
                    </div>
                </div>
                <div class="p-4">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h4 class="mb-0 text-white">${p.title}</h4>
                        <span class="text-accent small fw-bold">₦${p.price.split(' ')[0]}</span>
                    </div>
                    <p class="text-label small mb-3">${p.location}</p>
                    <p class="text-muted small">${p.description.substring(0, 80)}...</p>
                </div>
            </div>
        `).join('') || '<div class="p-5 text-label">NO SIGNAL MATCHED IN NEURAL CACHE</div>';
    }

    enterStage(id: number) {
        const prop = MOCK_PROPERTIES.find(p => p.id === id);
        if (!prop) return;

        const stage = document.createElement("div");
        stage.className = "stage-container";
        stage.innerHTML = `
            <div class="stage-media">
                <img src="${prop.image}" class="w-100 h-100 object-fit-cover">
                
                <!-- Close Button -->
                <button class="position-absolute top-0 start-0 m-5 btn btn-link text-white text-label p-0" 
                        onclick="this.closest('.stage-container').remove(); window.speechSynthesis.cancel();">
                    <i class="fas fa-arrow-left me-2"></i> EXIT_STAGE
                </button>

                <!-- Floating CTA -->
                <div class="position-absolute bottom-0 start-0 w-100 p-5" style="background: linear-gradient(to top, black, transparent)">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="glass-panel p-4 px-5 rounded-pill d-flex align-items-center gap-5">
                            <div>
                                <span class="text-label">Verified Market Asset</span>
                                <h3 class="mb-0">₦${prop.price}</h3>
                            </div>
                            <div class="vr opacity-25"></div>
                            <a href="${prop.original_url}" target="_blank" class="btn-action text-decoration-none">Contact Agent</a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="stage-info">
                <div class="mb-5 border-bottom border-glass pb-4">
                    <span class="text-label text-accent">Neural Description Extraction</span>
                </div>

                <div class="detail-scroll">
                    <h1 class="text-title mb-4">${prop.title}</h1>
                    <p class="text-label mb-5"><i class="fas fa-map-marker-alt text-accent me-2"></i> ${prop.location}</p>
                    
                    <div id="narration-stream" class="fs-4 leading-relaxed text-muted">
                        <!-- Words injected for ghost narration -->
                    </div>
                </div>

                <div class="mt-5 pt-4 border-top border-glass text-label opacity-50">
                    Source Protocol: Jiji Network Node 04 // Signal Integrity: 98%
                </div>
            </div>
        `;
        document.body.appendChild(stage);
        this.ghostNarrate(prop.description, "narration-stream");
    }

    ghostNarrate(text: string, elementId: string) {
        window.speechSynthesis.cancel();
        const container = document.getElementById(elementId);
        if (!container) return;

        const words = text.split(' ');
        container.innerHTML = words.map((w, i) => `<span id="ghost-${i}">${w} </span>`).join('');

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        utterance.pitch = 0.9;
        utterance.voice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-GB') || null;

        let currentWord = 0;
        utterance.onboundary = (e: any) => {
            if (e.name === 'word') {
                const wordSpan = document.getElementById(`ghost-${currentWord}`);
                if (wordSpan) {
                    wordSpan.classList.add("active");
                    currentWord++;
                }
            }
        };

        window.speechSynthesis.speak(utterance);
    }
}

// Neural Entry Point
document.addEventListener("DOMContentLoaded", async () => {
    const view = new NeuralMarketView("marketplace-search-view");
    await view.viewModel.resolveNode();

    // Sync Initial Meta
    const intelNode = document.getElementById("intel-node");
    const stationId = document.getElementById("station-id");
    
    if (intelNode) intelNode.innerText = `NODE: ${view.viewModel.get("location")}`;
    if (stationId) stationId.innerText = `STATION: ${view.viewModel.get("device").toUpperCase()}`;

    window.addEventListener("enter-stage", (e: any) => view.enterStage(e.detail));
});
