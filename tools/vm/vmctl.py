"""Talks to a running test VM (tools/vm/run-vm.ps1).

  python vmctl.py shot out.png              screenshot through QEMU's control socket
  python vmctl.py run "journalctl -b"       log in on the serial console and run a command
  python vmctl.py root "systemctl ..."      the same, as root (sudo -i)
  python vmctl.py log [seconds]             print what the serial console shows
  python vmctl.py key ret                   press a key (QEMU key names: ret, esc, up, x, q, m...)

The test account is in tools/vm/config.toml.
"""
import json
import pathlib
import re
import socket
import sys
import time

SERIAL = ("127.0.0.1", 4555)
QMP = ("127.0.0.1", 4556)
CONFIG = pathlib.Path(__file__).with_name("config.toml").read_text()
USER = re.search(r'name = "([^"]+)"', CONFIG).group(1)
PASSWORD = re.search(r'password = "([^"]+)"', CONFIG).group(1)


def qmp(*commands):
    with socket.create_connection(QMP, timeout=10) as s:
        f = s.makefile("rw")
        f.readline()
        for cmd in [{"execute": "qmp_capabilities"}, *commands]:
            f.write(json.dumps(cmd) + "\n")
            f.flush()
            while True:
                reply = json.loads(f.readline())
                if "return" in reply or "error" in reply:
                    if "error" in reply:
                        raise SystemExit(reply["error"]["desc"])
                    break
    return reply


def read_for(s, seconds, until=None):
    s.settimeout(0.3)
    out = b""
    end = time.time() + seconds
    while time.time() < end:
        try:
            chunk = s.recv(65536)
            if not chunk:
                break
            out += chunk
            if until and until in out:
                break
        except socket.timeout:
            pass
    return out.decode(errors="replace")


def run(command, wait=20, root=False):
    with socket.create_connection(SERIAL, timeout=10) as s:
        s.sendall(b"\r")
        seen = read_for(s, 3)
        if "login:" in seen:
            s.sendall(USER.encode() + b"\r")
            read_for(s, 3, b"Password:")
            s.sendall(PASSWORD.encode() + b"\r")
            # The login probes the terminal first and gives up after a few seconds without a reply.
            read_for(s, 30, b"$ ")
        if root:
            s.sendall(b"sudo -i\r")
            if "assword" in read_for(s, 10, b"assword"):
                # sudo flushes typed-ahead input when it turns echo off; let it get there first.
                time.sleep(1)
                s.sendall(PASSWORD.encode() + b"\r")
            read_for(s, 30, b"]# ")
        # Quoted in the command so the echoed input doesn't contain the marker itself.
        marker = "__VANTA_DONE__"
        s.sendall(f"{command}; echo __VANTA_''DONE__\r".encode())
        out = read_for(s, wait, marker.encode() + b"\r\n")
        if root:
            s.sendall(b"exit\r")
            read_for(s, 1)
        return out


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if len(sys.argv) < 2:
        print(__doc__)
        return
    what = sys.argv[1]
    if what == "shot":
        path = str(pathlib.Path(sys.argv[2]).resolve())
        qmp({"execute": "screendump", "arguments": {"filename": path, "format": "png"}})
        print(path)
    elif what in ("run", "root"):
        print(run(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 20, what == "root"))
    elif what == "log":
        with socket.create_connection(SERIAL, timeout=10) as s:
            print(read_for(s, int(sys.argv[2]) if len(sys.argv) > 2 else 5))
    elif what == "key":
        keys = [{"type": "qcode", "data": k} for k in sys.argv[2].split("+")]
        qmp({"execute": "send-key", "arguments": {"keys": keys}})
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
