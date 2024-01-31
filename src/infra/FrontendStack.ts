/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import {CfnOutput, DockerImage, Fn, RemovalPolicy, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import * as childProcess from "child_process";
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment";
import * as fsExtra from "fs-extra";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import {
    AddBehaviorOptions,
    AllowedMethods,
    CachePolicy,
    Distribution,
    LambdaEdgeEventType,
    OriginAccessIdentity,
    OriginRequestPolicy,
    ResponseHeadersPolicy,
    ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import {BlockPublicAccess, Bucket, BucketAccessControl, ObjectOwnership} from "aws-cdk-lib/aws-s3";
import {HttpOrigin, S3Origin} from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path";
import {Code, Runtime} from "aws-cdk-lib/aws-lambda";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {StringParameter} from "aws-cdk-lib/aws-ssm";

export class FrontendStack extends Stack {
    public readonly distribution: Distribution;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const getBookUrl = this.getParameter('/books/GetBookUrl');
        const getBooksUrl = this.getParameter('/books/GetBooksUrl');
        const createBookUrl = this.getParameter('/books/CreateBookUrl');
        const updateBookUrl = this.getParameter('/books/UpdateBookUrl');
        const deleteBookUrl = this.getParameter('/books/DeleteBookUrl');
        const getBookArn = this.getParameter('/books/GetBookArn');
        const getBooksArn = this.getParameter('/books/GetBooksArn');
        const createBookArn = this.getParameter('/books/CreateBookArn');
        const updateBookArn = this.getParameter('/books/UpdateBookArn');
        const deleteBookArn = this.getParameter('/books/DeleteBookArn');

        const authFunction = new cloudfront.experimental.EdgeFunction(this, 'AuthFunctionAtEdge', {
            handler: 'auth.handler',
            runtime: Runtime.NODEJS_18_X,
            code: Code.fromAsset(path.join(__dirname, '../functions/auth')),
        });
        authFunction.addToRolePolicy(new PolicyStatement({
            sid: 'AllowInvokeFunctionUrl',
            effect: Effect.ALLOW,
            actions: ['lambda:InvokeFunctionUrl'],
            resources: [getBookArn, getBooksArn, createBookArn, updateBookArn, deleteBookArn],
            conditions: {
                "StringEquals": {"lambda:FunctionUrlAuthType": "AWS_IAM"}
            }
        }));

        const accessLogsBucket = new Bucket(this, 'AccessLogsBucket', {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            accessControl: BucketAccessControl.PRIVATE,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
            enforceSSL: true
        })
        const frontendS3Bucket = new Bucket(this, 'FrontendBucket', {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            serverAccessLogsBucket: accessLogsBucket,
            serverAccessLogsPrefix: 'FrontS3AccessLogs',
        })

        const oai = new OriginAccessIdentity(this, 'OAI');
        frontendS3Bucket.grantRead(oai);

        this.distribution = new Distribution(this, 'FrontendDistribution', {
            comment: 'Books Distribution',
            defaultBehavior: {
                origin: new S3Origin(frontendS3Bucket, {
                    originAccessIdentity: oai,
                }),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            },
            errorResponses: [
                {httpStatus: 404, responsePagePath: '/', responseHttpStatus: 200},
            ],
            defaultRootObject: 'index.html',
            enableLogging: true,
            logBucket: accessLogsBucket,
            // certificate: specify a custom certificate (from ACM)
        });

        const commonBehaviorOptions: AddBehaviorOptions = {
            viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
            cachePolicy: CachePolicy.CACHING_DISABLED,
            originRequestPolicy: OriginRequestPolicy.CORS_CUSTOM_ORIGIN,
            responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
        };
        const getBehaviorOptions: AddBehaviorOptions  = {
            ...commonBehaviorOptions,
            edgeLambdas: [{
                functionVersion: authFunction.currentVersion,
                eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
                includeBody: false, // GET, no body
            }],
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        }
        this.distribution.addBehavior('/getBook/*', new HttpOrigin(Fn.select(2, Fn.split('/', getBookUrl)),), getBehaviorOptions);
        this.distribution.addBehavior('/getBooks', new HttpOrigin(Fn.select(2, Fn.split('/', getBooksUrl)),), getBehaviorOptions);

        const notGetBehaviorOptions: AddBehaviorOptions  = {
            ...commonBehaviorOptions,
            edgeLambdas: [{
                functionVersion: authFunction.currentVersion,
                eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
                includeBody: true
            }],
            allowedMethods: AllowedMethods.ALLOW_ALL,
        };
        this.distribution.addBehavior('/createBook', new HttpOrigin(Fn.select(2, Fn.split('/', createBookUrl)),), notGetBehaviorOptions);
        this.distribution.addBehavior('/updateBook/*', new HttpOrigin(Fn.select(2, Fn.split('/', updateBookUrl)),), notGetBehaviorOptions);
        this.distribution.addBehavior('/deleteBook/*', new HttpOrigin(Fn.select(2, Fn.split('/', deleteBookUrl)),), notGetBehaviorOptions);

        const execOptions: childProcess.ExecSyncOptions = {stdio: 'inherit'};
        new BucketDeployment(this, 'FrontendAppDeploy', {
            retainOnDelete: true,
            sources: [
                Source.asset('src/front', {
                    bundling: {
                        image: DockerImage.fromRegistry('alpine'),
                        command: ['sh', '-c', 'echo "Docker build not supported. Please install esbuild."'],
                        local: {
                            tryBundle(outputDir: string) {
                                try {
                                    childProcess.execSync('esbuild --version', execOptions);
                                    childProcess.execSync('cd src/front/node_modules || (cd src/front && npm ci)', execOptions);
                                    childProcess.execSync('cd src/front && npm run build --passWithNoTests', execOptions);
                                    fsExtra.copySync('src/front/build', outputDir);
                                    return true;
                                } catch {
                                    return false;
                                }
                            },
                        },
                    },
                }),
            ],
            destinationBucket: frontendS3Bucket,
            distribution: this.distribution,
            distributionPaths: ['/*'],
            memoryLimit: 1024,
        });

        new CfnOutput(this, 'FrontendURL', {value: `https://${this.distribution.distributionDomainName}/`});
        new CfnOutput(this, 'CreateBookFunctionURL', {value: createBookUrl});
        new CfnOutput(this, 'GetBooksFunctionURL', {value: getBooksUrl});
        new CfnOutput(this, 'GetBookFunctionURL', {value: getBookUrl});
        new CfnOutput(this, 'UpdateBookFunctionURL', {value: updateBookUrl});
        new CfnOutput(this, 'DeleteBookFunctionURL', {value: deleteBookUrl});
        new CfnOutput(this, 'CreateBookURL', {value: `https://${this.distribution.distributionDomainName}/createBook`});
        new CfnOutput(this, 'GetBooksURL', {value: `https://${this.distribution.distributionDomainName}/getBooks`});
        new CfnOutput(this, 'GetBookURL', {value: `https://${this.distribution.distributionDomainName}/getBook/id`});
        new CfnOutput(this, 'UpdateBookURL', {value: `https://${this.distribution.distributionDomainName}/updateBook/id`});
        new CfnOutput(this, 'DeleteBookURL', {value: `https://${this.distribution.distributionDomainName}/deleteBook/id`});
    }

    private getParameter(parameter: string): string {
        return StringParameter.fromStringParameterName(this, parameter.toLowerCase().replace('/', '') + 'Parameter', parameter).stringValue
    }
}