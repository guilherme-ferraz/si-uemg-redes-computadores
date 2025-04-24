from flask import Flask, request
import csv
import os

app = Flask(__name__)
ARQUIVO = "dados.csv"

@app.route('/submit', methods=['POST'])
def submit():
    nome = request.form.get('nome')
    email = request.form.get('email')

    # Salvar no CSV
    if not os.path.exists(ARQUIVO):
        with open(ARQUIVO, mode='w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Nome', 'Email'])

    with open(ARQUIVO, mode='a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([nome, email])

    # Ler os dados e gerar HTML
    with open(ARQUIVO, newline='') as f:
        reader = csv.reader(f)
        linhas = list(reader)

    html = "<h2>Lista de Envios</h2><ul>"
    for i, linha in enumerate(linhas[1:], start=1):  # Ignorar cabeçalho
        html += f"<li>{i}. Nome: {linha[0]}, Email: {linha[1]}</li>"
    html += "</ul><a href='/'>Voltar</a>"
    return html
