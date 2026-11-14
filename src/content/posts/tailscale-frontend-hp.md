---
title: "Buka aplikasi pengembangan dari HP lewat Tailscale"
date: 2026-11-11T22:03:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","frontend","vite"]
description: "Uji tampilan aplikasi Debian dari HP lewat Tailscale. Gunakan alamat privat, batasi host Vite, dan hindari membuka dev server ke internet."
---

Sedang membuat tampilan web di komputer atau server Debian, lalu ingin langsung mengetes tampilannya di layar HP? Biasanya kamu harus berada di jaringan Wi-Fi yang sama, itu pun sering terhalang aturan router kantor atau kafe yang memblokir koneksi antarperangkat.

Dengan Tailscale, HP milikmu bisa langsung membuka server pengembangan (*dev server*) di Debian meskipun keduanya berada di jaringan yang sama sekali berbeda—misalnya Debian di rumah dan HP memakai kuota seluler.

Kenapa tidak bisa langsung buka `http://localhost:5173` di HP? Karena **`localhost` selalu berarti "perangkat ini sendiri"**. Kalau kamu mengetik `localhost` di browser HP, HP akan mencari aplikasi di dalam dirinya sendiri, bukan di komputer Debian-mu! Solusinya, kita memanggil **alamat IP Tailscale** milik komputer Debian.

Contoh berikut memakai proyek frontend **Vite** yang sudah berjalan di Debian dengan skrip `npm run dev`. Sebelum mulai, pastikan kamu sudah menyelesaikan [pemasangan Tailscale](/posts/tailscale-debian-pemula/) di Debian dan di HP, login ke *tailnet* yang sama, lalu aktifkan koneksinya di HP.

## 1. Jalankan Vite hanya pada IP Tailscale

Pertama, lihat alamat IP privat Tailscale milik komputer Debian-mu:

```bash
tailscale ip -4
```

Misalnya muncul `100.101.102.103`. Dari dalam folder proyekmu, jalankan Vite sambil mengarahkan `--host` ke IP Tailscale tersebut secara spesifik:

```bash
# di Debian; ganti IP dengan hasil tailscale ip -4 milikmu
npm run dev -- --host 100.101.102.103 --port 5173 --strictPort
```

Penjelasan opsi di atas:
- `--` (tanda pisah ganda): memberi tahu `npm` agar meneruskan opsi-opsi setelahnya langsung ke Vite.
- `--host 100.101.102.103`: menyuruh Vite mendengarkan hanya pada jalur privat Tailscale, bukan `0.0.0.0` (yang terbuka ke semua kartu jaringan termasuk IP publik).
- `--strictPort`: membuat Vite langsung berhenti dengan pesan error jika port `5173` sudah terpakai, bukan diam-diam pindah ke port `5174`. (Catatan: perintah di atas khusus Vite; framework lain seperti Astro atau Next.js mungkin memakai nama opsi yang berbeda).

Untuk memastikannya, buka terminal Debian lain dan cek di alamat mana port `5173` sedang mendengarkan:

```bash
ss -ltnp 'sport = :5173'
```

Pastikan yang tertera adalah IP Tailscale milikmu (`100.101.102.103:5173`), **bukan** `0.0.0.0:5173` atau `[::]:5173`. Dengan mengikat ke IP privat saja, aplikasi pengembanganmu aman dari koneksi luar di internet publik. Jika muncul error bahwa alamat tidak tersedia, cek kembali apakah Tailscale di Debian sedang menyala dan IP yang diketik sudah persis sama.

## 2. Buka aplikasinya dari browser HP

Di browser HP (Chrome/Safari), ketik alamat lengkap beserta `http://` dan nomor portnya:

```text
http://100.101.102.103:5173
```

(Ganti `100.101.102.103` dengan IP Tailscale Debian-mu, dan pastikan HP membukanya sebagai URL alamat web, bukan hasil pencarian Google).

