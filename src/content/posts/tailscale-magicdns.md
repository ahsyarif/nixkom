---
title: "MagicDNS: akses perangkat Tailscale pakai nama"
date: 2026-11-11T22:02:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","dns","magicdns"]
description: "Aktifkan MagicDNS agar server Tailscale bisa diakses lewat nama perangkat. Bedakan nama pendek, domain tailnet, dan DNS publik."
---

Menghafal deretan angka IP seperti `100.101.102.103` setiap kali mau terhubung ke server itu rasanya seperti harus menghafal nomor telepon semua temanmu secara manual. Di dunia nyata, kita menyimpan kontak dengan nama. Di Tailscale, fitur **MagicDNS** melakukan hal yang persis sama: ia memberi nama yang mudah diingat untuk setiap perangkat di *tailnet*-mu.

Dengan MagicDNS aktif, kamu cukup mengetik `ssh admin@debian-rumah` alih-alih mengetik angka IP. Penting untuk diketahui: nama ini hanya berlaku untuk perangkat-perangkat di dalam jaringan privat *tailnet*-mu; menyalakan MagicDNS **tidak** membuat layananmu terbuka ke internet publik.

**Prasyarat:** Kedua perangkat (laptop dan server Debian) harus sudah [terhubung ke Tailscale](/posts/tailscale-debian-pemula/). Pastikan dulu kamu bisa terhubung memakai alamat IP sebelum memakai nama—supaya kalau ada kendala, kita langsung tahu apakah masalahnya ada di jaringan atau di penerjemahan nama (DNS).

## 1. Cek nama perangkat dan nyalakan MagicDNS

