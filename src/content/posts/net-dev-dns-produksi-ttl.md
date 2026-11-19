---
title: "DNS Praktis untuk Produksi: Record, TTL, Internal DNS, & Migrasi Aman"
date: 2026-11-19T13:02:00+07:00
categories:
  - Networking
  - DevOps
  - Server
tags:
  - networking
  - dns
  - devops
  - cloud
  - pemula
description: "Panduan praktis DNS untuk Developer dan DevOps: memilih tipe record A, AAAA, CNAME, MX, TXT, memahami jebakan root apex CNAME, internal DNS Docker/cloud, serta trik menurunkan TTL sebelum migrasi server."
---

Di panduan pemula biasa, DNS cuma dijelaskan sebagai *"buku kontak telepon yang mengubah nama domain menjadi IP"*. Padahal dalam pekerjaan **Developer dan DevOps sehari-hari**, salah menaruh satu record DNS saja bisa bikin email perusahaan gagal terkirim, sertifikat SSL gagal terbit, atau pengguna masih tersesat ke server lama berjam-jam setelah migrasi!

Mari pahami cara mengelola DNS secara rapi untuk sistem produksi.

---

## 1. Enam Tipe DNS Record yang Paling Sering Dipakai DevOps

| Tipe Record | Fungsinya | Contoh Nyata | Catatan Penting |
| --- | --- | --- | --- |
| **`A`** | Memetakan domain -> alamat **IPv4** | `api.contoh.com -> 203.0.113.10` | Tipe paling mendasar untuk menunjuk langsung ke IP VPS. |
| **`AAAA`** | Memetakan domain -> alamat **IPv6** | `api.contoh.com -> 2001:db8::10` | **Hati-hati:** Jangan pasang `AAAA` jika web server/firewall VPS-mu belum dikonfigurasi melayani IPv6! |
| **`CNAME`** | Alias: memetakan nama domain -> **nama domain lain** | `www.contoh.com -> contoh.pages.dev` | Ideal saat IP tujuan dikelola pihak ketiga (CDN, Vercel, Load Balancer AWS) yang IP-nya bisa berganti! |
| **`MX`** | Menunjuk server penerima **email** domain tersebut | `@ -> mail.contoh.com (priority 10)` | Angka *priority* lebih kecil = dicoba lebih dulu. |
| **`TXT`** | Menyimpan teks bebas (verifikasi & pengaman email) | Verifikasi Google/Domain, **`SPF`**, **`DKIM`**, **`DMARC`** | Wajib rapi kalau aplikasimu mengirim email agar tidak masuk folder Spam! |
| **`NS`** | Menunjuk server DNS otoritatif pengelola seluruh catatan domainmu | `ns1.cloudflare.com` | Diatur di pendaftar domain (*registrar*) saat mengarahkan DNS ke Cloudflare / Route 53. |

---

## 2. Jebakan Klasik `CNAME` di Root Domain (`@` / Apex)

Salah satu error paling membingungkan di panel DNS klasik adalah ketika kamu mencoba membuat:

```text
CNAME   @   ->   app.railway.app
```

Lalu panel DNS **menolak menyimpannya**! Mengapa?

Sesuai aturan standar DNS (`RFC 1034/1035`), **sebuah nama tidak boleh memiliki `CNAME` bersamaan dengan record lain seperti `NS` atau `SOA`**. Padahal root domain (`@`, misalnya `contoh.com` tanpa `www`) **wajib** memiliki record `NS` dan `SOA`!

**Dua solusi standar di produksi:**
1. Gunakan DNS provider modern yang mendukung **CNAME Flattening / ALIAS / ANAME** (seperti Cloudflare, Route 53 Alias, Bunny DNS)—di belakang layar, provider diam-diam mengubah `CNAME` tersebut menjadi IP `A` saat menjawab resolver!
2. Atau arahkan root domain (`@`) ke reverse proxy/IP statis (`A record`) yang me-redirect `contoh.com` -> `www.contoh.com` (`CNAME`).

---

## 3. Internal DNS di Lingkungan Lokal, Docker, & Cloud

DNS tidak hanya hidup di internet publik! Sebagai Developer & DevOps, kamu memakai DNS internal setiap hari:

1. **Di laptop (`/etc/hosts`):**  
   Urutan pencarian nama di Linux umumnya membaca `/etc/hosts` dulu sebelum bertanya ke server DNS luar (cek dengan `getent hosts nama-host`). Berguna untuk pengujian lokal, tapi jangan dipakai sebagai pengganti DNS di banyak server produksi karena repot disinkronkan.
