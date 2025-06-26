# Habilitar o firewall
ufw enable

# Permitir todo acesso na porta 80
ufw allow 80

# Negar acesso de um host específico na porta 80
ufw deny from 192.173.0.3 to any port 80

# Exibir status/lista das regras
ufw status numbered

# Deletar regra especifica
ufw delete 1

# Desabilitar / Resetar regras
ufw disable
ufw reset

