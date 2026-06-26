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
