---
title: "Protokol Remote Server & Transfer File: SSH, SFTP, FTP, & RDP"
date: 2026-11-18T12:19:00+07:00
categories:
  - Networking
  - Linux
  - Server
  - Security
tags:
  - networking
  - ssh
  - sftp
  - ftp
  - rdp
  - keamanan
  - pemula
description: "Mengenal protokol untuk mengendalikan server jarak jauh dan mengirim file—SSH, SFTP/SCP, FTP vs FTPS, dan RDP—lengkap dengan analogi, kelebihan, kekurangan, serta alasan kenapa FTP biasa harus dihindari."
---

Begitu kamu menyewa VPS Linux atau mengelola server jarak jauh, kamu tidak mungkin mencolokkan monitor dan keyboard langsung ke pusat data. Untuk mengatur server dan mengirim file dari laptop, kamu memakai protokol **remote access** dan **file transfer**.

Di bagian kelima ini, kita membedah protokol yang paling sering dipakai admin server—**SSH**, **SFTP/SCP**, **FTP**, dan **RDP**—termasuk mana yang wajib dipakai dan mana yang berbahaya di internet publik!

---

## 1. SSH (Secure Shell — Port `22` TCP)

**Analogi:** **Lorong rahasia kedap suara langsung menuju meja terminal server.** Kamu mengetik perintah di laptopmu, hurufnya dienkripsi rapat melewati internet, dieksekusi oleh server di belahan dunia lain, lalu hasilnya tampil kembali di layarmu.

*(Sebelum SSH lahir di tahun 1995, admin memakai **Telnet** yang mengirim password dalam teks terbuka! Sekarang Telnet sudah pensiun total untuk keamanan server.)*

| Kelebihan SSH | Kekurangan SSH |
| --- | --- |
| **Enkripsi kuat menyeluruh** dan mendukung autentikasi **SSH Key (`Ed25519`)** tanpa password yang jauh lebih kebal terhadap *brute-force*. | **Berbasis teks (CLI):** Tidak menampilkan tampilan desktop grafis bagi pemula yang terbiasa klik mouse. |
| **Sangat hemat bandwidth:** Tetap responsif meskipun dipakai lewat sinyal seluler yang lambat. | Port `22` yang terbuka ke internet publik menjadi target pemindaian bot 24 jam (solusi aman: gunakan SSH Key, Fail2ban, atau sembunyikan di balik [Tailscale SSH](/posts/tailscale-hardening-tailscale-ssh/)). |
| **Multifungsi:** Bisa dipakai untuk login shell, terowongan port (*SSH tunneling*), Git push, dan transfer file (`SFTP`/`SCP`). | — |

---

## 2. FTP vs FTPS vs SFTP / SCP (Protokol Transfer File)

Banyak pemula mengira semua transfer file ke server bernama "FTP", padahal perbedaannya seperti siang dan malam dari sisi keamanan:

### A. FTP Klasik (File Transfer Protocol — Port `21` TCP) — **HINDARI DI INTERNET!**

**Analogi:** **Mengirim salinan KTP dan password lewat kartu pos terbuka.**

- **Kelebihan:** Sangat tua sehingga didukung aplikasi web/hosting jadul; protokolnya sederhana.
- **Kekurangan Fatal:**
  1. **Tanpa enkripsi sama sekali!** Username, password login hosting, dan seluruh isi file yang dikirim dapat dibaca siapa saja di jaringan Wi-Fi yang sama.
  2. **Ribet di firewall/NAT:** Memakai dua saluran terpisah (*control port 21* + *data port dinamis* pada mode Active/Passive), sering macet di balik router modern.

*(Ada versi terenkripsinya bernama **FTPS** = FTP + TLS, tetapi masalah dua port firewall-nya masih lebih merepotkan dibandingkan SFTP.)*

### B. SFTP & SCP (Berjalan Aman di Dalam SSH — Port `22` TCP)

**Analogi:** **Menyelipkan map berkas ke dalam lorong baja SSH yang sudah aman.**

