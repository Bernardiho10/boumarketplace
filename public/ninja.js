var Ninja = (function () {
    'use strict';

    const API_BASE = "https://api.ninja.boucloud.io";
    const ID_LENGTHS = { nin: 11, bvn: 11, ndl: 12 };
    const ID_LABELS = {
        nin: "National Identity Number",
        bvn: "Bank Verification Number",
        ndl: "Driver's License Number",
    };
    // ID types currently wired up to the backend providers. Anything not in this
    // set renders as a disabled "(coming soon)" option in the dropdown.
    const ENABLED_ID_TYPES = new Set(["nin"]);
    function friendlyError(err, fallback) {
        if (!err)
            return fallback;
        if (err instanceof Error && !err.type)
            return err.message || fallback;
        const type = (err.type || "").toLowerCase();
        const message = err.message || "";
        if (type === "unauthorized_request" || /api[_ ]?key/i.test(message)) {
            return "Invalid or missing API key. Check your Ninja dashboard for the correct public key.";
        }
        if (type === "access_denied") {
            return "This API key isn't authorized to perform identity verification.";
        }
        if (type === "low_balance" || /insufficient funds|balance/i.test(message)) {
            return message || "Your Ninja wallet balance is too low. Please top up at https://ninja.boucloud.io/user/wallet/ to continue.";
        }
        if (type === "rate_limit") {
            return "Too many verification attempts. Please try again in a moment.";
        }
        if (type === "validation_error") {
            return message.replace(/^Validation error:\s*/i, "") || "Please check the details you entered.";
        }
        if (type === "api_connection" || type === "api_error") {
            return "We couldn't reach the verification provider right now. Please try again shortly.";
        }
        if (type === "server_error") {
            return "Something went wrong on our side. The charge will be reversed automatically.";
        }
        return message || fallback;
    }
    class Ninja {
        constructor(config) {
            this.host = null;
            this.shadowRoot = null;
            this.loading = false;
            this.modalOpen = false;
            this.config = Object.assign({ idType: "nin", mode: "lookup", display: "form", buttonLabel: "Verify Identity" }, config);
            // Force unsupported id types to the safe default until the backend
            // providers are wired up. Logs a warning so integrators notice.
            if (this.config.idType && !ENABLED_ID_TYPES.has(this.config.idType)) {
                console.warn(`Ninja SDK: idType "${this.config.idType}" is not yet supported. Falling back to "nin".`);
                this.config.idType = "nin";
            }
        }
        static init(config) {
            const ninja = new Ninja(config);
            ninja.render();
            return ninja;
        }
        render() {
            const target = document.querySelector(this.config.targetElement);
            if (!target) {
                console.error(`Ninja SDK: Target element "${this.config.targetElement}" not found.`);
                return;
            }
            this.host = document.createElement("div");
            this.host.className = "ninja-sdk-root";
            this.shadowRoot = this.host.attachShadow({ mode: "open" });
            target.appendChild(this.host);
            if (this.config.display === "button") {
                this.renderButton();
            }
            else {
                this.renderForm();
            }
        }
        get baseStyles() {
            return `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            :host {
                all: initial;
                display: block;
                font-family: 'Inter', -apple-system, system-ui, sans-serif;
            }
            * { box-sizing: border-box; }

            .ninja-card {
                background: rgba(255, 255, 255, 0.92);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(226, 232, 240, 0.8);
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05);
                max-width: 440px;
                width: 100%;
            }
            .ninja-header { margin-bottom: 24px; }
            .ninja-badge {
                display: inline-flex; align-items: center;
                padding: 4px 12px; background: #f1f5f9; color: #475569;
                border-radius: 9999px; font-size: 12px; font-weight: 600;
                margin-bottom: 12px;
            }
            .ninja-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
            .ninja-subtitle { font-size: 14px; color: #64748b; margin: 8px 0 0 0; }
            .ninja-form { display: flex; flex-direction: column; gap: 20px; }
            .ninja-input-group { display: flex; flex-direction: column; gap: 8px; }
            .ninja-label { font-size: 14px; font-weight: 600; color: #334155; }
            .ninja-input {
                width: 100%; padding: 12px 16px;
                border: 1px solid #e2e8f0; border-radius: 10px;
                font-size: 16px; background: #fff; outline: none;
                transition: all 0.2s;
            }
            .ninja-input:focus {
                border-color: #10b981;
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
            }
            .ninja-input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
            .ninja-input option:disabled { color: #cbd5e1; font-style: italic; }
            .ninja-hint {
                font-size: 11px; color: #94a3b8;
                margin-top: 2px;
            }

            .ninja-btn {
                width: 100%; padding: 14px;
                background: #0f172a; color: white; border: none; border-radius: 10px;
                font-size: 16px; font-weight: 600; cursor: pointer;
                display: flex; align-items: center; justify-content: center; gap: 10px;
                transition: all 0.2s;
            }
            .ninja-btn:hover:not(:disabled) { background: #1e293b; transform: translateY(-1px); }
            .ninja-btn:disabled { opacity: 0.7; cursor: not-allowed; }

            .ninja-launcher {
                display: inline-flex; align-items: center; gap: 10px;
                padding: 12px 20px; background: #10b981; color: #fff;
                border: none; border-radius: 10px; cursor: pointer;
                font-size: 14px; font-weight: 600;
                box-shadow: 0 8px 20px -8px rgba(16, 185, 129, 0.6);
                transition: all 0.2s;
            }
            .ninja-launcher:hover { background: #059669; transform: translateY(-1px); }
            .ninja-launcher svg { width: 16px; height: 16px; }

            .ninja-result { margin-top: 24px; animation: fadeIn 0.4s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .ninja-result-card {
                background: #f8fafc; border: 1px solid #e2e8f0;
                border-radius: 12px; padding: 20px;
            }
            .ninja-result-header {
                display: flex; align-items: center; gap: 16px; margin-bottom: 20px;
                padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;
            }
            .ninja-avatar {
                width: 84px; height: 84px; border-radius: 14px; flex-shrink: 0;
                background: linear-gradient(135deg, #e2e8f0, #f1f5f9);
                display: flex; align-items: center; justify-content: center;
                overflow: hidden; border: 3px solid #fff;
                box-shadow: 0 10px 18px -8px rgba(15, 23, 42, 0.25);
            }
            .ninja-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .ninja-result-info { min-width: 0; flex: 1; }
            .ninja-result-info h4 {
                margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;
                line-height: 1.25; word-break: break-word;
            }
            .ninja-result-info .ninja-verified-tag {
                display: inline-flex; align-items: center; gap: 6px;
                margin-top: 6px; padding: 3px 10px; border-radius: 9999px;
                background: rgba(16, 185, 129, 0.12); color: #047857;
                font-size: 11px; font-weight: 700;
                text-transform: uppercase; letter-spacing: 0.06em;
            }
            .ninja-result-info .ninja-id-line {
                margin: 8px 0 0 0; font-size: 12px; color: #64748b;
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                word-break: break-all;
            }
            .ninja-grid {
                display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px;
            }
            .ninja-grid-full { grid-column: 1 / -1; }
            .ninja-item { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
            .ninja-item-label {
                font-size: 10px; font-weight: 700; color: #94a3b8;
                text-transform: uppercase; letter-spacing: 0.06em;
            }
            .ninja-item-value {
                font-size: 13px; font-weight: 500; color: #0f172a;
                word-break: break-word;
            }
            .ninja-signature-row {
                margin-top: 14px; padding-top: 14px;
                border-top: 1px dashed #e2e8f0;
            }
            .ninja-signature-row img {
                max-width: 100%; max-height: 80px; object-fit: contain;
                background: #fff; border-radius: 8px; padding: 6px;
            }
            .ninja-result-actions {
                display: flex; gap: 10px; margin-top: 16px;
            }
            .ninja-btn-secondary {
                flex: 1; padding: 12px; border: 1px solid #cbd5e1;
                background: #fff; color: #0f172a;
                border-radius: 10px; font-size: 14px; font-weight: 600;
                cursor: pointer; transition: all 0.15s;
                display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            }
            .ninja-btn-secondary:hover { border-color: #94a3b8; background: #f8fafc; }
            .ninja-btn-secondary.ninja-btn-primary-tone {
                background: #10b981; color: #fff; border-color: #10b981;
            }
            .ninja-btn-secondary.ninja-btn-primary-tone:hover {
                background: #059669; border-color: #059669;
            }
            .ninja-error-msg {
                margin-top: 4px; padding: 12px;
                background: #fef2f2; border: 1px solid #fecaca;
                border-radius: 8px; color: #b91c1c; font-size: 14px;
                display: none;
            }
            .ninja-spinner {
                width: 20px; height: 20px;
                border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
                border-top-color: #fff; animation: spin 0.8s linear infinite;
                display: none;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .ninja-footer-note {
                margin-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;
            }

            /* Modal (button mode) */
            .ninja-overlay {
                position: fixed; inset: 0;
                background: rgba(15, 23, 42, 0.55);
                backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
                display: none; align-items: center; justify-content: center;
                z-index: 2147483000; padding: 16px;
            }
            .ninja-overlay.open { display: flex; animation: fadeIn 0.2s ease-out; }
            .ninja-modal {
                position: relative;
                width: 100%; max-width: 460px;
                max-height: calc(100vh - 32px); overflow: auto;
            }
            .ninja-close {
                position: absolute; top: 12px; right: 12px;
                width: 32px; height: 32px; border: none; border-radius: 8px;
                background: #f1f5f9; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                color: #475569;
            }
            .ninja-close:hover { background: #e2e8f0; }
        `;
        }
        renderButton() {
            var _a, _b, _c;
            if (!this.shadowRoot)
                return;
            this.shadowRoot.innerHTML = `
            <style>${this.baseStyles}</style>
            <button class="ninja-launcher" id="ninja-launcher" aria-label="Verify identity with Ninja">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                </svg>
                <span>${this.config.buttonLabel}</span>
            </button>
            <div class="ninja-overlay" id="ninja-overlay" role="dialog" aria-modal="true" aria-label="Identity verification">
                <div class="ninja-modal">
                    <div class="ninja-card">
                        <button class="ninja-close" id="ninja-close" aria-label="Close">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
                        </button>
                        ${this.formMarkup()}
                    </div>
                </div>
            </div>
        `;
            (_a = this.shadowRoot.getElementById("ninja-launcher")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => this.openModal());
            (_b = this.shadowRoot.getElementById("ninja-close")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => this.closeModal());
            (_c = this.shadowRoot.getElementById("ninja-overlay")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", (e) => {
                if (e.target === this.shadowRoot.getElementById("ninja-overlay"))
                    this.closeModal();
            });
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && this.modalOpen)
                    this.closeModal();
            });
            this.attachFormEvents();
        }
        renderForm() {
            if (!this.shadowRoot)
                return;
            this.shadowRoot.innerHTML = `
            <style>${this.baseStyles}</style>
            <div class="ninja-card">
                ${this.formMarkup()}
            </div>
        `;
            this.attachFormEvents();
        }
        formMarkup() {
            const idType = this.config.idType;
            const title = idType.toUpperCase();
            const expectedLen = ID_LENGTHS[idType];
            const optionFor = (value, label) => {
                const enabled = ENABLED_ID_TYPES.has(value);
                const selected = idType === value ? "selected" : "";
                const display = enabled ? label : `${label} — coming soon`;
                const disabledAttr = enabled ? "" : "disabled";
                return `<option value="${value}" ${selected} ${disabledAttr}>${display}</option>`;
            };
            return `
            <div class="ninja-header">
                <div class="ninja-badge">${title} VERIFICATION</div>
                <h3 class="ninja-title">Identity Verification</h3>
                <p class="ninja-subtitle">Securely verify identity using government databases.</p>
            </div>
            <div class="ninja-form">
                <div class="ninja-input-group">
                    <label class="ninja-label" for="ninja-id-type">Document Type</label>
                    <select class="ninja-input" id="ninja-id-type">
                        ${optionFor("nin", "National Identity Number (NIN)")}
                        ${optionFor("bvn", "Bank Verification Number (BVN)")}
                        ${optionFor("ndl", "Driver's License (NDL)")}
                    </select>
                    <span class="ninja-hint">Only NIN is currently active. BVN and NDL will unlock here once enabled.</span>
                </div>
                <div class="ninja-input-group">
                    <label class="ninja-label" id="ninja-id-label" for="ninja-id-input">${ID_LABELS[idType]}</label>
                    <input type="text" inputmode="numeric" class="ninja-input" id="ninja-id-input"
                        placeholder="Enter ${expectedLen}-digit ${title}"
                        maxlength="${expectedLen}" autocomplete="off">
                </div>
                <div class="ninja-error-msg" id="ninja-error" role="alert"></div>
                <button class="ninja-btn" id="ninja-submit" type="button">
                    <span class="ninja-btn-text">Verify Identity</span>
                    <div class="ninja-spinner"></div>
                </button>
            </div>
            <div id="ninja-result-container"></div>
            <div class="ninja-footer-note">Powered by Ninja · BOU Group</div>
        `;
        }
        attachFormEvents() {
            if (!this.shadowRoot)
                return;
            const input = this.shadowRoot.getElementById("ninja-id-input");
            const btn = this.shadowRoot.getElementById("ninja-submit");
            const error = this.shadowRoot.getElementById("ninja-error");
            const typeSelect = this.shadowRoot.getElementById("ninja-id-type");
            const idLabel = this.shadowRoot.getElementById("ninja-id-label");
            input === null || input === void 0 ? void 0 : input.addEventListener("input", (e) => {
                const target = e.target;
                const expected = ID_LENGTHS[this.config.idType];
                target.value = target.value.replace(/\D/g, "").slice(0, expected);
                if (error)
                    error.style.display = "none";
            });
            typeSelect === null || typeSelect === void 0 ? void 0 : typeSelect.addEventListener("change", (e) => {
                const target = e.target;
                const requested = target.value;
                // Belt-and-suspenders: a disabled <option> shouldn't be selectable,
                // but if anything bypasses that we silently snap back to NIN.
                const next = ENABLED_ID_TYPES.has(requested) ? requested : "nin";
                if (next !== requested)
                    target.value = next;
                this.config.idType = next;
                const newTitle = next.toUpperCase();
                const expected = ID_LENGTHS[next];
                if (idLabel)
                    idLabel.textContent = ID_LABELS[next];
                if (input) {
                    input.placeholder = `Enter ${expected}-digit ${newTitle}`;
                    input.maxLength = expected;
                    input.value = "";
                }
                if (error)
                    error.style.display = "none";
            });
            btn === null || btn === void 0 ? void 0 : btn.addEventListener("click", () => this.handleVerify());
            input === null || input === void 0 ? void 0 : input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.handleVerify();
                }
            });
        }
        openModal() {
            if (!this.shadowRoot)
                return;
            const overlay = this.shadowRoot.getElementById("ninja-overlay");
            overlay === null || overlay === void 0 ? void 0 : overlay.classList.add("open");
            this.modalOpen = true;
            // If a previous verification result is still in the modal, clear it
            // so the user always lands on an empty form.
            const result = this.shadowRoot.getElementById("ninja-result-container");
            if (result && result.innerHTML.trim().length > 0) {
                this.resetForm();
            }
            const input = this.shadowRoot.getElementById("ninja-id-input");
            setTimeout(() => input === null || input === void 0 ? void 0 : input.focus(), 50);
        }
        closeModal() {
            if (!this.shadowRoot)
                return;
            const overlay = this.shadowRoot.getElementById("ninja-overlay");
            overlay === null || overlay === void 0 ? void 0 : overlay.classList.remove("open");
            this.modalOpen = false;
        }
        async handleVerify() {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (!this.shadowRoot || this.loading)
                return;
            const input = this.shadowRoot.getElementById("ninja-id-input");
            const btn = this.shadowRoot.getElementById("ninja-submit");
            const btnText = this.shadowRoot.querySelector(".ninja-btn-text");
            const spinner = this.shadowRoot.querySelector(".ninja-spinner");
            const error = this.shadowRoot.getElementById("ninja-error");
            const resultContainer = this.shadowRoot.getElementById("ninja-result-container");
            const idNumber = ((input === null || input === void 0 ? void 0 : input.value) || "").trim();
            const idType = this.config.idType;
            const expected = ID_LENGTHS[idType];
            if (idNumber.length !== expected) {
                this.showError(error, `Please enter a valid ${expected}-digit ${idType.toUpperCase()}.`);
                return;
            }
            this.loading = true;
            btn.disabled = true;
            btnText.style.display = "none";
            spinner.style.display = "block";
            error.style.display = "none";
            resultContainer.innerHTML = "";
            const widget = this.config.display === "button" ? "button" : "form";
            try {
                const response = await fetch(`${API_BASE}/api/identity/identify?widget=${widget}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-API-Key": this.config.apiKey,
                    },
                    body: JSON.stringify({
                        idNumber,
                        idType,
                        mode: this.config.mode,
                    }),
                });
                let result = null;
                try {
                    result = await response.json();
                }
                catch (_j) {
                    /* non-JSON */
                }
                if (!response.ok) {
                    const friendly = friendlyError(result, "Verification failed. Please try again.");
                    this.showError(error, friendly);
                    (_b = (_a = this.config).onError) === null || _b === void 0 ? void 0 : _b.call(_a, Object.assign({ status: response.status }, result));
                    return;
                }
                if ((result === null || result === void 0 ? void 0 : result.status) === "not_found") {
                    this.renderNotFound();
                    (_d = (_c = this.config).onFailure) === null || _d === void 0 ? void 0 : _d.call(_c, result);
                }
                else {
                    this.renderSuccess(result.data);
                    (_f = (_e = this.config).onSuccess) === null || _f === void 0 ? void 0 : _f.call(_e, result.data);
                }
            }
            catch (err) {
                const msg = (err === null || err === void 0 ? void 0 : err.message) || "A network error occurred. Please check your connection.";
                this.showError(error, msg);
                (_h = (_g = this.config).onError) === null || _h === void 0 ? void 0 : _h.call(_g, err);
            }
            finally {
                this.loading = false;
                btn.disabled = false;
                btnText.style.display = "block";
                spinner.style.display = "none";
            }
        }
        showError(el, message) {
            if (!el)
                return;
            el.textContent = message;
            el.style.display = "block";
        }
        renderSuccess(data) {
            var _a, _b;
            if (!this.shadowRoot || !data)
                return;
            const container = this.shadowRoot.getElementById("ninja-result-container");
            const esc = (v) => v == null ? "" : String(v)
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
            const asImage = (raw) => {
                if (!raw)
                    return null;
                const s = String(raw);
                return s.startsWith("data:") ? s : `data:image/jpeg;base64,${s}`;
            };
            const fullName = [data.first_name, data.middle_name, data.last_name]
                .filter(Boolean).map(esc).join(" ");
            const image = asImage(data.image);
            const signature = asImage(data.signature);
            const idTypeLabel = (data.type ? String(data.type) : (this.config.idType || "id")).toUpperCase();
            const idNumber = data.id_number || "";
            // Render an item only when the value is non-empty (skip "—" sea of blanks).
            const item = (label, value, opts = {}) => {
                if (value == null || value === "" || value === false)
                    return "";
                const cls = opts.full ? "ninja-item ninja-grid-full" : "ninja-item";
                return `<div class="${cls}">
                <span class="ninja-item-label">${esc(label)}</span>
                <span class="ninja-item-value">${esc(value)}</span>
            </div>`;
            };
            const yesNo = (v) => (v === true || v === "true") ? "Yes" : (v === false || v === "false") ? "No" : null;
            const addressLine = [data.address_line, data.address_town, data.address_lga, data.address_state]
                .filter(Boolean).map(esc).join(", ");
            const items = [
                item("Gender", data.gender),
                item("Date of Birth", data.date_of_birth),
                item("Phone", data.mobile),
                item("Email", data.email),
                item("State of Origin", data.birth_state),
                item("LGA of Origin", data.birth_lga),
                item("Country of Birth", data.birth_country),
                item("Religion", data.religion),
                item("Nationality", data.country),
                item("Next of Kin State", data.nok_state),
                item("Address", addressLine, { full: true }),
                item("Data validation", yesNo(data.data_validation)),
                item("Selfie validation", yesNo(data.selfie_validation)),
                item("All checks passed", yesNo(data.all_validation_passed)),
                item("Source", data.source),
                item("Last refreshed", data.refresh_at ? new Date(data.refresh_at).toLocaleString() : null),
            ].filter(Boolean).join("");
            container.innerHTML = `
            <div class="ninja-result">
                <div class="ninja-result-card">
                    <div class="ninja-result-header">
                        <div class="ninja-avatar">
                            ${image
            ? `<img src="${image}" alt="Profile photo">`
            : `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#94a3b8"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`}
                        </div>
                        <div class="ninja-result-info">
                            <h4>${fullName || "Verified Individual"}</h4>
                            <span class="ninja-verified-tag">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Identity Verified
                            </span>
                            ${idNumber ? `<p class="ninja-id-line">${esc(idTypeLabel)} · ${esc(idNumber)}</p>` : ""}
                        </div>
                    </div>

                    <div class="ninja-grid">
                        ${items || `<div class="ninja-item ninja-grid-full"><span class="ninja-item-value">No additional details returned by the provider.</span></div>`}
                    </div>

                    ${signature ? `
                    <div class="ninja-signature-row">
                        <span class="ninja-item-label">Signature</span>
                        <div style="margin-top:6px;"><img src="${signature}" alt="Signature"></div>
                    </div>` : ""}
                </div>

                <div class="ninja-result-actions">
                    <button class="ninja-btn-secondary" id="ninja-reset" type="button">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        Verify Another
                    </button>
                    ${this.config.display === "button" ? `
                    <button class="ninja-btn-secondary ninja-btn-primary-tone" id="ninja-done" type="button">
                        Done
                    </button>` : ""}
                </div>
            </div>
        `;
            (_a = this.shadowRoot.getElementById("ninja-reset")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => this.resetForm());
            (_b = this.shadowRoot.getElementById("ninja-done")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => {
                this.closeModal();
                this.resetForm();
            });
        }
        /**
         * Clear the result, reset the input, and refocus — lets the user run another
         * verification without reloading the page or reopening the widget.
         */
        resetForm() {
            if (!this.shadowRoot)
                return;
            const input = this.shadowRoot.getElementById("ninja-id-input");
            const error = this.shadowRoot.getElementById("ninja-error");
            const result = this.shadowRoot.getElementById("ninja-result-container");
            if (input) {
                input.value = "";
                input.disabled = false;
                setTimeout(() => input.focus(), 30);
            }
            if (error) {
                error.style.display = "none";
                error.textContent = "";
            }
            if (result)
                result.innerHTML = "";
        }
        renderNotFound() {
            if (!this.shadowRoot)
                return;
            const container = this.shadowRoot.getElementById("ninja-result-container");
            container.innerHTML = `
            <div class="ninja-result">
                <div class="ninja-result-card" style="border-color:#fca5a5;background:#fffaf0;">
                    <div style="display:flex;align-items:center;gap:12px;color:#dc2626;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <h4 style="margin:0;font-size:15px;font-weight:700;">No Record Found</h4>
                    </div>
                    <p style="margin:8px 0 0 0;font-size:13px;color:#7f1d1d;">The provided number does not match any identity record in our database.</p>
                </div>
            </div>
        `;
        }
    }

    return Ninja;

})();
