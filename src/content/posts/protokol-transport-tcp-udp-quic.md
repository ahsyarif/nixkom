---
title: "TCP vs UDP vs QUIC: Memilih Jalur Pengiriman Data yang Tepat"
date: 2026-11-18T12:17:00+07:00
categories:
  - Networking
  - Server
tags:
  - networking
  - tcp
  - udp
  - quic
  - pemula
description: "Memahami perbedaan TCP, UDP, dan QUIC lewat analogi pengiriman barang dan panggilan suara, lengkap dengan kelebihan, kekurangan, dan contoh aplikasinya."
---

Jika **IP** di Bagian 2 adalah alamat rumah penerima, maka protokol di **Lapisan Transport**—yaitu **TCP**, **UDP**, dan pendatang baru modern **QUIC**—adalah **jenis layanan kurir** yang mengantarkan data dari pintu aplikasi satu (berdasarkan nomor **Port**, misalnya `443` untuk web atau `5432` untuk database) ke pintu aplikasi lain.

Memahami perbedaan ketiganya sangat penting agar kamu tahu mengapa streaming game/Zoom memakai **UDP**, sementara transfer file, SSH, dan database wajib memakai **TCP**, serta kenapa web modern mulai berpindah ke **QUIC**!

---

## 1. TCP (Transmission Control Protocol)

**Analogi:** Mengirim barang berharga lewat **kurir resmi dengan resi dan tanda tangan**.
Sebelum berangkat, pengirim dan penerima melakukan perkenalan 3 langkah (**3-Way Handshake**):
1. Klien: *"Halo, boleh kirim paket?"* (`SYN`)
2. Server: *"Halo, silakan! Saya siap menerima."* (`SYN-ACK`)
3. Klien: *"Oke, paket #1 mulai dikirim!"* (`ACK`)

Jika di tengah perjalanan Paket #3 hilang atau rusak, kurir meminta pengiriman ulang Paket #3 dan menahannya supaya sampai ke aplikasi tetap rapi berurutan: `1 -> 2 -> 3 -> 4`.

### Kelebihan & Kekurangan TCP

| Kelebihan TCP | Kekurangan TCP |
| --- | --- |
| **100% andal (*reliable*):** Paket hilang otomatis dikirim ulang, rusak otomatis dideteksi. | **Lambat di pembukaan koneksi:** Wajib melewati *3-way handshake* (ditambah TLS handshake bila HTTPS) sebelum data pertama dikirim. |
| **Urutan dijamin rapi:** Aplikasi menerima byte persis sesuai urutan pengirimannya. | **Head-of-Line (HoL) Blocking:** Jika Paket #2 macet di jalan, Paket #3 dan #4 yang sudah sampai ikut tertahan menunggu #2 datang! |
| **Ramah jaringan macet:** Punya kendali aliran (*flow & congestion control*) agar tidak membanjiri penerima. | **Header lebih besar** (minimal 20 byte) dan pemrosesan lebih berat bagi CPU dibanding UDP. |

**Cocok untuk:** Website (HTTP/1.1 & HTTP/2), SSH, SFTP, API REST/JSON, PostgreSQL/MySQL, dan Email (`SMTP`/`IMAP`)—semua hal di mana **hilangnya 1 huruf saja berakibat fatal**!

---

## 2. UDP (User Datagram Protocol)

**Analogi:** **Melempar kartu pos atau siaran langsung di radio**. Pengirim tidak melakukan salam perkenalan dulu dan tidak menunggu tanda tangan penerima. Paket langsung dilempar ke alamat tujuan secepat mungkin!

Kalau satu potongan kecil gambar saat video call hilang di jalan? Ya sudah, biarkan lewat—karena percuma mengirim ulang frame suara 3 detik yang lalu ketika percakapan sudah berjalan ke detik sekarang!

### Kelebihan & Kekurangan UDP

| Kelebihan UDP | Kekurangan UDP |
| --- | --- |
| **Super cepat & latensi rendah:** Tidak ada handshake, langsung kirim di paket pertama! | **Tidak ada jaminan sampai:** Paket bisa hilang di tengah jalan tanpa ada pengiriman ulang otomatis. |
| **Header sangat kecil (8 byte):** Beban jaringan dan CPU sangat ringan. | **Urutan bisa tertukar atau duplikat:** Jika aplikasi butuh keandalan, programmer harus menulis logika konfirmasinya sendiri di atas UDP. |
| **Mendukung Broadcast & Multicast:** Bisa mengirim satu paket ke banyak penerima sekaligus di jaringan lokal. | Sebagian firewall jaringan kantor ketat lebih sering membatasi trafik UDP tak dikenal. |

**Cocok untuk:** Video call / rapat online (**Zoom, Google Meet, WebRTC**), game online real-time, pencarian cepat **DNS**, dan terowongan VPN cepat (**WireGuard / Tailscale**).

