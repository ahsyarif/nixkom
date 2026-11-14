---
title: Mengelola Proses Bandel, Port Terbuka, & Troubleshooting Jaringan
date: 2026-11-14T12:24:00+07:00
categories:
  - Linux
  - Infrastructure
tags:
  - linux
  - tmux
  - networking
  - ss
  - troubleshooting
  - tips
  - pemula
description: Trik mencari dan menghentikan proses yang macet secara beradab, menjaga pekerjaan tetap jalan saat SSH putus dengan tmux, serta mengecek port, DNS, dan HTTP dari server Linux.
---

Ada tiga situasi lapangan yang hampir pasti dialami setiap pemilik VPS:

1. Aplikasi error dengan pesan **`Error: listen EADDRINUSE: address already in use :::3000`** (ada proses lama yang masih menyangkut di port `3000`).
2. Koneksi Wi-Fi terputus tepat di tengah proses *migrasi database* atau `apt upgrade` yang butuh 10 menit, membuat pekerjaan berantakan.
3. Server gagal memanggil API luar atau domain sendiri tidak bisa dibuka, lalu bingung mengecek apakah masalahnya ada di aplikasi, DNS, atau jaringan.

Di bagian kelima ini, kita bereskan ketiganya dengan beberapa perintah ringkas yang sangat ampuh.

---

## Trik 1: Mencari & Menghentikan Proses Bandel Tanpa Merusak Data (`pgrep` & `kill`)

Sebelum mematikan proses, cari tahu dulu nomor identitas prosesnya (**PID**):

```bash
# Cara lama (terkadang ikut memunculkan baris grep sendiri)
ps aux | grep node

# Cara lebih bersih: langsung tampilkan PID & argumen lengkapnya
pgrep -af node
```

Begitu mendapatkan nomor PID (misalnya `14820`), jangan langsung memakai `kill -9`! Pahami perbedaan dua sinyal ini:

- **`kill 14820`** *(mengirim sinyal `SIGTERM`)*: Ini cara **sopan**. Linux mengetuk pintu aplikasi dan memintanya berhenti sendiri—jadi aplikasi sempat menutup koneksi database dan menyimpan data sementara agar tidak korup.
- **`kill -9 14820`** *(mengirim sinyal `SIGKILL`)*: Ini cara **paksa seketika**. Aplikasi langsung dibunuh oleh kernel tanpa sempat membereskan apa pun. **Hanya pakai `kill -9`** jika `kill` biasa sudah ditunggu beberapa detik dan prosesnya benar-benar membeku!

*(Trik cepat jika ingin menghentikan semua proses bernama `python3` sekaligus: `pkill -f nama_script.py` — selalu cek dulu daftar yang cocok memakai `pgrep -af nama_script.py` sebelum menjalankan `pkill`!)*

---

## Trik 2: Wajib Pakai `tmux` Sebelum Menjalankan Tugas Lama di VPS

Pemula sering menjalankan migrasi database, kompresi backup raksasa, atau kompilasi berat langsung di sesi SSH biasa. Bahayanya: begitu koneksi internet laptopmu putus 2 detik saja, sesi SSH mati—dan proses di dalam VPS **ikut terbunuh di tengah jalan**!

Solusi standarnya adalah **`tmux`** (terminal multiplexer yang terus hidup di server meskipun kamu tutup laptop):

```bash
# Install jika belum ada
sudo apt install -y tmux

# 1. Buat sesi baru bernama "migrasi"
tmux new -s migrasi
```

Di dalam layar `tmux`, jalankan pekerjaan beratmu. Jika ingin meninggalkan sesi agar tetap bekerja di latar belakang (*detach*), tekan **`Ctrl + B`**, lepaskan keduanya, lalu tekan **`D`**.

Kapan saja kamu kembali masuk ke VPS nanti (atau jika SSH tadi terputus mendadak!), lihat daftar sesi yang hidup lalu sambungkan kembali layarnya seperti semula:

```bash
tmux ls
tmux attach -t migrasi
```

Setelah pekerjaan selesai dan kamu ingin menutup sesi `tmux` selamanya, cukup ketik `exit` di dalamnya.

---

## Trik 3: Cek Port yang Sedang Dipakai & Proses Pemiliknya (`ss`)

Ketika muncul error port sudah terpakai (*address already in use*), atau ingin memastikan tidak ada port asing mendengarkan keluar, jalankan:

```bash
sudo ss -lntup
```

*(Untuk panduan mendalam membaca kolom output `ss`, baca juga [artikel cek port terbuka di Debian](/posts/debian-cek-port/).)*

Jika ingin langsung menyaring hanya port tertentu—misalnya mengecek siapa yang menduduki port `3000`:

```bash
sudo ss -lntup | grep :3000
```

Di kolom paling kanan (`users:(("node",pid=14820,fd=21))`), kamu langsung melihat nama program beserta **PID**-nya (`14820`), siap diperiksa atau dihentikan dengan rapi.

---

