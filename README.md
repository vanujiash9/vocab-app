# IELTS Vocabulary OS — React + TypeScript + Supabase

Ứng dụng học từ vựng tone xanh dương–trắng với hai vai trò:

- **Teacher:** tạo/xóa khóa học, tạo bài học, chia sẻ mã, xem danh sách học viên.
- **Student:** tham gia khóa học bằng mã, lưu từ vựng, flashcard, quiz, deadline và tiến độ cá nhân.

## 1. Yêu cầu

- Node.js 20+
- pnpm hoặc npm
- Một Supabase project

## 2. Thiết lập Supabase

1. Tạo project mới tại Supabase.
2. Mở **SQL Editor**.
3. Chạy toàn bộ file `supabase/schema.sql`.
4. Vào **Authentication > Providers > Email** và bật Email/Password.
5. Trong môi trường phát triển, bạn có thể tắt **Confirm email** để đăng ký xong đăng nhập ngay. Khi production nên bật xác nhận email.

> Bản này cho phép người dùng chọn Teacher hoặc Student khi đăng ký. Với hệ thống production công khai, nên đổi luồng Teacher thành admin phê duyệt/invite để tránh người dùng tự nâng quyền.

## 3. Biến môi trường

Sao chép `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Điền:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Lấy hai giá trị này tại **Project Settings > API**.

> Chỉ đặt các biến `VITE_*` an toàn để lộ ở client. Mọi secret server-side hoặc API key riêng phải nằm ngoài Vite env client và ngoài repo.
> Nếu một key từng xuất hiện trong file local như `supabase-secrets.env`, hãy coi key đó đã lộ và **rotate ngay** trước khi deploy.

App sẽ fail fast nếu thiếu `VITE_SUPABASE_URL` hoặc `VITE_SUPABASE_ANON_KEY`, nên hãy cấu hình hai biến này đầy đủ cho môi trường Preview và Production.

## 3.1 Checklist hardening trước production

- Rotate mọi key/API secret từng lộ trong local workspace.
- Bật leaked password protection trong Supabase Auth.
- Review lại quyền `SECURITY DEFINER` functions nếu không muốn public/authenticated gọi trực tiếp.
- Xác nhận `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` đã được set ở môi trường deploy.
- Không đưa file secret local như `supabase-secrets.env` vào artifact deploy hoặc git workflow.
- Chạy lại `npm run build`, `npm run test:unit`, và `npm run test:e2e` trước khi release.

## 3.2 Cấu hình schema production

Ưu tiên áp dụng migration trong `supabase/migrations/` thay vì chỉnh tay lệch với repo. Chỉ dùng `supabase/schema.sql` để bootstrap môi trường mới hoàn toàn khi cần.

## 4. Cài và chạy

## 4. Cài và chạy

```bash
corepack enable
pnpm install
pnpm dev
```

Mở `http://localhost:4175`.

Build production:

```bash
pnpm build
pnpm preview
```

## 4.1 Deploy lên Vercel

Repo đã có cấu hình tối thiểu cho Vercel qua `vercel.json`.

Thiết lập project trên Vercel:

- Framework preset: `Vite`
- Build command: `pnpm build`
- Output directory: `dist`
- Root directory: repo root

Thiết lập biến môi trường cho Preview và Production:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nếu bạn deploy branch `feat/polish-teacher-student-import`, Vercel sẽ tạo preview deployment cho branch đó sau khi project được kết nối với GitHub repo.

## 5. Chức năng

- Đăng ký/đăng nhập email + mật khẩu.
- Chọn vai trò Teacher/Student.
- Profile tự tạo qua trigger Supabase Auth.
- RLS bảo vệ dữ liệu theo tài khoản và vai trò.
- Teacher tạo khóa học, tạo bài học, chia sẻ mã, xem học viên.
- Student tham gia khóa học bằng mã RPC bảo mật.
- Từ điển cá nhân và phân loại New/Known/Difficult.
- Flashcard dùng dữ liệu thật trong bảng `vocabulary`.
- Quiz sinh từ thư viện và lưu kết quả.
- Deadline CRUD cơ bản.
- Profile và cài đặt mục tiêu học.
- Responsive desktop/mobile.

## 6. Lưu ý về từ điển

Project lưu từ và dữ liệu người dùng thật trên Supabase. Phần nghĩa tự động hiện là placeholder vì chưa có API từ điển cụ thể. Bạn có thể nối Cambridge, Oxford hoặc provider khác trong `src/services/data.ts`, hàm `addVocabulary`.
