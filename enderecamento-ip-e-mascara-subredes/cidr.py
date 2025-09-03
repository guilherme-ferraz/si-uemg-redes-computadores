import ipaddress

def calcular_subredes(rede_base_cidr, novo_prefixo):
    rede = ipaddress.IPv4Network(rede_base_cidr, strict=False)

    bits_rede = rede.prefixlen
    bits_novo = novo_prefixo

    if bits_novo < bits_rede:
        return "O novo prefixo precisa ser maior (ou igual) que o da rede original para fazer sub-redes."

    # Número de sub-redes possíveis
    subredes_possiveis = 2 ** (bits_novo - bits_rede)

    # Número de hosts por sub-rede
    bits_hosts_novos = 32 - bits_novo
    total_hosts = 2 ** bits_hosts_novos
    hosts_validos = total_hosts - 2

    return {
        "Rede base": rede_base_cidr,
        "Novo prefixo": f"/{novo_prefixo}",
        "Sub-redes possíveis": subredes_possiveis,
        "Hosts válidos por sub-rede": hosts_validos
    }

# Entrada do usuário
rede_base = input("Digite a rede base (ex: 10.0.0.0/16): ")
novo_prefixo = int(input("Digite o novo prefixo CIDR desejado (ex: 20): "))

resultado = calcular_subredes(rede_base, novo_prefixo)

print("\nResultado:")
if isinstance(resultado, str):
    print(resultado)
else:
    for chave, valor in resultado.items():
        print(f"{chave}: {valor}")
