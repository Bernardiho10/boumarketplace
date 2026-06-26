import { MagicView, MagicViewModel } from "../../magicui/src/index";
import { type Property } from "./lib/mock-data";
import { DataProvider } from "./lib/data-provider";

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
        this.setText("prop-source", prop.sourceSite || "BOU Verified");
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
        this.setText("agent-name", prop.agentName || "BOU Verified Agent");
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
        if (btnWhatsapp) btnWhatsapp.href = prop.agentWhatsApp || '#';
        const btnCall = document.getElementById("btn-call-agent") as HTMLAnchorElement;
        if (btnCall) btnCall.href = prop.agentPhone || 'tel:+2348100000000';

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

        // Update page title
        document.title = `${prop.title} — BOU Marketplace`;
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
    }

    private startGallerySlider() {
        if (this.sliderInterval) clearInterval(this.sliderInterval);
        if (this.galleryImages.length <= 1) return;
        this.sliderInterval = setInterval(() => {
            this.showGalleryImage(this.activeGalleryIndex + 1);
        }, 6500);
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