**Bagaimana kalau halaman tidak mau terbuka?**
1. Cek kebijakan *tailnet* (ACL/grants) apakah HP sudah diizinkan mengakses port TCP `5173` menuju Debian.
2. Cek firewall di Debian. **Jangan** membuka port `5173` ke seluruh internet sebagai jalan pintas! Jika memakai UFW, cukup izinkan khusus di antarmuka `tailscale0`:

```bash
# di Debian, hanya tambahkan jika firewallmu memang memblokir port ini
sudo ufw allow in on tailscale0 to any port 5173 proto tcp
```

Ingat bahwa aturan `netfilter` bawaan Tailscale dan aturan UFW bisa saling berinteraksi. Untuk benar-benar membatasi perangkat mana saja di *tailnet* yang boleh mengakses layananmu, gunakan [grants](/posts/tailscale-grants-pemula/) dan uji langsung dari HP yang diizinkan vs perangkat lain yang tidak diberi izin.

## 3. Mengatasi panggilan API `localhost` dan fitur yang butuh HTTPS

Setelah tampilan frontend terbuka di HP, ada dua masalah lanjutan yang sangat sering ditemui pemula:

### Masalah A: Frontend memanggil API di `http://localhost:3000`
Kalau kode frontendmu memanggil backend lewat alamat `http://localhost:3000`, saat dibuka dari HP, browser HP akan mencoba menghubungi port `3000` di dalam HP itu sendiri—dan pasti gagal!

**Solusi rapi:** Atur fitur **proxy** di konfigurasi Vite (`vite.config.ts`) untuk meneruskan rute `/api` ke backend `http://127.0.0.1:3000` di server Debian, lalu ubah kode frontend agar memanggil path relatif seperti `fetch('/api/products')`. Dengan cara ini, kamu tidak perlu membuka port backend tambahan dan terhindar dari masalah *CORS*.

### Masalah B: Fitur browser menolak jalan tanpa HTTPS
Walaupun koneksi Tailscale sebenarnya sudah terenkripsi di jaringan, browser HP tetap melihat alamat `http://100.101.102.103:5173` sebagai **HTTP biasa** (bukan HTTPS). Fitur browser yang mewajibkan *secure context* (HTTPS)—seperti akses kamera, mikrofon, lokasi GPS, atau *clipboard*—bisa saja diblokir oleh browser.

**Solusi rapi:** Gunakan [Tailscale Serve dengan HTTPS](/posts/tailscale-serve-funnel/), lalu jalankan kembali Vite di `127.0.0.1` saja sebagai target lokal untuk `Serve`.

### Masalah C: Vite menolak nama host MagicDNS
Jika kamu mengakses memakai nama MagicDNS (misalnya `http://debian-rumah.nama-tailnet.ts.net:5173`) dan Vite memunculkan pesan bahwa host tidak diizinkan (*blocked request*), tambahkan **hanya nama lengkap perangkat tersebut** ke daftar `server.allowedHosts` di file konfigurasi Vite. **Jangan** menyetel `allowedHosts: true` karena itu mematikan perlindungan penting terhadap serangan *DNS rebinding*. (Jika mengakses langsung lewat IP, pengaturan ini tidak dibutuhkan).

## 4. Matikan setelah selesai menguji

Begitu selesai mengetes dari HP:
1. Kembali ke terminal Vite dan tekan `Ctrl+C` untuk mematikannya.
2. Cek ulang dengan `ss -ltnp 'sport = :5173'` untuk memastikan port sudah tertutup.
3. Hapus aturan UFW port `5173` tadi jika hanya dibuat sementara untuk percobaan.

> **Penting:** Jangan pernah memakai *dev server* (seperti `npm run dev`) untuk melayani pengguna sungguhan di produksi. Kode sumber mentah, pesan error terperinci, dan jalur pengembangan tidak dirancang untuk menghadapi lalu lintas publik yang tidak tepercaya.

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
