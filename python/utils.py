import httplib
import hmac
import base64
from hashlib import sha1
from urllib import quote_plus, urlencode
import json


def send_ali(req_data):
    http_client = None
    query_string = urlencode(req_data)
    try:
        http_client = httplib.HTTPSConnection("alidns.aliyuncs.com", 443, timeout=30)
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": len(query_string),
        }
        http_client.request("POST", "/", body=query_string, headers=headers)
        response = http_client.getresponse()
        return response.status, json.loads(response.read()), response.reason
    except Exception, e:
        return -1, None, e
    finally:
        if http_client:
            http_client.close()


def cal_signature(param_dict, ali_sk):
    keys = param_dict.keys()
    keys.sort()
    data = []
    for item in keys:
        data.append("{}={}".format(item, param_dict.get(item)))
    to_encode = "POST&%2F&" + param_encode("&".join(data))
    encrypt_key = "{}&".format(ali_sk)
    hmac_code = hmac.new(encrypt_key.encode(), to_encode.encode(), sha1).digest()
    return base64.b64encode(hmac_code).decode()


def param_encode(data_str):
    return quote_plus(data_str).replace("%2A", "%252A").replace("%3A", "%253A")
