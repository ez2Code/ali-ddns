from urllib import urlopen
import re
import os
import json

current_dir = os.path.dirname(__file__)

with open(os.path.join(current_dir, "config.json")) as conf_file:
    CONFIG = json.load(conf_file)


def request():
    for server in CONFIG["whoami_server"]:
        try:
            res = urlopen(server)
            my_ip = res.read().strip()
            if re.match(r"\d+\.\d+\.\d+\.\d+", my_ip):
                return my_ip
        except Exception:
            print("error occurs")
    raise Exception("fail to request my ip")
