"""Local-only bootstrap for the Desenhos Animados Blender bridge.
It intentionally does not run shell commands or accept render scripts yet.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import json
import secrets

HOST = "127.0.0.1"
PORT = 8765
TOKEN_FILE = Path(__file__).with_name("bridge-token.txt")


def get_token():
    if TOKEN_FILE.exists():
        token = TOKEN_FILE.read_text(encoding="utf-8").strip()
        if token:
            return token
    token = secrets.token_urlsafe(32)
    TOKEN_FILE.write_text(token, encoding="utf-8")
    return token


TOKEN = get_token()


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, value):
        data = json.dumps(value).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path != "/health":
            self.send_json(404, {"ok": False, "error": "not_found"})
            return
        supplied = self.headers.get("X-Bridge-Token", "")
        if not secrets.compare_digest(supplied, TOKEN):
            self.send_json(401, {"ok": False, "error": "unauthorized"})
            return
        self.send_json(200, {"ok": True, "service": "desenhos-animados-blender-bridge", "stage": "bootstrap"})

    def do_POST(self):
        self.send_json(404, {
            "ok": False,
            "error": "render_not_enabled",
            "message": "A fila de renderização ainda não foi integrada."
        })

    def log_message(self, fmt, *args):
        print("[Desenhos Bridge] " + (fmt % args))


if __name__ == "__main__":
    print("Conector local Desenhos Animados")
    print("Endereço: http://127.0.0.1:8765")
    print("Token local em:", TOKEN_FILE)
    print("Não compartilhe o token. Ctrl+C encerra.")
    HTTPServer((HOST, PORT), Handler).serve_forever()
