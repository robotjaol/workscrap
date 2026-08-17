# Career Pulse

Career Pulse adalah extension Manifest V3 untuk Chrome dan Edge. Extension memeriksa portal karier melalui API ATS atau HTML, menyimpan snapshot lokal, lalu mengirim lowongan baru ke Telegram.

## Fitur

* Greenhouse melalui Boards API
* Lever melalui Postings API
* Workday melalui endpoint CXS
* Taleo dan situs custom melalui selector CSS
* Polling acak per sumber
* Exponential backoff sampai 120 menit
* Snapshot maksimal 500 ID per sumber
* Riwayat 50 alert terakhir
* Peringatan selector setelah dua kegagalan

Pemeriksaan pertama membuat baseline tanpa mengirim semua lowongan lama. Browser harus tetap berjalan agar alarm dapat memeriksa sumber.

## Instalasi Chrome

1. Buka `chrome://extensions`.
2. Aktifkan Developer mode.
3. Pilih Load unpacked.
4. Pilih folder `extension` ini.
5. Buka halaman pengaturan Career Pulse.

Untuk Edge, gunakan `edge://extensions` dan langkah yang sama.

## Telegram

1. Buka BotFather di Telegram.
2. Jalankan `/newbot` dan simpan bot token.
3. Kirim satu pesan ke bot baru.
4. Buka `https://api.telegram.org/botTOKEN/getUpdates` dengan token yang sesuai.
5. Ambil nilai `message.chat.id` dari respons.
6. Masukkan bot token dan chat ID di pengaturan.
7. Pilih Tes koneksi.

Token tersimpan di `chrome.storage.local` pada profil browser. Jangan membagikan profil browser atau hasil ekspor storage.

## Greenhouse

URL Greenhouse biasanya berbentuk `https://boards.greenhouse.io/company`. Nilai setelah nama domain adalah board token. Tambahkan preset Greenhouse lalu masukkan nilai tersebut.

## Lever

URL Lever biasanya berbentuk `https://jobs.lever.co/company`. Nilai setelah nama domain adalah company slug. Tambahkan preset Lever lalu masukkan nilai tersebut.

## Workday

Endpoint CXS berbeda untuk setiap tenant.

1. Buka halaman karier Workday.
2. Buka DevTools dan pilih Network.
3. Cari request yang berakhir dengan `/jobs` dan memuat `/wday/cxs/`.
4. Salin URL lengkap ke field Endpoint CXS.

## Taleo dan custom

Masukkan URL listing serta selector item, judul, dan link. Selector departemen dan ID bersifat opsional. Jika selector ID kosong, ID stabil dibuat dari judul dan URL.

Tiga contoh bentuk konfigurasi tersedia di `lib/selectors.json`. Contoh memakai domain placeholder dan harus disesuaikan sebelum digunakan.

Situs custom meminta izin akses host ketika pengaturan disimpan. Sumber HTML dijadwalkan mendekati 15 menit untuk mengurangi risiko rate limiting.

## Pemeriksaan manual

Klik ikon extension lalu pilih Cek sekarang. Service worker menulis daftar hasil fetch ke console dengan label `Career Pulse jobs`.

Untuk membuka console, buka `chrome://extensions`, cari Career Pulse, lalu pilih tautan service worker.

## Simulasi alert baru

1. Jalankan satu pemeriksaan untuk membuat baseline.
2. Buka DevTools halaman extension.
3. Buka Application, Extension storage, lalu Local.
4. Hapus satu ID dari `snapshots` untuk sumber yang diuji.
5. Simpan perubahan storage.
6. Jalankan Cek sekarang.

Job yang ID-nya dihapus akan dianggap baru dan dikirim ke Telegram.

## Tes lokal

Jalankan perintah berikut dari folder `extension`:

```powershell
node tests/run-tests.mjs
```

Tes memakai respons mock untuk Greenhouse, Lever, dan Workday sehingga tidak membutuhkan token atau koneksi internet.

## Batasan

Service worker hanya aktif selama browser berjalan. Workday, Taleo, dan struktur HTML custom dapat berubah. Gunakan extension untuk kebutuhan personal dan periksa Terms of Service setiap portal sebelum mengaktifkan scraping HTML.
