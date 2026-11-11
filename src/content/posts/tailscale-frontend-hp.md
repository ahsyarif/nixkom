---
title: "Buka aplikasi pengembangan dari HP lewat Tailscale"
date: 2026-11-11T22:03:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","frontend","vite"]
description: "Uji tampilan aplikasi Debian dari HP lewat Tailscale. Gunakan alamat privat, batasi host Vite, dan hindari membuka dev server ke internet."
---

HP yang terhubung ke Tailscale bisa membuka aplikasi pengembangan di Debian tanpa berada pada Wi-Fi yang sama. `localhost` di HP tetap berarti HP itu sendiri, jadi kamu perlu memakai IP Tailscale komputer yang menjalankan aplikasinya.

Contoh ini memakai proyek Vite yang sudah berjalan di Debian dan skrip npm `dev` yang memanggil Vite. Kerjakan [pemasangan Tailscale](/posts/tailscale-debian-pemula/) pada Debian dan HP terlebih dahulu. Pilih tailnet yang sama, lalu aktifkan koneksi di HP.

## Jalankan Vite pada IP Tailscale

Di Debian, lihat alamat privatnya:

```bash
tailscale ip -4
```

Misalnya hasilnya `100.101.102.103`. Dari folder proyek, jalankan Vite dengan alamat itu secara eksplisit:

```bash
# di Debian; ganti IP dengan hasil tailscale ip -4
npm run dev -- --host 100.101.102.103 --port 5173 --strictPort
```

`--strictPort` membuat Vite berhenti jika port 5173 terpakai, bukan diam-diam memilih port lain. Perintah tersebut khusus proyek Vite; opsi Astro atau framework lain tidak selalu sama.

Periksa alamat dengarnya dari terminal Debian lain:

```bash
ss -ltnp 'sport = :5173'
```

Yang dicari adalah IP Tailscale di port 5173, bukan `0.0.0.0:5173` atau `[::]:5173`. Mengikat ke IP privat menghindari layanan menerima koneksi langsung pada IP publik server. Jika muncul galat alamat tidak tersedia, pastikan Tailscale masih terhubung dan IP yang dipakai memang milik Debian itu.

## Buka alamatnya dari HP

Di peramban HP, masukkan alamat lengkap:

```text
http://100.101.102.103:5173
```

Ganti IP contoh. Pastikan kolom alamat membukanya sebagai URL, bukan pencarian. Jika halaman tidak muncul, periksa kebijakan tailnet: HP perlu izin TCP 5173 menuju Debian. Firewall host juga bisa memengaruhi hasil; jangan membuka port 5173 untuk seluruh internet sebagai jalan pintas.

Bila memakai UFW, aturan antarmuka yang sempit bisa ditambahkan sesuai kebutuhan:

```bash
# di Debian, hanya jika diperlukan oleh firewall yang kamu kelola
sudo ufw allow in on tailscale0 to any port 5173 proto tcp
```

Aturan netfilter Tailscale dan UFW bisa berinteraksi. Untuk pembatasan antarperangkat, gunakan [grants](/posts/tailscale-grants-pemula/) dan uji dari HP yang diizinkan serta perangkat lain yang tidak diizinkan.

## Periksa API dan fitur yang membutuhkan HTTPS

Jika frontend memanggil `http://localhost:3000`, HP akan mencoba menghubungi port 3000 miliknya sendiri. Untuk pengembangan, gunakan *proxy* Vite menuju API loopback di Debian dan panggil API dengan path relatif seperti `/api`. Ini menghindari membuka port API tambahan dan mengurangi masalah CORS.

HTTP melalui Tailscale dienkripsi pada jalur Tailscale, tetapi peramban tetap melihat URL HTTP. API peramban yang membutuhkan *secure context*, misalnya sebagian akses kamera, mungkin tidak tersedia. Untuk itu, gunakan [Serve dengan HTTPS](/posts/tailscale-serve-funnel/) dan kembalikan Vite ke `127.0.0.1` sebagai target lokalnya.

Jika memakai nama MagicDNS dan Vite menolak nama host, tambahkan **nama lengkap perangkat itu saja** ke `server.allowedHosts` di konfigurasi Vite. Jangan memakai `allowedHosts: true`; pengaturan tersebut melepas perlindungan terhadap DNS rebinding. Akses langsung lewat IP tidak membutuhkan daftar nama host tambahan pada Vite.

## Hentikan setelah pengujian

Tekan `Ctrl+C` pada terminal Vite dan periksa lagi port 5173 dengan `ss`. Hapus aturan firewall khusus percobaan jika tadi menambahkannya dan tidak dipakai lagi. Jangan memakai dev server untuk melayani pengguna produksi; sumber kode, pesan galat, dan endpoint pengembangan tidak dirancang sebagai layanan publik.

## Referensi

- [Opsi server Vite, termasuk host dan allowedHosts](https://vite.dev/config/server-options)
- [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)

## Seri Tailscale untuk pemula

1. [Tailscale di Debian 13: hubungkan laptop dan server](/posts/tailscale-debian-pemula/)
2. [SSH Debian lewat Tailscale tanpa port publik](/posts/tailscale-ssh-debian/)
3. [MagicDNS: akses perangkat Tailscale pakai nama](/posts/tailscale-magicdns/)
4. **Buka aplikasi pengembangan dari HP lewat Tailscale (artikel ini)**
5. [Tailscale Serve dan Funnel: akses privat atau publik](/posts/tailscale-serve-funnel/)
6. [Batasi akses perangkat Tailscale dengan grants](/posts/tailscale-grants-pemula/)
7. [Subnet router Tailscale untuk akses jaringan rumah](/posts/tailscale-subnet-router/)
8. [Exit node Tailscale: koneksi internet lewat Debian](/posts/tailscale-exit-node/)
