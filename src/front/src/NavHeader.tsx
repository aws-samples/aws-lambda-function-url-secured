/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import { TopNavigation } from '@cloudscape-design/components';
import React from 'react';

/**
 * Defines the Navigation Header
 */
const NavHeader: React.FC = () => {

  return (
    <TopNavigation
      key={'header'}
      i18nStrings={{ overflowMenuTitleText: 'Header', overflowMenuTriggerText: 'Header' }}
      identity={{ title: 'Books', href: '', logo: { src: '/android-icon-192x192.png' } }}
    />
  );
};

export default NavHeader;
