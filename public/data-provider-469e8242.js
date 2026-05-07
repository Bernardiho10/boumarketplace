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
        datePosted: "2026-04-29"
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
        datePosted: "2026-04-28"
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
        datePosted: "2026-04-27"
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
        datePosted: "2026-04-25"
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
        datePosted: "2026-04-22"
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
        datePosted: "2026-04-20"
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
        datePosted: "2026-04-15"
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
        datePosted: "2026-04-10"
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
        datePosted: "2026-04-05"
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
        datePosted: "2026-04-01"
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
        datePosted: "2026-03-28"
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
        datePosted: "2026-03-20"
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
        datePosted: "2026-03-15"
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
        datePosted: "2026-03-10"
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
        datePosted: "2026-03-01"
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
        // Start with mock properties
        this.properties = [...MOCK_PROPERTIES];
        try {
            // Try to fetch the scraped data
            // Note: In a production app, this would be an API call or a statically served JSON
            const response = await fetch('./data.json');
            if (response.ok) {
                const scrapedData = await response.json();
                if (Array.isArray(scrapedData)) {
                    // Combine and remove duplicates by original_url if necessary
                    this.properties = [...scrapedData, ...this.properties];
                    console.log(`Loaded ${scrapedData.length} scraped properties.`);
                }
            }
        }
        catch (error) {
            console.log("No scraped data found, using neural cache (mock data) only.");
        }
        this.initialized = true;
    }
    getAllProperties() {
        return this.properties;
    }
    getPropertyById(id) {
        return this.properties.find(p => p.id === id);
    }
}

export { DataProvider as D, MagicView as M, MagicViewModel as a };
