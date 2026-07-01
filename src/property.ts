import { MagicView, MagicViewModel } from "../../magicui/src/index";
import { type Property } from "./lib/mock-data";
import { DataProvider } from "./lib/data-provider";

declare let L: any;

export function getPropertyCoordinates(locationStr: string): [number, number] {
    const lower = locationStr.toLowerCase();
    if (lower.includes("ikoyi") || lower.includes("bourdillon")) return [6.4549, 3.4246];
    if (lower.includes("banana island")) return [6.4638, 3.4557];
    if (lower.includes("victoria island")) return [6.4281, 3.4219];
    if (lower.includes("chevron") || lower.includes("orchid") || lower.includes("ikate") || lower.includes("vgc") || lower.includes("lekki")) return [6.4281, 3.4219];
    if (lower.includes("ikeja")) return [6.6018, 3.3515];
    if (lower.includes("yaba")) return [6.5095, 3.3711];
    if (lower.includes("epe")) return [6.5833, 3.9833];
    if (lower.includes("maitama")) return [9.0882, 7.5006];
    if (lower.includes("guzape")) return [9.0227, 7.5020];
    if (lower.includes("asokoro")) return [9.0381, 7.5186];
    if (lower.includes("wuse")) return [9.0683, 7.4619];
    if (lower.includes("abuja")) return [9.0765, 7.3986];
    if (lower.includes("port harcourt")) return [4.8156, 7.0498];
    if (lower.includes("ibadan") || lower.includes("bodija")) return [7.3775, 3.9470];
    if (lower.includes("enugu")) return [6.4584, 7.5464];
    return [6.5244, 3.3792]; // Lagos general default
}

export function getCoordinatesWithJitter(locationStr: string, id: number): [number, number] {
    const base = getPropertyCoordinates(locationStr);
    const latOffset = ((id * 17) % 100 - 50) / 15000;
    const lngOffset = ((id * 23) % 100 - 50) / 15000;
    return [base[0] + latOffset, base[1] + lngOffset];
}

const FALLBACK_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=900";

class PropertyDetailViewModel extends MagicViewModel {
    constructor() {
        super();
        this.set("property", null);
    }
}

class PropertyDetailView extends MagicView {
    private galleryImages: string[] = [];
    private activeGalleryIndex = 0;
    private sliderInterval: ReturnType<typeof setInterval> | null = null;

    get viewModel(): PropertyDetailViewModel {
        return this._viewModel as PropertyDetailViewModel;
    }
    set viewModel(vm: PropertyDetailViewModel) {
        this._viewModel = vm;
        vm._view = this;
    }

    constructor(id: string) {
        super(id);
        this.viewModel = new PropertyDetailViewModel();
    }

    async loadProperty() {
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');

        const dataProvider = DataProvider.getInstance();
        await dataProvider.init();

        let id: number;
        if (!idParam) {
            // Fallback to sample property (first one)
            const all = dataProvider.getAllProperties();
            if (all.length > 0) {
                id = all[0].id;
            } else {
                this.showError("No asset intelligence found.");
                return;
            }
        } else {
            id = parseInt(idParam, 10);
        }

        const property = dataProvider.getPropertyById(id);

        if (!property) {
            this.showError("Asset not found in the neural cache.");
            return;
        }

        this.viewModel.set("property", property);

        setTimeout(() => {
            this.renderProperty(property);
        }, 700);
    }

    showError(msg: string) {
        const loadingState = document.getElementById("loading-state");
        if (loadingState) {
            loadingState.innerHTML = `
                <div style="text-align:center;">
                    <i class="fas fa-exclamation-triangle text-accent" style="font-size:2rem;margin-bottom:1rem;display:block;"></i>
                    <h3 style="color:rgba(255,255,255,0.6);font-size:1rem;margin-bottom:1rem;">${msg}</h3>
                    <a href="index.html" class="btn-action" style="font-size:0.8rem;padding:0.75rem 1.5rem;">Return to Marketplace</a>
                </div>
            `;
        }
    }

