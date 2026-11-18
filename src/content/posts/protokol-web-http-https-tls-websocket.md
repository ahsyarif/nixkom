---
title: "Protokol Web & API: HTTP/1.1, HTTP/2, HTTP/3, HTTPS (TLS), & WebSocket"
date: 2026-11-18T12:18:00+07:00
categories:
  - Networking
  - Security
  - Server
tags:
  - networking
  - http
  - https
  - tls
  - websocket
  - pemula
description: "Memahami perbedaan HTTP/1.1, HTTP/2, HTTP/3, cara kerja enkripsi HTTPS (TLS), serta kapan memakai WebSocket ketimbang HTTP biasa lengkap dengan kelebihan dan kekurangannya."
---

Hampir setiap proyek aplikasi web, mobile backend, maupun REST API berjalan di atas keluarga protokol **HTTP**. Namun, pemula sering kali belum memahami perbedaan nyata antara **HTTP/1.1 vs HTTP/2 vs HTTP/3**, mengapa **HTTPS (TLS)** wajib hukumnya meski untuk blog kecil, dan kapan harus memakai **WebSocket** alih-alih HTTP biasa.

---

## 1. HTTP (*Request -> Response*): Pelayan Kafe yang Ramah

**Analogi:** **Memesan makanan di kasir kafe.**
Kamu (klien/browser) selalu yang memulai percakapan (*Request*): *"Tolong ambilkan menu kopi (`GET /menu`)"* atau *"Simpan pesanan baru (`POST /order`)"*. Server (kasir) lalu membalas (*Response*) disertai kode status (`200 OK`, `404 Tidak Ditemukan`, atau `500 Server Error`). Setelah selesai, percakapan dianggap tuntas.

Seiring makin beratnya halaman web modern (satu website bisa memuat puluhan file CSS, JS, dan gambar), HTTP berevolusi tiga kali:

| Versi HTTP | Cara Kerja Singkat | Kelebihan Utama | Kekurangan Utama |
| --- | --- | --- | --- |
| **HTTP/1.1** (1997) | Teks biasa di atas TCP. Satu koneksi cenderung mengirim permintaan berurutan (browser membuka ~6 koneksi paralel agar tidak antre). | Sangat sederhana, mudah dibaca manusia saat *debugging* (`curl`), didukung 100% alat jaringan lama. | Boros koneksi TCP; header teks berulang membuat loading web beraset banyak terasa lebih lambat. |
| **HTTP/2** (2015) | Format biner + **Multiplexing**: ratusan request dikirim serempak lewat **1 koneksi TCP** saja, plus kompresi header. | Halaman web memuat jauh lebih cepat dengan lebih sedikit koneksi TCP ke server. | Masih menumpang **TCP**, jadi jika 1 paket hilang di jaringan HP lemot, seluruh antrean stream di koneksi itu ikut tersendat (*TCP HoL blocking*). |
| **HTTP/3** (2022) | Berjalan di atas **QUIC (UDP)** bukan TCP! | Koneksi awal lebih cepat, antar-file benar-benar independen tidak saling tunggu, dan tahan saat HP pindah Wi-Fi ke 4G/5G. | Sedikit lebih berat di CPU server dan segelintir firewall kantor lawas memblokir UDP port 443 (browser otomatis jatuh kembali ke HTTP/2). |

---

## 2. HTTPS (HTTP + TLS): Brankas Anti-Intip di Wi-Fi Publik

**HTTP tanpa `S`** mengirim seluruh data—termasuk **username, password login, token cookie, dan isi form**—dalam bentuk **teks polos (*plaintext*)**! Siapa pun yang berada di jaringan Wi-Fi kafe yang sama atau penyedia router di tengah jalan bisa menyadapnya dengan mudah.

**HTTPS** membungkus HTTP di dalam protokol enkripsi bernama **TLS (*Transport Layer Security*, penerus SSL)** pada port standar **`443`**.

