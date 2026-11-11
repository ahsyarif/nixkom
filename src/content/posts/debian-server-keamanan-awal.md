---
title: "Mengamankan VPS Debian 13 baru: urutan langkah awal yang aman"
date: 2026-11-11T21:00:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "vps", "sudo", "ssh"]
description: "Urutan aman menyiapkan VPS Debian 13 baru: update, akun admin bersudo, lalu kunci SSH, firewall, patch otomatis, dan backup tanpa terkunci."
---

Mengamankan VPS Debian 13 (*trixie*) dimulai dengan memperbarui paket dan membuat akun admin, lalu membatasi SSH serta koneksi masuk. Urutannya harus menjaga satu hal: **jangan menutup akses lama sebelum akses penggantinya terbukti bisa dipakai.**

Dalam semua contoh, `203.0.113.10` adalah IP dokumentasi. **Ganti dengan IP server aslimu.** Kita pakai port SSH 22 dan akun admin bernama `admin`; ganti kalau punyamu beda. Penanda `# di server` dan `# di laptop` menunjukkan tempat perintah dijalankan.

## Sebelum mulai: cari jalan darurat

Cari dulu **konsol recovery/VNC/serial** di panel provider. Konsol ini tidak lewat SSH, jadi tetap bisa dipakai kalau kamu salah konfigurasi SSH atau firewall. Coba login lewat konsol sekali (lihat kredensial `root` dari provider) supaya kamu tahu itu berfungsi *sebelum* kamu butuh.

Buka juga panel firewall provider kalau ada (sering disebut *cloud firewall* atau *security group*). Firewall di panel itu terpisah dari firewall di dalam server, dan sama-sama bisa memblokir koneksimu.

## Langkah 1: masuk pertama dan update

Dari laptop, masuk pertama kali dengan akun yang diberikan provider:

```bash
# di laptop
ssh root@203.0.113.10
```

Contoh ini memakai akses awal `root`. Kalau provider memberikan akun lain dengan `sudo`, pakai akun itu dan awali perintah administrasi dengan `sudo`. Image yang hanya menerima kunci memerlukan opsi `-i /lokasi/kunci` saat SSH; jangan mengaktifkan login sandi hanya untuk mengikuti contoh.

Kalau muncul pertanyaan fingerprint, jangan asal ketik `yes`. Bandingkan dulu dengan fingerprint dari konsol provider; caranya ada di [artikel SSH key](/posts/debian-ssh-key/).

Lalu perbarui daftar paket dan lihat dulu apa yang akan berubah:

```bash
# di server
apt update
apt list --upgradable
```

`apt list --upgradable` menampilkan paket yang punya versi baru. Kalau daftarnya wajar, jalankan:

```bash
# di server
apt upgrade
```

APT akan menampilkan ringkasan paket yang dipasang, diganti, atau dihapus dan menunggu konfirmasi. **Baca ringkasan itu**, terutama baris "akan dihapus" (*to be REMOVED*). Kalau ada dialog tentang berkas konfigurasi yang diubah, pilih mempertahankan versi lokal kalau kamu tidak yakin, lalu periksa belakangan. Kalau kernel ikut diperbarui, `reboot` nanti bisa dilakukan setelah akun admin siap dan kamu masih punya konsol.

## Langkah 2: buat akun admin dengan sudo

Bekerja terus-menerus sebagai `root` berbahaya: satu salah ketik, tidak ada rem. Buat akun biasa yang bisa naik hak lewat `sudo`. Image Debian minimal kadang belum punya `sudo`, jadi pasang dulu:

```bash
# di server (sebagai root)
apt install sudo adduser
adduser admin
usermod -aG sudo admin
```

`adduser admin` menanyakan kata sandi, pilih yang panjang dan unik. Isian nama lengkap dan lainnya boleh dikosongkan dengan Enter. `usermod -aG sudo admin` memasukkan `admin` ke grup `sudo` (`-a` penting: tanpa itu grup lain malah terhapus). Cek hasilnya:

```bash
# di server
id admin
```

