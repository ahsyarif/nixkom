---
title: "Batasi akses perangkat Tailscale dengan grants"
date: 2026-11-11T22:05:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","grants","keamanan"]
description: "Batasi laptop agar hanya dapat SSH ke satu server lewat grants Tailscale. Periksa aturan allow-all dan uji izin serta penolakan akses."
---

Ketika beberapa perangkat bergabung ke dalam satu *tailnet*, bukan berarti semuanya harus boleh membuka semua layanan di setiap komputer. Bayangkan anggota tim atau salah satu perangkatmu hanya butuh akses SSH ke satu server tertentu, tetapi tidak seharusnya bisa menyentuh halaman admin atau database di port lain.

Fitur **grants** di Tailscale bekerja seperti kartu akses gedung: kita bisa mengatur agar laptop tertentu **hanya** diizinkan mengetuk port TCP `22` (SSH) pada satu server tertentu, sementara semua akses ke port lainnya langsung ditolak.

Contoh di artikel ini memakai OpenSSH biasa lewat jalur Tailscale (bukan fitur Tailscale SSH). Kamu memerlukan hak untuk mengedit file kebijakan *tailnet*, serta akses pemulihan ke server lewat jalur lain (misalnya konsol penyedia VPS) jika terjadi salah aturan. Pastikan juga kamu sudah bisa login SSH lewat IP Tailscale mengikuti [panduan SSH privat](/posts/tailscale-ssh-debian/).

## 1. Catat IP perangkat dan simpan salinan kebijakan awal

