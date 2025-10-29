from flask import Flask, request, render_template_string, redirect
import csv, datetime, subprocess, os

LOGFILE = "/var/log/captive/accepts.csv"
CONNFILE = "/var/log/captive/clients.csv"
os.makedirs("/var/log/captive", exist_ok=True)

app = Flask(__name__)

HTML = """<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laboratório de Redes</title>
  <style>
    * {margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
    body {display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;padding:20px;}
    .container {background:#fff;padding:40px 30px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.15);max-width:450px;width:100%;text-align:center;}
    h2 {color:#333;margin-bottom:20px;font-size:1.5rem;}
    p {color:#555;margin-bottom:30px;font-size:1rem;line-height:1.5;}
    form {display:flex;flex-direction:column;gap:20px;align-items:flex-start;}
    label {display:flex;align-items:center;gap:12px;font-size:1rem;cursor:pointer;}
    input[type="checkbox"] {width:22px;height:22px;cursor:pointer;}
    button {align-self:center;padding:14px 30px;font-size:1.1rem;color:#fff;background:#007bff;border:none;border-radius:10px;cursor:pointer;transition:background 0.3s ease;}
    button:hover {background:#0056b3;}
    @media(max-width:480px){.container{padding:35px 25px;}h2{font-size:1.7rem;}p,label{font-size:1.1rem;}input[type="checkbox"]{width:26px;height:26px;}button{width:100%;font-size:1.2rem;padding:16px;}}
  </style>
</head>
<body>
  <div class="container">
    <h2>Laboratório de Redes — Aviso</h2>
    <p>Esta é uma rede de laboratório. Clique em aceitar para registrar seu consentimento (IP, MAC no segmento e user-agent).</p>
    <form method="post" action="/accept">
      <label><input type="checkbox" name="consent" required> Concordo</label>
      <button type="submit">Aceitar</button>
    </form>
  </div>
</body>
</html>"""

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


def conn(ip, mac, ua):
    header = ["timestamp_utc","ip","mac","user_agent"]
    exists = os.path.exists(CONNFILE)
    with open(CONNFILE, "a") as f:
        writer = csv.writer(f)
        if not exists:
            writer.writerow(header)
        writer.writerow([datetime.datetime.utcnow().isoformat(), ip, mac, ua])


# Página principal
@app.route("/")
def index():
    return HTML

@app.route("/<path:any_path>", methods=["GET","POST"])
def catch_all(any_path):
    ip = request.remote_addr or ""
    mac = get_mac(ip)
    ua = request.headers.get("User-Agent","")
    conn(ip, mac, ua)
    return redirect("/")



# # Android: generate_204
# @app.route("/generate_204")
# def android_check():
#     # Retorna 200 (ou redirect) para forçar captive UI.
#     # Se retornar 204, o Android pensa que está conectado sem portal.
#     # return make_response(("", 204))
#     return redirect("http://connectivitycheck.gstatic.com/generate_204", code=302)

# # iOS: hotspot detect (retorna pequena página)
# @app.route("/hotspot-detect.html")
# def ios_check():
#     # Retorna conteúdo HTML simples (qualquer coisa diferente do esperado pelo iOS dispara a UI)
#     resp = make_response("<html><body>Rede com captive portal</body></html>")
#     resp.headers['Content-Type'] = 'text/html'
#     return resp

# Captive-checks automáticos do sistema operacional
@app.route("/hotspot-detect.html")       # iOS
@app.route("/generate_204")              # Android
@app.route("/connecttest.txt")           # Windows
def captive_redirect():
    # Redireciona para a página principal do portal
    ip = request.remote_addr or ""
    mac = get_mac(ip)
    ua = request.headers.get("User-Agent","")
    conn(ip, mac, ua)
  
    return redirect("/")

# Aceite do usuário
@app.route("/accept", methods=["POST"])
def accept():
    ip = request.remote_addr or ""
    mac = get_mac(ip)
    ua = request.headers.get("User-Agent","")
    log(ip, mac, ua)
    return "<h3>Consentimento registrado. Obrigado.</h3>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
