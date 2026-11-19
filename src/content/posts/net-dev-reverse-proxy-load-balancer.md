---
title: "Reverse Proxy, Load Balancer, TLS Termination, & Header X-Forwarded-*"
date: 2026-11-19T13:04:00+07:00
categories:
  - Networking
  - DevOps
  - Server
tags:
  - networking
  - reverse-proxy
  - load-balancer
  - nginx
  - caddy
  - devops
  - pemula
description: "Memahami perbedaan Forward Proxy vs Reverse Proxy vs Load Balancer, cara kerja TLS termination, health check, serta jebakan header X-Forwarded-For dan X-Forwarded-Proto pada backend aplikasi."
---

Di aplikasi produksi yang rapi, kamu hampir **tidak pernah** menghubungkan langsung aplikasi Node.js, Python, atau Go ke pengunjung internet di port `443`. Selalu ada "penjaga depan" seperti **Nginx**, **Caddy**, **Traefik**, atau **AWS Application Load Balancer (ALB)** yang duduk di depan aplikasimu.

Bagian kelima ini membahas cara kerja **Reverse Proxy**, **Load Balancer**, dan dua masalah klasik di kode backend yang sering bikin Developer bingung!

---

## 1. Forward Proxy vs Reverse Proxy (Jangan Sampai Tertukar!)

Keduanya adalah perantara, tetapi berdiri di sisi yang berlawanan:

- **Forward Proxy (Melindungi / Mewakili *Client*):**  
  Duduk di sisi **pengguna/kantor**. Saat laptop karyawan membuka website di luar kantor, request melewati proxy kantor dulu supaya server tujuan tidak tahu identitas langsung tiap karyawan, atau untuk memfilter situs terlarang dan menghemat cache kantor.
- **Reverse Proxy (Melindungi / Mewakili *Server*):**  
  Duduk di sisi **server produksi**. Pengunjung internet hanya melihat 1 alamat pintu utama (`https://api.contoh.com:443`), padahal di belakang layar Nginx/Caddy meneruskan request ke aplikasi backend lokal (`127.0.0.1:3000`), layanan gambar (`127.0.0.1:4000`), atau static files!

---

## 2. Mengapa Aplikasi Produksi Wajib Memakai Reverse Proxy & TLS Termination?

1. **TLS Termination (Urus Sertifikat HTTPS di Satu Tempat):**  
   Daripada mengurus sertifikat SSL Let's Encrypt dan kode HTTPS di dalam tiap aplikasi backend, cukup pasang TLS di Reverse Proxy/Load Balancer (*TLS termination*). Pengunjung <-> Reverse Proxy memakai HTTPS (`443`), sedangkan Reverse Proxy <-> Backend di `127.0.0.1:3000` (atau subnet privat tepercaya) cukup memakai HTTP internal yang ringan!
2. **Menyajikan Banyak Aplikasi di 1 VPS & 1 Port `443`:**  
   `api.contoh.com` diteruskan ke port `3000`, `admin.contoh.com` diteruskan ke port `9000`, dan `blog.contoh.com` ke file statis—semuanya berbagi satu IP publik dan satu port `443` lewat fitur *Virtual Host* (`Server Name Indication / SNI`)!
3. **Menangani File Statis, Kompresi, & Perlindungan Dasar:**  
   Nginx/Caddy jauh lebih cepat menyajikan gambar/CSS serta membatasi ukuran upload (`client_max_body_size`) dan *rate limiting* sebelum request berat menyentuh proses Node.js/Python-mu.

---

## 3. Load Balancer: Membagi Beban & *Health Check*

Ketika satu server aplikasi mulai kewalahan (atau saat ingin update aplikasi **tanpa downtime**), kamu menjalankan 2, 3, atau 10 instansi backend dan menaruh **Load Balancer** di depannya:

- **Algoritma Populer:**
  - **Round Robin:** Membagi bergiliran rata (`Server A -> Server B -> Server C -> Server A ...`). Cocok jika semua request beratnya mirip.
  - **Least Connections:** Mengirim request baru ke server yang saat ini punya koneksi aktif paling sedikit (lebih adil jika ada request tertentu yang makan waktu lama).
  - **IP Hash / Sticky Session:** Mengarahkan user yang sama ke server yang sama—**tips DevOps:** hindari bergantung pada *sticky session* jika bisa! Lebih baik simpan data session user di **Redis** bersama supaya server mana pun bisa melayani request user dengan bebas!
