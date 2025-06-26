FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y ufw nginx links iputils-ping net-tools netcat telnet dnsutils && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE 80

# Rodar nginx em primeiro plano (modo "daemon off")
CMD ["nginx", "-g", "daemon off;"]