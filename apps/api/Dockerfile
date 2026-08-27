# FastAPI + Alembic 런타임. 비밀은 ARG/ENV/COPY로 굽지 않는다.
# 베이스는 공식 멀티아키. linux/amd64를 굽지 않는다. 로컬 AMD64와 EC2 arm64는 태그 해석에 맡긴다.
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY apps/api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY apps/api /app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
