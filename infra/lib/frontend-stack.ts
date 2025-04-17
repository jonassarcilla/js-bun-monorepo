import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import * as apigatewayV1 from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayV2 from '@aws-cdk/aws-apigatewayv2';
// import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { BaseResourceStackProps } from '../types/types';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as child_process from 'child_process';

dotenv.config();

interface FrontendStackProps extends BaseResourceStackProps {
    // Add any frontent related props
    apiGateway?: apigatewayV2.HttpApi;
}

export class FrontendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: FrontendStackProps) {
        super(scope, id, props);

        const region = this.region;
        const stackName = `${props.clientName}-${props.environment.toLowerCase()}`;
        const apiGatewayUrl = cdk.Fn.importValue(`${stackName}-backendStack-ApiGatewayUrl`);

        console.log(`Imported API Gateway URL: ${apiGatewayUrl}`);

        props.appregistry.associateApplicationWithStack(this);

        //#region [Create Deployment Logging bucket]
        const s3LoggingBucket = new s3.CfnBucket(this, `${stackName}-s3-logging`, {
            bucketName: `${stackName}-s3-logging`,
            publicAccessBlockConfiguration: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            versioningConfiguration: {
                status: 'Enabled',
            },
            bucketEncryption: {
                serverSideEncryptionConfiguration: [
                    {
                        bucketKeyEnabled: false,
                        serverSideEncryptionByDefault: {
                            sseAlgorithm: 'AES256',
                        },
                    },
                ],
            },
            ownershipControls: {
                rules: [
                    {
                        objectOwnership: 'ObjectWriter',
                    },
                ],
            },
            accessControl: 'LogDeliveryWrite',
            tags: [{ key: 'stack-name', value: stackName }],
        });
        s3LoggingBucket.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
        //#endregion

        //#region [Create S3 Bucket]
        const s3Bucket = new s3.CfnBucket(this, `${stackName}-s3-bucket`, {
            bucketName: `${stackName}-s3-bucket`,
            publicAccessBlockConfiguration: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            loggingConfiguration: {
                destinationBucketName: s3LoggingBucket.bucketName,
                logFilePrefix: 's3-access-logs',
            },
            versioningConfiguration: {
                status: 'Enabled',
            },
            bucketEncryption: {
                serverSideEncryptionConfiguration: [
                    {
                        bucketKeyEnabled: false,
                        serverSideEncryptionByDefault: {
                            sseAlgorithm: 'AES256',
                        },
                    },
                ],
            },
            ownershipControls: {
                rules: [
                    {
                        objectOwnership: 'ObjectWriter',
                    },
                ],
            },
            accessControl: 'LogDeliveryWrite',
            tags: [{ key: 'stack-name', value: stackName }],
        });
        s3Bucket.node.addDependency(s3LoggingBucket);
        s3Bucket.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
        //#endregion

        // Deploy zip files from a local directory to the S3 bucket
        const packageFilePath = path.join(__dirname, '../../apps/web/.package');
        const s3BucketInfo: s3.IBucket = s3.Bucket.fromBucketName(this, `${stackName}-s3-bucket-info`, String(s3Bucket.bucketName));
        const zipFileUpload = new s3deploy.BucketDeployment(this, `${stackName}-zip-file-upload`, {
            sources: [
                s3deploy.Source.asset(packageFilePath, {
                    exclude: ['*', '!*.zip'],
                }),
            ],
            destinationBucket: s3BucketInfo,
            destinationKeyPrefix: 'packages/',
        });
        zipFileUpload.node.addDependency(s3Bucket);

        const publicFolderPath = path.join(packageFilePath, '/web-ui-public')

        const publicFolderUpload = new s3deploy.BucketDeployment(this, `${stackName}-public-folder-upload`, {
            sources: [
                s3deploy.Source.asset(publicFolderPath),
            ],
            destinationBucket: s3BucketInfo,
            destinationKeyPrefix: '/',
        });
        publicFolderUpload.node.addDependency(s3Bucket);

