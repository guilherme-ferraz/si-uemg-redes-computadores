FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y iputils-ping net-tools netcat telnet dnsutils && \
    apt-get clean

# Mantém o container ativo
CMD ["tail", "-f", "/dev/null"]