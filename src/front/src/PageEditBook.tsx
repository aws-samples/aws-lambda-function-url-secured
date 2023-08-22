/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import {
  Button,
  Container,
  DatePicker,
  Form,
  FormField,
  Header,
  Input,
  SpaceBetween,
} from '@cloudscape-design/components';
import React, { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayoutContext } from './App';
import { Book } from './Book';

interface BookParam {
  bookId: string;
}

const PageEditBook: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const i18n = useIntl();
  const bookParam = location.state as BookParam;

  const [book, setBook] = useState<Book>({});
  const [title, setTitle] = useState<string>();
  // const [error, setError] = useState<any>([]);

  const { setAppLayoutProps } = useContext(AppLayoutContext);

  useEffect(() => {
    console.log(i18n.locale);
  });

  useEffect(() => {
    void (async () => {
      if (!bookParam) {
        setTitle('Create Book');
        return;
      }
      setTitle('Edit Book');
      const { bookId } = bookParam;
      const response = await fetch(
        `/getBook/${bookId}`,
      );
      const body = await response.json();
      console.log(JSON.stringify(body));
      setBook(body);
    })();
  }, [bookParam]);

  useEffect(() => {
    setAppLayoutProps({
      contentType: 'form',
      contentHeader: <Header>{title}</Header>,
    });
  }, [setAppLayoutProps]);

  async function createOrUpdateBook() {
    try {
      if (bookParam && bookParam.bookId) {
        console.log(`Update book ${JSON.stringify(book)}`);
        await fetch(`/updateBook/${bookParam.bookId}`, {
          method: 'PUT',
          body: JSON.stringify(book),
        });
      } else {
        console.log(`Create book ${JSON.stringify(book)}`);
        await fetch('/createBook', {
          method: 'POST',
          body: JSON.stringify(book),
        });
      }
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <form onSubmit={e => e.preventDefault()}>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button formAction="none" variant="link" onClick={() => navigate(-1)}>
                  Cancel
            </Button>
            <Button variant="primary" onClick={() => createOrUpdateBook()}>Submit</Button>
          </SpaceBetween>
        }
      >
        <Container>
          <SpaceBetween direction="vertical" size="l">
            <FormField label="Book Name">
              <Input value={book?.name || ''}
                onChange={(e) => setBook({ ...book, name: e.detail.value })}/>
            </FormField>
            <FormField label="Author">
              <Input value={book?.author || ''}
                onChange={(e) => setBook({ ...book, author: e.detail.value })}/>
            </FormField>
            <FormField label="Publication date">
              <DatePicker value={book?.releaseDate || ''} todayAriaLabel='Today'
                nextMonthAriaLabel='Next month' previousMonthAriaLabel='Previous month'
                locale={i18n.locale}
                onChange={(e) => setBook({ ...book, releaseDate: e.detail.value })}/>
            </FormField>
          </SpaceBetween>
        </Container>
      </Form>
    </form>
  );
};

export default PageEditBook;