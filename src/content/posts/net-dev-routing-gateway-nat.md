---
title: "Routing, Default Gateway, NAT, & Port Forwarding di Mata Developer"
date: 2026-11-19T13:01:00+07:00
categories:
  - Networking
  - DevOps
  - Server
tags:
  - networking
  - routing
  - nat
  - gateway
  - devops
  - pemula
description: "Memahami bagaimana paket data menemukan jalan dari laptop atau container ke internet lewat Routing Table, Default Gateway, SNAT/Masquerade, dan Port Forwarding (DNAT)."
---

Di Bagian 1 kita sudah tahu bahwa laptopmu di rumah memiliki IP privat (misal `192.168.1.15`), sementara server API GitHub atau VPS memiliki IP publik (`203.0.113.10`).

Pertanyaannya bagi seorang Developer/DevOps: **bagaimana paket dari IP privat `192.168.1.15` bisa sampai ke server publik di Singapura, lalu jawabannya tahu harus pulang kembali ke laptopmu?**

Jawabannya ada pada tiga konsep dasar ini: **Routing Table**, **Default Gateway**, dan **NAT**!

---

## 1. Routing Table & Default Gateway (Papan Penunjuk Arah)

Setiap komputer, container Docker, dan server Linux menyimpan daftar rute kecil bernama **Routing Table**. Cek isinya sekarang di terminal Linux dengan:

```bash
ip route
```

Contoh output di sebuah VPS:

```text
default via 203.0.113.1 dev eth0
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1
203.0.113.0/24 dev eth0 proto kernel scope link src 203.0.113.10
```

Cara Linux membaca daftar ini sangat sederhana (**aturan kecocokan paling spesifik menang duluan**, alias *longest prefix match*):

1. Mau kirim paket ke `172.17.0.5` (container Docker)? Cocok dengan baris `172.17.0.0/16` -> kirim langsung lewat jembatan `docker0` tanpa melewati internet luar!
2. Mau kirim paket ke `203.0.113.20` (VPS tetangga di subnet sama)? Cocok dengan `203.0.113.0/24` -> kirim langsung lewat `eth0`.
3. Mau kirim paket ke `1.1.1.1` atau `github.com` (di luar jaringan lokal)? Tidak cocok dengan dua baris di atas, maka jatuh ke baris **`default via 203.0.113.1`** (**Default Gateway**)! Artinya serahkan paket ini ke router gerbang utama (`203.0.113.1`) biar router tersebut yang meneruskannya ke internet.

---

## 2. Kenapa Container/Laptop IP Privat Bisa Internetan? (SNAT / Masquerade)

Ingat aturan dari Bagian 1: **router di internet publik membuang paket dengan alamat pengirim IP privat** (`192.168.1.15` atau IP Docker `172.17.0.2`), karena jutaan rumah di dunia juga memakai angka `192.168.1.15` yang sama!

Agar laptopmu atau container Docker tetap bisa mengunduh paket dari internet, router/host melakukan trik bernama **SNAT (*Source Network Address Translation*)** atau **Masquerade**:

**Analogi Resepsionis Kantor:**
1. Karyawan di ruang dalam (`172.17.0.2`) menitip surat keluar untuk `api.github.com` lewat resepsionis (`VPS host` dengan IP publik `203.0.113.10`).
2. Resepsionis **mengganti alamat pengirim di amplop luar** dari `172.17.0.2` menjadi `203.0.113.10` (sambil mencatat di buku tamu: *"Kalau ada balasan di port acak `54321`, itu milik `172.17.0.2` port `39100`"*).
3. Saat `api.github.com` membalas ke `203.0.113.10:54321`, resepsionis melihat buku catatannya (**tabel *conntrack***) lalu mengantarkan surat balasan itu tepat ke dalam container `172.17.0.2`!

*(Itulah cara kerja `NAT Gateway` di AWS VPC dan cara container Docker melakukan `curl` ke internet!)*

---

## 3. Port Forwarding (`DNAT`): Memasukkan Tamu dari Luar ke Dalam

Kebalikannya adalah **DNAT (*Destination NAT*)** atau **Port Forwarding**—yaitu ketika orang dari internet publik menghubungi `203.0.113.10:8080`, lalu VPS/router membelokkannya masuk ke container `172.17.0.2:80`!

Di Docker, ketika kamu menjalankan:

```bash
docker run -d -p 127.0.0.1:8080:80 nginx
```

