import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from '@aws-cdk/aws-apigatewayv2';
import { BaseResourceStackProps } from '../types/types';

interface BackendStackProps extends BaseResourceStackProps {
    // Add any backend related props
}

export class BackendStack extends cdk.Stack {
    public readonly apiGateway: apigateway.HttpApi;

    constructor(scope: Construct, id: string, props: BackendStackProps) {
        super(scope, id, props);

        // this.apiGateway.url!

        new cdk.CfnOutput(this, 'ApiGatewayUrlOutput', {
            value: "junas",
            exportName: `${id}-ApiGatewayUrl`, // Unique export name
        });

        props.appregistry.associateApplicationWithStack(this);
    }
}