## Trik 4: Troubleshooting Jaringan Bertingkat (`ip`, `getent`/`dig`, `nc`, `curl`)

Jangan langsung menyalahkan "internet server mati" ketika satu request gagal. Uji jaringan dari lapisan paling bawah ke atas dengan 4 perintah singkat ini:

### 1. Cek IP Address & Routing Server secara Ringkas

Daripada bingung membaca output panjang `ifconfig` atau `ip addr`, tambahkan **`-br`** (*brief*):

```bash
ip -br a
ip route
```

Dalam 3 baris ringkas, kamu langsung melihat interface yang berstatus `UP`, IP publik (`eth0`), dan IP VPN privat (`tailscale0` jika ada).

### 2. Cek Resolusi DNS Persis Seperti yang Dilihat OS

Kadang `dig` memakai DNS publik, sementara aplikasi di OS juga mengecek file `/etc/hosts`. Uji keduanya:

```bash
# Cek alamat IP yang dibaca OS (termasuk /etc/hosts)
getent hosts api.github.com

# Cek langsung ke DNS dengan jawaban singkat (+short)
dig +short example.com
```

### 3. Uji Apakah Port Tujuan Terbuka Tanpa Harus Login (`nc` / `ss`)

Ingin tahu apakah VPS web server bisa menembus port `5432` di server database sebelah, atau terblokir firewall? Gunakan *netcat* (`nc`):

```bash
nc -zv 100.101.102.30 5432
```

- `-z`: hanya memindai apakah port mendengarkan, tanpa mengirim data apa pun.
- `-v`: tampilkan hasil pesan berhasil (*succeeded*) atau ditolak (*Connection refused* / *timed out*).

### 4. Uji Endpoint HTTP/HTTPS & Sertifikat SSL Langsung (`curl`)

Jika web servermu mengembalikan error `502 Bad Gateway` atau redirect berulang:

```bash
# Lihat hanya status HTTP & header respons (tanpa mencetak HTML panjang)
curl -I https://domainkamu.com

# Lihat proses lengkap koneksi TLS, IP tujuan, dan header request/respons
curl -Iv http://127.0.0.1:3000/health
```

Jika `curl -Iv http://127.0.0.1:3000/health` dari dalam VPS berhasil `200 OK` sedangkan dari luar gagal, berarti **aplikasimu sehat** dan masalahnya ada di reverse proxy (Nginx/Caddy) atau firewall/DNS di depannya!

---

## Checklist Singkat Sebelum Lanjut

- [x] Memakai `pgrep -af` untuk menemukan PID, dan mencoba `kill PID` sebelum terpaksa memakai `kill -9`.
- [x] Menjalankan tugas jangka panjang di dalam sesi **`tmux`**.
- [x] Mengaudit port bentrok lewat `sudo ss -lntup | grep :PORT`.
- [x] Bisa mendiagnosis masalah jaringan bertahap memakai `ip -br a`, `getent hosts`, `nc -zv`, dan `curl -Iv`.

Di **Bagian 6**, kita akan merapikan keterampilan administrasi inti lainnya: tips bersih manajemen paket (`apt`/`dnf`), mengelola user `sudo` secara aman memakai `visudo`, dan trik cepat membereskan masalah permission Linux tanpa pernah menyentuh `chmod 777`.

---

## Seri Tips & Trik Command Linux untuk Manajemen Server

1. [Bagian 1 — Trik Navigasi Terminal & Manajemen File Cepat di Server Linux](/posts/linux-cli-navigasi-file/)
2. [Bagian 2 — Membaca Config, Pipe, Redirection, & Trik Edit File di Server](/posts/linux-cli-teks-pipe-redirection/)
3. [Bagian 3 — Cek Kesehatan Server: Pantau CPU, RAM, & Disk Penuh dengan Cepat](/posts/linux-cli-pantau-cpu-ram-disk/)
4. [Bagian 4 — Mengelola Service dengan systemctl & Investigasi Error di journalctl](/posts/linux-cli-service-systemd-log/)
5. **Bagian 5 — Mengelola Proses Bandel, Port Terbuka, & Troubleshooting Jaringan** *(sedang dibaca)*
6. [Bagian 6 — Manajemen Paket, User, sudo, & Permission Tanpa Panik](/posts/linux-cli-paket-user-permission/)
7. [Bagian 7 — Menjalankan Tugas Otomatis (cron vs systemd timer) & Kebiasaan Aman](/posts/linux-cli-otomatis-cron-systemd-timer/)

---

## Referensi

- [Debian Manpage: `ps(1)`](https://manpages.debian.org/trixie/procps/ps.1.en.html)
- [Debian Manpage: `tmux(1)`](https://manpages.debian.org/trixie/tmux/tmux.1.en.html)
- [Debian Manpage: `ss(8)`](https://manpages.debian.org/trixie/iproute2/ss.8.en.html)
- [Debian Manpage: `ip(8)`](https://manpages.debian.org/trixie/iproute2/ip.8.en.html)
