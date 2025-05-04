import * as cdk from 'aws-cdk-lib';
import * as appregistry from '@aws-cdk/aws-servicecatalogappregistry-alpha';

export type ProductConfig = {
    productName: string,
    domainName: string;
    description: string;
}

export type ProductRegistryStackProps = ProductConfig & cdk.StackProps

export interface AppConfig {
    clientName: string;
    environment: "dev" | "staging" | "prod"
    attributes: {
        [key: string]: any;
    }
    tags: { [key: string]: string; }
}

export type AppRegistryStackProps = AppConfig & cdk.StackProps;

export type BaseResourceStackProps = Pick<AppRegistryStackProps, "clientName" | "environment"> & cdk.StackProps & {
    appregistry: appregistry.Application;
}