# Celery 워커. 로컬 Compose와 같이 api 패키지를 PYTHONPATH로 공유한다. 비밀은 이미지에 넣지 않는다.
# 베이스는 공식 멀티아키. linux/amd64를 굽지 않는다.
FROM python:3.12-slim

WORKDIR /opt/worker

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/opt/api:/opt/worker

COPY apps/worker/requirements.txt /opt/worker/requirements.txt
RUN pip install --no-cache-dir -r /opt/worker/requirements.txt

COPY apps/api /opt/api
COPY apps/worker /opt/worker

# 동시성은 런타임 CELERY_CONCURRENCY만 사용한다. 기본 1은 TECH_STACK과 같다.
CMD ["sh", "-c", "exec celery -A worker.app worker --loglevel=INFO --concurrency=${CELERY_CONCURRENCY:-1}"]
