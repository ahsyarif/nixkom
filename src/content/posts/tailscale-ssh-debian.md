---
title: "SSH Debian lewat Tailscale tanpa port publik"
date: 2026-11-11T22:01:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","ssh","keamanan"]
description: "Akses OpenSSH Debian lewat IP Tailscale, uji login baru, lalu tutup jalur SSH publik dengan pemeriksaan firewall dan akses pemulihan."
---

SSH ke IP Tailscale tetap bisa memakai OpenSSH dan kunci Ed25519 yang sudah kamu gunakan. Yang berubah adalah jalur jaringannya: laptop menghubungi alamat privat server, bukan port SSH pada IP publik.

Selesaikan [pemasangan Tailscale](/posts/tailscale-debian-pemula/) di kedua perangkat. Contoh memakai port SSH 22 dan akun Linux `admin`; ganti sesuai servermu. Siapkan kunci melalui [panduan SSH Debian](/posts/debian-ssh-key/) bila belum ada.

## Bedakan OpenSSH dan Tailscale SSH

Panduan ini memakai layanan `sshd` biasa. Tailscale hanya membawa koneksinya; autentikasi tetap melalui konfigurasi OpenSSH dan `authorized_keys`.

Fitur bernama **Tailscale SSH** berbeda: fitur itu mengambil alih koneksi SSH ke IP Tailscale dan memakai aturan SSH dalam kebijakan tailnet. Kita tidak menjalankan `tailscale up --ssh` atau `tailscale set --ssh` di sini. Bila sebelumnya kamu sudah mengaktifkannya, tentukan dulu layanan yang hendak dipakai sebelum mengikuti langkah ini.

## Uji sesi baru sebelum mengubah firewall

Pertahankan sesi SSH publik yang sekarang terbuka. Di server:

```bash
systemctl status ssh
sudo ss -ltnp 'sport = :22'
tailscale ip -4
```

OpenSSH harus mendengarkan di IP Tailscale atau alamat wildcard yang mencakupnya. Jika hanya mendengarkan pada IP publik tertentu, periksa `ListenAddress` di konfigurasi sshd. Validasi perubahan dengan `sudo sshd -t` sebelum memuat ulang layanan; jangan menebak alamat baru dari contoh.

Di terminal laptop lain, ganti IP ilustrasi berikut:

```bash
# di laptop
ssh admin@100.101.102.103
```

Cocokkan sidik jari host key saat diminta. Di sesi server yang sudah dipercaya, lihat sidik jari Ed25519 dengan `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. Jangan asal menerima peringatan host key berubah.

Login berhasil harus membuka shell akun yang benar. Jalankan `whoami` dan `sudo -v` untuk memastikan akses administrasi masih tersedia. Jika gagal, periksa kebijakan tailnet untuk TCP 22, alamat dengar sshd, dan firewall host. Ping Tailscale berhasil saja belum cukup.

## Tutup jalur publik setelah pemulihan siap

Pastikan konsol serial/web provider bisa dipakai dan kamu tahu cara mengembalikan aturan firewall. Kunci perangkat Tailscale yang kedaluwarsa atau gangguan login bisa membuat jalur privat tidak tersedia. Jangan mematikan masa berlaku kunci tanpa mempertimbangkan risiko perangkat yang dicuri.

Jika memakai UFW yang sudah aktif, periksa aturannya:

```bash
# di server
sudo ufw status verbose
sudo ufw status numbered
```

Bila diperlukan oleh susunan firewallmu, izinkan hanya SSH melalui antarmuka Tailscale:

```bash
sudo ufw allow in on tailscale0 to any port 22 proto tcp
```

Tailscale juga memasang aturan netfilter sendiri secara bawaan; urutan aturan dapat membuat lalu lintas Tailscale diterima sebelum aturan UFW. Karena itu, gunakan [grants](/posts/tailscale-grants-pemula/) untuk membatasi akses di tailnet dan uji hasilnya. Jangan menganggap UFW sendirian mengendalikan seluruh lalu lintas Tailscale.

Hapus aturan UFW yang mengizinkan SSH dari antarmuka publik setelah mengenali nomor dan cakupannya. Contoh sintaksnya:

```bash
# ganti NOMOR_ATURAN dengan nomor aturan publik yang sudah diperiksa
sudo ufw delete NOMOR_ATURAN
sudo ufw status numbered
```

Nomor bergeser setiap kali aturan dihapus. Baca ulang daftar sebelum menghapus aturan berikutnya. Periksa aturan IPv4, IPv6, profil `OpenSSH`, dan aturan luas lain yang mungkin masih mengizinkan port tersebut. Jangan mengaktifkan UFW dari nol hanya dengan potongan panduan ini; ikuti [panduan UFW tanpa terkunci](/posts/debian-firewall-ufw/).

Di firewall provider, cabut izin masuk TCP port SSH dari internet untuk IPv4 maupun IPv6. Jangan menghapus akses yang masih dibutuhkan layanan lain atau menghalangi konektivitas Tailscale keluar.

## Buktikan dua hasil yang berbeda

Buka **koneksi SSH baru** melalui IP Tailscale; sesi lama yang masih hidup bukan bukti aturan baru benar. Dari perangkat/jaringan luar, uji juga koneksi ke IP publik server pada port SSH. Uji kedua keluarga IP jika server punya IPv6 publik. Hasil yang dicari: login privat berhasil, koneksi publik baru gagal.

Jika privat gagal setelah perubahan, gunakan sesi lama atau konsol provider untuk memulihkan aturan yang tadi dicatat. Jangan menutup sesi terakhir sebelum dua pemeriksaan itu selesai.

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
