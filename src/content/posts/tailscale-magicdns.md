---
title: "MagicDNS: akses perangkat Tailscale pakai nama"
date: 2026-11-11T22:02:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","dns","magicdns"]
description: "Aktifkan MagicDNS agar server Tailscale bisa diakses lewat nama perangkat. Bedakan nama pendek, domain tailnet, dan DNS publik."
---

MagicDNS memberi nama pada perangkat Tailscale sehingga kamu bisa mengetik `ssh admin@debian-rumah` tanpa menghafal IP. Nama itu menunjuk perangkat dalam tailnet; mengaktifkan MagicDNS tidak menerbitkan layanan ke internet.

Kedua perangkat harus sudah [terhubung ke Tailscale](/posts/tailscale-debian-pemula/). Pastikan akses memakai IP bekerja lebih dulu supaya masalah DNS tidak tertukar dengan masalah jaringan.

## Periksa nama perangkat dan MagicDNS

Buka [Machines](https://console.tailscale.com/admin/machines), pilih server, lalu periksa nama perangkatnya. Gunakan nama yang mudah dikenali, misalnya `debian-rumah`. Kalau perlu, ubah nama perangkat melalui konsol. Salin nama yang benar-benar tampil, termasuk akhiran tambahan jika terjadi benturan nama.

Buka [pengaturan DNS](https://console.tailscale.com/admin/dns) dan aktifkan MagicDNS jika belum aktif. Tailnet baru biasanya sudah mengaktifkannya. Catat juga domain tailnet milikmu, misalnya bentuk `nama-tailnet.ts.net`.

Klien harus menerima pengaturan DNS Tailscale. Di laptop Linux:

```bash
sudo tailscale set --accept-dns=true
```

Pada aplikasi desktop, periksa opsi penggunaan DNS Tailscale. Jangan menimpa `/etc/resolv.conf` secara manual; berkas itu bisa dikelola NetworkManager atau layanan resolver sistem.

## Coba nama pendek dan nama lengkap

Contoh berikut mengasumsikan server bernama `debian-rumah`. Jalankan di laptop:

```bash
ssh admin@debian-rumah
```

Nama lengkap menggabungkan nama perangkat dan domain tailnet. Jika konsol menampilkan `debian-rumah.nama-tailnet.ts.net`, alamat itulah yang dipakai, bukan domain contoh yang dipilih sembarang:

```bash
# ganti dengan nama lengkap yang disalin dari konsol
ssh admin@debian-rumah.nama-tailnet.ts.net
```

Nama pendek memakai domain pencarian yang dipasang Tailscale. Untuk perangkat yang dibagikan dari tailnet lain, gunakan nama lengkap. Kebijakan akses dan autentikasi SSH tetap berlaku; DNS hanya menerjemahkan nama.

## Memeriksa saat nama tidak ditemukan

Di laptop Linux, bandingkan hasil berikut dengan IP yang tertera di konsol:

```bash
getent ahosts debian-rumah
tailscale status
```

Jika IP bisa dipakai tetapi nama pendek gagal, coba nama lengkap. Jika keduanya gagal, cek apakah MagicDNS aktif dan klien menerima pengaturan DNS. VPN lain atau DNS terenkripsi yang diatur sendiri di peramban juga dapat mengubah jalur resolusi.

Di macOS, alat seperti `host` dan `nslookup` bisa melewati resolver sistem, sehingga kegagalannya tidak selalu berarti MagicDNS rusak. Uji dengan aplikasi yang memang akan dipakai, misalnya `ssh` atau `ping`. Ping biasa bisa ditolak kebijakan meskipun DNS berhasil; baca apakah nama telah diterjemahkan ke IP sebelum menilai hasilnya.

## Nama .ts.net tidak berarti layanan publik

MagicDNS tidak otomatis memasang HTTPS pada aplikasi atau mengubah alamat dengarnya. `http://debian-rumah:3000` hanya bekerja bila ada layanan di alamat yang terjangkau dan akses portnya diizinkan. Aplikasi yang hanya mendengarkan di `127.0.0.1` tetap tidak menerima koneksi langsung dari HP.

Untuk HTTPS pada aplikasi loopback, gunakan [Tailscale Serve](/posts/tailscale-serve-funnel/). Sertifikat HTTPS memakai nama lengkap perangkat dan domain tailnet. Penerbitannya dapat mencatat nama itu pada log transparansi sertifikat publik; hindari nama perangkat yang memuat informasi sensitif.

Jika hendak menonaktifkan DNS Tailscale sementara pada satu klien Linux, gunakan `sudo tailscale set --accept-dns=false`. Ini juga menghentikan penerimaan pengaturan DNS tailnet lain pada klien tersebut, bukan hanya nama pendek MagicDNS. Kembalikan ke `true` untuk memakainya lagi.

## Referensi

- [MagicDNS](https://tailscale.com/docs/features/magicdns)
- [Nama perangkat](https://tailscale.com/docs/concepts/machine-names)
- [Sertifikat HTTPS](https://tailscale.com/docs/how-to/set-up-https-certificates)

## Seri Tailscale untuk pemula

1. [Tailscale di Debian 13: hubungkan laptop dan server](/posts/tailscale-debian-pemula/)
2. [SSH Debian lewat Tailscale tanpa port publik](/posts/tailscale-ssh-debian/)
3. **MagicDNS: akses perangkat Tailscale pakai nama (artikel ini)**
4. [Buka aplikasi pengembangan dari HP lewat Tailscale](/posts/tailscale-frontend-hp/)
5. [Tailscale Serve dan Funnel: akses privat atau publik](/posts/tailscale-serve-funnel/)
6. [Batasi akses perangkat Tailscale dengan grants](/posts/tailscale-grants-pemula/)
7. [Subnet router Tailscale untuk akses jaringan rumah](/posts/tailscale-subnet-router/)
8. [Exit node Tailscale: koneksi internet lewat Debian](/posts/tailscale-exit-node/)