2. **Di Docker Compose (Service Discovery):**  
   Di dalam jaringan custom Docker Compose, kamu **tidak perlu mencari tahu IP container PostgreSQL** (`172.18.0.3`) yang bisa berubah saat restart! Cukup sambungkan aplikasimu ke hostname `db:5432` (nama *service* di `compose.yaml`) karena **Docker menyediakan DNS internal otomatis** (`127.0.0.11`) di dalam container!
3. **Di VPN / Cloud Private Network:**  
   Layanan seperti **Tailscale MagicDNS** atau **AWS Route 53 Private Hosted Zone** memungkinkan server memanggil database privat lewat nama `db-prod` tanpa mengekspos IP atau nama host internal itu ke DNS internet publik.

---

## 4. Memahami `TTL` & Trik Migrasi Server Tanpa Downtime

Setiap record DNS punya angka **TTL (*Time To Live*)** dalam satuan detik—misalnya `3600` (1 jam) atau `300` (5 menit). TTL memberi tahu resolver dan browser di seluruh dunia: *"Simpan jawaban IP ini di cache selama 3600 detik sebelum bertanya lagi!"*

**Kesalahan umum saat pindah VPS:**  
TTL masih disetel `86400` (24 jam), lalu hari-H kamu langsung mengubah A record ke IP VPS baru sambil mematikan VPS lama. Akibatnya? Selama hingga 24 jam ke depan, sebagian pengguna masih diarahkan ke VPS lama yang sudah mati!

**SOP Migrasi DNS Tanpa Downtime (Gaya DevOps):**
1. **H-1 atau beberapa jam sebelum migrasi:** Turunkan `TTL` record terkait menjadi **`60`** atau **`300`** detik (1–5 menit), lalu tunggu sampai masa TTL lama habis.
2. **Saat jam migrasi:** Sinkronkan data terbaru, pastikan VPS baru sudah siap menerima trafik (uji dulu dengan `curl -Iv --resolve domain.com:443:IP_VPS_BARU https://domain.com`!), baru ubah `A record` ke IP VPS baru. Dalam 1–5 menit, hampir seluruh pengguna dunia langsung berpindah mulus!
3. **Setelah stabil:** Naikkan kembali TTL ke angka wajar (misalnya `300`–`3600` detik) agar query DNS efisien.

---

## Checklist Singkat Sebelum Lanjut

- [x] Memahami kapan memakai `A`/`AAAA` vs `CNAME` dan alasan larangan `CNAME` polos di root `@`.
- [x] Memakai nama service (`db`, `redis`) lewat internal DNS Docker/cloud alih-alih IP privat yang di-hardcode.
- [x] Membiasakan menurunkan `TTL` sebelum migrasi server dan menguji dengan `curl --resolve` sebelum mengganti DNS.

Di **Bagian 4**, kita masuk ke detail yang paling sering membuat kode lokal gagal diakses dari luar: **Port, Socket, perbedaan krusial binding `127.0.0.1` vs `0.0.0.0`, Ephemeral Ports, dan cara kerja Firewall Stateful**!

---

## Seri Jaringan Komputer Dasar untuk Developer & DevOps

1. [Bagian 1 — IP Address, CIDR (/24, /16, /32), & IP Publik vs Privat untuk Developer](/posts/net-dev-ip-cidr-subnetting/)
2. [Bagian 2 — Routing, Default Gateway, NAT, & Port Forwarding di Mata Developer](/posts/net-dev-routing-gateway-nat/)
3. **Bagian 3 — DNS Praktis untuk Produksi: Record, TTL, Internal DNS, & Migrasi Aman** *(sedang dibaca)*
4. [Bagian 4 — Port, Socket, Binding (127.0.0.1 vs 0.0.0.0), & Cara Kerja Firewall](/posts/net-dev-port-socket-binding-firewall/)
5. [Bagian 5 — Reverse Proxy, Load Balancer, TLS Termination, & Header X-Forwarded-*](/posts/net-dev-reverse-proxy-load-balancer/)
6. [Bagian 6 — Jaringan Container Docker & Cloud VPC (Public vs Private Subnet)](/posts/net-dev-jaringan-docker-vpc-cloud/)
7. [Bagian 7 — Jaringan di Aplikasi Web: CORS, CDN, Connection Pooling, & Efek Latensi](/posts/net-dev-cors-cdn-latensi-aplikasi/)

---

## Referensi

- [IETF RFC 1035: Domain Names - Implementation and Specification](https://datatracker.ietf.org/doc/html/rfc1035)
- [Debian Manpage: `dig(1)`](https://manpages.debian.org/trixie/bind9-dnsutils/dig.1.en.html)
- [Debian Manpage: `curl(1)`](https://manpages.debian.org/trixie/curl/curl.1.en.html)
