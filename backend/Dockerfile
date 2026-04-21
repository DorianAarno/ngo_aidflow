FROM python:3.12-slim

# Mirror the local directory structure so Path.parents[] resolves identically
# to local development: /aidflow/backend/app/main.py
WORKDIR /aidflow/backend

# Install dependencies (cached layer)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY backend/app/ ./app/

# Copy frontend so FastAPI can serve it as static files
# Ends up at /aidflow/frontend/ — matches Path(__file__).parents[2]/"frontend"
COPY frontend/ ../frontend/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
