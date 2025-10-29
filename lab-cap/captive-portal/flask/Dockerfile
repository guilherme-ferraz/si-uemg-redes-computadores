FROM python:3.11-slim
WORKDIR /app
COPY captive.py /app/captive.py
RUN pip install --no-cache-dir flask
VOLUME ["/var/log/captive"]
EXPOSE 80
CMD ["python", "captive.py"]