Pertama, buka halaman [Machines](https://console.tailscale.com/admin/machines) di dasbor Tailscale, pilih server Debian milikmu, lalu perhatikan nama perangkatnya. Pakai nama yang singkat dan gampang dikenali, misalnya `debian-rumah` (jika perlu, kamu bisa mengganti namanya langsung dari konsol).

Salin nama yang benar-benar tampil di konsol, termasuk akhiran angka tambahan jika kebetulan ada nama perangkat yang kembar.

Selanjutnya, buka [pengaturan DNS](https://console.tailscale.com/admin/dns) di konsol dan pastikan fitur **MagicDNS** aktif (untuk akun/*tailnet* baru, fitur ini biasanya sudah menyala otomatis). Catat juga nama **domain tailnet** milikmu yang tertera di halaman itu—bentuknya kira-kira seperti `nama-tailnet.ts.net`.

Agar laptopmu mau menerima daftar nama dari Tailscale, pastikan setelan DNS Tailscale aktif di perangkat klien:
- **Di laptop Linux:** jalankan perintah ini:

```bash
sudo tailscale set --accept-dns=true
```

- **Di aplikasi desktop (Windows/macOS):** cek menu pengaturan aplikasi Tailscale dan pastikan opsi penggunaan DNS Tailscale aktif.

> **Jangan lakukan:** Jangan mengedit atau menimpa file `/etc/resolv.conf` secara manual di Linux, karena file tersebut dikelola otomatis oleh `NetworkManager` atau layanan resolver sistem dan bisa bentrok atau tertimpa ulang.

## 2. Coba panggil nama pendek dan nama lengkap

Misalkan server Debian-mu bernama `debian-rumah`. Dari terminal laptop, coba masuk dengan nama pendeknya saja:

```bash
ssh admin@debian-rumah
```

Selain nama pendek, setiap perangkat juga punya **nama lengkap (FQDN)** yang menggabungkan nama perangkat dan domain *tailnet*-mu. Jika di konsol Tailscale tertera `debian-rumah.nama-tailnet.ts.net`, pakai persis nama lengkap yang tampil di konsolmu itu (jangan menyalin domain contoh di artikel ini):

```bash
# ganti dengan nama lengkap persis seperti yang tampil di konsol Tailscale-mu
ssh admin@debian-rumah.nama-tailnet.ts.net
```

Kapan pakai nama pendek dan kapan pakai nama lengkap?
- **Nama pendek** (`debian-rumah`) bekerja otomatis untuk perangkat di dalam *tailnet*-mu sendiri karena Tailscale memasang domain pencarian otomatis di sistem.
- **Nama lengkap** (`debian-rumah.nama-tailnet.ts.net`) wajib dipakai kalau kamu mengakses perangkat yang dibagikan dari *tailnet* orang lain (atau dipakai untuk alamat URL HTTPS).

Ingat: MagicDNS hanyalah "buku kontak" yang menerjemahkan nama menjadi angka IP. Kebijakan izin akses dan autentikasi SSH tetap berlaku seperti biasa.

## 3. Cara mengecek kalau nama tidak ditemukan

Jika koneksi memakai nama gagal, jangan langsung menebak. Cek dulu dari laptop Linux apakah nama `debian-rumah` sudah diterjemahkan ke alamat IP Tailscale yang benar seperti di konsol:

```bash
getent ahosts debian-rumah
tailscale status
```

Langkah diagnosa bertahap:
1. Jika mengakses lewat **IP berhasil**, tetapi lewat **nama pendek gagal**, coba gunakan **nama lengkap** (`.ts.net`).
2. Jika **keduanya gagal**, periksa kembali apakah MagicDNS sudah aktif di dasbor dan apakah laptopmu sudah menyalakan `accept-dns`.
3. Cek apakah di laptop ada VPN lain yang sedang menyala atau fitur *DNS over HTTPS / Secure DNS* yang diatur khusus di browser—keduanya bisa membelokkan pencarian nama keluar dari jalur Tailscale.

**Catatan khusus pengguna macOS:** Alat diagnostik terminal seperti `host` dan `nslookup` sering kali melewati (*bypass*) sistem resolver bawaan macOS, sehingga perintah itu bisa saja terlihat gagal padahal MagicDNS sebenarnya berjalan normal! Lebih baik uji langsung dengan aplikasi yang hendak kamu pakai (misalnya `ssh` atau `ping`). Catatan lain: `ping` biasa bisa saja ditolak oleh aturan firewall/kebijakan meskipun penerjemahan nama sudah berhasil—perhatikan dulu apakah nama berhasil berubah menjadi IP sebelum menyimpulkan hasilnya.

## 4. Nama `.ts.net` tidak otomatis berarti aman pakai HTTPS atau terbuka ke publik

Ada dua kesalahpahaman yang paling sering terjadi pada pemula setelah melihat alamat `.ts.net`:
1. **MagicDNS tidak otomatis menyalakan HTTPS** pada aplikasimu, dan tidak mengubah di alamat mana aplikasimu mendengarkan.
2. Membuka `http://debian-rumah:3000` hanya akan berhasil jika aplikasi tersebut benar-benar mendengarkan pada alamat Tailscale (bukan `127.0.0.1`) dan port `3000` diizinkan. Aplikasi yang cuma berjalan di `127.0.0.1` tetap tidak akan bisa dibuka langsung dari HP.

Kalau kamu ingin mengakses aplikasi lokal (`127.0.0.1`) lewat alamat HTTPS `.ts.net` yang rapi, gunakan fitur [Tailscale Serve](/posts/tailscale-serve-funnel/).

Perlu diketahui juga, saat Tailscale menerbitkan sertifikat HTTPS untuk nama lengkap perangkat dan domain *tailnet*-mu, nama lengkap tersebut dapat tercatat di log transparansi sertifikat publik (*Certificate Transparency log*). Karena itu, **hindari memberi nama perangkat dengan kata-kata sensitif atau rahasia** (seperti nama klien rahasia atau kata sandi).

Terakhir, jika suatu saat kamu ingin mematikan penerimaan DNS Tailscale sementara di satu klien Linux, jalankan `sudo tailscale set --accept-dns=false` (perhatikan bahwa ini juga menghentikan pengaturan DNS *tailnet* lainnya di mesin tersebut, bukan hanya nama pendek MagicDNS). Kembalikan ke `true` saat ingin memakainya lagi.

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