    renderProperty(prop: Property) {
        document.getElementById("loading-state")?.classList.add("d-none");
        const content = document.getElementById("property-content");
        if (content) content.classList.remove("d-none");

        // Badges and status
        this.setText("prop-category", prop.category);
        const sourceEl = document.getElementById("prop-source");
        if (sourceEl) {
            sourceEl.textContent = prop.sourceSite || "Verified";
            if (prop.sourceSite === 'Xtate') {
                sourceEl.style.background = "#9B5DE5";
                sourceEl.style.color = "white";
            } else if (prop.sourceSite === 'Jiji') {
                sourceEl.style.background = "#007bff";
                sourceEl.style.color = "white";
            } else {
                sourceEl.style.background = "#00e676";
                sourceEl.style.color = "black";
            }
        }
        this.setText("prop-status", prop.status);
        this.setText("prop-ref-id", `REF: ${prop.refId || '—'}`);

        // Furnishing & Serviced badges
        const furnishingEl = document.getElementById("prop-furnishing");
        if (furnishingEl) {
            if (prop.furnishing) {
                furnishingEl.textContent = prop.furnishing;
                furnishingEl.style.display = "inline-block";
            } else {
                furnishingEl.style.display = "none";
            }
        }

        const servicedEl = document.getElementById("prop-serviced");
        if (servicedEl) {
            if (prop.serviced) {
                servicedEl.style.display = "inline-block";
            } else {
                servicedEl.style.display = "none";
            }
        }

        // Title
        this.setText("prop-title", prop.title);

        // Location (includes icon via CSS)
        this.setText("prop-location", `<i class="fas fa-map-marker-alt"></i> ${prop.location}`);

        // Price
        this.setText("prop-price", `₦${prop.price}`);

        // Specs — show N/A for land/commercial
        this.setText("spec-beds", prop.bedrooms > 0 ? prop.bedrooms.toString() : "—");
        this.setText("spec-baths", prop.bathrooms > 0 ? prop.bathrooms.toString() : "—");
        this.setText("spec-toilets", prop.toilets !== undefined ? prop.toilets.toString() : (prop.bathrooms > 0 ? prop.bathrooms.toString() : "—"));
        this.setText("spec-parking", prop.parkingSpaces !== undefined ? prop.parkingSpaces.toString() : "—");
        this.setText("spec-sqft", prop.sqft > 0 ? prop.sqft.toLocaleString() : "—");

        // Safety Alert Banner
        const safetyBanner = document.getElementById("prop-safety-banner");
        if (safetyBanner) {
            if (prop.sourceSite === 'Jiji') {
                safetyBanner.innerHTML = `
                    <div style="background: rgba(220, 53, 69, 0.15); border: 1px solid rgba(220, 53, 69, 0.3); border-left: 4px solid #dc3545; padding: 0.85rem; color: #ffccd0; border-radius: 4px;">
                        <i class="fas fa-exclamation-triangle" style="color: #dc3545; margin-right: 0.5rem; font-size: 1rem;"></i>
                        <strong>Jiji Safety Advisory:</strong> Do not pay in advance. Always inspect the property physically in daylight, verify the seller's true identity, and check all original title deeds before any financial commitment.
                    </div>
                `;
            } else if (prop.sourceSite === 'NPC') {
                safetyBanner.innerHTML = `
                    <div style="background: rgba(0, 230, 118, 0.1); border: 1px solid rgba(0, 230, 118, 0.2); border-left: 4px solid #00e676; padding: 0.85rem; color: #c8e6c9; border-radius: 4px;">
                        <i class="fas fa-shield-alt" style="color: #00e676; margin-right: 0.5rem; font-size: 1rem;"></i>
                        <strong>NPC Verified Listing:</strong> Please inspect the property physically in person. Ensure you verify the agent's mandate and conduct a search at the state land registry before making payments.
                    </div>
                `;
            } else if (prop.sourceSite === 'Xtate') {
                safetyBanner.innerHTML = `
                    <div style="background: rgba(111, 66, 193, 0.15); border: 1px solid rgba(111, 66, 193, 0.3); border-left: 4px solid #9B5DE5; padding: 0.85rem; color: #e2d9f3; border-radius: 4px;">
                        <i class="fas fa-check-circle" style="color: #9B5DE5; margin-right: 0.5rem; font-size: 1rem;"></i>
                        <strong>Xtate Direct Listing:</strong> This property is listed directly from our management network. Full identity verification, instant viewing booking, and automated rental contract support are active.
                    </div>
                `;
            } else {
                safetyBanner.innerHTML = `
                    <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.2); border-left: 4px solid #ffc107; padding: 0.85rem; color: #fff3cd; border-radius: 4px;">
                        <i class="fas fa-info-circle" style="color: #ffc107; margin-right: 0.5rem; font-size: 1rem;"></i>
                        <strong>Property Advisory:</strong> Conduct physical inspections in daylight and verify all legal title documentation with an independent legal advisor before making payments.
                    </div>
                `;
            }
        }

        // Agent Card Info
        this.setText("agent-name", prop.agentName || "Verified Agent");
        const agentStatusText = prop.agentVerified 
            ? '<i class="fas fa-check-circle" style="color: #00e676;"></i> Verified Partner' 
            : 'Standard Partner';
        this.setText("agent-status", agentStatusText);

        // Hide beds/baths for land-type properties
        const specsSection = document.querySelector(".prop-specs");
        if (prop.bedrooms === 0 && prop.bathrooms === 0 && specsSection) {
            (specsSection as HTMLElement).style.display = "none";
        }

        // Main image
        const mainImg = document.getElementById("main-image") as HTMLImageElement;
        if (mainImg) {
            mainImg.src = prop.image || FALLBACK_PROPERTY_IMAGE;
            mainImg.alt = prop.title;
            mainImg.onerror = () => { mainImg.src = FALLBACK_PROPERTY_IMAGE; };
        }

        // Thumbnails
        const galleryContainer = document.getElementById("thumbnail-gallery");
        if (galleryContainer) {
            this.galleryImages = [prop.image, ...prop.gallery.filter(g => g !== prop.image)].filter(Boolean);
            if (this.galleryImages.length === 0) this.galleryImages = [FALLBACK_PROPERTY_IMAGE];
            galleryContainer.innerHTML = this.galleryImages.map((img, i) => `
                <img
                    src="${img}"
                    class="prop-thumb ${i === 0 ? 'active' : ''}"
                    alt="View ${i + 1}"
                    data-gallery-index="${i}"
                    onerror="this.src='${FALLBACK_PROPERTY_IMAGE}'"
                >
            `).join('');
            this.bindGalleryControls();
            this.startGallerySlider();
        }

        // Amenities
        const amenitiesContainer = document.getElementById("amenities-list");
        if (amenitiesContainer) {
            if (prop.amenities.length > 0) {
                amenitiesContainer.innerHTML = prop.amenities.map(a => `
                    <span class="amenity-tag">${a}</span>
                `).join('');
            } else {
                document.getElementById("amenities-section")?.remove();
            }
        }

        // Description — render as plain text first, audio button activates ghost narration
        const descContainer = document.getElementById("narration-stream");
        if (descContainer) descContainer.textContent = prop.description;

        // Contact CTA Links (WhatsApp & Call)
        const btnWhatsapp = document.getElementById("btn-whatsapp-agent") as HTMLAnchorElement;
        const isXtate = prop.sourceSite === 'Xtate';
        if (btnWhatsapp) {
            btnWhatsapp.href = isXtate ? (prop.agentWhatsApp || '#') : (prop.original_url || '#');
            btnWhatsapp.target = "_blank";
        }
        const btnCall = document.getElementById("btn-call-agent") as HTMLAnchorElement;
        if (btnCall) {
            btnCall.href = isXtate ? (prop.agentPhone || '#') : (prop.original_url || '#');
            if (isXtate) {
                btnCall.removeAttribute("target");
            } else {
                btnCall.target = "_blank";
            }
        }

        // Audio button
        const btnAudio = document.getElementById("btn-read-aloud");
        if (btnAudio) {
            btnAudio.addEventListener("click", () => {
                btnAudio.classList.toggle("playing");
                if (btnAudio.classList.contains("playing")) {
                    btnAudio.innerHTML = `<i class="fas fa-stop"></i> Stop Briefing`;
                    this.ghostNarrate(prop.description, "narration-stream");
                } else {
                    btnAudio.innerHTML = `<i class="fas fa-volume-up"></i> Play Audio Briefing`;
                    window.speechSynthesis.cancel();
                    if (descContainer) descContainer.textContent = prop.description;
                }
            });
        }

        // Render Map
        const coords = getCoordinatesWithJitter(prop.location, prop.id);
        const mapContainer = document.getElementById("property-map");
        if (mapContainer && typeof L !== 'undefined') {
            try {
                // Initialize map
                const map = L.map("property-map", {
                    zoomControl: true,
                    attributionControl: false
                }).setView(coords, 14);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    maxZoom: 20
                }).addTo(map);

                // Privacy circle
                L.circle(coords, {
                    color: '#00ff88',
                    fillColor: '#00ff88',
                    fillOpacity: 0.1,
                    radius: 350
                }).addTo(map);

                // Price badge marker
                const priceAbbr = prop.price.split(' ')[0];
                const customIcon = L.divIcon({
                    className: 'custom-price-marker',
                    html: `<div class="map-price-badge"><i class="fas fa-store map-marketplace-icon"></i> ₦${priceAbbr}</div>`,
                    iconSize: [80, 30],
                    iconAnchor: [40, 15]
                });

                L.marker(coords, { icon: customIcon }).addTo(map);
            } catch (err) {
                console.error("Leaflet map initialization failed:", err);
            }
        }

        // Bind Lightbox and Tenant Application
        this.bindLightbox();
        this.bindTenantApplication(prop);

        // Update page title
        document.title = `${prop.title} — Marketplace`;
    }

    setText(id: string, html: string) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    private showGalleryImage(index: number) {
        if (this.galleryImages.length === 0) return;
        this.activeGalleryIndex = (index + this.galleryImages.length) % this.galleryImages.length;
        const mainImg = document.getElementById("main-image") as HTMLImageElement;
        if (mainImg) {
            mainImg.src = this.galleryImages[this.activeGalleryIndex] || FALLBACK_PROPERTY_IMAGE;
            mainImg.onerror = () => { mainImg.src = FALLBACK_PROPERTY_IMAGE; };
        }
        document.querySelectorAll(".prop-thumb").forEach((thumb, thumbIndex) => {
            thumb.classList.toggle("active", thumbIndex === this.activeGalleryIndex);
        });
    }

    private bindGalleryControls() {
        document.querySelectorAll(".prop-thumb").forEach(thumb => {
            thumb.addEventListener("click", () => {
                const index = Number((thumb as HTMLElement).dataset.galleryIndex || 0);
                this.showGalleryImage(index);
                this.startGallerySlider();
            });
        });

        // Main gallery next/prev overlay navigation
        const btnPrev = document.getElementById("btn-gallery-prev");
        const btnNext = document.getElementById("btn-gallery-next");

        btnPrev?.addEventListener("click", (e) => {
            e.stopPropagation(); // Avoid triggering lightbox open
            this.showGalleryImage(this.activeGalleryIndex - 1);
            this.startGallerySlider();
        });

        btnNext?.addEventListener("click", (e) => {
            e.stopPropagation(); // Avoid triggering lightbox open
            this.showGalleryImage(this.activeGalleryIndex + 1);
            this.startGallerySlider();
        });
    }

    private startGallerySlider() {
        if (this.sliderInterval) clearInterval(this.sliderInterval);
        if (this.galleryImages.length <= 1) return;
        this.sliderInterval = setInterval(() => {
            this.showGalleryImage(this.activeGalleryIndex + 1);
        }, 6500);
    }

    private bindLightbox() {
        const mainImg = document.getElementById("main-image");
        const lightbox = document.getElementById("gallery-lightbox");
        const lightboxClose = document.getElementById("btn-close-lightbox");
        const lightboxPrev = document.getElementById("btn-lightbox-prev");
        const lightboxNext = document.getElementById("btn-lightbox-next");

        if (!mainImg || !lightbox || !lightboxClose) return;

        // Click main image to open lightbox
        mainImg.addEventListener("click", () => {
            lightbox.classList.remove("d-none");
            this.updateLightboxImage(this.activeGalleryIndex);
        });

        // Close lightbox
        lightboxClose.addEventListener("click", () => {
            lightbox.classList.add("d-none");
        });

        // Lightbox prev/next buttons
        lightboxPrev?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.updateLightboxImage(this.activeGalleryIndex - 1);
        });

        lightboxNext?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.updateLightboxImage(this.activeGalleryIndex + 1);
        });

        // Keyboard navigation & close
        document.addEventListener("keydown", (e) => {
            if (lightbox.classList.contains("d-none")) return;
            if (e.key === "Escape") {
                lightbox.classList.add("d-none");
            } else if (e.key === "ArrowLeft") {
                this.updateLightboxImage(this.activeGalleryIndex - 1);
            } else if (e.key === "ArrowRight") {
                this.updateLightboxImage(this.activeGalleryIndex + 1);
            }
        });
    }

    private updateLightboxImage(index: number) {
        if (this.galleryImages.length === 0) return;
        this.activeGalleryIndex = (index + this.galleryImages.length) % this.galleryImages.length;

        // Keep main page image in sync
        const mainImg = document.getElementById("main-image") as HTMLImageElement;
        if (mainImg) mainImg.src = this.galleryImages[this.activeGalleryIndex];

        const lightboxImg = document.getElementById("lightbox-main-img") as HTMLImageElement;
        if (lightboxImg) lightboxImg.src = this.galleryImages[this.activeGalleryIndex];

        // Keep standard thumbnails highlighting in sync
        document.querySelectorAll(".prop-thumb").forEach((thumb, i) => {
            thumb.classList.toggle("active", i === this.activeGalleryIndex);
        });

        // Render thumbs in lightbox
        const thumbsContainer = document.getElementById("lightbox-thumbs-container");
        if (thumbsContainer) {
            thumbsContainer.innerHTML = this.galleryImages.map((img, i) => `
                <img
                    src="${img}"
                    class="lightbox-thumb ${i === this.activeGalleryIndex ? 'active' : ''}"
                    style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 2px solid ${i === this.activeGalleryIndex ? 'var(--emerald)' : 'rgba(255,255,255,0.2)'}; cursor: pointer; transition: all 0.2s;"
                    data-lightbox-index="${i}"
                    onerror="this.src='${FALLBACK_PROPERTY_IMAGE}'"
                >
            `).join('');

            thumbsContainer.querySelectorAll(".lightbox-thumb").forEach(thumb => {
                thumb.addEventListener("click", () => {
                    const idx = Number((thumb as HTMLElement).dataset.lightboxIndex || 0);
                    this.updateLightboxImage(idx);
                });
            });
        }
    }

    private bindTenantApplication(prop: Property) {
        const modal = document.getElementById("tenant-modal");
        const btnOpen = document.getElementById("btn-apply-tenant");
        const btnClose = document.getElementById("btn-close-tenant-modal");
        const btnCloseSuccess = document.getElementById("btn-success-close");

        const btnStep1Next = document.getElementById("btn-step-1-next");
        const btnStep2Next = document.getElementById("btn-step-2-next");
        const btnStep2Back = document.getElementById("btn-step-2-back");
        const btnStep3Back = document.getElementById("btn-step-3-back");

        const form = document.getElementById("tenant-application-form") as HTMLFormElement;
        const formContainer = document.getElementById("tenant-form-container");
        const successContainer = document.getElementById("tenant-success-container");

        if (!modal || !btnOpen) return;

        // Custom titles based on purchase status
        const modalTitle = document.getElementById("tenant-modal-title");
        const modalSubtitle = document.getElementById("tenant-modal-subtitle");
        
        if (prop.status === "For Sale") {
            btnOpen.innerHTML = `<i class="fas fa-gavel"></i> Make an Offer`;
            if (modalTitle) modalTitle.textContent = "Property Purchase Offer";
            if (modalSubtitle) modalSubtitle.textContent = "Secure buyer identity verification via government database integration.";
            
            const salaryLabel = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('MONTHLY SALARY'));
            if (salaryLabel) salaryLabel.textContent = "AVAILABLE PURCHASE BUDGET (₦)";
        } else {
            btnOpen.innerHTML = `<i class="fas fa-file-contract"></i> Apply to Rent`;
            if (modalTitle) modalTitle.textContent = "Tenant Application Form";
            if (modalSubtitle) modalSubtitle.textContent = "Secure tenant verification via government database integration.";
        }

        // Open/Close triggers
        btnOpen.addEventListener("click", (e) => {
            e.preventDefault();
            if (prop.sourceSite === 'Xtate') {
                modal.classList.remove("d-none");
                formContainer?.classList.remove("d-none");
                successContainer?.classList.add("d-none");
                this.goToStep(1);
            } else {
                window.open(prop.original_url, '_blank');
            }
        });

        btnClose?.addEventListener("click", () => modal.classList.add("d-none"));
        btnCloseSuccess?.addEventListener("click", () => modal.classList.add("d-none"));

        // Steps navigation validations
        btnStep1Next?.addEventListener("click", () => {
            const nameInput = document.getElementById("app-full-name") as HTMLInputElement;
            const emailInput = document.getElementById("app-email") as HTMLInputElement;
            const phoneInput = document.getElementById("app-phone") as HTMLInputElement;

            if (nameInput.checkValidity() && emailInput.checkValidity() && phoneInput.checkValidity()) {
                this.goToStep(2);
            } else {
                nameInput.reportValidity();
                emailInput.reportValidity();
                phoneInput.reportValidity();
            }
        });

        btnStep2Next?.addEventListener("click", () => {
            const jobInput = document.getElementById("app-job") as HTMLInputElement;
            const employerInput = document.getElementById("app-employer") as HTMLInputElement;
            const salaryInput = document.getElementById("app-salary") as HTMLInputElement;

            if (jobInput.checkValidity() && employerInput.checkValidity() && salaryInput.checkValidity()) {
                this.goToStep(3);
                this.initializeNinjaWidget();
            } else {
                jobInput.reportValidity();
                employerInput.reportValidity();
                salaryInput.reportValidity();
            }
        });

        btnStep2Back?.addEventListener("click", () => this.goToStep(1));
        btnStep3Back?.addEventListener("click", () => this.goToStep(2));

        // Submit form
        form?.addEventListener("submit", (e) => {
            e.preventDefault();
            formContainer?.classList.add("d-none");
            successContainer?.classList.remove("d-none");
            
            const refEl = document.getElementById("app-reference-id");
            if (refEl) {
                const prefix = prop.status === "For Sale" ? "OFFER" : "APP";
                const randNum = Math.floor(Math.random() * 900000 + 100000);
                refEl.textContent = `REF: ${prefix}-${randNum}`;
            }
        });
    }

    private goToStep(stepNum: number) {
        const step1 = document.getElementById("form-step-1");
        const step2 = document.getElementById("form-step-2");
        const step3 = document.getElementById("form-step-3");

        const badge1 = document.getElementById("step-badge-1");
        const badge2 = document.getElementById("step-badge-2");
        const badge3 = document.getElementById("step-badge-3");

        if (!step1 || !step2 || !step3 || !badge1 || !badge2 || !badge3) return;

        step1.classList.add("d-none");
        step2.classList.add("d-none");
        step3.classList.add("d-none");

        badge1.style.background = "rgba(255,255,255,0.08)";
        badge1.style.color = "#fff";
        badge1.style.borderColor = "rgba(255,255,255,0.1)";

        badge2.style.background = "rgba(255,255,255,0.08)";
        badge2.style.color = "#fff";
        badge2.style.borderColor = "rgba(255,255,255,0.1)";

        badge3.style.background = "rgba(255,255,255,0.08)";
        badge3.style.color = "#fff";
        badge3.style.borderColor = "rgba(255,255,255,0.1)";

        if (stepNum === 1) {
            step1.classList.remove("d-none");
            badge1.style.background = "var(--emerald)";
            badge1.style.color = "black";
            badge1.style.borderColor = "var(--emerald)";
        } else if (stepNum === 2) {
            step2.classList.remove("d-none");
            badge2.style.background = "var(--emerald)";
            badge2.style.color = "black";
            badge2.style.borderColor = "var(--emerald)";
        } else if (stepNum === 3) {
            step3.classList.remove("d-none");
            badge3.style.background = "var(--emerald)";
            badge3.style.color = "black";
            badge3.style.borderColor = "var(--emerald)";
        }
    }

    private async initializeNinjaWidget() {
        const anchor = document.getElementById("ninja-form-anchor");
        if (!anchor) return;
        
        anchor.innerHTML = "";
        
        const statusBadge = document.getElementById("app-verification-status");
        if (statusBadge) {
            statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(255, 193, 7, 0.15); color: #ffc107; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-spinner fa-spin"></i> Authenticating Session...</span>`;
        }

        try {
            const response = await fetch("https://api.ninja.boucloud.io/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_key: "pk_fa9f85d0-325b-4dfa-9c0e-39f7b83f1104",
                    client_secret: "sk_e2473e41-8a35-4137-923b-034a73e8b6d7"
                })
            });

            if (!response.ok) throw new Error("Failed to authenticate session token");
            const { token } = await response.json();

            if ((window as any).Ninja) {
                (window as any).Ninja.init({
                    targetElement: "#ninja-form-anchor",
                    apiKey: token,
                    idType: "nin",
                    mode: "lookup",
                    display: "form",
                    buttonLabel: "Verify Identity",
                    onSuccess: (data: any) => {
                        console.log("Ninja KYC Success:", data);
                        if (statusBadge) {
                            statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(0, 230, 118, 0.15); color: #00e676; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-check-circle"></i> ID Verified (${data.first_name || ''} ${data.last_name || ''})</span>`;
                        }
                        const submitBtn = document.getElementById("btn-submit-application") as HTMLButtonElement;
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.style.cursor = "pointer";
                            submitBtn.style.opacity = "1";
                        }
                    },
                    onFailure: (err: any) => {
                        console.warn("Ninja KYC Failure:", err);
                        if (statusBadge) {
                            statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(220, 53, 69, 0.15); color: #dc3545; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-times-circle"></i> Verification Failed</span>`;
                        }
                    },
                    onError: (err: any) => {
                        console.error("Ninja KYC Error:", err);
                        if (statusBadge) {
                            statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(220, 53, 69, 0.15); color: #dc3545; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-exclamation-triangle"></i> SDK Connection Error</span>`;
                        }
                    }
                });
            } else {
                throw new Error("Ninja SDK not loaded on window");
            }
        } catch (e) {
            console.error("Failed to initialize verification widget:", e);
            if (statusBadge) {
                statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(220, 53, 69, 0.15); color: #dc3545; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-times-circle"></i> API Connection Error</span>`;
            }
        }
    }

    ghostNarrate(text: string, elementId: string) {
        window.speechSynthesis.cancel();
        const container = document.getElementById(elementId);
        if (!container) return;

        const words = text.split(' ');
        container.innerHTML = words.map((w, i) => `<span id="gw-${i}">${w} </span>`).join('');

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        utterance.pitch = 0.9;
        utterance.voice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-GB') || null;

        let currentWord = 0;
        utterance.onboundary = (e: any) => {
            if (e.name === 'word') {
                const wordSpan = document.getElementById(`gw-${currentWord}`);
                if (wordSpan) wordSpan.classList.add("active");
                currentWord++;
            }
        };

        utterance.onend = () => {
            const btn = document.getElementById("btn-read-aloud");
            if (btn) {
                btn.classList.remove("playing");
                btn.innerHTML = `<i class="fas fa-volume-up"></i> Play Audio Briefing`;
            }
        };

        window.speechSynthesis.speak(utterance);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const view = new PropertyDetailView("marketplace-property-view");
    view.loadProperty();
});
