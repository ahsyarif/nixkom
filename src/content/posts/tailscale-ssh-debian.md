---
title: "SSH Debian lewat Tailscale tanpa port publik"
date: 2026-11-11T22:01:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","ssh","keamanan"]
description: "Akses OpenSSH Debian lewat IP Tailscale, uji login baru, lalu tutup jalur SSH publik dengan pemeriksaan firewall dan akses pemulihan."
---

Membuka port SSH (port 22) ke internet publik itu ibarat menaruh pintu depan rumah tepat di pinggir jalan raya: siapa saja di internet bisa mencoba mengetuk dan menebak kata sandinya setiap hari. Dengan Tailscale, kita bisa memindahkan akses SSH ke "pintu belakang" yang hanya ada di dalam jaringan privat *tailnet*.

Kabar baiknya, SSH lewat IP Tailscale tetap bisa memakai **OpenSSH** dan kunci **Ed25519** yang sudah biasa kamu gunakan. Yang berubah hanyalah jalur jaringannya: laptop menghubungi alamat IP privat Tailscale milik server, bukan IP publiknya.

Sebelum mulai, pastikan kamu sudah menyelesaikan [pemasangan Tailscale](/posts/tailscale-debian-pemula/) di laptop dan server. Contoh di bawah memakai port SSH `22` dan akun Linux `admin` (silakan ganti sesuai servermu). Jika belum punya kunci SSH, siapkan dulu lewat [panduan SSH Debian](/posts/debian-ssh-key/).

## Bedakan OpenSSH dan Tailscale SSH

Penting untuk tidak tertukar antara dua istilah ini:

- **OpenSSH lewat Tailscale (yang kita pakai di sini):** Kita tetap memakai layanan `sshd` bawaan Debian. Tailscale hanya berperan membawa paket koneksinya secara aman, sedangkan urusan login dan verifikasi kunci tetap ditangani oleh konfigurasi OpenSSH dan file `authorized_keys`.
- **Tailscale SSH (fitur bawaan Tailscale):** Ini adalah fitur khusus dari Tailscale yang mengambil alih koneksi SSH ke IP Tailscale dan mengatur izinnya lewat kebijakan *tailnet*. Kita **tidak** menjalankan `tailscale up --ssh` atau `tailscale set --ssh` di panduan ini. Jika sebelumnya kamu pernah mengaktifkan fitur tersebut, tentukan dulu layanan mana yang ingin dipakai sebelum melanjutkan.

## Uji sesi baru sebelum mengubah firewall

Aturan emas saat mengutak-atik firewall server jarak jauh: **jangan menutup pintu lama sebelum pintu baru terbukti bisa dibuka!** Pertahankan sesi SSH publik yang sekarang masih terbuka sebagai jaring pengaman.

Di terminal server, periksa apakah layanan SSH aktif, di alamat mana ia "mendengarkan" koneksi, dan berapa IP Tailscale servermu:

```bash
systemctl status ssh
sudo ss -ltnp 'sport = :22'
tailscale ip -4
```

Pastikan OpenSSH mendengarkan di IP Tailscale server atau di alamat wildcard (`0.0.0.0` / `[::]`) yang mencakup semua antarmuka. Jika di konfigurasi `sshd` sebelumnya kamu membatasinya hanya pada IP publik tertentu, periksa pengaturan `ListenAddress`. Selalu validasi perubahan konfigurasi dengan `sudo sshd -t` sebelum memuat ulang layanan, dan jangan menebak-nebak alamat baru dari contoh.

Sekarang, buka **terminal baru di laptop** (jangan tutup sesi lama di terminal pertama), lalu coba masuk lewat IP Tailscale server (ganti `100.101.102.103` dengan IP milikmu):

```bash
# di laptop
ssh admin@100.101.102.103
```

Saat pertama kali terhubung lewat IP baru, SSH akan meminta kamu memverifikasi sidik jari (*fingerprint*) host key server. Cocokkan sidik jari tersebut dengan mengeceknya langsung di sesi server lama yang sudah kamu percaya:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Jangan asal menerima peringatan jika sidik jari host key berubah tanpa alasan yang jelas.

Setelah berhasil login, jalankan `whoami` dan `sudo -v` untuk memastikan kamu masuk sebagai akun yang benar dan hak akses `sudo` masih berfungsi. Jika login gagal, periksa tiga hal: kebijakan *tailnet* untuk TCP port 22, alamat dengar `sshd`, dan firewall di server. Ingat, `tailscale ping` yang berhasil saja belum cukup untuk menjamin SSH bisa masuk.

## Tutup jalur publik setelah pemulihan siap