Keluarannya harus memuat `sudo`, misalnya `groups=1001(admin),27(sudo)`. Anggota grup baru terbaca saat login baru, jadi lanjutkan dengan sesi baru.

## Langkah 3: sambung ulang dan buktikan sudo

Biarkan sesi `root` tetap terbuka. Buka terminal **kedua** di laptop:

```bash
# di laptop, terminal kedua
ssh admin@203.0.113.10
```

Kalau server hanya menerima kunci, pasang kunci publik untuk `admin` lewat sesi `root` terlebih dahulu. Ikuti bagian pemasangan manual di [panduan kunci SSH](/posts/debian-ssh-key/), lalu ulangi login `admin` dengan kunci tersebut.

Setelah masuk, tes:

```bash
# di server, sebagai admin
sudo whoami
```

Harus mencetak `root`. Kalau iya, kamu sudah punya jalan masuk non-root yang berfungsi. Kalau gagal (`admin is not in the sudoers file`, misalnya), perbaiki dari sesi `root` yang masih terbuka, jangan tutup dulu.

## Langkah 4: lanjutkan ke pengerasan, satu per satu

Sekarang baru kamu punya pijakan. Urutan yang disarankan, masing-masing dengan cek dan jalan mundur:

1. **[Kunci SSH](/posts/debian-ssh-key/)**: masuk dengan kunci, uji di terminal kedua, baru nanti nonaktifkan sandi dan login `root`.
2. **[Firewall UFW](/posts/debian-firewall-ufw/)**: izinkan SSH dulu, baru aktifkan.
3. **[Cek port yang terbuka](/posts/debian-cek-port/)**: pastikan hanya layanan yang kamu maksud yang mendengarkan.
4. **[Update keamanan otomatis](/posts/debian-unattended-upgrades/)**: tambalan keamanan masuk tanpa kamu ingat.
5. **[Permission tanpa 777](/posts/debian-permission-tanpa-777/)**: hak akses berkas seperlunya.
6. **[Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)**: memperlambat tebakan sandi berulang.
7. **[Backup dan uji restore](/posts/debian-backup-restore/)**: pengaman terakhir kalau semua di atas gagal.

Kunci SSH diuji sebelum firewall agar kamu tidak mengubah dua jalur akses sekaligus. Kalau server sudah menyimpan data, buat dan uji backup sebelum eksperimen besar.

## Hal yang sengaja tidak dilakukan

- **Jangan menonaktifkan login `root` atau kata sandi sebelum login kunci + `sudo` terbukti** dari sesi terpisah.
- **Jangan menempel skrip "hardening satu klik"** dari internet. Kamu tidak tahu apa yang diubah dan tidak tahu cara membatalkannya.
- **Jangan tutup sesi SSH yang sedang bekerja** saat mengubah SSH atau firewall. Sesi lama itu tali penyelamatmu.

## Cek akhir

Sebelum menganggap tahap awal selesai, pastikan:

- login `admin` dan `sudo whoami` jalan di terminal terpisah;
- kamu tahu cara masuk konsol recovery provider;
- `apt update && apt list --upgradable` tidak menyisakan tambalan keamanan yang tertunda.

## Referensi

- [Debian Reference, bab 4: autentikasi dan kontrol akses](https://www.debian.org/doc/manuals/debian-reference/ch04.en.html)
- [adduser(8), Debian trixie](https://manpages.debian.org/trixie/adduser/adduser.8.en.html)
- [sudo(8), Debian trixie](https://manpages.debian.org/trixie/sudo/sudo.8.en.html)

## Seri keamanan server Debian

1. **Mengamankan VPS Debian 13 baru (artikel ini)**
2. [Login SSH pakai kunci Ed25519](/posts/debian-ssh-key/)
3. [Firewall UFW tanpa terkunci](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka dengan ss dan nmap](/posts/debian-cek-port/)
5. [Update keamanan otomatis dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. [Permission berkas tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. [Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)
8. [Backup dan uji restore](/posts/debian-backup-restore/)
