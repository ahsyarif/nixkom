---
title: "Tailscale Serve dan Funnel: akses privat atau publik"
date: 2026-11-11T22:04:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","https","serve","funnel"]
description: "Pilih Tailscale Serve untuk HTTPS privat atau Funnel untuk akses internet. Periksa target loopback, izin, dan cara menghentikan keduanya."
---

Misalnya kamu menjalankan aplikasi web lokal di server Debian pada `127.0.0.1:3000`, dan ingin membukanya lewat browser dengan alamat HTTPS yang rapi tanpa repot membeli domain atau mengurus sertifikat SSL sendiri. Tailscale punya dua fitur bernama **Serve** dan **Funnel** yang mirip bentuknya, tetapi **jauh berbeda tingkat aksesnya**:

- **Tailscale Serve (Privat):** Membagikan aplikasi dengan HTTPS **khusus** kepada perangkat yang tergabung (dan diizinkan) di dalam *tailnet*-mu sendiri. Orang luar tidak bisa membukanya.
- **Tailscale Funnel (Publik):** Membuka pintu aplikasi tersebut ke **seluruh internet**, termasuk kepada siapa saja yang tidak memakai Tailscale sama sekali.

Hati-hati: URL hasil Serve maupun Funnel sama-sama berakhiran `.ts.net`! Jadi melihat akhiran `.ts.net` saja belum cukup untuk mengetahui apakah sebuah layanan bersifat privat atau sudah terbuka ke dunia.

Contoh di bawah memakai server Debian yang sudah [terhubung ke Tailscale](/posts/tailscale-debian-pemula/), dengan aplikasi web berjalan di `127.0.0.1:3000`. Pastikan klien Tailscale-mu sudah versi baru (sintaks perintah Serve dan Funnel berubah sejak versi `1.52`). Perintah berikut mengacu pada dokumentasi resmi yang diperiksa November 2026.

## 1. Periksa aplikasi lokal (`loopback`) dan status saat ini

Di terminal Debian, pastikan aplikasimu benar-benar merespons dan hanya mendengarkan di alamat lokal (`127.0.0.1`), serta cek apakah sudah ada aturan Serve/Funnel lain yang sedang berjalan:

```bash
curl --fail http://127.0.0.1:3000/
sudo ss -ltnp 'sport = :3000'
tailscale version
tailscale serve status
tailscale funnel status
```

Jika ternyata sudah ada konfigurasi Serve atau Funnel yang aktif sebelumnya, catat dulu dan pilih port/jalur yang tidak menabraknya. **Jangan** asal menjalankan perintah `reset` hanya untuk mencoba satu aplikasi baru, karena `reset` akan menghapus semua konfigurasi Serve/Funnel lain yang ada di server itu.

Selain itu, pastikan [MagicDNS](/posts/tailscale-magicdns/) dan fitur HTTPS sudah aktif di konsol Tailscale (atau ikuti tautan persetujuan yang dicetak oleh CLI saat pertama kali dijalankan). Sertifikat HTTPS otomatis menggunakan nama lengkap perangkat + domain *tailnet*-mu (bukan domain `.ts.net` pilihan bebas), dan nama tersebut dapat masuk ke log transparansi sertifikat publik.

## 2. Bagikan secara privat dengan **Serve**

Untuk membagikan aplikasi di port `3000` menjadi layanan HTTPS privat di dalam *tailnet*:

```bash
# di Debian
sudo tailscale serve --bg --https=443 http://127.0.0.1:3000
sudo tailscale serve status
```

Penjelasan opsinya:
- `--bg` (*background*): menyimpan aturan penerusan ini di latar belakang, sehingga tetap aktif meskipun terminal ditutup, layanan Tailscale di-restart, atau server di-reboot. (**Penting:** `--bg` hanya menjaga aturan penerusan Tailscale-nya tetap hidup; proses aplikasi web milikmu di port `3000` tetap harus kamu jalankan sendiri!).
- `--https=443`: membungkus lalu lintas ke `http://127.0.0.1:3000` menjadi HTTPS standar (port `443`).

Jika CLI Tailscale memintamu mengaktifkan fitur HTTPS di konsol admin, klik URL resmi yang diberikan dan setujui sebelum lanjut.

