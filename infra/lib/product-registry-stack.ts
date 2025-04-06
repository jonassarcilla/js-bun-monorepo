
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProductRegistryStackProps } from '../types/types';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export class ProductRegistryStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ProductRegistryStackProps) {
        super(scope, id, props);

        const prefixAppName = props.productName.toString();
        const domainName = props.domainName.toString();

        //#region [Creating Hosted Zone]
        // 1. Create a Route 53 Hosted Zone
        const hostedZone = new route53.PublicHostedZone(this, `${prefixAppName}-hosted-zone`, {
            zoneName: domainName,
        });

        // Output the Hosted Zone ID for your DNS records at any domain provider (e.g Namecheap, GoDaddy)
        new cdk.CfnOutput(this, `${prefixAppName}-hosted-zone-id`, {
            value: hostedZone.hostedZoneId,
            description: 'The ID of the Route 53 Hosted Zone',
        });

        // Output the Name Servers to configure at your domain registrar (Namecheap)
        new cdk.CfnOutput(this, `${prefixAppName}-hosted-zone-name-servers`, {
            value: cdk.Fn.join(',', hostedZone.hostedZoneNameServers ?? []),
            description: 'The Name Servers for your Route 53 Hosted Zone (configure at Namecheap)',
        });
        //#endregion

        //#region [Create an ACM Certificate]
        const wildcardDomain = `*.${domainName}`;

        const certificate = new acm.Certificate(this, `${prefixAppName}-certificate`, {
            certificateName: `${prefixAppName}-certificate`,
            domainName: domainName, // Base domain as the primary
            subjectAlternativeNames: [wildcardDomain], // Add the wildcard as a SAN
            validation: acm.CertificateValidation.fromDns(hostedZone), // DNS validation using the hosted zone
        });

        // Output the ARN of the ACM Certificate
        new cdk.CfnOutput(this, `${prefixAppName}-certificate-arn`, {
            value: certificate.certificateArn,
            description: 'The ARN of the ACM Certificate',
        });
        //#endregion
    }
}  