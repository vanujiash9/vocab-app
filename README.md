# IELTS Vocabulary OS — React + TypeScript + Supabase

Ứng dụng học từ vựng tone xanh dương–trắng với hai vai trò:

- **Teacher:** tạo/xóa khóa học, tạo bài học, chia sẻ mã, xem danh sách học viên.
- **Student:** tham gia khóa học bằng mã, lưu từ vựng, flashcard, quiz, deadline và tiến độ cá nhân.

## Kiến trúc backend hiện tại

### Backend chính của ứng dụng
Backend chính của web app là **Supabase**.

Web frontend hiện tại dùng Supabase cho:
- authentication
- database
- realtime/notifications
- edge functions

Nói ngắn gọn:
- **frontend chạy bình thường chỉ cần Supabase**
- **không cần FastAPI để web app hoạt động**

### Vai trò của FastAPI trong repo này
FastAPI trong repo này **không phải backend chính của ứng dụng**.
Nó chỉ là một **service phụ để test Swagger/OpenAI-compatible gateway**.

FastAPI được dùng cho các việc như:
- mở Swagger UI tại `/docs`
- gửi request thử tới gateway
- xem normalized response và raw upstream response
- debug nhanh kết nối gateway

Tức là:
- **Supabase = backend chính của app**
- **FastAPI = công cụ test/debug gateway**

---

## 1. Yêu cầu

- Node.js 20+
- pnpm hoặc npm
- Python 3.11+
- Một Supabase project

## 2. Thiết lập Supabase

1. Tạo project mới tại Supabase.
2. Mở **SQL Editor**.
3. Chạy toàn bộ file `supabase/schema.sql`.
4. Vào **Authentication > Providers > Email** và bật Email/Password.
5. Trong môi trường phát triển, bạn có thể tắt **Confirm email** để đăng ký xong đăng nhập ngay. Khi production nên bật xác nhận email.

## 3. Biến môi trường

Sao chép `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Điền:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

GATEWAY_BASE_URL=https://your-openai-compatible-gateway.example.com/v1
GATEWAY_API_KEY=YOUR_GATEWAY_API_KEY
GATEWAY_MODEL=cx/gpt-5.4-mini
GATEWAY_TIMEOUT_SECONDS=30
FASTAPI_CORS_ORIGINS=["http://localhost:4175"]
```

### Nhóm biến nào dùng cho cái gì?

#### Biến dùng cho web app chính
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Đây là hai biến quan trọng để frontend chạy với **Supabase backend chính**.

#### Biến chỉ dùng cho FastAPI test service
- `GATEWAY_BASE_URL`
- `GATEWAY_API_KEY`
- `GATEWAY_MODEL`
- `GATEWAY_TIMEOUT_SECONDS`
- `FASTAPI_CORS_ORIGINS`

Các biến này **không phải để frontend hoạt động bình thường**, mà chỉ dùng khi bạn muốn chạy FastAPI để test gateway qua Swagger.

## 4. Cài và chạy frontend

Đây là cách chạy **web app chính** với Supabase:

```bash
corepack enable
pnpm install
pnpm dev
```

Mở `http://localhost:4175`.

> Nếu mục tiêu của bạn là chạy ứng dụng học từ vựng bình thường, chỉ cần bước này + cấu hình Supabase đúng là đủ.

## 5. FastAPI Gateway Test Service

Phần này là **service phụ** để test OpenAI-compatible gateway qua Swagger.

### Khi nào cần chạy FastAPI?
Chỉ chạy FastAPI khi bạn muốn:
- test gateway bằng Swagger
- kiểm tra response từ gateway
- debug request/response ngoài luồng chính của app

Nếu bạn chỉ muốn chạy web app bình thường thì **không cần chạy FastAPI**.

### Cài dependency Python

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Chạy service

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Endpoint tối thiểu

- `GET /`
- `GET /api/health`
- `GET /api/models`
- `POST /api/chat`
- `POST /api/chat/raw`

### Swagger / OpenAPI

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

> Mở `/docs` là test được ngay, không cần thêm token FastAPI.

### Ví dụ request `/api/chat`

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain spaced repetition simply."
    }
  ],
  "temperature": 0.2,
  "max_tokens": 200,
  "response_format": {
    "type": "text"
  },
  "stream": false
}
```

### Ví dụ request `response_format: json_object`

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Return a JSON object with keys title and summary about spaced repetition."
    }
  ],
  "temperature": 0.2,
  "max_tokens": 200,
  "response_format": {
    "type": "json_object"
  },
  "stream": false
}
```

### Curl nhanh

#### Normalized

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Explain spaced repetition simply."}],
    "temperature": 0.2,
    "max_tokens": 200,
    "response_format": {"type": "text"},
    "stream": false
  }'
```

#### Raw upstream

```bash
curl -X POST http://localhost:8000/api/chat/raw \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Explain spaced repetition simply."}],
    "temperature": 0.2,
    "max_tokens": 200,
    "response_format": {"type": "text"},
    "stream": false
  }'
```

### Chạy test

```bash
pytest -q tests/test_gateway_api.py
```

Test hiện cover:
- `GET /api/health`
- `GET /api/models`
- `POST /api/chat/raw` với mock gateway

## 6. Chức năng frontend

- Đăng ký/đăng nhập email + mật khẩu.
- Chọn vai trò Teacher/Student.
- Flashcard, quiz, deadline, thông báo.
- Responsive desktop/mobile.

---

## Tóm tắt ngắn gọn

### Nếu bạn muốn chạy ứng dụng chính
Làm theo:
1. cấu hình Supabase
2. `pnpm dev`

### Nếu bạn muốn test gateway bằng Swagger
Làm thêm:
1. cấu hình `GATEWAY_*` trong `.env`
2. chạy FastAPI bằng `uvicorn`
3. mở `http://localhost:8000/docs`

**Supabase là backend chính. FastAPI chỉ là tool test Swagger.**