/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import {APIGatewayProxyEventV2, APIGatewayProxyHandlerV2} from "aws-lambda";
import {
    DeleteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    QueryInput,
    ScanCommand,
    ScanInput,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {randomUUID} from "crypto";

const {marshall, unmarshall} = require("@aws-sdk/util-dynamodb");

export interface Book {
    id?: string;
    author: string;
    name: string;
    releaseDate: Date;
}

const tableName = process.env.TABLE_NAME!;
const ddbClient = new DynamoDBClient({
    region: process.env.AWS_REGION
})

// Return a successful JSON response
function success(body: any) {
    return {
        statusCode: 200,
        body: JSON.stringify(body),
    }
}

// Returns a failed response
function error(statusCode: number, message: string) {
    return {
        statusCode: statusCode,
        body: JSON.stringify({message: message}),
    }
}

/**
 * Get one book by id
 */
const getBook = async function (bookId: string): Promise<Book | undefined> {
    const bookResult = await ddbClient.send(new GetItemCommand({
        TableName: tableName,
        Key: {
            "id": marshall(bookId)
        }
    }));
    if (bookResult.Item) {
        return unmarshall(bookResult.Item);
    }
    return undefined;
}

/**
 * Fetches all books for the given author
 * @param author
 */
const getBooksFromAuthor = async function (author: string): Promise<Book[]> {
    const query: QueryInput = {
        TableName: tableName,
        IndexName: 'author',
        KeyConditionExpression: "author = :author",
        ExpressionAttributeValues: {
            ":author": {S: author},
        },
    }

    const booksResult = await ddbClient.send(new QueryCommand(query));

    const books: Book[] = [];
    if (booksResult.Items) {
        booksResult.Items.forEach((book) => books.push(unmarshall(book)));
    }

    return books;
}

const getAllBooks = async function (): Promise<Book[]> {
    const query: ScanInput = {
        TableName: tableName,
        // TODO: add limit
    }

    const booksResult = await ddbClient.send(new ScanCommand(query));

    const books: Book[] = [];
    if (booksResult.Items) {
        booksResult.Items.forEach((book) => books.push(unmarshall(book)));
    }

    return books;
}

/**
 * Creates a new book.
 * @param book the book to insert
 * @return the book with the generated id
 */
const createBook = async function (book: Book): Promise<Book> {
    const newBook = {
        ...book,
        id: randomUUID(),
    }

    await ddbClient.send(new PutItemCommand({
        TableName: tableName,
        Item: marshall(newBook)
    }));

    return newBook;
}

/**
 * Deletes a book
 * @param bookId
 */
const deleteBook = async function (bookId: string): Promise<boolean> {
    try {
        await ddbClient.send(new DeleteItemCommand({
            TableName: tableName,
            Key: {
                "id": marshall(bookId)
            }
        }));
    } catch (e) {
        console.error(e);
        return false;
    }

    return true;
}

/**
 * Update the book information
 * @param book
 */
const updateBook = async function (book: Book): Promise<Book> {
    await ddbClient.send(new UpdateItemCommand({
        TableName: tableName,
        Key: {
            "id": marshall(book.id)
        },
        UpdateExpression: "set #name=:name, #author=:author, #releaseDate=:releaseDate",
        ExpressionAttributeNames: {
            "#name": "name",
            "#author": "author",
            "#releaseDate": "releaseDate"
        },
        ExpressionAttributeValues: {
            ":name": marshall(book.name),
            ":author": marshall(book.author),
            ":releaseDate": marshall(book.releaseDate)
        }
    }));

    return book;
}

export const getBookHandler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
    console.log(JSON.stringify(event));
    const bookId = event.rawPath.substring(1);
    let book = await getBook(bookId);
    if (book)
        return success(book);
    else
        return error(404, `Book ${bookId} not found`);
}

export const getBooksHandler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
    console.log(JSON.stringify(event));
    const author = event.queryStringParameters ? event.queryStringParameters.author : undefined;
    let books: Book[];
    if (author) {
        books = await getBooksFromAuthor(author);
    } else {
        books = await getAllBooks();
    }
    return success(books);
}

export const createBookHandler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
    console.log(JSON.stringify(event));
    let book: Book = JSON.parse(event.body!);
    book = await createBook(book);
    return success(book)
}

export const deleteBookHandler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
    console.log(JSON.stringify(event));
    // CORS preflight (only for PUT and DELETE that are not "simple" methods)
    if (event.requestContext.http.method == 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Methods": "DELETE"
            }
        }
    }
    const bookId = event.rawPath.substring(1);
    if (await deleteBook(bookId)) {
        return success({})
    } else {
        return error(400, "Couldn't delete")
    }
}

export const updateBookHandler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
    console.log(JSON.stringify(event));
    // CORS preflight (only for PUT and DELETE that are not "simple" methods)
    if (event.requestContext.http.method == 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Methods": "PUT"
            }
        }
    }
    const bookId = event.rawPath.substring(1);
    const book: Book = JSON.parse(event.body!);

    // Sanity check
    if (bookId !== book.id) {
        return error(400, "Two different book IDs given!")
    }

    const updatedBook = await updateBook(book);

    return success(updatedBook);
}
