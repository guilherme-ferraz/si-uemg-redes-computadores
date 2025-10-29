from flask import Flask, request, render_template_string
import csv, datetime, subprocess, os

LOGFILE = "/var/log/captive/accepts.csv"
os.makedirs("/var/log/captive", exist_ok=True)

app = Flask(__name__)
HTML = """
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laboratório de Redes</title>
  <style>
    /* Reset básico */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }

    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      background: #fff;
      padding: 30px 25px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }

    h2 {
      color: #333;
      margin-bottom: 15px;
    }

    p {
      color: #555;
      margin-bottom: 25px;
      font-size: 0.95rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
      align-items: flex-start;
    }

    label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
      cursor: pointer;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    button {
      align-self: center;
      padding: 10px 25px;
      font-size: 1rem;
      color: #fff;
      background: #007bff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.3s ease;
    }

    button:hover {
      background: #0056b3;
    }

    @media (max-width: 480px) {
      .container {
        padding: 20px;
      }

      h2 {
        font-size: 1.2rem;
      }

      p, label {
        font-size: 0.9rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Laboratório de Redes — Aviso</h2>
    <p>Esta é uma rede de laboratório. Clique em aceitar para registrar seu consentimento (IP, MAC no segmento e user-agent).</p>
    <form method="post" action="/accept">
      <label>
        <input type="checkbox" name="consent" required>
        Concordo
      </label>
      <button type="submit">Aceitar</button>
    </form>
  </div>
</body>
</html>
"""

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

@app.route("/")
def index():
    return HTML

@app.route("/accept", methods=["POST"])
def accept():
    ip = request.remote_addr or ""
    mac = get_mac(ip)
    ua = request.headers.get("User-Agent","")
    log(ip, mac, ua)
    return "<h3>Consentimento registrado. Obrigado.</h3>"
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