### Cara menguji Serve
1. Buka **URL yang dicetak oleh perintah Serve** dari laptop atau HP yang terhubung ke *tailnet* yang sama (pastikan kebijakan *tailnet* mengizinkan TCP port `443` menuju server Debian).
2. **Wajib uji juga dari luar *tailnet*:** Matikan Tailscale di HP dan gunakan jaringan seluler, lalu buka URL tersebut. Jangan mengandalkan tab browser lama yang mungkin masih menampilkan halaman dari *cache*. Permintaan baru dari luar *tailnet* **harus gagal** untuk layanan Serve privat.

## 3. Buka untuk internet publik dengan **Funnel** (hanya jika benar-benar perlu!)

> **Peringatan keamanan:** Jangan pernah memakai Funnel untuk membuka panel admin, database, aplikasi debug, atau halaman apa pun yang mengandalkan Tailscale sebagai satu-satunya penjaga! Begitu Funnel aktif, **siapa pun di seluruh internet** bisa mengirim permintaan ke URL tersebut—pastikan aplikasinya memang ditujukan untuk publik atau sudah memiliki sistem login/keamanan sendiri yang kuat.

Pada port yang sama (misalnya `443`), perintah terakhir yang kamu jalankan menentukan sifat aksesnya: Serve menjadikannya privat, Funnel menjadikannya publik. Mari matikan contoh Serve di atas terlebih dahulu, lalu coba nyalakan Funnel:

```bash
sudo tailscale serve --bg --https=443 off
sudo tailscale funnel --bg --https=443 http://127.0.0.1:3000
sudo tailscale funnel status
```

Syarat Funnel agar bisa menyala: MagicDNS aktif, HTTPS aktif, dan akunmu memiliki atribut izin `funnel` di kebijakan *tailnet* (CLI akan memberi link persetujuan jika belum aktif). Saat menyalakan izin di kebijakan, periksa cakupannya—jangan memberi seluruh anggota tim hak membuka Funnel ke internet jika hanya satu pengelola yang membutuhkannya.

Menurut dokumentasi resmi per November 2026, Funnel masih berstatus beta, hanya memakai domain *tailnet*, hanya mendukung port `443`, `8443`, atau `10000`, dan memiliki batas *bandwidth* yang tidak bisa diatur sendiri. Karena itu, gunakan Funnel untuk keperluan yang cocok dengan batasan tersebut (misalnya tes webhook sementara atau demo singkat), bukan sebagai pengganti penuh seluruh infrastruktur web produksi.

Uji URL Funnel dari jaringan luar dengan Tailscale di HP dimatikan—kali ini permintaan baru harus berhasil terbuka. Ingat juga bahwa aturan `grants` Tailscale mengatur siapa yang boleh menyalakan fitur Funnel dan siapa yang boleh mengakses antarperangkat di dalam *tailnet*; `grants` **tidak** berfungsi sebagai halaman login bagi pengunjung internet yang datang lewat Funnel!

## 4. Matikan dan pastikan sudah tertutup dari luar

Jika sudah selesai mencoba Funnel (atau tidak mau aplikasinya terbuka lagi ke internet), matikan dengan `off` dan cek statusnya:

```bash
sudo tailscale funnel --bg --https=443 off
sudo tailscale funnel status
sudo tailscale serve status
```

Uji ulang membuka URL-nya dari luar *tailnet* (Tailscale mati) untuk membuktikan layanan publik tersebut sudah benar-benar tidak bisa dijangkau. Jika ingin mengembalikannya menjadi akses privat saja, jalankan ulang perintah `tailscale serve` dari langkah 2, lalu uji kembali dari dalam dan luar *tailnet*. Untuk mematikan layanan Serve privat saja, jalankan `sudo tailscale serve --bg --https=443 off`.

**Dua hal yang sering bikin salah sangka:**
1. Sekadar menutup jendela terminal **tidak** mematikan Serve atau Funnel karena tadi kita memakai `--bg`. Kamu harus mematikannya secara eksplisit dengan `off`.
2. Jika aplikasi web aslimu sejak awal juga mendengarkan di IP publik (`0.0.0.0`), mematikan Funnel hanya menutup pintu `.ts.net`—pintu langsung melalui IP publik server tetap terbuka kecuali kamu menutupnya di aplikasi atau firewall.

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
