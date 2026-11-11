---
title: "Batasi akses perangkat Tailscale dengan grants"
date: 2026-11-11T22:05:00+07:00
categories: ["Linux", "Networking"]
tags: ["tailscale","debian","pemula","grants","keamanan"]
description: "Batasi laptop agar hanya dapat SSH ke satu server lewat grants Tailscale. Periksa aturan allow-all dan uji izin serta penolakan akses."
---

Perangkat yang bergabung ke tailnet tidak harus boleh mengakses semua layanan. Grants Tailscale bisa membatasi satu laptop agar hanya menghubungi TCP 22 pada satu server, sementara aksesnya ke port lain tidak diberikan.

Contoh memakai OpenSSH biasa melalui Tailscale, bukan fitur Tailscale SSH. Kamu perlu hak mengedit kebijakan tailnet dan akses pemulihan server di luar jalur yang sedang diubah. Periksa [panduan SSH privat](/posts/tailscale-ssh-debian/) jika belum bisa login lewat IP Tailscale.

## Catat perangkat dan kebijakan awal

Salin kebijakan yang sekarang dari [Access controls](https://console.tailscale.com/admin/acls) ke tempat aman. Di daftar perangkat, catat IP Tailscale IPv4 laptop dan server. Contoh ini memakai alamat ilustrasi:

| Perangkat | IP contoh | Akses yang diinginkan |
|---|---|---|
| Laptop pribadi | `100.101.102.10` | Boleh SSH ke server |
| Server Debian | `100.101.102.20` | Menerima TCP 22 dari laptop |

Ganti keduanya dengan IP perangkatmu. Pemilihan IP membuat contoh membatasi perangkat tertentu; memakai identitas pengguna sebagai sumber dapat mencakup beberapa perangkat milik pengguna itu. Jika perangkat dihapus lalu didaftarkan lagi, periksa ulang alamat dan kebijakan.

## Pahami bahwa izin saling menambah

Grants memakai pendekatan *deny-by-default*: lalu lintas yang tidak mendapat izin ditolak. Tetapi semua izin yang cocok digabungkan. Menambahkan aturan sempit tidak mencabut izin dari aturan luas yang sudah ada.

Cari grants yang membolehkan semua sumber ke semua tujuan, misalnya `src: ["*"]`, `dst: ["*"]`, `ip: ["*"]`. Periksa juga ACL lama yang berisi `action: "accept"`, `src: ["*"]`, dan `dst: ["*:*"]`. Selama aturan luas itu tetap berlaku, contoh pembatasan berikut tidak menghasilkan isolasi yang diinginkan.

Untuk tailnet bersama, daftar dahulu seluruh akses yang masih diperlukan, termasuk admin, Serve, subnet router, dan exit node. Ganti izin luas dengan izin spesifik yang mempertahankan kebutuhan tersebut. Jangan menimpa seluruh kebijakan kantor dengan contoh dua perangkat.

## Contoh kebijakan laboratorium dua perangkat

Pada **tailnet percobaan** yang memang hanya membutuhkan alur tadi, dokumen lengkap berikut memberi satu izin jaringan dan menguji batasnya:

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

Ganti alamat di grants **dan** tests. Pemeriksaan `deny` adalah pernyataan pengujian, bukan aturan penolakan yang mengalahkan izin lain. Jika izin luas masih tersisa, pengujian port 80/443 semestinya gagal.

Pada tailnet yang sudah dipakai, gabungkan bagian grants dan tests ini ke bagian yang sudah ada; jangan membuat kunci JSON ganda. Pertahankan bagian lain seperti `groups`, `tagOwners`, dan `nodeAttrs` yang masih dibutuhkan. Validasi di editor kebijakan dan periksa hasil tes sebelum menyimpan. Contoh lengkap laboratorium di atas tidak mempertahankan fungsi tailnet lain.

## Uji koneksi baru, termasuk penolakan

Setelah disimpan, dari laptop yang diizinkan:

```bash
# ganti dengan IP Tailscale server
ssh -o ConnectTimeout=5 admin@100.101.102.20
```

Login tetap memerlukan kunci yang diterima OpenSSH. Grants tidak memasang SSH, tidak membuat akun Linux, dan tidak menggantikan `authorized_keys`.

Untuk menguji penolakan di lapangan, gunakan layanan HTTP yang memang sudah berjalan dan dapat diakses sebelum kebijakan dibatasi. Dari laptop yang sama, permintaan baru berikut harus gagal:

```bash
curl --connect-timeout 5 --max-time 10 http://100.101.102.20:80/
```

Jika port 80 memang tidak punya layanan, kegagalannya tidak membuktikan grants bekerja. Gunakan hasil tests di editor dan layanan uji yang diketahui hidup untuk membedakan penolakan kebijakan dari layanan mati. Bila ada perangkat lain yang tidak diberi izin, coba SSH baru dari perangkat tersebut; koneksi itu juga harus ditolak.

## Batas aturan dan pemulihan

Grants ini hanya membatasi jalur Tailscale. SSH melalui IP publik atau akses dari LAN server perlu firewall terpisah. Ping yang berhasil juga tidak membuktikan seluruh port diizinkan.

Jika akses yang diperlukan putus, buka konsol kebijakan lewat jalur administrasi yang masih tersedia dan pulihkan salinan sebelumnya. Perbaiki izin yang kurang, lalu jalankan tes lagi sebelum mempersempit akses. Saat menambah Serve atau exit node dari seri ini, tambahkan izin tujuannya secara sengaja; jangan mengembalikan allow-all agar semuanya cepat bekerja.

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
