'use strict';

const fs = require('fs');
const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');
const path = require('path');


let readFileAsync = function (file_name) {
    let name = path.join(__dirname, file_name);
    return new Promise(function (resolve, reject) {
        fs.readFile(name, (err, data) => {
            if (err) {
                resolve(null);
            } else {
                resolve(data.toString());
            }
        });
    })
};

let writeFileAsync = function (file_name, content) {
    let name = path.join(__dirname, file_name);
    fs.writeFile(name, content, 'utf8', err => {
        if (err) throw err;
        console.log('done');
    });
};

let getDate = function () {
    const date = new Date();
    const dateStr = date.toISOString();
    return dateStr.replace(/\.\d+/g, '');
};


let paramEncode = function (param) {
    return encodeURIComponent(param).replace(/\+/g, '%20').replace(/\*/g, '%252A')
        .replace(/%7E/g, '~')
        .replace(/%3A/g, '%253A');
};

let getSignature = function (param, secret) {
    const keySet = [];
    for (let key of Object.keys(param)) {
        keySet.push(key);
    }
    keySet.sort();
    const content = [];
    for (let key of keySet) {
        content.push(key + '=' + param[key]);
    }
    const paramStr = 'POST&%2F&' + paramEncode(content.join('&'));
    const key = secret + '&';
    const Signature = crypto.createHmac('sha1', key);
    Signature.update(paramStr);
    return Signature.digest().toString('base64');
};

let sendRequest = function (param) {
    return new Promise(function (resolve) {
        const contents = querystring.stringify(param);
        const options = {
            host: 'alidns.aliyuncs.com',
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': contents.length,
            },
        };
        const req = https.request(options, function (res) {
            res.setEncoding('utf8');
            let response = '';
            res.on('data', function (data) {
                response += data;
            });
            res.on('end', function () {
                resolve(response);
            });
        });
        req.write(contents);
        req.end();
    })
};


exports.writeFileAsync = writeFileAsync;
exports.readFileAsync = readFileAsync;
exports.getSignature = getSignature;
exports.sendRequest = sendRequest;
exports.getDate = getDate;