- **SFTP (*SSH File Transfer Protocol*):** Bukan "FTP yang ditambah S", melainkan protokol terpisah yang berjalan 100% di atas koneksi SSH! Didukung aplikasi grafis populer seperti **FileZilla** atau **Cyberduck**, maupun perintah terminal `sftp`.
  - **Kelebihan:** **Hanya butuh 1 port (`22`)** yang sama dengan SSH, seluruh data & password terenkripsi penuh, bisa melanjutkan transfer putus (*resume*), dan bisa melihat/menghapus folder jarak jauh dengan rapi.
  - **Kekurangan:** Di jaringan LAN lokal berkecepatan gigabit, enkripsi memberi sedikit beban CPU dibanding transfer mentah (namun di internet biasa nyaris tidak terasa).
- **SCP (*Secure Copy*) / `rsync -e ssh`:** Cocok untuk menyalin cepat satu baris dari terminal (`scp file.tar.gz user@server:/tmp/` atau `rsync` untuk menyinkronkan hanya bagian file yang berubah!).

---

## 3. RDP (Remote Desktop Protocol — Port `3389`) & VNC

**Analogi:** **Meminjam layar, mouse, dan keyboard komputer kantor dari jarak jauh secara grafis.** Umumnya dipakai pada **Windows Server** (**RDP**), atau desktop Linux/konsol darurat VPS (**VNC**).

| Kelebihan RDP / VNC | Kekurangan RDP / VNC |
| --- | --- |
| **Tampilan grafis penuh (GUI):** Bisa memakai aplikasi Windows, manajemen desktop, dan drag-and-drop dengan mudah. | **Boros bandwidth & butuh koneksi stabil:** Jika internet melambat, kursor mouse terasa patah-patah. |
| Sangat membantu untuk mengelola aplikasi yang memang tidak punya versi CLI. | **Sangat berisiko jika port `3389` / `5900` dibuka langsung ke internet publik!** Port RDP menjadi salah satu pintu masuk ransomware paling sering di dunia—selalu akses RDP/VNC lewat terowongan VPN privat (WireGuard / Tailscale), bukan langsung dari IP publik! |

---

## Ringkasan Pilihan Terbaik untuk Pemula Server

- Untuk mengelola **server Linux**: pakai **SSH (dengan kunci Ed25519)** dan **SFTP / `rsync`**. Matikan dan jangan pernah pasang server **FTP polos**!
- Untuk mengelola **Windows Server**: gunakan **RDP**, tetapi tutup port `3389` dari internet publik dan masuklah melalui VPN privat (seperti WireGuard/Tailscale).

Di **Bagian 6**, kita akan membahas dua dunia yang sangat berbeda tetapi sering muncul di proyek nyata: protokol **Email (`SMTP`, `IMAP`, `POP3`)** dan protokol ringan untuk **IoT (`MQTT`)**!

---

## Seri Mengenal Protokol Jaringan Komputer untuk Pemula

1. [Bagian 1 — Apa Itu Protokol Jaringan? Memahami Cara Kerja Internet Lewat Analogi Surat](/posts/protokol-jaringan-pengenalan-lapisan/)
2. [Bagian 2 — Protokol Pondasi Jaringan: IP, ARP, DHCP, DNS, & ICMP](/posts/protokol-dasar-ip-icmp-dhcp-dns-arp/)
3. [Bagian 3 — TCP vs UDP vs QUIC: Memilih Jalur Pengiriman Data yang Tepat](/posts/protokol-transport-tcp-udp-quic/)
4. [Bagian 4 — Protokol Web & API: HTTP/1.1, HTTP/2, HTTP/3, HTTPS (TLS), & WebSocket](/posts/protokol-web-http-https-tls-websocket/)
5. **Bagian 5 — Protokol Remote Server & Transfer File: SSH, SFTP, FTP, & RDP** *(sedang dibaca)*
6. [Bagian 6 — Protokol Email & IoT: SMTP, IMAP, POP3, dan MQTT untuk Pemula](/posts/protokol-email-iot-smtp-imap-pop3-mqtt/)
7. [Bagian 7 — Protokol VPN (WireGuard, OpenVPN, IPsec) & Peta Memilih Protokol yang Tepat](/posts/protokol-vpn-perbandingan-semua-protokol/)

---

## Referensi

- [IETF RFC 4251: The Secure Shell (SSH) Protocol Architecture](https://datatracker.ietf.org/doc/html/rfc4251)
- [Debian Manpage: `sshd_config(5)`](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)
- [Artikel Terkait: Login SSH pakai kunci Ed25519 di Debian](/posts/debian-ssh-key/)
