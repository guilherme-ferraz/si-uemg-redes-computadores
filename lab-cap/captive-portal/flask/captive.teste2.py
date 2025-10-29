from flask import Flask, request, render_template_string, redirect, make_response
import csv, datetime, subprocess, os
import uuid

LOGFILE = "/var/log/captive/accepts.csv"
os.makedirs("/var/log/captive", exist_ok=True)

app = Flask(__name__)

HTML = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laboratório de Redes</title>
<style>
/* CSS simplificado para responsividade */
body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;margin:0;font-family:Arial,sans-serif}
.container{background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);max-width:400px;width:100%;text-align:center}
h2{margin-bottom:15px;color:#333} p{margin-bottom:25px;color:#555;font-size:0.95rem}
label{display:flex;align-items:center;gap:10px;font-size:0.95rem;cursor:pointer} input[type=checkbox]{width:18px;height:18px;cursor:pointer}
button{padding:10px 25px;font-size:1rem;color:#fff;background:#007bff;border:none;border-radius:8px;cursor:pointer;transition:0.3s} button:hover{background:#0056b3}
</style>
</head>
<body>
<div class="container">
<h2>Laboratório de Redes — Aviso</h2>
<p>Esta é uma rede de laboratório. Clique em aceitar para registrar seu consentimento (IP, MAC e user-agent).</p>
<form method="post" action="/accept">
<label><input type="checkbox" name="consent" required> Concordo</label><br>
<button type="submit">Aceitar</button>
</form>
</div>
</body>
</html>
"""

# Sessões temporárias
sessions = {}  # chave: IP ou token, valor: True se aceitou

def get_mac(ip):
    try:
        out = subprocess.check_output(["/bin/sh", "-c", f"ip neigh show {ip} || arp -n {ip}"], stderr=subprocess.DEVNULL)
        import re
        m = re.search(r"(([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2}))", out.decode(errors="ignore"))
        return m.group(1) if m else ""
    except:
        return ""

def log(ip, mac, ua):
    header = ["timestamp_utc","ip","mac","user_agent"]
    exists = os.path.exists(LOGFILE)
    with open(LOGFILE, "a") as f:
        writer = csv.writer(f)
        if not exists:
            writer.writerow(header)
        writer.writerow([datetime.datetime.utcnow().isoformat(), ip, mac, ua])

# Função para checar se o portal deve aparecer
def portal_required(ip, token):
    if token in sessions and sessions[token]:
        return False
    if ip in sessions and sessions[ip]:
        return False
    return True

# Página principal / portal
@app.route("/")
def index():
    ip = request.remote_addr or ""
    token = request.cookies.get("session_token","")
    if portal_required(ip, token):
        # Gera token temporário e seta cookie
        token = str(uuid.uuid4())
        resp = make_response(HTML)
        resp.set_cookie("session_token", token)
        sessions[token] = False
        return resp
    return "<h3>Portal já aceito</h3>"

# Captive-checks automáticos do sistema operacional
@app.route("/hotspot-detect.html")       # iOS
@app.route("/generate_204")              # Android
@app.route("/connecttest.txt")           # Windows
def captive_redirect():
    return redirect("/")

# Aceite do usuário
@app.route("/accept", methods=["POST"])
def accept():
    ip = request.remote_addr or ""
    ua = request.headers.get("User-Agent","")
    mac = get_mac(ip)

    # Marca token como aceito
    token = request.cookies.get("session_token","")
    if token:
        sessions[token] = True
    sessions[ip] = True  # marca IP como aceito também

    log(ip, mac, ua)
    return "<h3>Consentimento registrado. Obrigado.</h3>"

# Catch-all para qualquer requisição
@app.route("/<path:any_path>", methods=["GET","POST"])
def catch_all(any_path):
    return redirect("/")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
