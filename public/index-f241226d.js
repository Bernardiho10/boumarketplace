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

export { MagicView as M, MagicViewModel as a };
