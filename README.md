# Vocab App

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Gateway_Test-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?logo=python&logoColor=white)](https://www.python.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

Nền tảng học từ vựng tiếng Anh dành cho **giáo viên** và **học viên**, được xây dựng với **React + TypeScript + Vite** ở frontend, **Supabase** cho backend chính, và **FastAPI + Python** như một dịch vụ phụ trợ để kiểm thử OpenAI-compatible gateway qua Swagger.

---

## Table of Contents

- [1. Tổng quan](#1-tổng-quan)
- [2. Demo giao diện](#2-demo-giao-diện)
- [3. Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
- [4. Tính năng chính](#4-tính-năng-chính)
- [5. Công nghệ sử dụng](#5-công-nghệ-sử-dụng)
- [6. Ngôn ngữ sử dụng trong repository](#6-ngôn-ngữ-sử-dụng-trong-repository)
- [7. Cấu trúc thư mục chính](#7-cấu-trúc-thư-mục-chính)
- [8. Yêu cầu môi trường](#8-yêu-cầu-môi-trường)
- [9. Thiết lập Supabase](#9-thiết-lập-supabase)
- [10. Biến môi trường](#10-biến-môi-trường)
- [11. Cài đặt và chạy frontend](#11-cài-đặt-và-chạy-frontend)
- [12. Chạy FastAPI Gateway Test Service](#12-chạy-fastapi-gateway-test-service)
- [13. Ví dụ request cho FastAPI gateway service](#13-ví-dụ-request-cho-fastapi-gateway-service)
- [14. Chạy test](#14-chạy-test)
- [15. Routing chính của frontend](#15-routing-chính-của-frontend)
- [16. Deployment](#16-deployment)
- [17. Quy trình khởi động nhanh](#17-quy-trình-khởi-động-nhanh)
- [18. Ghi chú vận hành](#18-ghi-chú-vận-hành)
- [19. Contributing](#19-contributing)
- [20. Roadmap tài liệu](#20-roadmap-tài-liệu)
- [21. Tóm tắt ngắn](#21-tóm-tắt-ngắn)
- [22. License](#22-license)

---

## 1. Tổng quan

Vocab App hỗ trợ hai nhóm người dùng chính:

- **Teacher**
  - Tạo và quản lý lớp học
  - Giao từ vựng cho học viên
  - Import danh sách từ bằng Excel
  - Theo dõi danh sách học viên và tiến độ học tập
- **Student**
  - Tham gia lớp học
  - Tra cứu từ điển
  - Lưu từ vào thư viện cá nhân
  - Ôn tập bằng flashcard và quiz
  - Ghi chú đọc hiểu, theo dõi deadline và thông báo

Ứng dụng được tổ chức để phục vụ luồng học tập thực tế: **tra cứu → lưu từ → được giao bài → ôn tập → theo dõi tiến độ**.

---

## 2. Demo giao diện

> Dưới đây là các vị trí giữ chỗ để bạn chèn ảnh sau.

### Trang đăng nhập / đăng ký

<!-- IMAGE: Auth page screenshot -->

### Dashboard giáo viên

<!-- IMAGE: Teacher dashboard screenshot -->

### Dashboard học viên

<!-- IMAGE: Student dashboard screenshot -->

### Thư viện từ vựng / Assigned words

<!-- IMAGE: Library or assigned words screenshot -->

### Chế độ ôn tập Flashcard / Quiz

<!-- IMAGE: Review mode screenshot -->

### Dictionary / Reading notes / AI assistant

<!-- IMAGE: Study tools screenshot -->

---

## 3. Kiến trúc hệ thống

### Backend chính của ứng dụng

**Supabase là backend chính** của web app, chịu trách nhiệm cho:

- **Authentication**
- **Database**
- **Realtime / notifications**
- **Data access cho frontend**

Điều này có nghĩa là:

- Nếu bạn chỉ muốn chạy **ứng dụng web chính**, bạn chỉ cần cấu hình **Supabase**.
- **Không cần FastAPI** để frontend hoạt động bình thường.

### Vai trò của FastAPI trong repository này

**FastAPI không phải backend chính của sản phẩm.**

Nó được dùng như một **dịch vụ phụ trợ** để:

- mở **Swagger UI**
- kiểm thử **OpenAI-compatible gateway**
- xem response đã chuẩn hóa và response raw upstream
- debug nhanh request/response ngoài luồng chính của frontend

Tóm tắt:

- **Supabase = backend chính của ứng dụng**
- **FastAPI = công cụ test/debug gateway**

---

## 4. Tính năng chính

### Dành cho giáo viên

- Quản lý lớp học và học viên
- Giao từ vựng cho học viên
- Import từ vựng từ file Excel
- Xem thư viện lớp học
- Theo dõi danh sách học viên

### Dành cho học viên

- Đăng ký / đăng nhập bằng email
- Tra cứu từ điển
- Lưu vào thư viện cá nhân
- Xem từ được giao
- Ôn tập bằng **flashcard** và **quiz**
- Tạo **reading notes**
- Theo dõi **deadline** và **notifications**
- Sử dụng **AI assistant** hỗ trợ học tập

### Khả năng giao diện

- Responsive cho desktop và mobile
- Điều hướng theo role Teacher / Student
- Tổ chức route rõ ràng theo từng chức năng

---

## 5. Công nghệ sử dụng

### Frontend

- **React 18**
- **TypeScript**
- **Vite**
- **React Router DOM**
- **Lucide React**
- **Recharts**
- **XLSX**
- **CSS**

### Backend chính

- **Supabase**
  - Auth
  - Database
  - Realtime

### Dịch vụ phụ trợ kiểm thử gateway

- **Python 3.11+**
- **FastAPI**
- **Uvicorn**
- **HTTPX**
- **Pydantic / Pydantic Settings**

### Deployment / Tooling

- **Vercel** cho frontend deployment
- **pnpm** hoặc **npm** cho frontend package management
- **pytest** cho test phía Python service
- **SQL** cho schema Supabase

---

## 6. Ngôn ngữ sử dụng trong repository

Repository này hiện sử dụng đầy đủ các ngôn ngữ / định dạng sau:

- **TypeScript / TSX** — frontend application logic và UI
- **JavaScript ecosystem tooling** — Vite, package scripts, dependency runtime
- **Python** — FastAPI gateway test service
- **SQL** — schema cho Supabase
- **CSS** — styling giao diện
- **JSON** — cấu hình như `package.json`, `vercel.json`
- **Markdown** — tài liệu dự án
- **ENV** — cấu hình biến môi trường

---

## 7. Cấu trúc thư mục chính

```text
.
├── app/                    # FastAPI gateway test service
├── src/                    # Frontend React application
│   ├── components/         # Shared UI components
│   ├── contexts/           # React contexts (ví dụ auth)
│   ├── features/           # Feature modules
│   ├── pages/              # Route-level pages
│   ├── services/           # Data/service layer
│   └── types/              # Shared TypeScript types
├── supabase/
│   └── schema.sql          # Database schema
├── tests/                  # Python tests cho gateway service
├── .env.example            # Mẫu biến môi trường
├── package.json            # Frontend dependencies và scripts
├── requirements.txt        # Python dependencies
└── vercel.json             # Frontend deployment config
```

---

## 8. Yêu cầu môi trường

Để chạy đầy đủ repository, bạn cần:

- **Node.js 20+**
- **pnpm** hoặc **npm**
- **Python 3.11+**
- Một **Supabase project**

---

## 9. Thiết lập Supabase

1. Tạo một project mới trên Supabase.
2. Mở **SQL Editor**.
3. Chạy toàn bộ file [supabase/schema.sql](supabase/schema.sql).
4. Vào **Authentication > Providers > Email** và bật **Email/Password**.
5. Trong môi trường phát triển, bạn có thể tắt **Confirm email** để đăng ký xong đăng nhập ngay.
6. Trong production, nên bật xác nhận email để tăng độ an toàn.

---

## 10. Biến môi trường

Sao chép file mẫu:

```bash
cp .env.example .env
```

Nội dung mẫu hiện tại:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_BASE_PATH=/

GATEWAY_BASE_URL=https://your-openai-compatible-gateway.example.com/v1
GATEWAY_API_KEY=YOUR_GATEWAY_API_KEY
GATEWAY_MODEL=cx/gpt-5.4-mini
GATEWAY_TIMEOUT_SECONDS=30
FASTAPI_CORS_ORIGINS=["http://localhost:4175"]
```

### Biến dùng cho web app chính

Các biến sau là bắt buộc để frontend chạy với Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BASE_PATH`

### Biến chỉ dùng cho FastAPI gateway test service

Các biến sau chỉ cần khi bạn muốn chạy FastAPI để test gateway:

- `GATEWAY_BASE_URL`
- `GATEWAY_API_KEY`
- `GATEWAY_MODEL`
- `GATEWAY_TIMEOUT_SECONDS`
- `FASTAPI_CORS_ORIGINS`

### Lưu ý về `VITE_BASE_PATH`

- Deploy ở root domain: dùng `VITE_BASE_PATH=/`
- Deploy dưới subpath: đặt theo subpath tương ứng, ví dụ `VITE_BASE_PATH=/vocab-app/`

---

## 11. Cài đặt và chạy frontend

Đây là cách chạy **ứng dụng web chính**:

```bash
corepack enable
pnpm install
pnpm dev
```

Mặc định ứng dụng chạy tại:

```text
http://localhost:4175
```

### Build production

```bash
pnpm build
```

### Preview bản build

```bash
pnpm preview
```

---

## 12. Chạy FastAPI Gateway Test Service

Chỉ thực hiện phần này nếu bạn muốn:

- test gateway bằng Swagger UI
- kiểm tra normalized response
- kiểm tra raw upstream response
- debug request/response ngoài frontend

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

### Endpoint chính

- `GET /`
- `GET /api/health`
- `GET /api/models`
- `POST /api/chat`
- `POST /api/chat/raw`

### Swagger / OpenAPI

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

> Bạn có thể mở `/docs` để test trực tiếp service này.

---

## 13. Ví dụ request cho FastAPI gateway service

### `POST /api/chat`

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

### `POST /api/chat` với `json_object`

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

### Curl nhanh: normalized response

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

### Curl nhanh: raw upstream response

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

---

## 14. Chạy test

### Frontend

Hiện tại `package.json` mới cung cấp các script:

- `pnpm dev`
- `pnpm build`
- `pnpm preview`

### Python gateway service

Chạy test bằng:

```bash
pytest -q tests/test_gateway_api.py
```

Phần test hiện cover các endpoint như:

- `GET /api/health`
- `GET /api/models`
- `POST /api/chat/raw` với mock gateway

---

## 15. Routing chính của frontend

Một số route tiêu biểu trong ứng dụng:

- `/auth`
- `/dashboard`
- `/lookup`
- `/library`
- `/teacher/library`
- `/reading-notes`
- `/assigned-words`
- `/review`
- `/ai-assistant`
- `/deadlines`
- `/notifications`
- `/assign-words`
- `/import-excel`
- `/students`
- `/profile`
- `/settings`

Ứng dụng có cơ chế chặn route theo role cho **teacher** và **student**.

---

## 16. Deployment

### Deploy frontend lên Vercel

Repository đã có file [vercel.json](vercel.json) với cấu hình build và rewrite cho SPA.

Cấu hình hiện tại:

- build command: `pnpm build`
- output directory: `dist`
- SPA rewrites về `/`

### Khuyến nghị triển khai

- **Vercel / root domain**
  - dùng `VITE_BASE_PATH=/`
- **Deploy dưới subpath**
  - cấu hình `VITE_BASE_PATH` theo subpath thực tế

---

## 17. Quy trình khởi động nhanh

### Nếu bạn chỉ muốn chạy ứng dụng chính

1. Tạo project Supabase
2. Chạy [supabase/schema.sql](supabase/schema.sql)
3. Cấu hình `.env`
4. Chạy:

```bash
pnpm install
pnpm dev
```

### Nếu bạn muốn test gateway bằng Swagger

Làm thêm các bước sau:

1. Điền các biến `GATEWAY_*`
2. Tạo virtual environment Python
3. Cài `requirements.txt`
4. Chạy:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Mở:

```text
http://localhost:8000/docs
```

---

## 18. Ghi chú vận hành

- Frontend phụ thuộc vào **Supabase** để chạy đúng luồng auth và dữ liệu.
- FastAPI chỉ phục vụ mục đích **kiểm thử gateway**, không thay thế backend chính.
- Nếu bạn chia sẻ repository này công khai, hãy đảm bảo không commit secrets thực tế vào `.env`.

---

## 19. Contributing

Đóng góp được chào đón nếu bạn muốn cải thiện sản phẩm, tài liệu, hoặc trải nghiệm phát triển.

### Quy trình đề xuất

1. Fork repository
2. Tạo branch mới
3. Thực hiện thay đổi với phạm vi rõ ràng
4. Kiểm tra lại build / test liên quan
5. Mở Pull Request với mô tả đầy đủ

### Quy ước khuyến nghị

- Giữ thay đổi **nhỏ, tập trung, dễ review**
- Không commit secrets thật vào `.env`
- Cập nhật README hoặc docs nếu thay đổi ảnh hưởng đến setup / usage
- Nếu thay đổi schema hoặc luồng auth, mô tả rõ impact trong PR

### Mẫu luồng làm việc Git

```bash
git checkout -b feat/your-feature-name
pnpm install
pnpm build
pytest -q tests/test_gateway_api.py
```

### Nội dung nên có trong Pull Request

- Mục tiêu thay đổi
- Phạm vi ảnh hưởng
- Cách test thủ công / tự động
- Screenshot nếu thay đổi UI
- Ghi chú migration nếu có thay đổi Supabase schema

---

## 20. Roadmap tài liệu

Bạn có thể bổ sung thêm các phần sau để README hoàn thiện hơn nữa:

- sơ đồ kiến trúc tổng thể
- ảnh chụp từng màn hình chính
- bảng quyền hạn Teacher vs Student
- luồng dữ liệu giữa React ↔ Supabase ↔ FastAPI gateway
- hướng dẫn seed dữ liệu mẫu
- hướng dẫn deploy production đầy đủ

---

## 21. Tóm tắt ngắn

- **Web app chính** chạy bằng **React + TypeScript + Vite + Supabase**
- **FastAPI + Python** chỉ là **gateway test/debug service**
- Chỉ cần Supabase + frontend là đủ để chạy sản phẩm chính
- Có thể dùng FastAPI để kiểm thử OpenAI-compatible gateway qua Swagger

---

## 22. License

Hiện tại repository **chưa kèm file `LICENSE`**.

Nếu bạn dự định public dự án như một open-source project, nên thêm một license rõ ràng, ví dụ:

- **MIT License** — đơn giản, dễ dùng, phù hợp với đa số project cá nhân / demo
- **Apache-2.0** — phù hợp nếu bạn muốn có điều khoản rõ hơn về patent
- **GPL-3.0** — phù hợp nếu bạn muốn các bản phân phối lại cũng phải open-source

### Gợi ý thực tế

Nếu mục tiêu của bạn là:

- **portfolio / chia sẻ code / cho phép tái sử dụng dễ dàng** → chọn **MIT**
- **muốn quy định chặt hơn về sử dụng và phân phối** → cân nhắc **Apache-2.0** hoặc **GPL-3.0**

> Khi bạn chọn license, hãy thêm file `LICENSE` ở thư mục gốc và cập nhật lại mục này cho khớp với license thực tế.
