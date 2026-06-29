import { MOCK_PROPERTIES, type Property } from "./mock-data";

export class DataProvider {
    private static instance: DataProvider;
    private properties: Property[] = [];
    private initialized: boolean = false;

    private constructor() {}

    public static getInstance(): DataProvider {
        if (!DataProvider.instance) {
            DataProvider.instance = new DataProvider();
        }
        return DataProvider.instance;
    }

    async init() {
        if (this.initialized) return;

        try {
            const response = await fetch('./data.json');
            if (response.ok) {
                const scrapedData = await response.json();
                if (Array.isArray(scrapedData) && scrapedData.length > 0) {
                    this.properties = scrapedData;
                } else {
                    this.properties = [...MOCK_PROPERTIES];
                }
            } else {
                this.properties = [...MOCK_PROPERTIES];
            }
        } catch {
            this.properties = [...MOCK_PROPERTIES];
        }

        // Filter out properties older than 2 months
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        this.properties = this.properties.filter(p => {
            if (!p.datePosted) return false;
            const d = new Date(p.datePosted);
            return d >= twoMonthsAgo;
        });

        this.initialized = true;
    }

    getAllProperties(): Property[] {
        return this.properties;
    }

    getPropertyById(id: number): Property | undefined {
        return this.properties.find(p => p.id === id);
    }
}