Di balik layar, Docker menambahkan aturan **DNAT** dan **forwarding** di Netfilter agar trafik menuju `127.0.0.1:8080` di host otomatis diterjemahkan tujuannya menjadi `172.17.0.2:80` di dalam jaringan container!

*(Inilah juga alasan teknis mengapa `-p 8080:80` tanpa `127.0.0.1` di Docker sering menembus aturan UFW `INPUT`: paket DNAT langsung diarahkan ke rantai `FORWARD`, melewati rantai `INPUT` biasa!)*

---

## 4. Tiga Masalah Klasik Routing & NAT yang Sering Ditemui DevOps

1. **Lupa mengaktifkan IP Forwarding di Linux (`net.ipv4.ip_forward = 1`):**  
   Secara default demi keamanan, server Linux **menolak meneruskan paket** dari satu interface ke interface lain. Jika kamu membangun container bridge, VPN router, atau [subnet router Tailscale](/posts/tailscale-subnet-router/), wajib menyalakan `net.ipv4.ip_forward = 1` di `/etc/sysctl.d/`.
2. **Asymmetric Routing (Pergi lewat A, Pulang lewat B):**  
   Misalnya VPS punya 2 IP publik atau 2 gateway: paket masuk lewat `eth0`, tapi *default gateway* mengirim balasannya lewat `eth1`. Firewall stateful (yang cuma melihat setengah perjalanan!) langsung mengira paket balasan itu tidak sah dan membuangnya!
3. **CGNAT di ISP Rumah / Seluler (Kenapa Tidak Bisa Port Forward Server di Rumah):**  
   Banyak ISP internet rumah & seluler zaman sekarang memakai **CGNAT (`100.64.0.0/10`)**—artinya ratusan rumah berbagi 1 IP publik di server ISP! Akibatnya, mengatur *Port Forwarding* di router Wi-Fi rumahmu tidak akan berhasil karena trafik dari internet berhenti di router ISP, bukan di routermu. (Solusinya untuk server rumahan: pakai overlay tunnel seperti Tailscale atau Cloudflare Tunnel!)

---

## Checklist Singkat Sebelum Lanjut

- [x] Bisa membaca output `ip route` dan memahami *longest prefix match* + peran *Default Gateway*.
- [x] Paham perbedaan **SNAT/Masquerade** (trafik keluar dari IP privat ke internet) dan **DNAT / Port Forwarding** (trafik masuk ke IP privat/container).
- [x] Tahu kenapa CGNAT membuat server rumahan tidak bisa langsung di-port-forward dari router biasa.

Di **Bagian 3**, kita akan membahas **DNS secara mendalam untuk Produksi & DevOps**: beda tipe record (`A`, `AAAA`, `CNAME`, `MX`, `TXT`, `SRV`), aturan apex domain, internal DNS di Docker & cloud, serta trik **migrasi server tanpa downtime** memakai **TTL**!

---

## Seri Jaringan Komputer Dasar untuk Developer & DevOps

1. [Bagian 1 — IP Address, CIDR (/24, /16, /32), & IP Publik vs Privat untuk Developer](/posts/net-dev-ip-cidr-subnetting/)
2. **Bagian 2 — Routing, Default Gateway, NAT, & Port Forwarding di Mata Developer** *(sedang dibaca)*
3. [Bagian 3 — DNS Praktis untuk Produksi: Record, TTL, Internal DNS, & Migrasi Aman](/posts/net-dev-dns-produksi-ttl/)
4. [Bagian 4 — Port, Socket, Binding (127.0.0.1 vs 0.0.0.0), & Cara Kerja Firewall](/posts/net-dev-port-socket-binding-firewall/)
5. [Bagian 5 — Reverse Proxy, Load Balancer, TLS Termination, & Header X-Forwarded-*](/posts/net-dev-reverse-proxy-load-balancer/)
6. [Bagian 6 — Jaringan Container Docker & Cloud VPC (Public vs Private Subnet)](/posts/net-dev-jaringan-docker-vpc-cloud/)
7. [Bagian 7 — Jaringan di Aplikasi Web: CORS, CDN, Connection Pooling, & Efek Latensi](/posts/net-dev-cors-cdn-latensi-aplikasi/)

---

## Referensi

- [Debian Manpage: `ip(8)`](https://manpages.debian.org/trixie/iproute2/ip.8.en.html)
- [Docker Docs: Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/)
- [IETF RFC 1918: Address Allocation for Private Internets](https://datatracker.ietf.org/doc/html/rfc1918)
