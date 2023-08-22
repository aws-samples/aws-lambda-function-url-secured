/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import { useCollection } from '@cloudscape-design/collection-hooks';
import { Button, Header, Pagination, SpaceBetween, Table } from '@cloudscape-design/components';
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayoutContext } from './App';
import { Book } from './Book';

const PAGINATION_ARIA = {
  nextPageLabel: 'Next page',
  previousPageLabel: 'Previous page',
  pageLabel: (pageNumber: any) => `Page ${pageNumber} of all pages`,
};
const PageBooks: React.FC = () => {

  const navigate = useNavigate();
  const { setAppLayoutProps } = useContext(AppLayoutContext);
  const [books, setBooks] = useState<Book[]>();
  const [selectedBook, setSelectedBook] = useState<Book>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const {
    items,
    collectionProps,
    paginationProps,
  } = useCollection(books || [], {
    pagination: { pageSize: 20 },
    selection: {},
  });

  useEffect(() => {
    setAppLayoutProps({
      contentType: 'table',
      contentHeader: <Header></Header>,
    });
  }, [setAppLayoutProps]);

  async function loadBooks() {
    try {
      const response = await fetch(
        '/getBooks',
      );
      const body = await response.json();
      console.log(JSON.stringify(body));
      setBooks(body);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await loadBooks();
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (collectionProps.selectedItems && collectionProps.selectedItems.length > 0) {
        setSelectedBook(collectionProps.selectedItems[0]);
      } else {
        setSelectedBook(undefined);
      }
    })();
  }, [collectionProps.selectedItems]);

  async function deleteBook() {
    try {
      await fetch(`/deleteBook/${selectedBook?.id}`, {
        method: 'DELETE',
      });
      await loadBooks();
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <Table
      {...collectionProps}
      items={items}
      pagination={
        <Pagination {...paginationProps} ariaLabels={PAGINATION_ARIA}/>
      }
      columnDefinitions={[
        {
          id: 'name',
          header: 'Name',
          cell: (item) => item.name,
        },
        {
          id: 'author',
          header: 'Author',
          cell: (item) => item.author,
        },
        {
          id: 'date',
          header: 'Release Date',
          cell: (item) => item.releaseDate ? new Date(item.releaseDate).toLocaleDateString() : '',
        },
      ]}
      selectionType="single"
      loading={isLoading}
      header={<Header
        variant="awsui-h1-sticky"
        counter={books ? `(${books.length})` : '0'}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName={'remove'} children={'Delete'} variant={'normal'} disabled={!selectedBook}
              onClick={() => deleteBook()}/>
            <Button iconName={'edit'} children={'Edit'} variant={'normal'} disabled={!selectedBook}
              onClick={() => navigate('/books/edit', {
                state: {
                  bookId: selectedBook?.id,
                },
              })}/>
            <Button iconName={'add-plus'} children={'New Book'} variant={'primary'}
              onClick={() => navigate('/books/new')}/>
          </SpaceBetween>
        }
      >
            Books
      </Header>}
      empty={<Button iconName={'add-plus'} children={'Add book'} onClick={() => navigate('/books/new')}/>}
    />
  );
};

export default PageBooks;