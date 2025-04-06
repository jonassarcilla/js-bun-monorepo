import { AppConfig, ProductConfig } from "../types/types";

export const PRODUCT_CONFIG: ProductConfig = {
    productName: "connvey",
    domainName: "connvey.com",
    description: "This is my money-making app"
}

export const APP_CONFIG: AppConfig = {
    clientName: "microsoft",
    environment: "dev",
    attributes: {
        Version: '1.0',
        Language: 'TypeScript',
        Framework: 'Next.js',
        DataStore: 'DynamoDB',
    },
    tags: {
        "Language": "TypeScript",
        "Framework": "Nextjs"
    }
}