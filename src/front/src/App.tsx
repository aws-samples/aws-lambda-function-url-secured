/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import AppLayout, { AppLayoutProps } from '@cloudscape-design/components/app-layout';
import React, { createContext, useCallback, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import NavHeader from './NavHeader';
import PageBooks from './PageBooks';
import PageEditBook from './PageEditBook';


/**
 * Context for updating/retrieving the AppLayout.
 */
export const AppLayoutContext = createContext({
  appLayoutProps: {},
  setAppLayoutProps: (_: AppLayoutProps) => {
  },
});

/**
 * Defines the App layout and contains logic for routing.
 */
const App: React.FC = () => {
  const [appLayoutProps, setAppLayoutProps] = useState<AppLayoutProps>({});

  const setAppLayoutPropsSafe = useCallback(
    (props: AppLayoutProps) => {
      JSON.stringify(appLayoutProps) !== JSON.stringify(props) && setAppLayoutProps(props);
    },
    [appLayoutProps],
  );

  return (
    <>
      <NavHeader/>
      <AppLayout
        navigationHide
        toolsHide
        content={
          <AppLayoutContext.Provider value={{ appLayoutProps, setAppLayoutProps: setAppLayoutPropsSafe }}>
            <Routes>
              {/* Define all your routes here */}
              <Route path="/" element={<PageBooks/>}/>
              <Route path="/books" element={<PageBooks/>}/>
              <Route path="/books/new" element={<PageEditBook/>}/>
              <Route path="/books/edit" element={<PageEditBook/>}/>
            </Routes>
          </AppLayoutContext.Provider>
        }
        {...appLayoutProps}
      />
    </>
  );
};

export default App;