---

## 3. QUIC (Fondasi HTTP/3 — Gabungan Kecepatan UDP + Keandalan TCP)

Selama puluhan tahun, dunia internet terjebak memilih: mau andal tapi ada hambatan antrean (**TCP**), atau cepat tapi tidak andal (**UDP**)?

Google lalu merancang **QUIC** (kini menjadi standar resmi internet **IETF RFC 9000**). Ide jeniusnya: **membangun sistem keandalan & enkripsi modern langsung di atas UDP**!

### Kelebihan & Kekurangan QUIC

| Kelebihan QUIC | Kekurangan QUIC |
| --- | --- |
| **Pembukaan koneksi super singkat:** Enkripsi **TLS 1.3 sudah menyatu** di dalam handshake QUIC (bahkan bisa **0-RTT** untuk koneksi ulang!). | **Konsumsi CPU sedikit lebih tinggi** daripada TCP klasik karena enkripsi & logika keandalan berjalan di *user space* aplikasi. |
| **Bebas *Head-of-Line Blocking* antar-stream:** Jika 1 gambar tertunda di stream A, file CSS/JS di stream B **tetap langsung diproses** tanpa menunggu! | Sebagian kecil firewall perusahaan atau ISP lama kadang masih memblokir atau membatasi **UDP port `443`** (browser otomatis turun balik ke TCP/HTTP2). |
| **Connection Migration:** Saat HP berpindah dari **Wi-Fi rumah ke 4G/5G** di tengah jalan, unduhan atau koneksi tidak langsung putus karena QUIC memakai *Connection ID*, bukan terpaku pada IP! | Alat pemantau jaringan lama lebih susah menginspeksi trafik QUIC dibanding TCP tradisional. |

**Cocok untuk:** Website & aplikasi mobile modern (**HTTP/3** dipakai oleh YouTube, Google, Cloudflare, CDN modern) di mana pengguna sering berada di jaringan seluler yang tidak stabil.

---

## Ringkasan Memilih: TCP vs UDP vs QUIC

- Pilih **TCP** jika kamu membangun aplikasi server standar (API, database, SSH, transfer file) yang butuh **keutuhan data mutlak** dan kompatibilitas universal di semua firewall.
- Pilih **UDP** jika **kecepatan & respons detik-ini (*real-time*)** jauh lebih penting daripada kehilangan sedikit data sesaat (audio/video call, game online, DNS).
- Pilih **QUIC (HTTP/3)** untuk menyajikan website/API modern ke pengguna akhir (cukup aktifkan di reverse proxy seperti Caddy, Nginx modern, atau CDN seperti Cloudflare) agar loading di HP jauh lebih gesit!

Di **Bagian 4**, kita naik ke Lapisan Aplikasi paling akrab bagi developer: membedah protokol web **HTTP/1.1**, **HTTP/2**, **HTTP/3**, **HTTPS (TLS)**, dan **WebSocket**!

---

## Seri Mengenal Protokol Jaringan Komputer untuk Pemula

1. [Bagian 1 — Apa Itu Protokol Jaringan? Memahami Cara Kerja Internet Lewat Analogi Surat](/posts/protokol-jaringan-pengenalan-lapisan/)
2. [Bagian 2 — Protokol Pondasi Jaringan: IP, ARP, DHCP, DNS, & ICMP](/posts/protokol-dasar-ip-icmp-dhcp-dns-arp/)
3. **Bagian 3 — TCP vs UDP vs QUIC: Memilih Jalur Pengiriman Data yang Tepat** *(sedang dibaca)*
4. [Bagian 4 — Protokol Web & API: HTTP/1.1, HTTP/2, HTTP/3, HTTPS (TLS), & WebSocket](/posts/protokol-web-http-https-tls-websocket/)
5. [Bagian 5 — Protokol Remote Server & Transfer File: SSH, SFTP, FTP, & RDP](/posts/protokol-remote-file-ssh-sftp-ftp-rdp/)
6. [Bagian 6 — Protokol Email & IoT: SMTP, IMAP, POP3, dan MQTT untuk Pemula](/posts/protokol-email-iot-smtp-imap-pop3-mqtt/)
7. [Bagian 7 — Protokol VPN (WireGuard, OpenVPN, IPsec) & Peta Memilih Protokol yang Tepat](/posts/protokol-vpn-perbandingan-semua-protokol/)

---

## Referensi

- [IETF RFC 9293: Transmission Control Protocol (TCP)](https://datatracker.ietf.org/doc/html/rfc9293)
- [IETF RFC 768: User Datagram Protocol (UDP)](https://datatracker.ietf.org/doc/html/rfc768)
- [IETF RFC 9000: QUIC Transport Protocol](https://datatracker.ietf.org/doc/html/rfc9000)
