#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { AppRegistryStack } from '../lib/app-registry-stack';
import { APP_CONFIG, PRODUCT_CONFIG } from '../config/configs';
import { ProductRegistryStack } from '../lib/product-registry-stack';
import { FrontendStack } from '../lib/frontend-stack';

const app = new cdk.App();
// new InfraStack(app, 'InfraStack', {  
//   /* If you don't specify 'env', this stack will be environment-agnostic.
//    * Account/Region-dependent features and context lookups will not work,
//    * but a single synthesized template can be deployed anywhere. */

//   /* Uncomment the next line to specialize this stack for the AWS Account
//    * and Region that are implied by the current CLI configuration. */
//   // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

//   /* Uncomment the next line if you know exactly what Account and Region you
//    * want to deploy the stack to. */
//   // env: { account: '123456789012', region: 'us-east-1' },

//   /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
// });

//#region [Product Related]
// const { productName, domainName, description } = PRODUCT_CONFIG;
// const productRegistryStackId = `${productName.toLowerCase()}-product-registry-stack`;
// const productRegistryStack = new ProductRegistryStack(app, productRegistryStackId, {
//   productName,
//   domainName,
//   description,
//   env: {
//     account: process.env.AWS_ACCOUNT!,
//     region: "us-east-1"
//   },
// });
//#endregion

//#region [Tenant Related]
const { clientName, environment, tags, attributes } = APP_CONFIG

const appRegistryStackId = `${clientName}-${environment.toLowerCase()}-app-registry-stack`;
const appRegistryStack = new AppRegistryStack(app, appRegistryStackId, {
  clientName,
  environment,
  tags,
  attributes,
  env: {
    account: process.env.AWS_ACCOUNT!,
    region: process.env.AWS_REGION!
  },
});
//#endregion

const backendStackId = `${clientName}-${environment.toLowerCase()}-backend-stack`;
const backendStack = new BackendStack(app, backendStackId, {
  clientName,
  environment,
  appregistry: appRegistryStack.appregistry,
  env: {
    account: process.env.AWS_ACCOUNT!,
    region: process.env.AWS_REGION!
  },
});

const frontendStackId = `${clientName}-${environment.toLowerCase()}-frontend-stack`;
new FrontendStack(app, frontendStackId, {
  clientName,
  environment,
  appregistry: appRegistryStack.appregistry,
  apiGateway: backendStack.apiGateway,
  // dataTable: backendStack.dataTable, // Pass the table object as a prop
  env: {
    account: process.env.AWS_ACCOUNT!,
    region: process.env.AWS_REGION!
  },
});