Sebelum mengubah kebijakan apa pun, buka halaman [Access controls](https://console.tailscale.com/admin/acls) di konsol admin Tailscale, lalu **salin dan simpan seluruh isi kebijakan saat ini ke catatan aman di komputermu**. Kalau nanti ada yang error, kamu bisa langsung mengembalikannya seperti semula.

Selanjutnya, lihat daftar perangkat dan catat alamat IPv4 Tailscale milik laptop dan servermu. Sebagai ilustrasi, kita pakai angka contoh berikut (ganti dengan IP perangkat aslimu):

| Perangkat | IP contoh | Akses yang diinginkan |
|---|---|---|
| Laptop pribadi | `100.101.102.10` | Boleh SSH ke server |
| Server Debian | `100.101.102.20` | Hanya menerima TCP port 22 dari laptop itu |

Catatan pemilihan target: memakai IP spesifik seperti di atas membatasi aturan hanya untuk satu perangkat itu saja (jika perangkat dihapus dan didaftarkan ulang ke Tailscale, IP-nya bisa berubah sehingga kebijakan harus diperbarui). Memakai identitas akun pengguna sebagai sumber (`src`) akan mencakup seluruh perangkat milik pengguna tersebut.

## 2. Pahami aturan penting: izin bersifat saling menambah!

Secara dasar, *grants* memakai prinsip **tolak secara bawaan (*deny-by-default*)**: lalu lintas apa pun yang tidak punya izin eksplisit akan ditolak. **Tetapi**, semua aturan izin yang ada di dalam file kebijakan digabungkan (*additive*). Artinya, menambahkan satu aturan baru yang sempit **tidak akan mencabut** izin dari aturan luas yang masih tertinggal!

Karena itu, sebelum menulis aturan pembatasan, periksa dulu isi kebijakanmu saat ini. Cari apakah ada aturan bawaan yang membolehkan semua ke semua (*allow-all*), misalnya:
- Di blok `grants`: aturan dengan `"src": ["*"]`, `"dst": ["*"]`, `"ip": ["*"]`.
- Di blok `acls` gaya lama: aturan dengan `"action": "accept"`, `"src": ["*"]`, `"dst": ["*:*"]`.

Selama aturan luas `"*"` tersebut masih bercokol di sana, contoh pembatasan di bawah tidak akan menghalangi akses apa pun!

**Jika memakai *tailnet* bersama tim atau kantor:** jangan asal menimpa seluruh kebijakan dengan contoh dua perangkat di bawah. Catat dulu semua akses yang masih dibutuhkan (akses admin lain, Tailscale Serve, subnet router, exit node, dll.), lalu ganti aturan *allow-all* tadi dengan daftar izin yang spesifik untuk tiap kebutuhan tersebut.

## 3. Contoh kebijakan untuk laboratorium dua perangkat

Pada **tailnet percobaan** yang memang hanya memiliki dua perangkat seperti tabel di atas, file kebijakan lengkap berikut memberikan satu izin SSH dan sekaligus menguji batas penolakannya:

```json
{
  "grants": [
    {
      "src": ["100.101.102.10"],
      "dst": ["100.101.102.20"],
      "ip": ["tcp:22"]
    }
  ],
  "tests": [
    {
      "src": "100.101.102.10",
      "accept": ["100.101.102.20:22"],
      "deny": ["100.101.102.20:80", "100.101.102.20:443"]
    }
  ]
}
```

Mari bedah dua bagian JSON di atas (ingat ganti alamat IP dengan milikmu):
1. **`grants`**: Aturan izin sesungguhnya. `src` (sumber) = laptop, `dst` (tujuan) = server Debian, `ip` = hanya protokol `tcp` di port `22`.
2. **`tests`**: Ini adalah **pengujian otomatis** milik editor kebijakan Tailscale (bukan aturan blokir!). Dengan blok `tests`, Tailscale otomatis mengecek setiap kali kamu menyimpan: benarkah laptop `100.101.102.10` diterima (`accept`) ke port `22` dan ditolak (`deny`) ke port `80` dan `443`? Jika masih ada aturan *allow-all* yang tertinggal, tes ini akan langsung gagal dan memperingatkanmu!

Jika kamu menerapkan ini pada *tailnet* yang sudah terpakai, gabungkan isi array `grants` dan `tests` di atas ke bagian yang sudah ada (jangan sampai ada dua kunci `"grants"` ganda dalam satu file JSON). Pertahankan juga bagian lain seperti `groups`, `tagOwners`, atau `nodeAttrs` yang masih dipakai. Validasi di editor kebijakan dan pastikan seluruh tes lulus sebelum menyimpan.

## 4. Uji koneksi nyata: yang diizinkan dan yang ditolak

Setelah kebijakan disimpan, buktikan langsung dari laptop yang diberi izin:

```bash
# ganti dengan IP Tailscale server
ssh -o ConnectTimeout=5 admin@100.101.102.20
```

Pastikan bisa login seperti biasa. Ingat: *grants* hanya membuka pintu jaringan Tailscale; untuk masuk SSH, kamu tetap membutuhkan kunci SSH yang terdaftar di `authorized_keys`. *Grants* tidak memasang SSH atau membuat akun Linux.

**Sekarang uji penolakannya di lapangan!** Ada satu jebakan logika saat mengetes blokir: kalau di servermu memang tidak ada aplikasi web di port `80`, lalu `curl` gagal, kegagalan itu bisa jadi cuma karena port `80`-nya memang mati—bukan karena diblokir oleh *grants*!

Karena itu, gunakan layanan HTTP uji yang **benar-benar sedang menyala** dan sebelumnya memang bisa kamu buka dari laptop sebelum kebijakan diperketat. Dari laptop yang sama, jalankan:

```bash
curl --connect-timeout 5 --max-time 10 http://100.101.102.20:80/
```

Jika aturan *grants* bekerja, koneksi kali ini harus gagal/timeout. Jika kamu punya perangkat ketiga di *tailnet* yang **tidak** diberi izin, coba juga SSH dari perangkat ketiga itu—harus ditolak pula.

## 5. Batasan *grants* dan cara memulihkan kalau salah atur

Dua hal penting yang tidak boleh dilupakan:
- ***Grants* hanya menjaga jalur jaringan Tailscale.** Akses lewat IP publik server atau akses dari jaringan lokal (LAN) kantor/rumah di luar Tailscale tetap harus dijaga memakai firewall seperti UFW.
- **Ping berhasil belum berarti semua port terbuka.** Koneksi ping (ICMP) bisa saja diizinkan atau diblokir terpisah dari izin port TCP seperti SSH atau HTTP.

Jika suatu saat kamu salah menulis kebijakan hingga akses penting terputus:
1. Buka konsol admin Tailscale lewat jalur administrasi yang masih bisa dipakai (atau gunakan konsol recovery VPS jika diperlukan).
2. Tempel kembali salinan kebijakan awal yang sudah kamu simpan di langkah 1, atau perbaiki izin yang kurang lalu jalankan `tests` lagi sebelum mempersempit akses.
3. Nanti, saat kamu menambahkan fitur seperti Tailscale Serve atau Exit Node dari seri panduan ini, tambahkan izinnya secara spesifik di `grants`—jangan tergoda mengembalikan aturan *allow-all* hanya agar cepat jalan!

## Referensi

- [Grants](https://tailscale.com/docs/features/access-control/grants)
- [Sintaks grants](https://tailscale.com/docs/reference/syntax/grants)
- [Pengujian kebijakan akses](https://tailscale.com/docs/reference/syntax/policy-file#tests)

## Seri Tailscale untuk pemula

1. [Tailscale di Debian 13: hubungkan laptop dan server](/posts/tailscale-debian-pemula/)
2. [SSH Debian lewat Tailscale tanpa port publik](/posts/tailscale-ssh-debian/)
3. [MagicDNS: akses perangkat Tailscale pakai nama](/posts/tailscale-magicdns/)
4. [Buka aplikasi pengembangan dari HP lewat Tailscale](/posts/tailscale-frontend-hp/)
5. [Tailscale Serve dan Funnel: akses privat atau publik](/posts/tailscale-serve-funnel/)
6. **Batasi akses perangkat Tailscale dengan grants (artikel ini)**
7. [Subnet router Tailscale untuk akses jaringan rumah](/posts/tailscale-subnet-router/)
8. [Exit node Tailscale: koneksi internet lewat Debian](/posts/tailscale-exit-node/)
