import { M as MagicView, a as MagicViewModel } from './index-f241226d.js';
import { D as DataProvider } from './data-provider-491b0d6d.js';

const FALLBACK_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=900";
class PropertyDetailViewModel extends MagicViewModel {
    constructor() {
        super();
        this.set("property", null);
    }
}
class PropertyDetailView extends MagicView {
    get viewModel() {
        return this._viewModel;
    }
    set viewModel(vm) {
        this._viewModel = vm;
        vm._view = this;
    }
    constructor(id) {
        super(id);
        this.galleryImages = [];
        this.activeGalleryIndex = 0;
        this.sliderInterval = null;
        this.viewModel = new PropertyDetailViewModel();
    }
    async loadProperty() {
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        const dataProvider = DataProvider.getInstance();
        await dataProvider.init();
        let id;
        if (!idParam) {
            // Fallback to sample property (first one)
            const all = dataProvider.getAllProperties();
            if (all.length > 0) {
                id = all[0].id;
            }
            else {
                this.showError("No asset intelligence found.");
                return;
            }
        }
        else {
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
    showError(msg) {
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
    renderProperty(prop) {
        document.getElementById("loading-state")?.classList.add("d-none");
        const content = document.getElementById("property-content");
        if (content)
            content.classList.remove("d-none");
        // Badges and status
        this.setText("prop-category", prop.category);
        this.setText("prop-status", prop.status);
        // Title
        this.setText("prop-title", prop.title);
        // Location (includes icon via CSS)
        this.setText("prop-location", `<i class="fas fa-map-marker-alt"></i> ${prop.location}`);
        // Price
        this.setText("prop-price", `₦${prop.price}`);
        // Specs — show N/A for land/commercial
        this.setText("spec-beds", prop.bedrooms > 0 ? prop.bedrooms.toString() : "—");
        this.setText("spec-baths", prop.bathrooms > 0 ? prop.bathrooms.toString() : "—");
        this.setText("spec-sqft", prop.sqft > 0 ? prop.sqft.toLocaleString() : "—");
        // Hide beds/baths for land-type properties
        const specsSection = document.querySelector(".prop-specs");
        if (prop.bedrooms === 0 && prop.bathrooms === 0 && specsSection) {
            specsSection.style.display = "none";
        }
        // Main image
        const mainImg = document.getElementById("main-image");
        if (mainImg) {
            mainImg.src = prop.image || FALLBACK_PROPERTY_IMAGE;
            mainImg.alt = prop.title;
            mainImg.onerror = () => { mainImg.src = FALLBACK_PROPERTY_IMAGE; };
        }
        // Thumbnails
        const galleryContainer = document.getElementById("thumbnail-gallery");
        if (galleryContainer) {
            this.galleryImages = [prop.image, ...prop.gallery.filter(g => g !== prop.image)].filter(Boolean);
            if (this.galleryImages.length === 0)
                this.galleryImages = [FALLBACK_PROPERTY_IMAGE];
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
            }
            else {
                document.getElementById("amenities-section")?.remove();
            }
        }
        // Description — render as plain text first, audio button activates ghost narration
        const descContainer = document.getElementById("narration-stream");
        if (descContainer)
            descContainer.textContent = prop.description;
        // Contact CTA
        const btnContact = document.getElementById("btn-contact-agent");
        if (btnContact)
            btnContact.href = prop.original_url;
        // Audio button
        const btnAudio = document.getElementById("btn-read-aloud");
        if (btnAudio) {
            btnAudio.addEventListener("click", () => {
                btnAudio.classList.toggle("playing");
                if (btnAudio.classList.contains("playing")) {
                    btnAudio.innerHTML = `<i class="fas fa-stop"></i> Stop Briefing`;
                    this.ghostNarrate(prop.description, "narration-stream");
                }
                else {
                    btnAudio.innerHTML = `<i class="fas fa-volume-up"></i> Play Audio Briefing`;
                    window.speechSynthesis.cancel();
                    if (descContainer)
                        descContainer.textContent = prop.description;
                }
            });
        }
        // Update page title
        document.title = `${prop.title} — BOU Marketplace`;
    }
    setText(id, html) {
        const el = document.getElementById(id);
        if (el)
            el.innerHTML = html;
    }
    showGalleryImage(index) {
        if (this.galleryImages.length === 0)
            return;
        this.activeGalleryIndex = (index + this.galleryImages.length) % this.galleryImages.length;
        const mainImg = document.getElementById("main-image");
        if (mainImg) {
            mainImg.src = this.galleryImages[this.activeGalleryIndex] || FALLBACK_PROPERTY_IMAGE;
            mainImg.onerror = () => { mainImg.src = FALLBACK_PROPERTY_IMAGE; };
        }
        document.querySelectorAll(".prop-thumb").forEach((thumb, thumbIndex) => {
            thumb.classList.toggle("active", thumbIndex === this.activeGalleryIndex);
        });
    }
    bindGalleryControls() {
        document.querySelectorAll(".prop-thumb").forEach(thumb => {
            thumb.addEventListener("click", () => {
                const index = Number(thumb.dataset.galleryIndex || 0);
                this.showGalleryImage(index);
                this.startGallerySlider();
            });
        });
    }
    startGallerySlider() {
        if (this.sliderInterval)
            clearInterval(this.sliderInterval);
        if (this.galleryImages.length <= 1)
            return;
        this.sliderInterval = setInterval(() => {
            this.showGalleryImage(this.activeGalleryIndex + 1);
        }, 6500);
    }
    ghostNarrate(text, elementId) {
        window.speechSynthesis.cancel();
        const container = document.getElementById(elementId);
        if (!container)
            return;
        const words = text.split(' ');
        container.innerHTML = words.map((w, i) => `<span id="gw-${i}">${w} </span>`).join('');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        utterance.pitch = 0.9;
        utterance.voice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-GB') || null;
        let currentWord = 0;
        utterance.onboundary = (e) => {
            if (e.name === 'word') {
                const wordSpan = document.getElementById(`gw-${currentWord}`);
                if (wordSpan)
                    wordSpan.classList.add("active");
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
