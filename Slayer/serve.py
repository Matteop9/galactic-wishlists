"""Local dashboard server, stdlib only.

python serve.py            -> http://127.0.0.1:8765/
GET  /, /index.html, /report.json, /data/task_log.json   static files from this folder
POST /api/log   {"date","master","task","amount","minutes","xp","gp","note"}  -> appends to data/task_log.json
POST /api/run   {"objective": "ca"}  -> runs run.py, returns its log tail; the page then reloads report.json
"""
import json
import pathlib
import subprocess
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parent
LOG = ROOT / "data" / "task_log.json"
PORT = 8765
ALLOWED = {"/", "/index.html", "/report.json", "/data/task_log.json", "/data/task_rates.json", "/data/config.json"}


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def log_message(self, fmt, *args):
        sys.stdout.write(f"[serve] {fmt % args}\n")

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path not in ALLOWED:
            self.send_error(404)
            return
        if path == "/data/task_log.json" and not LOG.exists():
            return self._json([])
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def do_POST(self):
        if self.path == "/api/log":
            e = self._body()
            missing = [k for k in ("date", "master", "task", "minutes") if not e.get(k)]
            if missing:
                return self._json({"error": f"missing {missing}"}, 400)
            entries = json.loads(LOG.read_text(encoding="utf-8")) if LOG.exists() else []
            if e.get("_delete") is not None:
                i = int(e["_delete"])
                if 0 <= i < len(entries):
                    entries.pop(i)
            else:
                entries.append({k: e.get(k) for k in ("date", "master", "task", "amount", "minutes", "xp", "gp", "note")})
            LOG.write_text(json.dumps(entries, indent=1, ensure_ascii=False), encoding="utf-8")
            return self._json({"ok": True, "n": len(entries)})
        if self.path == "/api/run":
            obj = self._body().get("objective") or None
            cmd = [sys.executable, str(ROOT / "run.py")] + (["--objective", obj] if obj else [])
            r = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", timeout=600)
            tail = "\n".join((r.stdout + r.stderr).strip().splitlines()[-25:])
            return self._json({"ok": r.returncode == 0, "code": r.returncode, "log": tail})
        self.send_error(404)


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    url = f"http://127.0.0.1:{PORT}/"
    print(f"[serve] {url}  (Ctrl+C to stop)")
    if "--no-open" not in sys.argv:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
