class MagicViewModel {
    constructor(data) {
        this._view = null;
        if (data) {
            Object.assign(this, data);
        }
        return this;
    }
    hydrate(data) {
        if (data) {
            for (let prop in this) {
                if (prop == "_view") {
                    continue;
                }
                if (!(typeof data[prop] == "undefined")) {
                    let value = data[prop];
                    this[prop] = this._cast(prop, value);
                    if (this._view) {
                        const el = this._view.getElement(prop);
                        if (el) {
                            el.value = [value];
                        }
                    }
                }
            }
        }
        return this;
    }
    hydrateRender(data) {
        if (data) {
            const _viewBackup = this._view;
            this._view = null; // suppress per-field notifications
            for (let prop in this) {
                if (data[prop] !== undefined) {
                    this[prop] = this._cast(prop, data[prop]);
                }
            }
            this._view = _viewBackup; // restore
            // single batch render
            if (this._view) {
                this._view.render();
            }
        }
        return this;
    }
    get(name) {
        let model = this.toRecord();
        let parts = name.split("."); // todo review this later to see how we can make it go more than 2 levels
        if (model[parts[0]] != undefined) {
            if (parts.length > 1) {
                return model[parts[0]][parts[1]];
            }
            else {
                return model[parts[0]];
            }
        }
        return this.toRecord()[name];
    }
    set(name, value) {
        for (let e in this) {
            if (e == name) {
                this[e] = this._cast(e, value);
                if (this._view) {
                    const el = this._view.getElement(name);
                    if (el) {
                        el.value = [value];
                        el.render();
                    }
                }
            }
        }
    }
    toRecord() {
        let data = {};
        for (let e in this) {
            if (e.startsWith("_")) {
                continue;
            }
            // console.log("toRecord", e, typeof this[e])
            if (this[e] instanceof Date) {
                // @ts-ignore
                data[e] = this[e].toJSON();
                continue;
            }
            data[e] = this[e];
        }
        return data;
    }
    _cast(prop, value) {
        // @ts-ignore
        switch (typeof this[prop]) {
            case "number":
                return Number(value);
            case "boolean":
                return Boolean(value);
            default:
                // @ts-ignore
                if (this[prop] instanceof Date) {
                    return new Date(value);
                }
        }
        return value;
    }
}
class MagicView {
    constructor(id, root) {
        this.id = "";
        this.elements = [];
        this.PARAMS = new URLSearchParams(location.search);
        this.root = document;
        this.keyupHandlerMap = new WeakMap();
        this.changeHandlerMap = new WeakMap();
        this.focusHandlerMap = new WeakMap();
        this.id = id;
        if (root != undefined && root != document) {
            this.root = root;
        }
        this._elementMap = new Map();
        this.bindEventHandlerMethods();
    }
    set viewModel(vm) {
        this._viewModel = vm;
        vm._view = this;
    }
    get viewModel() {
        return this._viewModel;
    }
    render() {
        console.log("viewModel.render", this);
        this.elements.map((element) => {
            element.render();
        });
    }
    registerElement(name, elementOrMagicID, data) {
        if (elementOrMagicID == undefined) {
            elementOrMagicID = name;
        }
        if (typeof elementOrMagicID == "string") {
            let elemTarget = this.root.querySelector(`#${this.id} [data-magic-id=${elementOrMagicID}]`);
            if (elemTarget) {
                elementOrMagicID = elemTarget;
            }
            else {
                throw new Error(`registerElement failed. element (#${this.id}.${elementOrMagicID}) does not exist`);
            }
        }
        if (elementOrMagicID) {
            let el = new MagicElement(this, elementOrMagicID, name, null);
            el._data = data;
            if (elementOrMagicID instanceof AbstractCustomElement) {
                elementOrMagicID.parent = this.root.getElementById(elementOrMagicID.id); // todo: specify view id
            }
            this.elements.push(el);
            this._elementMap.set(name, el);
            this.attachEventListeners(el);
            return el;
        }
        throw new Error(`registerElement failed. element (#${this.id}.${elementOrMagicID}) does not exist`);
    }
    createElement(elementOrMagicID) {
        if (typeof elementOrMagicID == "string") {
            let elemTarget = this.root.querySelector(`#${this.id} [data-magic-id=${elementOrMagicID}]`) || this.root.querySelector(`#${this.id} #${elementOrMagicID}`);
            if (elemTarget) {
                elementOrMagicID = elemTarget;
            }
            else {
                throw new Error(`registerElement failed. element (#${this.id}.${elementOrMagicID}) does not exist`);
            }
        }
        if (elementOrMagicID) {
            return new MagicElement(this, elementOrMagicID, "", null);
        }
        throw new Error("createElement failed. element does not exist");
    }
    getElement(name) {
        return this._elementMap.get(name);
    }
    attachEventListeners(el) {
        if (el.isInputElement()) {
            if ((el.element instanceof HTMLInputElement &&
                (el.element.type === "text" || el.element.type === "password")) ||
                el.element instanceof HTMLTextAreaElement) {
                const keyupHandler = (e) => this.updateViewModel(e, el);
                this.keyupHandlerMap.set(el.element, keyupHandler);
                el.element.addEventListener("keyup", keyupHandler);
            }
            const changeHandler = (e) => this.updateViewModel(e, el);
            this.changeHandlerMap.set(el.element, changeHandler);
            el.element.addEventListener("change", changeHandler);
            if (el.element instanceof HTMLInputElement && el.element.type === "date") {
                const focusHandler = (e) => this.showDatePicker(e, el);
                this.focusHandlerMap.set(el.element, focusHandler);
                el.element.addEventListener("focus", focusHandler);
            }
        }
    }
    detachEventListeners() {
        this.elements.map((el) => {
            if (el.isInputElement()) {
                const keyupHandler = this.keyupHandlerMap.get(el.element);
                if (keyupHandler) {
                    el.element.removeEventListener("keyup", keyupHandler);
                    this.keyupHandlerMap.delete(el.element);
                }
                const changeHandler = this.changeHandlerMap.get(el.element);
                if (changeHandler) {
                    el.element.removeEventListener("change", changeHandler);
                    this.changeHandlerMap.delete(el.element);
                }
                const focusHandler = this.focusHandlerMap.get(el.element);
                if (focusHandler) {
                    el.element.removeEventListener("focus", focusHandler);
                    this.focusHandlerMap.delete(el.element);
                }
            }
        });
    }
    updateViewModel(event, mel) {
        let el = event.target;
        let elemValue = el.value;
        if (el instanceof HTMLInputElement && el.type == "checkbox") {
            elemValue = el.checked;
        }
        this.viewModel.set(mel.name, elemValue);
    }
    showDatePicker(event, mel) {
        let el = event.target;
        el.showPicker();
    }
    bindEventHandlerMethods() {
        const prototype = Object.getPrototypeOf(this);
        const methodNames = Object.getOwnPropertyNames(prototype)
            .filter(name => typeof prototype[name] === 'function' && name !== 'constructor' && name.startsWith("do"));
        for (const name of methodNames) {
            // @ts-ignore
            this[name] = this[name].bind(this);
        }
    }
}
class MagicElement {
    constructor(view, element, name, value) {
        this.name = "";
        this.value = [];
        this.view = view;
        this.name = name;
        this.value.push(value);
        this.element = element;
    }
    isInputElement() {
        return this.element instanceof HTMLInputElement ||
            this.element instanceof HTMLSelectElement ||
            this.element instanceof HTMLTextAreaElement;
    }
    setData(data) {
        this._data = data;
        return this;
    }
    addEventTrigger(on, eventHandler) {
        // @ts-ignore
        this.element.addEventListener(on, (event) => {
            event.src = this;
            eventHandler(event);
        });
        return this;
    }
    render() {
        if (this.value[0] == null && this.view.viewModel != null) {
            this.value[0] = this.view.viewModel.get(this.name);
        }
        console.log("element.render", this.view.id, this.name, this.value);
        switch (true) {
            case this.element instanceof HTMLInputElement:
            case this.element instanceof HTMLTextAreaElement:
                switch (this.element.type) {
                    case "date":
                        this.element.value = getFormatter("date").format(this.value[0], "yyyy-mm-dd");
                        break;
                    case "datetime-local":
                        this.element.value = getFormatter("date").format(this.value[0], "yyyy-mm-ddThh:ii");
                        break;
                    case "checkbox":
                        this.element.checked = this.value[0];
                        break;
                    default:
                        this.element.value = this.value[0];
                }
                break;
            case this.element instanceof HTMLSelectElement:
                // render select options
                console.log("rendering select", this.name, this._data);
                if (typeof this._data == "object") {
                    this.element.innerHTML = "";
                    for (let opt of this._data) {
                        let sOpt = document.createElement("option");
                        sOpt.value = opt["value"];
                        sOpt.label = opt["label"];
                        this.element.appendChild(sOpt);
                    }
                }
                let hasSelected = false;
                for (let opt of this.element.options) {
                    if (opt.value == this.value[0]) {
                        opt.selected = true;
                        hasSelected = true;
                    }
                }
                if (!hasSelected) {
                    //default to the first option
                    if (this.view.viewModel) {
                        this.view.viewModel.set(this.name, this.element.options[0].value);
                    }
                    this.element.options[0].selected = true;
                }
                break;
            case this.element instanceof HTMLAnchorElement:
                this.element.href = this.value[0];
                break;
            case this.element instanceof HTMLImageElement:
            case this.element instanceof HTMLIFrameElement:
                this.element.src = this.value[0];
                break;
            case this.element instanceof AbstractCustomElement:
                console.log("rendering custom-element", this.name, this.value[0]);
                this.element.render(this.value[0]);
                break;
            default:
                let value = this.value[0];
                if (typeof value == "object") {
                    const template = this.element.outerHTML;
                    if (!Array.isArray(value)) {
                        value = [value];
                    }
                    this._renderTemplate(template, value);
                    break;
                }
                const format = this.element.getAttribute("data-magic-format");
                if (format != null) {
                    let [f, d] = format.split(",");
                    value = getFormatter(f).format(value, d);
                }
                const bindMode = this.element.dataset.magicBind;
                switch (bindMode) {
                    case "class":
                        this.element.classList.add(value);
                        break;
                    default:
                        this.element.textContent = value;
                }
        }
    }
    _renderTemplate(template, data) {
        console.log("rendering template", this.name, template, data);
        const idPrefix = this.element.dataset.magicId + ".";
        const magicId = this.element.dataset.magicId || "";
        let shadowHost = document.createElement("div");
        this.element.replaceWith(shadowHost);
        let shadow = shadowHost.attachShadow({ mode: "open" });
        const links = document.head.getElementsByTagName("link");
        for (let i = 0; i < links.length; i++) {
            shadow.appendChild(links[i].cloneNode());
        }
        data.map((record) => {
            let d = document.createElement("div");
            d.innerHTML = template.replaceAll(idPrefix, "");
            let registry = [];
            this._traverseDom(d, registry);
            let t = d.firstChild;
            t.removeAttribute("id");
            t.classList.add(magicId);
            let viewRoot = document.createElement("div").attachShadow({ mode: "open" });
            viewRoot.appendChild(d.firstChild);
            const view = new MagicView(this.view.id, viewRoot);
            view.viewModel = new MagicViewModel(record);
            registry.map((el) => {
                let elMagicId = el.dataset.magicId || "";
                let id = elMagicId;
                let name = elMagicId;
                if (elMagicId.indexOf(":") > 0) {
                    [id, name] = elMagicId.split(":");
                }
                el.dataset.magicId = id;
                if (record[name] != undefined) {
                    view.registerElement(name, el);
                }
            });
            view.render();
            // view.elements.map((el) => {
            //   el.element.classList.add(el.element.id)
            //   el.element.removeAttribute("id")
            // })
            shadow.appendChild(viewRoot.firstChild);
        });
    }
    _traverseDom(element, result = []) {
        // Base case: if the element is null, return
        if (!element)
            return;
        let htmlElement = element;
        if (htmlElement.dataset != undefined && htmlElement.dataset.magicId != undefined) {
            result.push(htmlElement);
        }
        // Recursively traverse the children of the current element
        let child = element.firstElementChild;
        while (child) {
            this._traverseDom(child, result);
            child = child.nextElementSibling;
        }
    }
}
class AbstractCustomElement extends HTMLElement {
    constructor(id) {
        super();
        this.template = "";
        this.parent = null;
        this.transformer = function (data) {
            return data;
        };
        if (id) {
            this.id = id;
            // this.parent = this.root.getElementById(id)
        }
        this.dom = this.attachShadow({ mode: "open" });
    }
    fromTemplate(template) {
        let d = document.createElement("div");
        d.innerHTML = template;
        return d.firstChild;
    }
    transform(data) {
        console.log("transforming table", data);
        return this.transformer(data);
    }
    render(data, parentNode) {
        throw new Error(`custom element (${this.localName}) does not implement render`);
    }
}
class DefaultFormatter {
    format(v, d) {
        return v;
    }
}
/**
 m = 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
 mm = 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
 mmm = Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
 mmmm = January, February, March, April, May, June, July, August, September, October, November, December
 yyyy = 2024
 yy = 24
 D = 1st, 2nd, 3rd, 4th, ... 31st
 d = 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ... 31
 dd = 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31
 ddd = Sun, Mon, Tue, Wed, Thu, Fri, Sat
 dddd = Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
 h = 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
 hh = 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
 i = 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59
 s = 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59
 x = [AM, PM]
 **/
