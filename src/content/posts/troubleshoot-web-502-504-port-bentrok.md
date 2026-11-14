---
title: "Website 502 Bad Gateway, 504 Timeout, & Port Bentrok (EADDRINUSE)"
date: 2026-11-14T16:38:00+07:00
categories:
  - Linux
  - Server
  - DevOps
tags:
  - linux
  - nginx
  - caddy
  - networking
  - ss
  - troubleshooting
  - pemula
description: "Panduan cepat membedakan dan memperbaiki error 502 Bad Gateway, 504 Gateway Timeout, serta konflik port EADDRINUSE pada reverse proxy dan aplikasi backend di server Linux."
---

Saat mengelola aplikasi web dengan reverse proxy seperti **Nginx** atau **Caddy**, dua kode error HTTP ini paling sering membuat pemula bingung: **`502 Bad Gateway`** dan **`504 Gateway Timeout`**.

Padahal keduanya punya arti yang sangat spesifik dan mudah dilacak dalam 60 detik—selama kamu tahu harus memeriksa lapisan mana terlebih dahulu!

---

## Bedakan `502` vs `504` dalam 10 Detik

Bayangkan **Nginx/Caddy** adalah resepsionis restoran, sedangkan **aplikasi backend-mu** (Node.js/Python/Go/Docker) adalah dapur di belakang:

- **`502 Bad Gateway` (Dapur Tutup / Alamat Salah):**  
  Resepsionis (Nginx/Caddy) hidup dan menerima tamu, lalu mencoba mengetuk pintu dapur (`127.0.0.1:3000`). Ternyata pintunya tidak dijawab karena dapur sedang mati, baru saja crash, atau salah nomor port!
- **`504 Gateway Timeout` (Dapur Lemot Terlalu Lama):**  
  Dapur masih hidup dan menerima pesanan, tetapi memasaknya terlalu lama (misalnya query database lambat, deadlock, atau memanggil API pihak ketiga yang menggantung) sehingga resepsionis menyerah menunggu (default sering ~60 detik).

---

## Langkah Diagnosis `502 Bad Gateway` (Ikuti Urutan Ini!)

### 1. Uji Langsung Backend dari Dalam VPS (`curl`)

Masuk ke VPS, lalu tembak langsung port aplikasi backend tanpa melewati Nginx/Caddy:

```bash
curl -Iv http://127.0.0.1:3000
```

- Jika hasilnya **`Connection refused`**, berarti masalahnya **100% di backend** (service mati, crash, atau salah port).
- Jika `curl` ke `127.0.0.1:3000` **berhasil `200 OK`**, berarti aplikasimu sehat dan masalahnya ada di konfigurasi Nginx/Caddy (atau aturan SELinux/firewall lokal).

### 2. Pastikan Alamat IP & Port Listening Cocok (`ss -lntup`)

```bash
sudo ss -lntup | grep :3000
```

**Jebakan klasik Docker / Vite / Next.js:**  
Kadang di dalam container atau skrip, aplikasi hanya mendengar di `127.0.0.1:3000` di dalam namespace container—bukan `0.0.0.0:3000` di dalam container—sehingga mapping port Docker (`-p 127.0.0.1:3000:3000`) gagal meneruskannya! Pastikan server web di dalam container mengikat ke `0.0.0.0` (while port host di `compose.yaml` tetap mengikat ke `127.0.0.1:3000:3000` agar aman!).

Sebaliknya, cek juga apakah Nginx memanggil `127.0.0.1:3000` sementara backend cuma mendengar di `[::1]:3000` (IPv6 *localhost* saja!). Menulis alamat IP eksplisit `127.0.0.1` di keduanya menghindari ketidakcocokan `localhost` (IPv4 vs IPv6).

### 3. Baca Log Error Reverse Proxy

```bash
# Untuk Nginx:
sudo tail -n 30 /var/log/nginx/error.log

# Untuk Caddy:
sudo journalctl -u caddy -n 30 --no-pager
```

Jika di log Nginx tertulis `connect() failed (111: Connection refused) while connecting to upstream`, kembali ke Langkah 1 & 2 dan periksa log aplikasimu (`journalctl -u nama-app` atau `docker logs nama-container`) untuk mengetahui alasan aplikasi mati (jangan-jangan dibunuh [OOM Killer](/posts/troubleshoot-ram-habis-oom-killer/)!).

---

## Langkah Diagnosis `504 Gateway Timeout`

Ketika halaman memuat berputar lama lalu berakhir `504`:

