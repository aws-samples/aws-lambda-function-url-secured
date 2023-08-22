/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
const AWS = require('aws-sdk');

exports.handler = async event => {
    console.log("event=" + JSON.stringify(event));

    const request = event.Records[0].cf.request;
    let headers = request.headers;

    // remove the x-forwarded-for from the signature
    delete headers['x-forwarded-for'];

    if (!request.origin.hasOwnProperty('custom'))
        throw("Unexpected origin type. Expected 'custom'. Got: " + JSON.stringify(request.origin));

    // remove the "behaviour" path from the uri to send to Lambda
    // ex: /updateBook/1234 => /1234
    let uri = request.uri.substring(1);
    let urisplit = uri.split('/');
    urisplit.shift(); // remove the first part (getBooks, createBook, ...)
    uri = '/' + urisplit.join('/');
    request.uri =  uri;

    const host = request.headers['host'][0].value;
    const region = host.split(".")[2];
    const path = uri + (request.querystring ? '?'+ request.querystring : '');

    // build the request to sign
    const req = new AWS.HttpRequest(new AWS.Endpoint(`https://${host}${path}`), region);
    req.body = (request.body && request.body.data) ? Buffer.from(request.body.data, request.body.encoding) : undefined;
    req.method = request.method;
    for (const header of Object.values(headers)) {
        req.headers[header[0].key] = header[0].value;
    }
    console.log(JSON.stringify(req));

    // sign the request with Signature V4 and the credentials of the edge function itself
    // the edge function must have lambda:InvokeFunctionUrl permission for the target URL
    const signer = new AWS.Signers.V4(req, 'lambda', true);
    signer.addAuthorization(AWS.config.credentials, AWS.util.date.getDate());

    // reformat the headers for CloudFront
    for (const header in req.headers){
        request.headers[header.toLowerCase()] = [{
            key: header,
            value: req.headers[header].toString(),
        }];
    }
    console.log("signedRequest="+JSON.stringify(request));
    return request;
}
