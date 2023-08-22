/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
const { web } = require('projen');
const project = new web.ReactTypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'front',
  deps: [
    '@cloudscape-design/collection-hooks',
    '@cloudscape-design/components',
    '@cloudscape-design/global-styles',
    'react-router-dom',
    'react-intl',
  ],
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();