1. **Cek apakah beban CPU/Database penuh:** Jalankan `htop` atau cek log aplikasi apakah ada satu request yang menumpuk.
2. **Periksa panggilan ke layanan eksternal:** Apakah backend sedang memanggil API pembayaran, SMTP email, atau webhook luar tanpa menetapkan batas `timeout` di kode HTTP client? Selalu pasang *timeout* pada setiap request keluar!
3. **Jika memang butuh proses lambat (misal ekspor laporan besar):** Jangan menaikkan `proxy_read_timeout` menjadi ratusan detik untuk endpoint publik—pindahkan pekerjaan berat ke *background queue* agar browser langsung mendapat respons cepat.

---

## Mengatasi Port Sudah Terpakai (`EADDRINUSE: address already in use`)

Error ini muncul ketika kamu menjalankan aplikasi di port `3000` (atau `80`/`443`), padahal sudah ada proses lain yang lebih dulu menduduki port tersebut:

1. **Temukan proses dan PID pemilik port tersebut:**
   ```bash
   sudo ss -lntup | grep :3000
   ```
   Output di kolom kanan menunjukkan nama proses dan PID-nya, misalnya `users:(("node",pid=9421,fd=20))`.
2. **Cek apakah proses itu dikelola `systemd` atau Docker:**
   - Kalau itu container Docker lama yang lupa dimatikan -> hentikan lewat `docker ps` lalu `docker stop ...`.
   - Kalau itu service systemd -> hentikan atau restart melalui `sudo systemctl restart nama-service` (jangan asal `kill` kalau `systemd` punya `Restart=always`, karena ia langsung hidup lagi dalam 1 detik!).
   - Kalau itu proses manual nyangkut dari percobaan sebelumnya -> hentikan rapi dengan `kill 9421`.

### Kenapa Aplikasi User Biasa Error `Permission denied` di Port `80` / `443`?

Di Linux, port di bawah `1024` (seperti `80` dan `443`) adalah **privileged ports** yang hanya boleh dibuka oleh proses berhak `root` atau memiliki kapabilitas khusus.

**Cara terbaik mengatasinya:** Tetap jalankan aplikasi Node.js/Python/Go-mu sebagai user biasa non-root di port tinggi (seperti `127.0.0.1:3000`), lalu biarkan **Nginx** atau **Caddy** yang memang dirancang aman sebagai layanan sistem menerima trafik di port `80`/`443` dan meneruskannya ke `127.0.0.1:3000`.

---

## Checklist Singkat Sebelum Lanjut

- [x] Bisa membedakan `502` (backend mati / salah alamat) dan `504` (backend macet / terlalu lama merespons).
- [x] Selalu memverifikasi backend dengan `curl -Iv http://127.0.0.1:PORT` dan `sudo ss -lntup | grep :PORT`.
- [x] Mengecek apakah proses pemilik port berasal dari `systemd`, Docker, atau proses manual sebelum menghentikannya.

Di **Bagian 5**, kita akan membereskan salah satu gangguan paling bikin frustrasi saat memasang atau memperbarui paket di Debian/Ubuntu: **error lock `apt` / `dpkg` (`Could not get lock`), instalasi terputus, dan repositori gagal update**.

---

## Seri Troubleshooting Kendala Server Linux untuk Pemula

1. [Bagian 1 — SSH Tidak Bisa Login? Cara Atasi Connection Refused, Timeout, & Terkunci Sendiri](/posts/troubleshoot-ssh-tidak-bisa-login/)
2. [Bagian 2 — Disk Penuh (`No space left on device`): Bersihkan Aman Tanpa Merusak Sistem](/posts/troubleshoot-disk-penuh-no-space/)
3. [Bagian 3 — Aplikasi Mati Mendadak karena RAM Habis (OOM Killer) & Cara Setup Swap](/posts/troubleshoot-ram-habis-oom-killer/)
4. **Bagian 4 — Website 502 Bad Gateway, 504 Timeout, & Port Bentrok (EADDRINUSE)** *(sedang dibaca)*
5. [Bagian 5 — apt / dpkg Error: Mengatasi Lock Error, Update Terputus, & Repo Gagal](/posts/troubleshoot-apt-dpkg-error-update/)
6. [Bagian 6 — Service Systemd Gagal Start & Error 403 Forbidden / Permission Denied](/posts/troubleshoot-service-gagal-start-permission/)
7. [Bagian 7 — Masalah SSL/HTTPS, DNS Tidak Mengarah, & Jam Server Melenceng](/posts/troubleshoot-ssl-dns-jam-server/)

---

## Referensi

- [Debian Manpage: `ss(8)`](https://manpages.debian.org/trixie/iproute2/ss.8.en.html)
- [Debian Manpage: `curl(1)`](https://manpages.debian.org/trixie/curl/curl.1.en.html)
- [Debian Manpage: `journalctl(1)`](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html)
