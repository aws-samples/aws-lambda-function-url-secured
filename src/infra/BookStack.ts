/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {BackendStack} from "./BackendStack";
import {FrontendStack} from "./FrontendStack";

export class BookStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const backend = new BackendStack(this, 'backend');

        const frontend = new FrontendStack(this, 'frontend', {
            env: {
                account: Stack.of(this).account,
                region: 'us-east-1' // deploy to us-east-1 for Lambda@Edge
            },
        });
        frontend.addDependency(backend);
    }
}