        const staticFolderPath = path.join(packageFilePath, '/web-ui-static')

        const staticFolderUpload = new s3deploy.BucketDeployment(this, `${stackName}-static-folder-upload`, {
            sources: [
                s3deploy.Source.asset(staticFolderPath),
            ],
            destinationBucket: s3BucketInfo,
            destinationKeyPrefix: '_next/',
        });
        staticFolderUpload.node.addDependency(s3Bucket);

        //#region [Create CloudFront Origin Access Identity for Bucket Policy for Deployment Bucket]
        const cloudFrontOriginAccessIdentity = new cloudfront.CfnCloudFrontOriginAccessIdentity(
            this,
            `${stackName}-deployment-cloudfront-origin-access-identity`,
            {
                cloudFrontOriginAccessIdentityConfig: {
                    comment: `OAI for  static resources in S3 bucket: ${s3Bucket.bucketName}`,
                },
            },
        );
        cloudFrontOriginAccessIdentity.node.addDependency(s3Bucket);
        cloudFrontOriginAccessIdentity.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
        //#endregion

        //#region [Create Bucket Policy for Deployment bucket]
        const s3BucketPolicy = new s3.CfnBucketPolicy(this, `${stackName}-s3-bucket-policy`, {
            bucket: s3BucketInfo.bucketName,
            policyDocument: {
                Statement: [
                    {
                        Action: 's3:GetObject',
                        Effect: 'Allow',
                        Principal: {
                            CanonicalUser: cloudFrontOriginAccessIdentity.attrS3CanonicalUserId,
                        },
                        // Resource: [s3BucketInfo.bucketArn, `${s3BucketInfo.bucketArn}/*`],
                        Resource: `${s3BucketInfo.bucketArn}/*`,
                    },
                ],
                Version: '2012-10-17',
            },

        });
        s3BucketPolicy.node.addDependency(s3Bucket);
        s3BucketPolicy.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
        //#endregion