class DateFormatter {
    format(v, formatString) {
        const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthNamesLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayNamesLong = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let result = '';
        if (v == null) {
            return result;
        }
        let i = 0;
        let date = new Date(v);
        while (i < formatString.length) {
            let char = formatString[i];
            let count = 1;
            // Count the number of consecutive same format characters
            while (i + 1 < formatString.length && formatString[i + 1] === char) {
                count++;
                i++;
            }
            switch (char) {
                case 'm':
                    if (count === 1) {
                        result += String(date.getMonth() + 1); // Month (1-12)
                    }
                    else if (count === 2) {
                        result += String(date.getMonth() + 1).padStart(2, '0'); // Month (01-12)
                    }
                    else if (count === 3) {
                        result += monthNamesShort[date.getMonth()]; // Abbreviated month
                    }
                    else if (count === 4) {
                        result += monthNamesLong[date.getMonth()]; // Full month name
                    }
                    break;
                case 'd':
                    if (count === 1) {
                        result += String(date.getDate()); // Day (1-31)
                    }
                    else if (count === 2) {
                        result += String(date.getDate()).padStart(2, '0'); // Day (01-31)
                    }
                    else if (count === 3) {
                        result += dayNamesShort[date.getDay()]; // Abbreviated day
                    }
                    else if (count === 4) {
                        result += dayNamesLong[date.getDay()]; // Full day name
                    }
                    break;
                case 'D':
                    const day = date.getDate();
                    const suffix = (day % 10 === 1 && day !== 11) ? 'st' :
                        (day % 10 === 2 && day !== 12) ? 'nd' :
                            (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
                    result += String(day) + suffix;
                    break;
                case 'y':
                    if (count === 1) {
                        result += String(date.getFullYear() % 100); // Last two digits of year
                    }
                    else if (count === 4) {
                        result += String(date.getFullYear()); // Full year
                    }
                    break;
                case 'h':
                    if (count === 1) {
                        const hours = date.getHours() % 12 || 12; // 12-hour format
                        result += String(hours).padStart(2, '0');
                    }
                    else if (count === 2) {
                        result += String(date.getHours()).padStart(2, '0'); // 24-hour format
                    }
                    break;
                case 'i':
                    result += String(date.getMinutes()).padStart(2, '0'); // Minutes
                    break;
                case 's':
                    result += String(date.getSeconds()).padStart(2, '0'); // Seconds
                    break;
                case 'x':
                    result += (date.getHours() < 12 ? 'AM' : 'PM');
                    break;
                default:
                    result += char; // Append unknown characters directly
                    break;
            }
            i++; // Move to the next character
        }
        return result;
    }
}
class MoneyFormatter {
    /**
     const money = new Intl.NumberFormat('de-CH',
     { style:'currency', currency: 'CHF' });
     const percent = new Intl.NumberFormat('de-CH',
     { style:'percent', maximumFractionDigits: 1, signDisplay: "always"});
     which than can be used as:

     money.format(1234.50); // output CHF 1'234.50
     percent.format(0.083);  // output +8.3%
     **/
    format(v, d) {
        console.log("decorating money", v, d);
        let options = {};
        if (d != "" && d != undefined) {
            options = {
                ...options,
                style: 'currency',
                currency: d,
                // These options are needed to round to whole numbers if that's what you want.
                //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
                //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
            };
        }
        const formatter = new Intl.NumberFormat('en-GB', options);
        return formatter.format(v);
    }
}
let formatters = new Map();
formatters.set("default", new DefaultFormatter());
formatters.set("date", new DateFormatter());
formatters.set("money", new MoneyFormatter());
function getFormatter(type = "default") {
    if (!formatters.has(type)) {
        return new DefaultFormatter();
    }
    return formatters.get(type);
}

const MOCK_PROPERTIES = [
    {
        id: 1,
        slug: "the-glass-house-terrace",
        title: "The Glass House Terrace",
        price: "150,000,000",
        location: "Ikate, Lekki, Lagos",
        description: "Experience the pinnacle of urban luxury in this architectural masterpiece. Featuring 4 oversized bedrooms, panoramic floor-to-ceiling windows, and a bespoke Italian kitchen. This smart-home integrated terrace offers 24/7 autonomous security and a private rooftop lounge overlooking the Lekki skyline.",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-1",
        category: "Terrace",
        status: "For Sale",
        bedrooms: 4,
        bathrooms: 4.5,
        sqft: 3500,
        amenities: ["Smart Home", "Rooftop Lounge", "24/7 Security", "Italian Kitchen", "Pool"],
        gallery: [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-25"
    },
    {
        id: 2,
        slug: "zenith-heights-penthouse",
        title: "Zenith Heights Penthouse",
        price: "4,500,000 / year",
        location: "Guzape, Abuja",
        description: "A sanctuary in the sky. This 3-bedroom penthouse in Guzape combines minimalist Zen aesthetics with high-performance living. Enjoy a private elevator entrance, a temperature-controlled wine cellar, and wrap-around balconies offering breathtaking views of the capital city's rolling hills.",
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-2",
        category: "Penthouse",
        status: "For Rent",
        bedrooms: 3,
        bathrooms: 3.5,
        sqft: 2800,
        amenities: ["Private Elevator", "Wine Cellar", "Wrap-around Balcony", "City Views"],
        gallery: [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-22"
    },
    {
        id: 3,
        slug: "heritage-loft-apartments",
        title: "Heritage Loft Apartments",
        price: "2,200,000 / year",
        location: "Yaba, Lagos",
        description: "Where history meets innovation. Located in the vibrant heart of Yaba's tech corridor, these 2-bedroom lofts feature industrial exposed brick, ultra-high ceilings, and high-speed fiber optic integration. Perfect for the modern creative professional seeking a blend of character and connectivity.",
        image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-3",
        category: "Apartment",
        status: "For Rent",
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1500,
        amenities: ["Exposed Brick", "High Ceilings", "Fiber Optic Internet", "Co-working space"],
        gallery: [
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1502672260266-1c1f52d36214?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-20"
    },
    {
        id: 4,
        slug: "royal-palms-estate",
        title: "Royal Palms Estate",
        price: "250,000,000",
        location: "Maitama, Abuja",
        description: "An enclave of absolute privacy. This palatial 5-bedroom detached duplex is situated within one of Maitama's most exclusive estates. Features include a gold-leafed foyer, an olympic-sized swimming pool, and dedicated staff quarters, all surrounded by lush, manicured tropical gardens.",
        image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-4",
        category: "Duplex",
        status: "For Sale",
        bedrooms: 5,
        bathrooms: 6,
        sqft: 5000,
        amenities: ["Swimming Pool", "Staff Quarters", "Tropical Gardens", "Gated Estate"],
        gallery: [
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-18"
    },
    {
        id: 5,
        slug: "ocean-breeze-villa",
        title: "Ocean Breeze Villa",
        price: "85,000,000",
        location: "VGC, Lekki, Lagos",
        description: "Catch the Atlantic rhythm in this contemporary 4-bedroom villa. Designed for seamless indoor-outdoor living, the property boasts a state-of-the-art home theater, a sun-drenched infinity pool, and sustainable solar power integration. A true masterclass in coastal sophistication.",
        image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-5",
        category: "Detached Villa",
        status: "For Sale",
        bedrooms: 4,
        bathrooms: 4.5,
        sqft: 4000,
        amenities: ["Home Theater", "Infinity Pool", "Solar Power", "Ocean Views"],
        gallery: [
            "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-15"
    },
    {
        id: 6,
        slug: "the-nexus-studio",
        title: "The Nexus Studio",
        price: "1,200,000 / year",
        location: "Ikeja, Lagos",
        description: "Compact, efficient, and undeniably sleek. This executive studio in Ikeja GRA is the ultimate urban base. Featuring modular furniture solutions, integrated high-spec appliances, and access to a shared premium co-working space and rooftop gym. Designed for the high-velocity professional.",
        image: "https://images.unsplash.com/photo-1536376073347-4573914a1fa4?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-6",
        category: "Studio",
        status: "For Rent",
        bedrooms: 1,
        bathrooms: 1,
        sqft: 600,
        amenities: ["Modular Furniture", "Co-working Space", "Rooftop Gym", "High-spec Appliances"],
        gallery: [
            "https://images.unsplash.com/photo-1536376073347-4573914a1fa4?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-12"
    },
    {
        id: 7,
        slug: "banana-island-mansion",
        title: "Banana Island Waterfront Mansion",
        price: "1,500,000,000",
        location: "Banana Island, Ikoyi, Lagos",
        description: "The epitome of Nigerian luxury. This 7-bedroom waterfront mansion in Banana Island features a private boat jetty, a 20-seat private cinema, and an Italian marble finished interior. The ultimate statement home.",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-7",
        category: "Mansion",
        status: "For Sale",
        bedrooms: 7,
        bathrooms: 8,
        sqft: 12000,
        amenities: ["Private Boat Jetty", "Private Cinema", "Italian Marble", "Waterfront"],
        gallery: [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-10"
    },
    {
        id: 8,
        slug: "asokoro-diplomatic-residence",
        title: "Asokoro Diplomatic Residence",
        price: "600,000,000",
        location: "Asokoro, Abuja",
        description: "A secure and elegant 6-bedroom residence in Abuja's most exclusive district. Features bulletproof windows, a panic room, and a massive compound suitable for diplomatic engagements.",
        image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-8",
        category: "Detached Villa",
        status: "For Sale",
        bedrooms: 6,
        bathrooms: 7,
        sqft: 8000,
        amenities: ["High Security", "Panic Room", "Large Compound", "Diplomatic Zone"],
        gallery: [
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-08"
    },
    {
        id: 9,
        slug: "port-harcourt-creek-view",
        title: "Creek View Estate",
        price: "120,000,000",
        location: "GRA Phase 2, Port Harcourt",
        description: "Modern 5-bedroom duplex with stunning views of the creek. Located in a secure gated community with consistent power supply and premium finishing.",
        image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-9",
        category: "Duplex",
        status: "For Sale",
        bedrooms: 5,
        bathrooms: 5.5,
        sqft: 4500,
        amenities: ["Creek Views", "Gated Community", "Consistent Power", "Premium Finishing"],
        gallery: [
            "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-05"
    },
    {
        id: 10,
        slug: "ibadan-bodija-bungalow",
        title: "Classic Bodija Bungalow",
        price: "45,000,000",
        location: "Bodija, Ibadan",
        description: "A beautifully renovated 3-bedroom bungalow in the heart of historic Bodija. Features a large garden, modern kitchen, and mature fruit trees.",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-10",
        category: "Bungalow",
        status: "For Sale",
        bedrooms: 3,
        bathrooms: 2,
        sqft: 2000,
        amenities: ["Large Garden", "Renovated", "Fruit Trees", "Historic Area"],
        gallery: [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-06-02"
    },
    {
        id: 11,
        slug: "enugu-independence-layout",
        title: "Independence Layout Mansion",
        price: "85,000,000",
        location: "Independence Layout, Enugu",
        description: "Spacious 6-bedroom mansion with a sprawling court yard. This property offers a blend of traditional eastern luxury and modern amenities.",
        image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-11",
        category: "Mansion",
        status: "For Sale",
        bedrooms: 6,
        bathrooms: 6,
        sqft: 5500,
        amenities: ["Courtyard", "Spacious", "Secure Area"],
        gallery: [
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-28"
    },
    {
        id: 12,
        slug: "victoria-island-commercial",
        title: "Prime VI Office Space",
        price: "15,000,000 / year",
        location: "Victoria Island, Lagos",
        description: "Grade A office space in the heart of Victoria Island. Open plan layout, raised floors, central air conditioning, and ample parking space.",
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-12",
        category: "Commercial",
        status: "For Rent",
        bedrooms: 0,
        bathrooms: 4,
        sqft: 8000,
        amenities: ["Grade A Office", "Raised Floors", "Central AC", "Ample Parking"],
        gallery: [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-25"
    },
    {
        id: 13,
        slug: "lekki-phase-1-land",
        title: "Lekki Phase 1 Prime Plot",
        price: "200,000,000",
        location: "Lekki Phase 1, Lagos",
        description: "1000 sqm of prime, dry land in a fully developed area of Lekki Phase 1. Perfect for a luxury residential development or mixed-use commercial building.",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-13",
        category: "Land",
        status: "For Sale",
        bedrooms: 0,
        bathrooms: 0,
        sqft: 10763,
        amenities: ["Dry Land", "Fenced", "Good Title"],
        gallery: [
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-20"
    },
    {
        id: 14,
        slug: "ikoyi-luxury-flat",
        title: "Bourdillon Luxury Flat",
        price: "15,000,000 / year",
        location: "Bourdillon, Ikoyi, Lagos",
        description: "Opulent 3-bedroom flat on Bourdillon Road. Offers stunning views, a fully equipped gym, Olympic size swimming pool, and round-the-clock concierge services.",
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=600",
        original_url: "https://jiji.ng/example-14",
        category: "Flat",
        status: "For Rent",
        bedrooms: 3,
        bathrooms: 3.5,
        sqft: 2500,
        amenities: ["Gym", "Pool", "Concierge", "Ocean View"],
        gallery: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-15"
    },
    {
        id: 15,
        slug: "wuse-2-commercial",
        title: "Wuse 2 Retail Space",
        price: "8,000,000 / year",
        location: "Wuse 2, Abuja",
        description: "High visibility retail space on a major road in Wuse 2. Ideal for a boutique, high-end salon, or showroom. Large glass display windows and dedicated customer parking.",
        image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&h=600",
        original_url: "https://nigeriapropertycentre.com/example-15",
        category: "Commercial",
        status: "For Rent",
        bedrooms: 0,
        bathrooms: 2,
        sqft: 1500,
        amenities: ["High Visibility", "Glass Display", "Customer Parking"],
        gallery: [
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=600"
        ],
        datePosted: "2026-05-10"
    }
];

class DataProvider {
    constructor() {
        this.properties = [];
        this.initialized = false;
    }
    static getInstance() {
        if (!DataProvider.instance) {
            DataProvider.instance = new DataProvider();
        }
        return DataProvider.instance;
    }
    async init() {
        if (this.initialized)
            return;
        try {
            const response = await fetch('./data.json');
            if (response.ok) {
                const scrapedData = await response.json();
                if (Array.isArray(scrapedData) && scrapedData.length > 0) {
                    this.properties = scrapedData;
                }
                else {
                    this.properties = [...MOCK_PROPERTIES];
                }
            }
            else {
                this.properties = [...MOCK_PROPERTIES];
            }
        }
        catch {
            this.properties = [...MOCK_PROPERTIES];
        }
        // Filter out properties older than 2 months
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        this.properties = this.properties.filter(p => {
            if (!p.datePosted)
                return false;
            const d = new Date(p.datePosted);
            return d >= twoMonthsAgo;
        });
        this.initialized = true;
    }
    getAllProperties() {
        return this.properties;
    }
    getPropertyById(id) {
        return this.properties.find(p => p.id === id);
    }
}

function getPropertyCoordinates(locationStr) {
    const lower = locationStr.toLowerCase();
    if (lower.includes("ikoyi") || lower.includes("bourdillon"))
        return [6.4549, 3.4246];
    if (lower.includes("banana island"))
        return [6.4638, 3.4557];
    if (lower.includes("victoria island"))
        return [6.4281, 3.4219];
    if (lower.includes("chevron") || lower.includes("orchid") || lower.includes("ikate") || lower.includes("vgc") || lower.includes("lekki"))
        return [6.4281, 3.4219];
    if (lower.includes("ikeja"))
        return [6.6018, 3.3515];
    if (lower.includes("yaba"))
        return [6.5095, 3.3711];
    if (lower.includes("epe"))
        return [6.5833, 3.9833];
    if (lower.includes("maitama"))
        return [9.0882, 7.5006];
    if (lower.includes("guzape"))
        return [9.0227, 7.5020];
    if (lower.includes("asokoro"))
        return [9.0381, 7.5186];
    if (lower.includes("wuse"))
        return [9.0683, 7.4619];
    if (lower.includes("abuja"))
        return [9.0765, 7.3986];
    if (lower.includes("port harcourt"))
        return [4.8156, 7.0498];
    if (lower.includes("ibadan") || lower.includes("bodija"))
        return [7.3775, 3.9470];
    if (lower.includes("enugu"))
        return [6.4584, 7.5464];
    return [6.5244, 3.3792]; // Lagos general default
}
function getCoordinatesWithJitter(locationStr, id) {
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
        const sourceEl = document.getElementById("prop-source");
        if (sourceEl) {
            sourceEl.textContent = prop.sourceSite || "Verified";
            if (prop.sourceSite === 'Xtate') {
                sourceEl.style.background = "#9B5DE5";
                sourceEl.style.color = "white";
            }
            else if (prop.sourceSite === 'Jiji') {
                sourceEl.style.background = "#007bff";
                sourceEl.style.color = "white";
            }
            else {
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
            }
            else {
                furnishingEl.style.display = "none";
            }
        }
        const servicedEl = document.getElementById("prop-serviced");
        if (servicedEl) {
            if (prop.serviced) {
                servicedEl.style.display = "inline-block";
            }
            else {
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
            }
            else if (prop.sourceSite === 'NPC') {
                safetyBanner.innerHTML = `
                    <div style="background: rgba(0, 230, 118, 0.1); border: 1px solid rgba(0, 230, 118, 0.2); border-left: 4px solid #00e676; padding: 0.85rem; color: #c8e6c9; border-radius: 4px;">
                        <i class="fas fa-shield-alt" style="color: #00e676; margin-right: 0.5rem; font-size: 1rem;"></i>
                        <strong>NPC Verified Listing:</strong> Please inspect the property physically in person. Ensure you verify the agent's mandate and conduct a search at the state land registry before making payments.
                    </div>
                `;
            }
            else {
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
        // Contact CTA Links (WhatsApp & Call)
        const btnWhatsapp = document.getElementById("btn-whatsapp-agent");
        if (btnWhatsapp) {
            btnWhatsapp.href = prop.original_url || '#';
            btnWhatsapp.target = "_blank";
        }
        const btnCall = document.getElementById("btn-call-agent");
        if (btnCall) {
            btnCall.href = prop.original_url || '#';
            btnCall.target = "_blank";
        }
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
            }
            catch (err) {
                console.error("Leaflet map initialization failed:", err);
            }
        }
        // Bind Lightbox and Tenant Application
        this.bindLightbox();
        this.bindTenantApplication(prop);
        // Update page title
        document.title = `${prop.title} — Marketplace`;
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
    startGallerySlider() {
        if (this.sliderInterval)
            clearInterval(this.sliderInterval);
        if (this.galleryImages.length <= 1)
            return;
        this.sliderInterval = setInterval(() => {
            this.showGalleryImage(this.activeGalleryIndex + 1);
        }, 6500);
    }
    bindLightbox() {
        const mainImg = document.getElementById("main-image");
        const lightbox = document.getElementById("gallery-lightbox");
        const lightboxClose = document.getElementById("btn-close-lightbox");
        const lightboxPrev = document.getElementById("btn-lightbox-prev");
        const lightboxNext = document.getElementById("btn-lightbox-next");
        if (!mainImg || !lightbox || !lightboxClose)
            return;
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
            if (lightbox.classList.contains("d-none"))
                return;
            if (e.key === "Escape") {
                lightbox.classList.add("d-none");
            }
            else if (e.key === "ArrowLeft") {
                this.updateLightboxImage(this.activeGalleryIndex - 1);
            }
            else if (e.key === "ArrowRight") {
                this.updateLightboxImage(this.activeGalleryIndex + 1);
            }
        });
    }
    updateLightboxImage(index) {
        if (this.galleryImages.length === 0)
            return;
        this.activeGalleryIndex = (index + this.galleryImages.length) % this.galleryImages.length;
        // Keep main page image in sync
        const mainImg = document.getElementById("main-image");
        if (mainImg)
            mainImg.src = this.galleryImages[this.activeGalleryIndex];
        const lightboxImg = document.getElementById("lightbox-main-img");
        if (lightboxImg)
            lightboxImg.src = this.galleryImages[this.activeGalleryIndex];
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
                    const idx = Number(thumb.dataset.lightboxIndex || 0);
                    this.updateLightboxImage(idx);
                });
            });
        }
    }
    bindTenantApplication(prop) {
        const modal = document.getElementById("tenant-modal");
        const btnOpen = document.getElementById("btn-apply-tenant");
        const btnClose = document.getElementById("btn-close-tenant-modal");
        const btnCloseSuccess = document.getElementById("btn-success-close");
        const btnStep1Next = document.getElementById("btn-step-1-next");
        const btnStep2Next = document.getElementById("btn-step-2-next");
        const btnStep2Back = document.getElementById("btn-step-2-back");
        const btnStep3Back = document.getElementById("btn-step-3-back");
        const form = document.getElementById("tenant-application-form");
        const formContainer = document.getElementById("tenant-form-container");
        const successContainer = document.getElementById("tenant-success-container");
        if (!modal || !btnOpen)
            return;
        // Custom titles based on purchase status
        const modalTitle = document.getElementById("tenant-modal-title");
        const modalSubtitle = document.getElementById("tenant-modal-subtitle");
        if (prop.status === "For Sale") {
            btnOpen.innerHTML = `<i class="fas fa-gavel"></i> Make an Offer`;
            if (modalTitle)
                modalTitle.textContent = "Property Purchase Offer";
            if (modalSubtitle)
                modalSubtitle.textContent = "Secure buyer identity verification via government database integration.";
            const salaryLabel = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('MONTHLY SALARY'));
            if (salaryLabel)
                salaryLabel.textContent = "AVAILABLE PURCHASE BUDGET (₦)";
        }
        else {
            btnOpen.innerHTML = `<i class="fas fa-file-contract"></i> Apply to Rent`;
            if (modalTitle)
                modalTitle.textContent = "Tenant Application Form";
            if (modalSubtitle)
                modalSubtitle.textContent = "Secure tenant verification via government database integration.";
        }
        // Open/Close triggers
        btnOpen.addEventListener("click", (e) => {
            e.preventDefault();
            window.open(prop.original_url, '_blank');
        });
        btnClose?.addEventListener("click", () => modal.classList.add("d-none"));
        btnCloseSuccess?.addEventListener("click", () => modal.classList.add("d-none"));
        // Steps navigation validations
        btnStep1Next?.addEventListener("click", () => {
            const nameInput = document.getElementById("app-full-name");
            const emailInput = document.getElementById("app-email");
            const phoneInput = document.getElementById("app-phone");
            if (nameInput.checkValidity() && emailInput.checkValidity() && phoneInput.checkValidity()) {
                this.goToStep(2);
            }
            else {
                nameInput.reportValidity();
                emailInput.reportValidity();
                phoneInput.reportValidity();
            }
        });
        btnStep2Next?.addEventListener("click", () => {
            const jobInput = document.getElementById("app-job");
            const employerInput = document.getElementById("app-employer");
            const salaryInput = document.getElementById("app-salary");
            if (jobInput.checkValidity() && employerInput.checkValidity() && salaryInput.checkValidity()) {
                this.goToStep(3);
                this.initializeNinjaWidget();
            }
            else {
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
    goToStep(stepNum) {
        const step1 = document.getElementById("form-step-1");
        const step2 = document.getElementById("form-step-2");
        const step3 = document.getElementById("form-step-3");
        const badge1 = document.getElementById("step-badge-1");
        const badge2 = document.getElementById("step-badge-2");
        const badge3 = document.getElementById("step-badge-3");
        if (!step1 || !step2 || !step3 || !badge1 || !badge2 || !badge3)
            return;
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
        }
        else if (stepNum === 2) {
            step2.classList.remove("d-none");
            badge2.style.background = "var(--emerald)";
            badge2.style.color = "black";
            badge2.style.borderColor = "var(--emerald)";
        }
        else if (stepNum === 3) {
            step3.classList.remove("d-none");
            badge3.style.background = "var(--emerald)";
            badge3.style.color = "black";
            badge3.style.borderColor = "var(--emerald)";
        }
    }
    async initializeNinjaWidget() {
        const anchor = document.getElementById("ninja-form-anchor");
        if (!anchor)
            return;
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
            if (!response.ok)
                throw new Error("Failed to authenticate session token");
            const { token } = await response.json();
            if (window.Ninja) {
                window.Ninja.init({
                    targetElement: "#ninja-form-anchor",
                    apiKey: token,
                    idType: "nin",
                    mode: "lookup",
                    display: "form",
                    buttonLabel: "Verify Identity",
                    onSuccess: (data) => {
                        console.log("Ninja KYC Success:", data);
                        if (statusBadge) {
                            statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(0, 230, 118, 0.15); color: #00e676; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-check-circle"></i> ID Verified (${data.first_name || ''} ${data.last_name || ''})</span>`;
                        }
                        const submitBtn = document.getElementById("btn-submit-application");
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.style.cursor = "pointer";
                            submitBtn.style.opacity = "1";
                        }
                    },
                    onFailure: (err) => {
                        console.warn("Ninja KYC Failure:", err);
                        if (statusBadge) {
                            statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(220, 53, 69, 0.15); color: #dc3545; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-times-circle"></i> Verification Failed</span>`;
                        }
                    },
                    onError: (err) => {
                        console.error("Ninja KYC Error:", err);
                        if (statusBadge) {
                            statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(220, 53, 69, 0.15); color: #dc3545; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-exclamation-triangle"></i> SDK Connection Error</span>`;
                        }
                    }
                });
            }
            else {
                throw new Error("Ninja SDK not loaded on window");
            }
        }
        catch (e) {
            console.error("Failed to initialize verification widget:", e);
            if (statusBadge) {
                statusBadge.innerHTML = `<span class="status-badge" style="background: rgba(220, 53, 69, 0.15); color: #dc3545; font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 99px; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas fa-times-circle"></i> API Connection Error</span>`;
            }
        }
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

export { DataProvider as D, MOCK_PROPERTIES as M, MagicView as a, MagicViewModel as b, getPropertyCoordinates as c, getCoordinatesWithJitter as g };
