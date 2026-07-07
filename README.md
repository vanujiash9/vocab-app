# Vocabulary OS

**Vocabulary OS** là ứng dụng học từ vựng cho **giáo viên** và **học viên**, xây dựng bằng **React + TypeScript + Vite + Supabase**.

Ứng dụng hỗ trợ:

- **Teacher**: tạo khóa học, tạo bài học, giao từ, quản lý học viên, nhập từ hàng loạt.
- **Student**: tham gia lớp bằng mã, lưu từ vựng, ôn flashcard, làm quiz, theo dõi deadline và tiến độ học tập.

Giao diện được tối ưu cho desktop và mobile, theo phong cách xanh dương – trắng.

---

## 1. Kiến trúc tổng quan

- **Frontend**: React 18 + TypeScript + Vite
- **Backend / Auth / Database**: Supabase
- **Routing**: React Router
- **UI icons**: lucide-react
- **Kiểm thử**: Vitest + Playwright

---

## 2. Môi trường sử dụng

### Local development
Dùng khi phát triển tính năng, debug, chạy test và kiểm tra UI cục bộ.

- Vite dev server
- Hot reload
- Kết nối tới Supabase project dev hoặc branch riêng

### Preview / Staging
Dùng để kiểm tra trước khi phát hành.

- Deploy từ branch
- Kiểm tra UI, phân quyền, luồng đăng nhập, dữ liệu thật hoặc dữ liệu staging
- Nên dùng Supabase branch hoặc project staging riêng

### Production
Dùng cho người dùng thật.

- Chỉ dùng cấu hình production
- Bật xác nhận email và chính sách bảo mật phù hợp
- Không dùng key local, key test hoặc dữ liệu thử nghiệm

---

## 3. Yêu cầu hệ thống

- Node.js **20+**
- pnpm (khuyến nghị) hoặc npm
- Một Supabase project
- Trình duyệt hiện đại cho development / preview / production

---

## 4. Thiết lập Supabase

1. Tạo project mới trong Supabase.
2. Mở **SQL Editor**.
3. Chạy toàn bộ file `supabase/schema.sql`.
4. Vào **Authentication > Providers > Email** và bật Email/Password.
5. Ở môi trường local/dev, có thể tắt **Confirm email** để đăng ký xong đăng nhập ngay.
6. Ở staging/production, nên bật xác nhận email và kiểm tra lại RLS/policy trước khi release.

> Người dùng hiện có thể chọn Teacher hoặc Student khi đăng ký. Nếu triển khai production công khai, nên cân nhắc luồng mời/duyệt cho Teacher để tránh tự nâng quyền.

---

## 5. Biến môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cấu hình:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Lấy các giá trị này trong **Project Settings > API**.

### Theo từng môi trường

- **Local**: dùng Supabase project dev hoặc branch riêng.
- **Preview / Staging**: đặt biến môi trường trên nền tảng deploy tương ứng.
- **Production**: dùng đúng key production, không dùng key dev.

> Chỉ các biến `VITE_*` an toàn mới được exposed ra client.
> Mọi secret server-side phải nằm ngoài repo và ngoài client bundle.
> Nếu một key từng xuất hiện trong file local như `supabase-secrets.env`, hãy coi key đó đã lộ và **rotate ngay** trước khi deploy.

App sẽ fail fast nếu thiếu `VITE_SUPABASE_URL` hoặc `VITE_SUPABASE_ANON_KEY`.

---

## 6. Cài đặt

```bash
corepack enable
pnpm install
```

---

## 7. Chạy ứng dụng

### Development

```bash
pnpm dev
```

Mở: `http://localhost:4180`

### Production preview

```bash
pnpm build
pnpm preview
```

Mở: `http://localhost:4175`

---

## 8. Kiểm thử

```bash
pnpm test:unit
pnpm test:e2e
pnpm build
```

Hoặc chạy toàn bộ:

```bash
pnpm test
```

---

## 9. Deploy lên Vercel

Repo đã có cấu hình tối thiểu cho Vercel qua `vercel.json`.

### Cấu hình khuyến nghị

- **Framework preset**: `Vite`
- **Build command**: `pnpm build`
- **Output directory**: `dist`
- **Root directory**: repo root

### Biến môi trường trên Vercel

Thiết lập cho cả **Preview** và **Production**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Mapping môi trường

- **Local** → Supabase dev branch hoặc project dev
- **Preview / Staging** → Supabase branch hoặc project staging
- **Production** → Supabase production project

---

## 10. Hardening trước khi release

- Rotate mọi key/API secret từng lộ trong local workspace.
- Bật leaked password protection trong Supabase Auth.
- Review lại quyền `SECURITY DEFINER` functions nếu có.
- Xác nhận `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` đã được set đúng cho môi trường deploy.
- Không đưa file secret local như `supabase-secrets.env` vào artifact deploy hoặc git workflow.
- Chạy lại `pnpm build`, `pnpm test:unit`, và `pnpm test:e2e` trước khi release.

---

## 11. Tính năng chính

- Đăng ký / đăng nhập bằng email + mật khẩu.
- Chọn vai trò Teacher / Student.
- Tự tạo profile qua trigger Supabase Auth.
- RLS bảo vệ dữ liệu theo tài khoản và vai trò.
- Teacher tạo khóa học, tạo bài học, chia sẻ mã, xem học viên.
- Student tham gia khóa học bằng mã RPC bảo mật.
- Từ điển cá nhân và phân loại New / Known / Difficult.
- Flashcard dùng dữ liệu thật trong bảng `vocabulary`.
- Quiz sinh từ thư viện và lưu kết quả.
- Deadline CRUD cơ bản.
- Profile và cài đặt mục tiêu học.
- Responsive cho desktop và mobile.

---

## 12. Ghi chú về từ điển

Hiện tại ứng dụng lưu từ và dữ liệu người dùng thật trên Supabase. Phần nghĩa tự động đang là placeholder vì chưa nối API từ điển cụ thể.

Nếu cần, bạn có thể tích hợp Cambridge, Oxford hoặc provider khác trong `src/services/data.ts`, hàm `addVocabulary`.

---

## 13. Cấu trúc chính

```text
src/
├── components/
├── contexts/
├── features/
├── pages/
├── services/
└── index.css

supabase/
├── schema.sql
└── migrations/
```
