---
title: "Tailscale Serve dan Funnel: akses privat atau publik"
date: 2026-11-11T22:04:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","https","serve","funnel"]
description: "Pilih Tailscale Serve untuk HTTPS privat atau Funnel untuk akses internet. Periksa target loopback, izin, dan cara menghentikan keduanya."
---

Tailscale Serve membagikan aplikasi kepada perangkat yang diizinkan dalam tailnet. Funnel membukanya untuk internet, termasuk orang yang tidak memakai Tailscale. URL keduanya bisa sama-sama berakhiran `.ts.net`; akhiran itu tidak cukup untuk menentukan apakah layanan privat.

Contoh memakai Debian yang sudah [terhubung ke Tailscale](/posts/tailscale-debian-pemula/), dengan aplikasi HTTP di `127.0.0.1:3000`. Gunakan klien Tailscale terkini; sintaks Serve dan Funnel berubah sejak versi 1.52. Perintah berikut mengikuti dokumentasi yang diperiksa November 2026.

## Siapkan aplikasi loopback

Di Debian:

```bash
curl --fail http://127.0.0.1:3000/
sudo ss -ltnp 'sport = :3000'
tailscale version
tailscale serve status
tailscale funnel status
```

Pastikan aplikasi menjawab dan hanya mendengarkan di loopback. Jika konfigurasi Serve/Funnel sudah ada, catat dulu dan pilih port/path yang tidak mengganggunya. Jangan menjalankan `reset` untuk sekadar mencoba satu aplikasi karena perintah itu menghapus konfigurasi lain pada perangkat.

Aktifkan [MagicDNS](/posts/tailscale-magicdns/) dan HTTPS sesuai tautan persetujuan yang diberikan CLI. Sertifikat memakai nama lengkap perangkat pada domain tailnet, bukan domain `.ts.net` pilihanmu sendiri. Nama tersebut dapat masuk log transparansi sertifikat publik.

## Bagikan secara privat dengan Serve

```bash
# di Debian
sudo tailscale serve --bg --https=443 http://127.0.0.1:3000
sudo tailscale serve status
```

Jika CLI meminta mengaktifkan HTTPS, ikuti URL resminya dan selesaikan persetujuan sebelum melanjutkan. Buka **URL yang dicetak oleh Serve** dari laptop atau HP yang terhubung ke tailnet. Kebijakan tailnet harus mengizinkan TCP 443 ke perangkat Debian.

`--bg` membuat konfigurasi tetap berjalan di latar, termasuk setelah restart Tailscale atau reboot. Itu tidak membuat aplikasimu otomatis hidup; proses di port 3000 tetap harus berjalan sendiri.

Uji dari perangkat yang diizinkan, lalu dari perangkat di luar tailnet. Untuk pengujian luar, matikan Tailscale dan gunakan jaringan seluler bila perlu. Jangan memakai sesi peramban dengan halaman yang sudah tersimpan sebagai bukti. Permintaan baru ke layanan Serve privat tidak boleh berhasil dari luar.

## Buka untuk publik dengan Funnel hanya jika sengaja

Jangan gunakan Funnel untuk panel admin, database, aplikasi debug, atau layanan yang mengandalkan tailnet sebagai satu-satunya autentikasi. Siapa pun di internet dapat mengirim permintaan ke endpoint Funnel; aplikasi perlu autentikasi dan perlindungan sendiri bila datanya tidak publik.

Pada port yang sama, konfigurasi terakhir menentukan visibilitas: Serve menjadikannya privat, Funnel menjadikannya publik. Hentikan contoh Serve tadi sebelum menggantinya:

```bash
sudo tailscale serve --bg --https=443 off
sudo tailscale funnel --bg --https=443 http://127.0.0.1:3000
sudo tailscale funnel status
```

Funnel memerlukan MagicDNS, HTTPS, dan atribut `funnel` dalam kebijakan tailnet. CLI memberikan tautan persetujuan jika fitur belum aktif. Periksa cakupan perubahan kebijakannya; jangan memberi semua anggota hak menerbitkan layanan jika hanya satu pengelola yang membutuhkan.

Menurut dokumentasi resmi per November 2026, Funnel masih beta, hanya memakai domain tailnet, dan mendengarkan pada port 443, 8443, atau 10000. Ada batas bandwidth yang tidak bisa diatur sendiri. Gunakan fitur ini untuk layanan yang sesuai batas tersebut, bukan pengganti otomatis seluruh infrastruktur web.

Uji URL hasilnya dari jaringan luar dengan Tailscale dimatikan. Kali ini permintaan baru memang harus berhasil. Grants mengatur siapa yang boleh mengaktifkan fitur dan akses dalam tailnet; jangan menganggap grants sebagai login bagi pengunjung internet Funnel.

## Matikan dan periksa dari luar

Untuk contoh Funnel di atas:

```bash
sudo tailscale funnel --bg --https=443 off
sudo tailscale funnel status
sudo tailscale serve status
```

Ulangi permintaan baru dari luar untuk memastikan endpoint publik sudah tidak tersedia. Bila ingin kembali privat, jalankan perintah Serve pada bagian sebelumnya, lalu ulangi uji privat dan publik. Untuk mematikan contoh Serve saja, gunakan `sudo tailscale serve --bg --https=443 off`.

Jangan hanya menutup terminal: konfigurasi `--bg` tetap aktif. Jika aplikasi aslinya juga mendengarkan pada IP publik, mematikan Funnel tidak menutup jalur publik yang terpisah itu.

## Referensi

- [CLI Serve](https://tailscale.com/docs/reference/tailscale-cli/serve)
- [CLI Funnel](https://tailscale.com/docs/reference/tailscale-cli/funnel)
- [Persyaratan dan batas Funnel](https://tailscale.com/docs/features/tailscale-funnel)

## Seri Tailscale untuk pemula

1. [Tailscale di Debian 13: hubungkan laptop dan server](/posts/tailscale-debian-pemula/)
2. [SSH Debian lewat Tailscale tanpa port publik](/posts/tailscale-ssh-debian/)
3. [MagicDNS: akses perangkat Tailscale pakai nama](/posts/tailscale-magicdns/)
4. [Buka aplikasi pengembangan dari HP lewat Tailscale](/posts/tailscale-frontend-hp/)
5. **Tailscale Serve dan Funnel: akses privat atau publik (artikel ini)**
6. [Batasi akses perangkat Tailscale dengan grants](/posts/tailscale-grants-pemula/)
7. [Subnet router Tailscale untuk akses jaringan rumah](/posts/tailscale-subnet-router/)
8. [Exit node Tailscale: koneksi internet lewat Debian](/posts/tailscale-exit-node/)