**Analogi TLS:** Sebelum menyerahkan surat HTTP, browser mengecek "KTP resmi" milik server (**Sertifikat Digital** dari *Certificate Authority* tepercaya seperti Let's Encrypt), lalu keduanya menyepakati kunci gembok rahasia sekali pakai untuk mengacak seluruh isi surat.

### Kelebihan & Kekurangan HTTPS (TLS 1.3)

- **Kelebihan:**
  - **Kerahasiaan (*Confidentiality*):** Orang luar hanya melihat data acak, tidak bisa membaca password atau token.
  - **Keutuhan (*Integrity*):** Tidak ada pihak ketiga yang bisa menyisipkan iklan atau mengubah skrip JavaScript di tengah jalan.
  - **Keaslian (*Authentication*):** Memastikan kamu benar-benar terhubung ke server `bankcontoh.com`, bukan server tiruan!
- **Kekurangan:**
  - Membutuhkan pengurusan sertifikat SSL dan pembaruan berkala (meski di era modern sudah otomatis gratis dengan Caddy atau `certbot` Let's Encrypt!).
  - Menambah sedikit pekerjaan enkripsi CPU dan proses handshake awal (meski pada TLS 1.3 modern perbedaannya nyaris tak terasa oleh manusia).

---

## 3. WebSocket (`ws://` & `wss://`): Telepon Dua Arah Tanpa Tutup Gagang

Kelemahan pola dasar HTTP adalah **server tidak bisa menghubungi browser lebih dulu** jika browser tidak bertanya. Untuk membuat fitur chat real-time dengan HTTP saja, dulunya programmer terpaksa membuat browser bertanya terus tiap 1 detik (*polling*: *"Ada pesan baru? Tidak. Ada pesan baru? Tidak..."*), yang sangat memboroskan server!

**WebSocket** memulai perkenalan via HTTP (*HTTP Upgrade*), lalu mengubah jalur TCP tersebut menjadi **pipa terbuka dua arah (*full-duplex*)**: baik klien maupun server bisa langsung mengirim pesan kapan saja dalam milidetik!

*(Aturan keamanan: selalu gunakan **`wss://`** yang terbungkus TLS, bukan `ws://` polos!)*

### Kelebihan & Kekurangan WebSocket

| Kelebihan WebSocket | Kekurangan WebSocket |
| --- | --- |
| **Komunikasi instan dua arah (*low latency*):** Server langsung mendorong data begitu kejadian terjadi, tanpa *overhead* header HTTP berulang. | **Stateful & boros memori jika penggunanya jutaan:** Server harus menjaga koneksi terbuka terus-menerus untuk setiap pengguna yang online. |
| Sangat hemat bandwidth dibandingkan polling berkala. | Lebih sulit di-*scale* lintas banyak server (sering butuh Redis Pub/Sub), dan klien harus menangani logika *auto-reconnect* saat koneksi HP terputus. |

**Kapan pakai HTTP vs WebSocket?**
- Pakai **HTTP (REST/GraphQL)** untuk permintaan sesekali: login, simpan data profil, muat halaman berita, upload file.
- Pakai **WebSocket** (atau *Server-Sent Events / SSE* jika cuma butuh arah satu sisi server -> klien!) untuk aplikasi chat, notifikasi langsung, skor pertandingan live, atau kolaborasi dokumen real-time.

Di **Bagian 5**, kita berpindah dari dunia browser ke dunia admin server: membandingkan protokol kendali jarak jauh dan transfer file seperti **SSH**, **SFTP**, **FTP**, dan **RDP**!

---

## Seri Mengenal Protokol Jaringan Komputer untuk Pemula

1. [Bagian 1 — Apa Itu Protokol Jaringan? Memahami Cara Kerja Internet Lewat Analogi Surat](/posts/protokol-jaringan-pengenalan-lapisan/)
2. [Bagian 2 — Protokol Pondasi Jaringan: IP, ARP, DHCP, DNS, & ICMP](/posts/protokol-dasar-ip-icmp-dhcp-dns-arp/)
3. [Bagian 3 — TCP vs UDP vs QUIC: Memilih Jalur Pengiriman Data yang Tepat](/posts/protokol-transport-tcp-udp-quic/)
4. **Bagian 4 — Protokol Web & API: HTTP/1.1, HTTP/2, HTTP/3, HTTPS (TLS), & WebSocket** *(sedang dibaca)*
5. [Bagian 5 — Protokol Remote Server & Transfer File: SSH, SFTP, FTP, & RDP](/posts/protokol-remote-file-ssh-sftp-ftp-rdp/)
6. [Bagian 6 — Protokol Email & IoT: SMTP, IMAP, POP3, dan MQTT untuk Pemula](/posts/protokol-email-iot-smtp-imap-pop3-mqtt/)
7. [Bagian 7 — Protokol VPN (WireGuard, OpenVPN, IPsec) & Peta Memilih Protokol yang Tepat](/posts/protokol-vpn-perbandingan-semua-protokol/)

---

## Referensi

- [MDN Web Docs: Evolution of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Evolution_of_HTTP)
- [MDN Web Docs: The WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [IETF RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://datatracker.ietf.org/doc/html/rfc8446)
