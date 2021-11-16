import utils
import os
import json
import datetime
import math
import random
import whoami

current_dir = os.path.dirname(__file__)
rr_record_file = os.path.join(current_dir, "rr_record.txt")
ip_cache_file = os.path.join(current_dir, "ip_cache.txt")

with open(os.path.join(current_dir, "config.json")) as conf_file:
    CONFIG = json.load(conf_file)


def get_rr_record():
    if os.path.exists(rr_record_file):
        with open(rr_record_file) as f:
            content = f.read()
        if content:
            return content
    return search_rr_record_from_supplier()


def search_rr_record_from_supplier():
    params = get_common_param()
    params["Action"] = "DescribeDomainRecords"
    params["DomainName"] = CONFIG.get("target_domain")
    params["Signature"] = utils.cal_signature(params, CONFIG.get("ali_sk"))
    res = utils.send_ali(params)
    if res[0] != 200:
        raise Exception("query rr record response error:{}".format(res))
    for item in res[1]["DomainRecords"]["Record"]:
        if item.get("RR") != CONFIG.get("target_rr"):
            continue
        with open(rr_record_file, mode="w") as f:
            f.write(item.get("RecordId"))
            return item.get("RecordId")


def update_dns_record(new_ip, record_id):
    params = get_common_param()
    params["Action"] = "UpdateDomainRecord"
    params["RecordId"] = record_id
    params["RR"] = CONFIG.get("target_rr")
    params["Type"] = "A"
    params["Value"] = new_ip
    params["Signature"] = utils.cal_signature(params, CONFIG.get("ali_sk"))
    res = utils.send_ali(params)
    if res[0] != 200:
        if "already exist" not in res[1].get("Message", "").lower():
            raise Exception("modify dns record fail")


def get_common_param():
    return {
        "Format": "JSON",
        "Version": "2015-01-09",
        "AccessKeyId": CONFIG.get("ali_ak"),
        "Timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "SignatureMethod": "HMAC-SHA1",
        "SignatureVersion": "1.0",
        "SignatureNonce": int(math.floor(random.random() * 10000))
    }


def should_update_dns(new_ip):
    if not os.path.exists(ip_cache_file):
        return True
    with open(ip_cache_file) as f:
        if f.read().strip() == new_ip:
            return False
    return True


def update_ip_cache(new_ip):
    with open(ip_cache_file, mode="w") as f:
        f.write(new_ip)


if __name__ == '__main__':
    rr_record_id = get_rr_record()
    current_ip = whoami.request()
    if not should_update_dns(current_ip):
        print("no need to update dns record")
        exit(0)
    update_dns_record(current_ip, rr_record_id)
    print("update dns record success")
    update_ip_cache(current_ip)