        //#region [Create Lambda Function Role]
        const lambdaFunctionRole = new iam.CfnRole(this, `${stackName}-lambda-function-role`, {
            roleName: `${stackName}-lambda-function-role`,
            assumeRolePolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: {
                            Service: 'lambda.amazonaws.com',
                        },
                        Action: 'sts:AssumeRole',
                    },
                ],
            },
            policies: [
                {
                    policyName: 'AWSLambdaBasicExecutionRole',
                    policyDocument: {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Effect: 'Allow',
                                Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                                Resource: '*',
                            },
                        ],
                    },
                },
                {
                    policyName: 'AWSXrayWriteOnlyAccess',
                    policyDocument: {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Effect: 'Allow',
                                Action: [
                                    'xray:PutTraceSegments',
                                    'xray:PutTelemetryRecords',
                                    'xray:GetSamplingRules',
                                    'xray:GetSamplingTargets',
                                    'xray:GetSamplingStatisticSummaries',
                                ],
                                Resource: ['*'],
                            },
                        ],
                    },
                },
            ],
            maxSessionDuration: 3600,
            tags: [
                {
                    key: 'stackName',
                    value: stackName,
                },
            ],
        });
        lambdaFunctionRole.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
        //#endregion

        //#region [Create Lambda Layer for Lambda Function]
        const lambdaFunctionLayer = new lambda.LayerVersion(this, `${stackName}-lambda-function-layer`, {
            layerVersionName: `${stackName}-lambda-function-layer`,
            code: lambda.Code.fromBucket(s3BucketInfo, "packages/web-ui-node.zip"),
            compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
            compatibleArchitectures: [lambda.Architecture.X86_64],
        });
        lambdaFunctionLayer.node.addDependency(s3Bucket);
        lambdaFunctionLayer.node.addDependency(zipFileUpload);
        //#endregion

        // #region [Create Lambda Function]
        const lambdaFunction = new lambda.CfnFunction(this, `${stackName}-lambda-function`, {
            functionName: `${stackName}-lambda-function`,
            code: {
                s3Bucket: s3Bucket.bucketName,
                s3Key: 'packages/web-ui-function.zip',
            },
            handler: 'run.sh',
            runtime: 'nodejs22.x',
            timeout: 10,
            memorySize: 512,
            architectures: ['x86_64'],
            environment: {
                variables: {
                    AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
                    RUST_LOG: 'info',
                    PORT: '8080',
                    // Other environment variables
                    // REGION: UIParameterStore.stringValue,
                },
            },
            layers: [
                `arn:aws:lambda:${region}:753240598075:layer:LambdaAdapterLayerX86:13`,
                lambdaFunctionLayer.layerVersionArn,
            ],
            tags: [
                {
                    key: 'stackName',
                    value: stackName,
                },
            ],
            role: lambdaFunctionRole.attrArn,
        });
        lambdaFunction.node.addDependency(s3Bucket);
        lambdaFunction.node.addDependency(lambdaFunctionRole);
        lambdaFunction.node.addDependency(lambdaFunctionLayer);
        lambdaFunctionLayer.node.addDependency(zipFileUpload);
        lambdaFunction.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
        //#endregion

        //#region [Create Lambda Function API Gateway]
        const lambdaFunctionInfo: lambda.IFunction = lambda.Function.fromFunctionName(
            this,
            `${stackName}-lambda-function-info`,
            String(lambdaFunction.functionName)
        );
        lambdaFunctionInfo.node.addDependency(lambdaFunction)

        const lambdaFunctionApiGateWay = new apigatewayV1.LambdaRestApi(
            this,
            `${stackName}-lambda-function-api-gateway`,
            {
                restApiName: `${stackName}-lambda-function-api-gateway`,
                handler: lambdaFunctionInfo,
                proxy: true,
            },
        );
        lambdaFunctionApiGateWay.node.addDependency(lambdaFunction);
        //#endregion

        //#region [Create CloudFront Origin Request Policy for UI Deployment CloudFront Distribution]
        const cloudFrontOriginRequestPolicy = new cloudfront.CfnOriginRequestPolicy(
            this,
            `${stackName}-deployment-cloudfront-origin-request-policy`,
            {
                originRequestPolicyConfig: {
                    name: `${stackName}-web-ui-originRequest-policy`,
                    comment: `${stackName}-web-ui-originRequest-policy`,
                    cookiesConfig: {
                        cookieBehavior: 'all',
                    },
                    headersConfig: {
                        headerBehavior: 'none',
                    },
                    queryStringsConfig: {
                        queryStringBehavior: 'all',
                    },
                },
            },
        );
        cloudFrontOriginRequestPolicy.node.addDependency(s3Bucket);
        cloudFrontOriginRequestPolicy.node.addDependency(publicFolderUpload);
        cloudFrontOriginRequestPolicy.node.addDependency(staticFolderUpload);
        cloudFrontOriginRequestPolicy.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
        //#endregion

        const DOMAIN_NAME = process.env.DOMAIN_NAME || ""

        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, `${stackName}-hosted-zone`, {
            hostedZoneId: process.env.HOSTED_ZONE_ID || "",
            zoneName: DOMAIN_NAME
        });

        const SUB_DOMAIN = `${stackName}.${DOMAIN_NAME}`;
        const CERTIFICATE_ARN = process.env.CERTIFICATE_ARN || "";
        const certificate = acm.Certificate.fromCertificateArn(this, `${stackName}-certificate-info`, CERTIFICATE_ARN);

        //#region [Create CloudFront Distribution]
        const cloudfrontDistribution = new cloudfront.CfnDistribution(
            this,
            `${stackName}-cloudfront-distribution`,
            {
                distributionConfig: {
                    origins: [
                        {
                            id: `${stackName}-s3-origin`,
                            domainName: s3Bucket.attrRegionalDomainName,
                            s3OriginConfig: {
                                originAccessIdentity: `origin-access-identity/cloudfront/${cloudFrontOriginAccessIdentity.attrId}`,
                            },
                        },
                        {
                            id: `${stackName}-lambda-function-api-gateway-origin`,
                            domainName: `${lambdaFunctionApiGateWay.restApiId}.execute-api.${region}.amazonaws.com`,
                            originPath: '/prod',
                            customOriginConfig: {
                                originProtocolPolicy: 'https-only',
                                httpsPort: 443,
                            },
                        },
                    ],
                    aliases: [SUB_DOMAIN],
                    viewerCertificate: {
                        acmCertificateArn: certificate.certificateArn,
                        sslSupportMethod: 'sni-only',
                        minimumProtocolVersion: 'TLSv1.2_2021',
                    },
                    enabled: true,
                    comment: `${stackName}-cloudfront-distribution`,
                    httpVersion: 'http2',
                    defaultRootObject: '',
                    defaultCacheBehavior: {
                        targetOriginId: `${stackName}-lambda-function-api-gateway-origin`,
                        cachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
                        forwardedValues: {
                            queryString: true,
                            cookies: {
                                forward: 'all',
                            },
                        },
                        compress: true,
                        allowedMethods: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
                        viewerProtocolPolicy: 'redirect-to-https',
                        maxTtl: 31536000,
                        originRequestPolicyId: cloudFrontOriginRequestPolicy.attrId,
                    },
                    cacheBehaviors: [
                        {
                            pathPattern: '/_next/*',
                            targetOriginId: `${stackName}-s3-origin`,
                            cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
                            allowedMethods: ['GET', 'HEAD'],
                            forwardedValues: {
                                queryString: false,
                                cookies: {
                                    forward: 'none',
                                },
                            },
                            compress: true,
                            viewerProtocolPolicy: 'https-only',
                        },
                        {
                            pathPattern: '/img/*',
                            targetOriginId: `${stackName}-s3-origin`,
                            cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
                            allowedMethods: ['GET', 'HEAD'],
                            forwardedValues: {
                                queryString: false,
                                cookies: {
                                    forward: 'none',
                                },
                            },
                            compress: true,
                            viewerProtocolPolicy: 'https-only',
                        },
                    ],
                    priceClass: 'PriceClass_100',
                    logging: {
                        bucket: s3Bucket.attrRegionalDomainName,
                        prefix: 'cloudfront-access-logs',
                    },
                },
                tags: [
                    {
                        key: 'stackName',
                        value: stackName,
                    },
                ],
            },
        );

        cloudfrontDistribution.node.addDependency(s3Bucket);
        cloudfrontDistribution.node.addDependency(lambdaFunctionApiGateWay);
        cloudfrontDistribution.node.addDependency(cloudFrontOriginAccessIdentity);
        cloudfrontDistribution.node.addDependency(cloudFrontOriginRequestPolicy);
        cloudfrontDistribution.node.addDependency(certificate);

        cloudfrontDistribution.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;
        //#endregion

        const cloudfrontDistributionInfo: cloudfront.IDistribution = cloudfront.Distribution.fromDistributionAttributes(this, `${stackName}-cloudfront-distribution-info`, {
            distributionId: cloudfrontDistribution.ref,
            domainName: cloudfrontDistribution.attrDomainName
        })
        cloudfrontDistributionInfo.node.addDependency(cloudfrontDistribution);

        const aliasRecord = new route53.ARecord(this, `${stackName}-alias-record`, {
            zone: hostedZone,
            recordName: SUB_DOMAIN,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(cloudfrontDistributionInfo)),
        });
        aliasRecord.node.addDependency(cloudfrontDistribution)
    }
}