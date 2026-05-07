import { M as MagicView, a as MagicViewModel } from './index-f241226d.js';
import { D as DataProvider } from './data-provider-491b0d6d.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const KNOWN_LOCATIONS = [
    "lagos", "lekki", "ikoyi", "ikeja", "abuja", "port harcourt",
    "ibadan", "enugu", "yaba", "victoria island", "banana island",
    "guzape", "maitama", "asokoro", "wuse", "bodija", "vgc", "epe"
];
const UNLISTED_CITIES = [
    "benin", "owerri", "kano", "kaduna", "jos", "onitsha", "calabar",
    "uyo", "warri", "asaba", "aba", "sapele", "ife", "abeokuta",
    "ilorin", "makurdi", "maiduguri"
];
const PROPERTY_KEYWORDS = [
    "house", "flat", "apartment", "duplex", "land", "plot", "villa",
    "mansion", "penthouse", "studio", "office", "commercial", "rent",
    "buy", "sale", "bedroom", "bed", "bath", "property", "estate",
    "bungalow", "terrace", "detached", "semi-detached", "room", "space",
    "building", "compound", "floor", "sqft", "m²", "let", "lease",
    ...KNOWN_LOCATIONS
];
const GHOST_SUGGESTIONS = [
    "3 bedroom duplex in Lekki",
    "apartment in Ikeja under 50M",
    "luxury penthouse in Victoria Island",
    "commercial property in Yaba",
    "land for sale in Lekki Phase 1",
    "4 bedroom villa in Ikoyi",
    "studio flat for rent in Ikeja",
    "5 bed mansion in Maitama Abuja"
];
const FALLBACK_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=900";
const PROPERTY_SEARCH_EXAMPLES = ["3 bedroom in Lagos", "apartment for rent Abuja", "land for sale Lekki", "duplex under 150M"];
const SEARCH_STOP_WORDS = new Set(["in", "at", "for", "the", "and", "or", "me", "show", "find", "under", "over", "above", "below", "around", "about"]);
function isPropertySearchQuery(query) {
    const lower = query.toLowerCase().trim();
    if (lower.length === 0)
        return true;
    const hasPropertyKeyword = PROPERTY_KEYWORDS.some(keyword => lower.includes(keyword));
    const hasPriceSignal = /\b\d+\s*(m|million|k|thousand)\b/.test(lower);
    return hasPropertyKeyword || hasPriceSignal;
}
// ─── ViewModel ───────────────────────────────────────────────────────────────
class NeuralViewModel extends MagicViewModel {
    constructor() {
        super();
        this.set("is_stage_active", false);
        this.set("location", "ENCRYPTION_NODE_07");
        this.set("device", this.detectDevice());
        this.set("intent", { location: null, price: null, type: null, bed: null });
        this.set("force_search", false);
    }
    updateScanningState(isScanning) {
        const intelNode = document.getElementById("intel-node");
        if (!intelNode)
            return;
        if (isScanning) {
            intelNode.classList.add("animate-pulse");
            intelNode.innerText = `NODE: ANALYZING_INTENT_${Math.random().toString(36).substring(7).toUpperCase()}`;
        }
        else {
            intelNode.classList.remove("animate-pulse");
            intelNode.innerText = `NODE: SCANNING...`;
        }
    }
    detectDevice() {
        return /mobile/i.test(navigator.userAgent) ? "Mobile Node" : "Command Station";
    }
    async resolveNode() {
        this.set("location", "NIGERIA MARKET GRID");
    }
}
// ─── View ─────────────────────────────────────────────────────────────────────
class NeuralMarketView extends MagicView {
    get viewModel() {
        return this._viewModel;
    }
    set viewModel(vm) {
        this._viewModel = vm;
        vm._view = this;
    }
    constructor(id) {
        super(id);
        this.selectedType = "";
        this.feedbackTimeout = null;
        // ─── Voice Search ──────────────────────────────────────────────────────────
        this.recognition = null;
        this.viewModel = new NeuralViewModel();
        document.getElementById("voice-search-btn")?.addEventListener("click", () => this.startVoiceSearch());
        document.getElementById("voice-stop-btn")?.addEventListener("click", () => this.stopVoiceSearch());
        document.getElementById("clear-results-btn")?.addEventListener("click", () => this.clearSearch());
        document.getElementById("search-input")?.addEventListener("input", event => this.parseConversationalIntent(event));
        // Search on Enter
        document.getElementById("search-input")?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.triggerForceSearch();
            }
        });
        // Scanning state on input
        document.getElementById("search-input")?.addEventListener("input", (e) => {
            this.viewModel.updateScanningState(e.target.value.length > 0);
        });
        this.initFeaturedGrid();
        this.initScrollReveal();
        this.initSuggestionChips();
        this.initTraditionalFilters();
        this.initTypePills();
        // Stage controls
        document.getElementById("close-stage-btn")?.addEventListener("click", () => this.exitStage());
    }
    startVoiceSearch() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.showFeedback("redirect", `<i class="fas fa-exclamation-triangle"></i> Voice search is not supported in this browser. Please type your search instead.`, []);
            return;
        }
        const input = document.getElementById("search-input");
        const overlay = document.getElementById("voice-overlay");
        const interimEl = document.getElementById("voice-interim-text");
        const voiceBtn = document.getElementById("voice-search-btn");
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-NG';
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.continuous = false;
        this.recognition.onstart = () => {
            overlay?.classList.remove("d-none");
            voiceBtn?.classList.add("recording");
            if (interimEl) {
                interimEl.textContent = "Speak now...";
                interimEl.classList.remove("has-text");
            }
        };
        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                }
                else {
                    interim += event.results[i][0].transcript;
                }
            }
            const transcript = final || interim;
            if (interimEl && transcript) {
                interimEl.textContent = transcript;
                interimEl.classList.add("has-text");
            }
            if (final) {
                input.value = final;
                input.dispatchEvent(new Event('input'));
            }
        };
        this.recognition.onspeechend = () => this.recognition?.stop();
        this.recognition.onend = () => {
            overlay?.classList.add("d-none");
            voiceBtn?.classList.remove("recording");
            if (input.value.trim())
                this.triggerForceSearch();
        };
        this.recognition.onerror = () => {
            overlay?.classList.add("d-none");
            voiceBtn?.classList.remove("recording");
        };
        this.recognition.start();
    }
    stopVoiceSearch() {
        this.recognition?.stop();
    }
    // ─── Force Search ──────────────────────────────────────────────────────────
    triggerForceSearch() {
        this.viewModel.set("force_search", true);
        const terminal = document.getElementById("main-terminal");
        terminal?.classList.add("force-search-active");
        const input = document.getElementById("search-input");
        input?.dispatchEvent(new Event('input'));
        setTimeout(() => {
            this.viewModel.set("force_search", false);
            terminal?.classList.remove("force-search-active");
        }, 1200);
    }
    // ─── Clear Search ──────────────────────────────────────────────────────────
    clearSearch() {
        const input = document.getElementById("search-input");
        if (input)
            input.value = "";
        document.getElementById("inline-results").style.display = "none";
        document.getElementById("search-ghost").innerText = "";
        this.hideFeedback();
        this.viewModel.updateScanningState(false);
    }
    // ─── Smart Query Analysis ──────────────────────────────────────────────────
    analyzeQuery(query) {
        const lower = query.toLowerCase().trim();
        if (lower.length < 4)
            return null;
        // Non-property query detection
        const looksLikePriceOnly = /^\d+[mk]?\s*(million|thousand)?$/.test(lower);
        if (!isPropertySearchQuery(lower) && !looksLikePriceOnly) {
            return {
                type: "redirect",
                icon: "fas fa-compass",
                message: "Keep your search focused on property type, location, budget, beds, or listing status. Try:",
                chips: PROPERTY_SEARCH_EXAMPLES
            };
        }
        // Unlisted city detection
        for (const city of UNLISTED_CITIES) {
            if (lower.includes(city)) {
                const displayCity = city.charAt(0).toUpperCase() + city.slice(1);
                return {
                    type: "location",
                    icon: "fas fa-map-marker-alt",
                    message: `We don't have listings in ${displayCity} yet. Try one of our active cities:`,
                    chips: ["Lagos", "Lekki", "Ikoyi", "Abuja", "Port Harcourt", "Ibadan"]
                };
            }
        }
        // Price too low (under ₦10M threshold)
        const lowBudgetMatch = lower.match(/(\d+)\s*(k|thousand)/i);
        if (lowBudgetMatch) {
            return {
                type: "price",
                icon: "fas fa-info-circle",
                message: "Our listings start from ₦10M. Try these price ranges:",
                chips: ["under ₦50M", "₦50M – ₦100M", "₦100M – ₦250M", "₦250M+"]
            };
        }
        // Very large single number without context (e.g. just "5000000")
        const bareNumberMatch = lower.match(/^(\d[\d,]+)$/);
        if (bareNumberMatch) {
            return {
                type: "price",
                icon: "fas fa-lightbulb",
                message: "Looking for properties at a specific price? Try phrasing it like:",
                chips: ["duplex under 100M Lagos", "3 bedroom flat around 50M Ikeja", "mansion above 500M Ikoyi"]
            };
        }
        return null;
    }
    showFeedback(type, message, chips) {
        const el = document.getElementById("search-feedback");
        if (!el)
            return;
        el.className = `search-feedback feedback-${type}`;
        el.innerHTML = `
            <div class="feedback-msg">${message}</div>
            ${chips.length > 0 ? `<div class="feedback-chips">
                ${chips.map(c => `<span class="feedback-chip" data-query="${c}">${c}</span>`).join('')}
            </div>` : ''}
        `;
        el.classList.remove("d-none");
        // Wire up chip clicks
        el.querySelectorAll(".feedback-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const input = document.getElementById("search-input");
                if (input) {
                    input.value = chip.dataset.query || chip.textContent || "";
                    input.dispatchEvent(new Event('input'));
                    this.triggerForceSearch();
                }
            });
        });
    }
    hideFeedback() {
        const el = document.getElementById("search-feedback");
        el?.classList.add("d-none");
    }
    // ─── Conversational Intent Parser ─────────────────────────────────────────
    parseConversationalIntent(event) {
        const input = event.target;
        const raw = input.value;
        const normalized = raw.toLowerCase();
        const ghostElement = document.getElementById("search-ghost");
        // Ghost autocomplete suggestion
        if (normalized.length > 2) {
            const match = GHOST_SUGGESTIONS.find(s => s.toLowerCase().startsWith(normalized));
            if (ghostElement)
                ghostElement.innerText = match || "";
        }
        else if (ghostElement) {
            ghostElement.innerText = "";
        }
        // Smart feedback (debounced)
        if (this.feedbackTimeout)
            clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = setTimeout(() => {
            if (normalized.length >= 4) {
                const feedback = this.analyzeQuery(normalized);
                if (feedback) {
                    this.showFeedback(feedback.type, `<i class="${feedback.icon}"></i> ${feedback.message}`, feedback.chips);
                }
                else {
                    this.hideFeedback();
                }
            }
            else {
                this.hideFeedback();
            }
        }, 350);
        // Parse intent for metadata
        const intent = { ...this.viewModel.get("intent") };
        intent.location = KNOWN_LOCATIONS.find(c => normalized.includes(c)) || null;
        const priceMatch = normalized.match(/(\d+)\s*(m|million|k)/);
        intent.price = priceMatch ? priceMatch[0] : null;
        const types = ["duplex", "terrace", "flat", "apartment", "studio", "penthouse", "land", "commercial", "mansion"];
        intent.type = types.find(t => normalized.includes(t)) || null;
        const bedMatch = normalized.match(/(\d+)\s*bed/);
        intent.bed = bedMatch ? bedMatch[0] : null;
        this.viewModel.set("intent", intent);
        // Results display
        const inlineResults = document.getElementById("inline-results");
        const inlineGrid = document.getElementById("inline-results-grid");
        const resultsCount = document.getElementById("results-count");
        const hasFilters = this.selectedType !== "" ||
            Array.from(document.querySelectorAll('.filter-pill select')).some((s) => s.value && s.value !== 'nigeria' && s.value !== '');
        if (normalized.length >= 2 && !isPropertySearchQuery(normalized)) {
            const feedback = this.analyzeQuery(normalized);
            if (feedback) {
                this.showFeedback(feedback.type, `<i class="${feedback.icon}"></i> ${feedback.message}`, feedback.chips);
            }
            if (inlineResults)
                inlineResults.style.display = "none";
            return;
        }
        if (normalized.length >= 2 || hasFilters) {
            const isForce = this.viewModel.get("force_search");
            const delay = isForce ? 0 : 380;
            if (!isForce && inlineGrid) {
                inlineGrid.innerHTML = `<div class="inline-no-results"><span class="text-accent animate-pulse">SCANNING NEURAL CACHE...</span></div>`;
                if (inlineResults)
                    inlineResults.style.display = "block";
            }
            setTimeout(() => {
                this.renderInlineResults(normalized, inlineGrid, resultsCount);
                if (inlineResults)
                    inlineResults.style.display = "block";
            }, delay);
        }
        else {
            if (inlineResults)
                inlineResults.style.display = "none";
        }
    }
    // ─── Filtering Logic ──────────────────────────────────────────────────────
    getFilteredProperties(query) {
        if (query.trim().length >= 2 && !isPropertySearchQuery(query)) {
            return [];
        }
        const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2 && !SEARCH_STOP_WORDS.has(t));
        const dataProvider = DataProvider.getInstance();
        const allProps = dataProvider.getAllProperties();
        const locFilter = document.getElementById('filter-location')?.value;
        const typeFilter = this.selectedType;
        const minPrice = parseInt(document.getElementById('filter-min-price')?.value) || 0;
        const maxPrice = parseInt(document.getElementById('filter-max-price')?.value) || Infinity;
        const dateFilter = document.getElementById('filter-date')?.value;
        let dateCutoff = null;
        if (dateFilter) {
            const now = new Date();
            if (dateFilter === '24h')
                dateCutoff = new Date(now.getTime() - 86400000);
            else if (dateFilter === '7d')
                dateCutoff = new Date(now.getTime() - 604800000);
            else if (dateFilter === '30d')
                dateCutoff = new Date(now.getTime() - 2592000000);
        }
        const results = allProps.map(p => {
            // Location Filter
            if (locFilter && locFilter !== 'nigeria' && !p.location.toLowerCase().includes(locFilter.toLowerCase()))
                return { property: p, score: 0 };
            // Type Filter
            if (typeFilter && !p.category.toLowerCase().includes(typeFilter.toLowerCase()) && !p.title.toLowerCase().includes(typeFilter.toLowerCase()))
                return { property: p, score: 0 };
            // Price Filter
            const numericPrice = parseInt(p.price.replace(/[^\d]/g, ''));
            if (numericPrice && (numericPrice < minPrice || numericPrice > maxPrice))
                return { property: p, score: 0 };
            // Date Filter
            if (dateCutoff && p.datePosted) {
                if (new Date(p.datePosted) < dateCutoff)
                    return { property: p, score: 0 };
            }
            // Text Search
            const content = `${p.title} ${p.location} ${p.description} ${p.category}`.toLowerCase();
            const matchedTokens = tokens.filter(t => content.includes(t));
            const score = tokens.length === 0 ? 1 : matchedTokens.length;
            return { property: p, score };
        })
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(result => result.property);
        return results;
    }
    // ─── Render Inline Results ────────────────────────────────────────────────
    renderInlineResults(query, container, countEl) {
        if (!container)
            return;
        const filtered = this.getFilteredProperties(query);
        if (countEl) {
            countEl.textContent = `${filtered.length} RESULT${filtered.length !== 1 ? 'S' : ''}`;
        }
        if (filtered.length === 0) {
            const tips = this.getNoResultTips(query);
            container.innerHTML = `
                <div class="inline-no-results" style="grid-column:1/-1;padding:1.5rem;text-align:center;">
                    <p style="color:rgba(255,255,255,0.3);font-size:0.8rem;margin-bottom:0.75rem;">No properties matched your search</p>
                    ${tips ? `<div class="feedback-chips" style="justify-content:center;">${tips}</div>` : ''}
                </div>`;
            return;
        }
        container.innerHTML = filtered.map(p => `
            <div class="inline-result-card" onclick="window.marketplaceView.enterStage(${p.id})" title="${p.title}" role="button" tabindex="0" aria-label="Preview ${p.title}">
                <div class="inline-result-img-wrap">
                    <img src="${p.image || FALLBACK_PROPERTY_IMAGE}" class="inline-result-img" alt="${p.title}" loading="lazy" onerror="this.src='${FALLBACK_PROPERTY_IMAGE}'">
                    <span class="inline-source-badge">${p.status}</span>
                </div>
                <div class="inline-result-info">
                    <span class="inline-result-price">₦${p.price.split(' ')[0]}</span>
                    <strong class="inline-result-title">${p.title}</strong>
                    <span class="inline-result-location">${p.location}</span>
                </div>
            </div>
        `).join('');
    }
    // ─── Stage Logic ──────────────────────────────────────────────────────────
    async enterStage(propId) {
        const dataProvider = DataProvider.getInstance();
        const prop = dataProvider.getPropertyById(propId);
        if (!prop)
            return;
        const stage = document.getElementById("property-stage");
        if (!stage)
            return;
        // Populate Stage
        const mainImg = document.getElementById("stage-main-img");
        if (mainImg) {
            mainImg.src = prop.image || FALLBACK_PROPERTY_IMAGE;
            mainImg.onerror = () => { mainImg.src = FALLBACK_PROPERTY_IMAGE; };
        }
        const titleEl = document.getElementById("stage-title");
        if (titleEl)
            titleEl.innerText = prop.title;
        const priceEl = document.getElementById("stage-price");
        if (priceEl)
            priceEl.innerText = `₦${prop.price}`;
        const catEl = document.getElementById("stage-category");
        if (catEl)
            catEl.innerText = prop.category.toUpperCase();
        const locEl = document.getElementById("stage-location");
        if (locEl)
            locEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${prop.location}`;
        const bedsEl = document.getElementById("stage-beds");
        if (bedsEl)
            bedsEl.innerText = (prop.bedrooms || 0).toString();
        const bathsEl = document.getElementById("stage-baths");
        if (bathsEl)
            bathsEl.innerText = (prop.bathrooms || 0).toString();
        const sqftEl = document.getElementById("stage-sqft");
        if (sqftEl)
            sqftEl.innerText = (prop.sqft || 0).toLocaleString();
        const descEl = document.getElementById("stage-desc");
        if (descEl)
            descEl.innerText = prop.description || "No intelligence brief available for this asset.";
        const amenitiesList = document.getElementById("stage-amenities-list");
        if (amenitiesList) {
            amenitiesList.innerHTML = (prop.amenities || []).map(a => `<span class="amenity-tag">${a}</span>`).join('');
        }
        const contactBtn = document.getElementById("stage-contact-btn");
        if (contactBtn) {
            contactBtn.onclick = () => window.open(prop.original_url || '#', '_blank');
        }
        // Show Stage
        stage.style.display = 'flex';
        stage.classList.remove("d-none");
        document.body.style.overflow = "hidden";
        this.viewModel.set("is_stage_active", true);
    }
    exitStage() {
        const stage = document.getElementById("property-stage");
        if (stage) {
            stage.classList.add("d-none");
            stage.style.display = 'none';
            document.body.style.overflow = "";
            this.viewModel.set("is_stage_active", false);
        }
    }
    closeStage() {
        this.exitStage();
    }
    getNoResultTips(query) {
        const lower = query.toLowerCase();
        // Detect if it was a location issue
        for (const city of UNLISTED_CITIES) {
            if (lower.includes(city)) {
                return ['Lagos', 'Lekki', 'Abuja', 'Ikoyi'].map(c => `<span class="feedback-chip" onclick="document.getElementById('search-input').value=document.getElementById('search-input').value.replace('${city}','${c.toLowerCase()}');document.getElementById('search-input').dispatchEvent(new Event('input'))">${c}</span>`).join('');
            }
        }
        // Suggest dropping some filters
        const locFilter = document.getElementById('filter-location')?.value;
        if (locFilter && locFilter !== 'nigeria') {
            return `<span class="feedback-chip" onclick="document.getElementById('filter-location').value='nigeria';document.getElementById('filter-location').dispatchEvent(new Event('change'))">Clear location filter</span>`;
        }
        return '';
    }
    // ─── Render Bento Grid ────────────────────────────────────────────────────
    renderBentoGridData(items, container) {
        if (!container)
            return;
        if (items.length === 0) {
            container.innerHTML = `<div style="padding:3rem;text-align:center;grid-column:1/-1;" class="text-label">NO SIGNAL MATCHED IN NEURAL CACHE</div>`;
            return;
        }
        container.innerHTML = items.map((p, i) => `
            <a href="property.html?id=${p.id}" class="bento-card" style="transition-delay:${i * 0.04}s;">
                <div style="position:relative;overflow:hidden;">
                    <img src="${p.image}" class="bento-img" alt="${p.title}" loading="lazy">
                    <div style="position:absolute;bottom:0;left:0;padding:0.75rem 1rem;width:100%;background:linear-gradient(transparent,rgba(0,0,0,0.8))">
                        <span class="text-accent" style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${p.category} · BOU Verified</span>
                    </div>
                </div>
                <div style="padding:1.25rem;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
                        <h4 style="margin:0;font-size:1rem;color:white;">${p.title}</h4>
                        <span class="text-accent" style="font-size:0.8rem;font-weight:700;white-space:nowrap;margin-left:1rem;">₦${p.price.split(' ')[0]}</span>
                    </div>
                    <p class="text-label" style="margin-bottom:0.75rem;">${p.location}${p.bedrooms > 0 ? ' · ' + p.bedrooms + ' Beds' : ''}</p>
                    <p class="text-muted" style="font-size:0.85rem;margin:0;">${p.description.substring(0, 80)}...</p>
                </div>
            </a>
        `).join('');
    }
    // ─── Featured Grid ────────────────────────────────────────────────────────
    async initFeaturedGrid() {
        const container = document.getElementById("featured-grid");
        const dataProvider = DataProvider.getInstance();
        await dataProvider.init();
        const featured = dataProvider.getAllProperties().slice(0, 6);
        this.renderBentoGridData(featured, container);
    }
    // ─── Filters & Pills ──────────────────────────────────────────────────────
    initTraditionalFilters() {
        document.querySelectorAll('.filter-pill select').forEach(select => {
            select.addEventListener('change', () => {
                const input = document.getElementById('search-input');
                if (input)
                    input.dispatchEvent(new Event('input'));
            });
        });
    }
    initTypePills() {
        const pills = document.querySelectorAll('.type-pill');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.selectedType = pill.getAttribute('data-type') || "";
                const input = document.getElementById('search-input');
                if (input)
                    input.dispatchEvent(new Event('input'));
            });
        });
    }
    initSuggestionChips() {
        const input = document.getElementById('search-input');
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                input.value = chip.textContent?.replace(/"/g, '') || "";
                input.dispatchEvent(new Event('input'));
                this.triggerForceSearch();
            });
        });
    }
    // ─── Scroll Reveal ────────────────────────────────────────────────────────
    initScrollReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting)
                    entry.target.classList.add('revealed');
            });
        }, { threshold: 0.1 });
        const observe = () => document.querySelectorAll('.bento-card, section, .featured-header').forEach(el => observer.observe(el));
        observe();
        window.addEventListener('grid-rendered', observe);
    }
}
// ─── Entry Point ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    await DataProvider.getInstance().init();
    const view = new NeuralMarketView("marketplace-search-view");
    window.marketplaceView = view;
    await view.viewModel.resolveNode();
    const intelNode = document.getElementById("intel-node");
    intelNode?.classList.remove("animate-pulse");
    intelNode?.classList.add("animate-fade-in");
    intelNode.innerText = `NODE: ${(await view.viewModel.get("location"))}`;
    const deviceNode = document.getElementById("device-node");
    deviceNode?.classList.remove("animate-pulse");
    deviceNode?.classList.add("animate-fade-in");
    deviceNode.innerText = `DEVICE: ${view.viewModel.get("device")}`;
});
