#!/usr/bin/env node
/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import 'source-map-support/register';
import {App, Aspects} from 'aws-cdk-lib';
import {BookStack} from './BookStack';
import {AwsSolutionsChecks, NagSuppressions} from 'cdk-nag';

const app = new App();

const bookStack = new BookStack(app, 'BookStack');

Aspects.of(app).add(new AwsSolutionsChecks());

NagSuppressions.addStackSuppressions(bookStack, [
  {id: 'AwsSolutions-IAM4', appliesTo:['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'], reason: 'default AWSLambdaBasicExecutionRole'}
], true);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/frontend/AuthFunctionAtEdge/Fn/Resource',
[{ id: 'AwsSolutions-L1', reason: 'Lambda function is using javascript sdk v2, and nodejs 16 is faster than 18, which is important for edge function' }]
);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/frontend/FrontendDistribution/Resource',
    [{ id: 'AwsSolutions-CFR4', reason: 'The sample does not come with a certificate, documented that the user should use a custom certificate' }]
);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/frontend/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1024MiB',
    [
        { id: 'AwsSolutions-IAM5', reason: 'L3 construct with policies limited to the bucket only'},
        { id: 'AwsSolutions-L1', reason: 'No control on the runtime of the function created in this L3 construct'}
    ], true
);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/backend/GetBookFunction/ServiceRole/DefaultPolicy/Resource',
    [
      { id: 'AwsSolutions-IAM5', reason: 'Resource:* is for X-Ray, otherwise the function has readonly on a specific bucket ddb table: bookTable.grantReadData(getBookFunction)'}
    ]
);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/backend/GetBooksFunction/ServiceRole/DefaultPolicy/Resource',
    [
      { id: 'AwsSolutions-IAM5', reason: 'Resource:* is for X-Ray, otherwise the function has readonly on a specific bucket ddb table: bookTable.grantReadData(getBooksFunction)'}
    ]
);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/backend/CreateBookFunction/ServiceRole/DefaultPolicy/Resource',
    [
      { id: 'AwsSolutions-IAM5', reason: 'Resource:* is for X-Ray, otherwise the function has write access on a specific bucket ddb table: bookTable.grantWriteData(createBookFunction)'}
    ]
);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/backend/UpdateBookFunction/ServiceRole/DefaultPolicy/Resource',
    [
      { id: 'AwsSolutions-IAM5', reason: 'Resource:* is for X-Ray, otherwise the function has write on a specific bucket ddb table: bookTable.grantWriteData(updateBookFunction)'}
    ]
);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/backend/DeleteBookFunction/ServiceRole/DefaultPolicy/Resource',
    [
      { id: 'AwsSolutions-IAM5', reason: 'Resource:* is for X-Ray, otherwise the function has readonly on a specific bucket ddb table: bookTable.grantWriteData(deleteBookFunction)'}
    ]
);

NagSuppressions.addResourceSuppressionsByPath(bookStack, '/BookStack/backend/AWS679f53fac002430cb0da5b7982bd2287/Resource',
    [
      { id: 'AwsSolutions-L1', reason: 'AwsCustomResource, cannot change runtime version'}
    ]
);