- **Health Check (`/health`):**  
  Load Balancer secara berkala mengetuk endpoint seperti `GET /health`. Begitu Server B crash atau sedang di-restart saat deploy, Load Balancer langsung **mengeluarkannya dari antrean** sehingga pengunjung tidak terkena error `502 Bad Gateway`!

---

## 4. Jebakan Klasik Developer: Header `X-Forwarded-For` & `X-Forwarded-Proto`

Ini bug paling sering ditemui di aplikasi web begitu naik ke VPS di balik Nginx, Caddy, Cloudflare, atau AWS ALB:

1. **Semua IP pengunjung tercatat sebagai `127.0.0.1`!**  
   Karena yang membuka koneksi TCP ke backend adalah **Nginx di `127.0.0.1`**, log aplikasi atau fitur *rate-limit* mengira **semua pengguna dunia berasal dari `127.0.0.1`** (sekali 1 orang kena limit, seluruh pengguna website ikut diblokir!).
2. **Backend mengira request datang lewat `HTTP`, bukan `HTTPS`!**  
   Karena TLS berhenti di Reverse Proxy (*TLS termination*), backend menerima koneksi HTTP biasa sehingga cookie `Secure` gagal disimpan atau aplikasi malah membuat redirect loop `http -> https -> http`!

### Cara Mengatasi di Reverse Proxy & Kode Backend

Di sisi **Nginx**, teruskan identitas asli pengunjung lewat header standar (di **Caddy**, header ini sudah ditambahkan secara otomatis!):

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Dan di sisi **kode aplikasi backend** (misal Express.js, FastAPI, Rails, Laravel), **wajib** aktifkan pengaturan **Trust Proxy** (contoh di Express.js: `app.set('trust proxy', 1)` atau IP proxy tepercaya saja)—**tetapi ingat:** hanya percayai header `X-Forwarded-*` jika aplikasi memang menerima trafik dari reverse proxy tepercaya (misal `127.0.0.1`), karena jika aplikasi terbuka langsung ke internet, orang luar bisa memalsukan header `X-Forwarded-For`!

---

## Checklist Singkat Sebelum Lanjut

- [x] Paham perbedaan Forward Proxy (sisi client) vs Reverse Proxy (sisi server) dan manfaat *TLS termination*.
- [x] Mengerti pentingnya endpoint `/health` agar Load Balancer bisa mengeluarkan server bermasalah otomatis.
- [x] Menambahkan header `X-Forwarded-For` / `X-Forwarded-Proto` di proxy dan mengaktifkan `trust proxy` terbatas pada IP proxy tepercaya di backend.

Di **Bagian 6**, kita membedah dua arsitektur jaringan infrastruktur modern yang wajib dikuasai Developer & DevOps: **Jaringan Container Docker (`bridge` vs `host`)** dan **Arsitektur Cloud VPC (`Public Subnet` vs `Private Subnet` + `NAT Gateway`)**!

---

## Seri Jaringan Komputer Dasar untuk Developer & DevOps

1. [Bagian 1 — IP Address, CIDR (/24, /16, /32), & IP Publik vs Privat untuk Developer](/posts/net-dev-ip-cidr-subnetting/)
2. [Bagian 2 — Routing, Default Gateway, NAT, & Port Forwarding di Mata Developer](/posts/net-dev-routing-gateway-nat/)
3. [Bagian 3 — DNS Praktis untuk Produksi: Record, TTL, Internal DNS, & Migrasi Aman](/posts/net-dev-dns-produksi-ttl/)
4. [Bagian 4 — Port, Socket, Binding (127.0.0.1 vs 0.0.0.0), & Cara Kerja Firewall](/posts/net-dev-port-socket-binding-firewall/)
5. **Bagian 5 — Reverse Proxy, Load Balancer, TLS Termination, & Header X-Forwarded-*** *(sedang dibaca)*
6. [Bagian 6 — Jaringan Container Docker & Cloud VPC (Public vs Private Subnet)](/posts/net-dev-jaringan-docker-vpc-cloud/)
7. [Bagian 7 — Jaringan di Aplikasi Web: CORS, CDN, Connection Pooling, & Efek Latensi](/posts/net-dev-cors-cdn-latensi-aplikasi/)

---

## Referensi

- [MDN Web Docs: `X-Forwarded-For` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For)
- [MDN Web Docs: `X-Forwarded-Proto` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-Proto)
- [IETF RFC 8446: Transport Layer Security (TLS) 1.3](https://datatracker.ietf.org/doc/html/rfc8446)