Sebelum menutup akses SSH dari internet publik, pastikan kamu punya **rencana cadangan (pemulihan)**. Pastikan konsol serial/web dari penyedia VPS atau cloud bisa kamu akses dan kamu tahu cara mengembalikan aturan firewall jika terjadi masalah. Kenapa ini penting? Karena kunci perangkat Tailscale bisa kedaluwarsa (*key expiry*) atau sewaktu-waktu ada gangguan login yang membuat jalur privat sementara tidak tersedia. Jangan mematikan masa berlaku kunci tanpa mempertimbangkan risiko keamanan apabila perangkatmu hilang atau dicuri.

Jika servermu memakai **UFW** yang sudah aktif, periksa daftar aturan saat ini:

```bash
# di server
sudo ufw status verbose
sudo ufw status numbered
```

Bila dibutuhkan oleh susunan firewallmu, izinkan SSH hanya melalui antarmuka jaringan Tailscale (`tailscale0`):

```bash
sudo ufw allow in on tailscale0 to any port 22 proto tcp
```

> **Catatan keamanan penting:** Tailscale secara bawaan memasang aturan `netfilter` sendiri di Linux. Urutan aturan tersebut bisa membuat lalu lintas Tailscale langsung diterima *sebelum* menyentuh aturan UFW. Karena itu, jangan mengandalkan UFW sendirian untuk membatasi perangkat mana saja di *tailnet* yang boleh mengakses server—gunakan [grants](/posts/tailscale-grants-pemula/) untuk membatasi akses di level *tailnet* dan uji hasilnya.

Setelah yakin jalur privat aman, hapus aturan UFW yang mengizinkan SSH dari antarmuka publik. Kenali dulu nomor aturan dan cakupannya dari `sudo ufw status numbered`, lalu hapus:

```bash
# ganti NOMOR_ATURAN dengan nomor aturan publik yang sudah diperiksa
sudo ufw delete NOMOR_ATURAN
sudo ufw status numbered
```

**Hati-hati:** Setiap kali satu aturan dihapus, **nomor aturan di bawahnya akan bergeser**! Selalu jalankan dan baca ulang `sudo ufw status numbered` sebelum menghapus aturan berikutnya. Periksa aturan IPv4, IPv6, profil `OpenSSH`, serta aturan luas lain yang mungkin masih membuka port 22. Jangan mengaktifkan UFW dari nol hanya berbekal potongan panduan ini; ikuti [panduan UFW tanpa terkunci](/posts/debian-firewall-ufw/) jika baru mau memasang UFW.

Terakhir, jika penyedia VPS/cloud kamu memiliki **firewall di dasbor provider**, cabut izin masuk TCP port SSH dari internet publik untuk IPv4 maupun IPv6. Pastikan kamu tidak menghapus akses yang masih dibutuhkan layanan lain atau memblokir koneksi keluar yang dipakai Tailscale.

## Buktikan dua hasil yang berbeda

Jangan langsung menutup sesi SSH lama sebelum melakukan dua pengujian ini:

1. **Uji jalur privat:** Buka **koneksi SSH baru** dari laptop ke IP Tailscale server. (Sesi lama yang masih hidup bukanlah bukti bahwa aturan firewall baru sudah benar!)
2. **Uji jalur publik:** Dari perangkat atau jaringan luar, coba sambungkan SSH ke IP publik server. Uji baik IPv4 maupun IPv6 jika servermu punya IPv6 publik.

Hasil yang kamu cari harus kontras: **login lewat IP Tailscale berhasil**, sedangkan **koneksi baru ke IP publik gagal**.

Jika jalur privat ternyata gagal setelah firewall diubah, segera pakai sesi lama yang masih terbuka atau konsol web provider untuk mengembalikan aturan firewall yang tadi kamu catat. Jangan menutup sesi terakhir sampai kedua pemeriksaan di atas beres.

## Referensi

- [Tailscale dan UFW (contoh resmi untuk Ubuntu)](https://tailscale.com/docs/how-to/secure-ubuntu-server-with-ufw)
- [Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh)
- [sshd_config(5), Debian trixie](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)

## Seri Tailscale untuk pemula

1. [Tailscale di Debian 13: hubungkan laptop dan server](/posts/tailscale-debian-pemula/)
2. **SSH Debian lewat Tailscale tanpa port publik (artikel ini)**
3. [MagicDNS: akses perangkat Tailscale pakai nama](/posts/tailscale-magicdns/)
4. [Buka aplikasi pengembangan dari HP lewat Tailscale](/posts/tailscale-frontend-hp/)
5. [Tailscale Serve dan Funnel: akses privat atau publik](/posts/tailscale-serve-funnel/)
6. [Batasi akses perangkat Tailscale dengan grants](/posts/tailscale-grants-pemula/)
7. [Subnet router Tailscale untuk akses jaringan rumah](/posts/tailscale-subnet-router/)
8. [Exit node Tailscale: koneksi internet lewat Debian](/posts/tailscale-exit-node/)
