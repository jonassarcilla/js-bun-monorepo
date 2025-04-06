import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appregistry from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import { AppRegistryStackProps } from '../types/types';

export class AppRegistryStack extends cdk.Stack {
    public readonly appregistry: appregistry.Application;

    constructor(scope: Construct, id: string, props: AppRegistryStackProps) {
        super(scope, id, props);

        const { clientName, environment, tags, attributes } = props;
        const prefixAppName = (`${clientName}-${environment}`).toLowerCase();
        const appRegistryStackName = `${prefixAppName}-app`;

        this.appregistry = new appregistry.Application(this, appRegistryStackName, {
            applicationName: appRegistryStackName, // Replace with your application name
            description: 'This is the application registry entry for my web application.',
        });

        // Add tags to the Application after it's created
        cdk.Tags.of(this.appregistry).add('environment', environment);
        cdk.Tags.of(this.appregistry).add('version', "1.0.0");

        Object.entries(tags).map(([key, value]) => {
            cdk.Tags.of(this.appregistry).add(key, value);
        })

        new cdk.CfnOutput(this, 'ApplicationId', {
            value: this.appregistry.applicationId,
            description: 'The ID of the Application Registry application.',
        });

        new cdk.CfnOutput(this, 'ApplicationArn', {
            value: this.appregistry.applicationArn,
            description: 'The ARN of the Application Registry application.',
        });

        this.appregistry.associateApplicationWithStack(this);

        // Create an S3 bucket (example resource)
        // const websiteBucket = new s3.Bucket(this, `${prefixAppName}-bucket`, {
        //     bucketName: `${prefixAppName}-bucket`
        // });

        // Create an Attribute Group (for metadata)
        // this.appregistry.addAttributeGroup(`${prefixAppName}-app-metadata`, {
        //     attributeGroupName: `${prefixAppName}-app-metadata`,
        //     attributes
        // });

        // Associate the S3 bucket with the Application
        // new appregistry.ResourceAssociation(this, 'BucketAssociation', {
        //     application: application,
        //     resource: appregistry.Resource.fromArn(websiteBucket.bucketArn),
        // });

        // You can associate other resources as well, e.g., a DynamoDB table:
        // const dataTable = new dynamodb.Table(this, 'DataTable', { ... });
        // new appregistry.ResourceAssociation(this, 'TableAssociation', {
        //   application: application,
        //   resource: appregistry.Resource.fromArn(dataTable.tableArn),
        // });
    }
}