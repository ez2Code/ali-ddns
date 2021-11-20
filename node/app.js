'use strict';

const calc = require('./calc');
const conf = require('./conf');
const https = require('https');

let recordId = '';
const aliAccessKeyId = conf.ali.key;
const aliAccessKeySecret = conf.ali.secret;
const RR = conf.ali.RR;
const domain = conf.ali.domain;


function getRecordId() {
    let contents = {
        Format: 'JSON',
        Version: '2015-01-09',
        AccessKeyId: aliAccessKeyId,
        Timestamp: calc.getDate(),
        SignatureMethod: 'HMAC-SHA1',
        SignatureVersion: '1.0',
        SignatureNonce: Math.floor(Math.random() * 10000)
    };
    contents['Action'] = 'DescribeDomainRecords';
    contents['DomainName'] = domain;
    contents['Signature'] = calc.getSignature(contents, aliAccessKeySecret);
    return calc.sendRequest(contents).then(data => {
        let obj = JSON.parse(data);
        let records = obj['DomainRecords']['Record'];
        for (let item of records) {
            if (item['RR'] === RR) {
                recordId = item['RecordId'];
                calc.writeFileAsync('record-cache.txt', recordId);
                break;
            }
        }
    });
}

async function modifyDNS(ip) {
    await calc.readFileAsync('record-cache.txt').then(async function (v) {
        if (v) {
            recordId = v;
        } else {
            await getRecordId();
        }
    });
    const contents = {
        Format: 'JSON',
        Version: '2015-01-09',
        AccessKeyId: aliAccessKeyId,
        Timestamp: calc.getDate(),
        SignatureMethod: 'HMAC-SHA1',
        SignatureVersion: '1.0',
        SignatureNonce: Math.floor(Math.random() * 10000),
    };
    contents.Action = 'UpdateDomainRecord';
    contents.RecordId = recordId;
    contents.RR = RR;
    contents.Type = 'A';
    contents.Value = ip;
    contents.Signature = calc.getSignature(contents, aliAccessKeySecret);
    return calc.sendRequest(contents);
}

function getCurrentIp() {
    return new Promise(function (resolve) {
        const options = {
            host: conf.whoami.domain,
            path: conf.whoami.path,
            method: 'GET',
        };
        const req = https.request(options, function (res) {
            res.setEncoding('utf8');
            let response = '';
            res.on('data', function (data) {
                response += data;
            });
            res.on('end', function () {
                const reg = /\d+\.\d+\.\d+\.\d+/g;
                resolve(response.match(reg)[0]);
            });
        });
        req.end();
    });
}

function compareIp() {
    calc.readFileAsync('ip-cache.txt').then(async function (v) {
        let currentIp = await getCurrentIp();
        if (v !== currentIp) {
            modifyDNS(currentIp).then(res => {
                let data = JSON.parse(res);
                if (!!data["RequestId"]) {
                    calc.writeFileAsync('ip-cache.txt', currentIp);
                }
            }).catch(err => {
                console.log("modify dns fail")
            });
        }
    })
}

compareIp();
