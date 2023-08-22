/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import { CfnOutput, Duration, Names, NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import {Construct} from "constructs";
import {NodejsFunction, NodejsFunctionProps} from "aws-cdk-lib/aws-lambda-nodejs";
import {FunctionUrl, FunctionUrlAuthType, HttpMethod, Runtime, Tracing} from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from "aws-cdk-lib/custom-resources";

export class BackendStack extends NestedStack {

    public readonly getBooksUrl: FunctionUrl;
    public readonly createBookUrl: FunctionUrl;
    public readonly updateBookUrl: FunctionUrl;
    public readonly deleteBookUrl: FunctionUrl;
    public readonly getBookUrl: FunctionUrl;

    constructor(scope: Construct, id: string, props?: NestedStackProps) {
        super(scope, id, props);

        const bookTable = this.initializeBookTable();

        const functionConfiguration: NodejsFunctionProps = {
            runtime: Runtime.NODEJS_18_X,
            memorySize: 512,
            timeout: Duration.seconds(30),
            entry: path.join(__dirname, '../functions/books/books.ts'),
            tracing: Tracing.ACTIVE,
            environment: {
                TABLE_NAME: bookTable.tableName
            },
            bundling: {
                // minify: true,
                target: 'es2020',
            },
        }
        this.getBookUrl = this.initializeGetBookFunction(functionConfiguration, bookTable);
        this.getBooksUrl = this.initializeGetBooksFunction(functionConfiguration, bookTable);
        this.createBookUrl = this.initializeCreateBookFunction(functionConfiguration, bookTable);
        this.updateBookUrl = this.initializeUpdateBookFunction(functionConfiguration, bookTable);
        this.deleteBookUrl = this.initializeDeleteBookFunction(functionConfiguration, bookTable);
    }

    private initializeBookTable(): Table {
        const bookTable = new Table(this, 'BooksTable', {
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                type: AttributeType.STRING,
                name: 'id'
            },
            removalPolicy: RemovalPolicy.DESTROY,
            pointInTimeRecovery: true
        });
        bookTable.addGlobalSecondaryIndex({
            indexName: 'author',
            partitionKey: {
                type: AttributeType.STRING,
                name: 'author'
            },
            sortKey: {
                type: AttributeType.STRING,
                name: 'id'
            }
        });
        return bookTable;
    }

    /**
     *
     * @param functionConfiguration
     * @param bookTable
     * @private
     */
    private initializeGetBookFunction(functionConfiguration: NodejsFunctionProps, bookTable: Table): FunctionUrl {
        const getBookFunction = new NodejsFunction(this, 'GetBookFunction', {
            ...functionConfiguration,
            handler: 'getBookHandler',
            description: 'Retrieve a book with its id',
        });

        bookTable.grantReadData(getBookFunction);

        const getBookUrl = getBookFunction.addFunctionUrl({
            authType: FunctionUrlAuthType.AWS_IAM,
            cors: {
                allowedOrigins: ['*'],
                allowedMethods: [HttpMethod.GET],
                allowedHeaders: ['*'],
                allowCredentials: true,
            }
        });
        this.outputUrl(getBookUrl, 'GetBook');

        return getBookUrl;
    }

    /**
     *
     * @param functionConfiguration
     * @param bookTable
     * @private
     */
    private initializeGetBooksFunction(functionConfiguration: NodejsFunctionProps, bookTable: Table): FunctionUrl {
        const getBooksFunction = new NodejsFunction(this, 'GetBooksFunction', {
            ...functionConfiguration,
            handler: 'getBooksHandler',
            description: 'Retrieve all books from an author',
        });

        bookTable.grantReadData(getBooksFunction);

        const getBooksUrl = getBooksFunction.addFunctionUrl({
            authType: FunctionUrlAuthType.AWS_IAM,
            cors: {
                allowedOrigins: ['*'],
                allowedMethods: [HttpMethod.GET],
                allowedHeaders: ['*'],
                allowCredentials: true,
            }
        });

        this.outputUrl(getBooksUrl, 'GetBooks');

        return getBooksUrl;
    }

    /**
     *
     * @param functionConfiguration
     * @param bookTable
     * @private
     */
    private initializeCreateBookFunction(functionConfiguration: NodejsFunctionProps, bookTable: Table): FunctionUrl {
        const createBookFunction = new NodejsFunction(this, 'CreateBookFunction', {
            ...functionConfiguration,
            handler: 'createBookHandler',
            description: 'Create a new book',
        });

        bookTable.grantWriteData(createBookFunction);

        const createBookUrl = createBookFunction.addFunctionUrl({
            authType: FunctionUrlAuthType.AWS_IAM,
            cors: {
                allowedOrigins: ['*'],
                allowedMethods: [HttpMethod.POST],
                allowedHeaders: ['*'],
                maxAge: Duration.seconds(0),
                allowCredentials: true,
            }
        });

        this.outputUrl(createBookUrl, 'CreateBook');

        return createBookUrl;
    }

    /**
     *
     * @param functionConfiguration
     * @param bookTable
     * @private
     */
    private initializeUpdateBookFunction(functionConfiguration: NodejsFunctionProps, bookTable: Table): FunctionUrl {
        const updateBookFunction = new NodejsFunction(this, 'UpdateBookFunction', {
            ...functionConfiguration,
            handler: 'updateBookHandler',
            description: 'Update an existing book',
        });

        bookTable.grantWriteData(updateBookFunction);

        const updateBookUrl = updateBookFunction.addFunctionUrl({
            authType: FunctionUrlAuthType.AWS_IAM,
            cors: {
                allowedOrigins: ['*'],
                allowedMethods: [HttpMethod.PUT],
                allowedHeaders: ['*'],
                maxAge: Duration.seconds(0),
                allowCredentials: true,
            }
        });

        this.outputUrl(updateBookUrl, 'UpdateBook');

        return updateBookUrl;
    }

    /**
     *
     * @param functionConfiguration
     * @param bookTable
     * @private
     */
    private initializeDeleteBookFunction(functionConfiguration: NodejsFunctionProps, bookTable: Table): FunctionUrl {
        const deleteBookFunction = new NodejsFunction(this, 'DeleteBookFunction', {
            ...functionConfiguration,
            handler: 'deleteBookHandler',
            description: 'Delete a book',
        });

        bookTable.grantWriteData(deleteBookFunction);

        const deleteBookUrl = deleteBookFunction.addFunctionUrl({
            authType: FunctionUrlAuthType.AWS_IAM,
            cors: {
                allowedOrigins: ['*'],
                allowedMethods: [HttpMethod.DELETE],
                allowedHeaders: ['*'],
                maxAge: Duration.seconds(0),
                allowCredentials: true,
            }
        });

        this.outputUrl(deleteBookUrl, 'DeleteBook');

        return deleteBookUrl;
    }

    private outputUrl(functionUrl: FunctionUrl, name: string) {
        new CfnOutput(this, name, {
            value: functionUrl.url,
            description: name
        });

        this.writeParameter(`/books/${name}Url`, functionUrl.url, `URL for ${name} function`);
        this.writeParameter(`/books/${name}Arn`, functionUrl.functionArn, `ARN for ${name} function`);
    }

    /**
     * Using custom resource to be able to write to us-east-1
     * @param parameter
     * @param value
     * @param description
     * @private
     */
    private writeParameter(parameter: string, value: string, description: string) {
        new AwsCustomResource(this, parameter.replace('/', ''), {
            onUpdate: {
                service: "SSM",
                action: "putParameter",
                parameters: {
                    Name: parameter,
                    Value: value,
                    Type: 'String',
                    Description: description,
                    Overwrite: true
                },
                region: 'us-east-1', // will be needed by frontend (deployed in us-east-1)
                physicalResourceId: PhysicalResourceId.of(`parameter-${Date.now().toString()}`)
            },
            policy: AwsCustomResourcePolicy.fromSdkCalls({
                resources: [`arn:aws:ssm:us-east-1:${this.account}:parameter${parameter}`]
            }),
            functionName: 'WriteParameter-' + Names.uniqueResourceName(this, {}),
            installLatestAwsSdk: false
        });
    }
}