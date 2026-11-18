---
title: "Tips & Trik Perintah Jaringan Linux untuk Mengelola dan Mendiagnosis Server"
date: 2026-11-18T12:10:00+07:00
categories:
  - Linux
  - Networking
  - Server
tags:
  - linux
  - networking
  - cli
  - dns
  - curl
  - ss
  - tips
  - pemula
description: "Kumpulan tips dan trik perintah jaringan Linux modern yang paling sering dipakai admin server pemula: ip, ss, ping, mtr, dig, resolvectl, nc, curl --resolve, hingga tcpdump."
---

Saat mengelola server Linux—atau sekadar ingin tahu kenapa satu aplikasi tidak bisa menghubungi database maupun API luar—banyak pemula langsung bingung memilih perintah jaringan mana yang harus dipakai. Sebagian masih mencari `ifconfig` atau `netstat` dari tutorial lama, padahal di distro modern keduanya sudah lama digantikan oleh alat yang jauh lebih cepat dan informatif.

Artikel ini merangkum **tips dan trik perintah jaringan Linux modern** yang paling sering dipakai sehari-hari, lengkap dengan contoh output nyata dan kapan harus memakai masing-masing perintah.

---

## 1. Cek IP, Interface, & Jalur Keluar Paket (`ip`)

Jangan ketik `ip addr` polos kalau tidak ingin membanjiri layar dengan puluhan baris teks teknis. Tambahkan flag **`-br`** (*brief*) dan **`-c`** (*color*):

```bash
ip -br -c a
```

Outputnya langsung ringkas **1 baris per kartu jaringan**, lengkap dengan warna hijau (`UP`) atau merah (`DOWN`):

```text
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0             UP             203.0.113.10/24
tailscale0       UNKNOWN        100.101.102.20/32
```

### Trik Emas: *"Jika Paket Dikirim ke IP X, Lewat Pintu Mana?"* (`ip route get`)

Jika servermu punya lebih dari satu jalur (misalnya `eth0` publik, `docker0`, dan VPN `tailscale0`), jangan menebak-nebak rute mana yang dipakai Linux saat menghubungi IP tertentu. Tanya langsung ke kernel:

```bash
ip route get 1.1.1.1
ip route get 100.101.102.30
```

Dalam sekejap, Linux menjawab interface mana (`dev eth0` atau `dev tailscale0`), gateway mana (`via ...`), dan IP sumber mana (`src ...`) yang benar-benar dipakai untuk paket tersebut!

---

## 2. Audit Port Terbuka & Koneksi Aktif (`ss`)

Pengganti modern `netstat` adalah **`ss`** (*socket statistics*). Perintah wajib yang perlu dihafal:

```bash
sudo ss -lntup
```

*(Untuk penjelasan arti setiap huruf `l`, `n`, `t`, `u`, `p` dan cara membaca kolom alamat `127.0.0.1` vs `0.0.0.0`, baca panduan dasarnya di [cara cek port terbuka dengan `ss`](/posts/debian-cek-port/).)*

### 3 Trik Lanjutan `ss` yang Jarang Dipakai Pemula

1. **Lihat ringkasan total koneksi server dalam 1 detik:**
   ```bash
   ss -s
   ```
   Sangat cepat untuk melihat apakah jumlah koneksi TCP `estab` (sedang aktif) melonjak tidak wajar saat traffic ramai.
2. **Lihat siapa saja yang SEDANG tersambung aktif saat ini (`state established`):**
   ```bash
   sudo ss -ntp state established
   ```
   Jika `ss -lntup` cuma melihat pintu yang *menunggu*, `state established` memperlihatkan siapa yang benar-benar sedang berbicara dengan servermu detik ini (misal koneksi SSH, API keluar, atau koneksi ke database).
3. **Filter port langsung di `ss` tanpa perlu `| grep`:**
   ```bash
   sudo ss -lntup 'sport = :443 or sport = :80'
   ```

---

## 3. Uji Koneksi Dasar & Lacak Paket Hilang (`ping` & `mtr`)

### Trik `ping` untuk Memisahkan Masalah Internet vs DNS

Di Linux, `ping` berjalan terus-menerus tanpa berhenti sampai kamu menekan `Ctrl + C`. Selalu biasakan memberi batas jumlah paket dengan **`-c 4`**:

```bash
ping -c 4 1.1.1.1
ping -c 4 google.com
```

**Kenapa menguji keduanya berurutan?**
- Jika `ping 1.1.1.1` **berhasil** tetapi `ping google.com` **gagal** (*Temporary failure in name resolution*): internet servermu **sehat**, masalahnya **100% di DNS**!
- Jika keduanya gagal: masalahnya ada di jalur jaringan/gateway/firewall server.

### Gabungan `ping` + `traceroute` dalam Satu Alat (`mtr`)

Kalau koneksi ke suatu server terasa lambat atau *packet loss* naik-turun, `ping` saja tidak tahu **di router ke berapa** paket mulai tersendat. Pasang dan jalankan **`mtr`** (`sudo apt install -y mtr-tiny`) dalam mode laporan sekali jalan:

```bash
mtr -rwzbc 20 api.contoh.com
```

Arti flag singkatnya: `-r` (*report*, keluar rapi setelah selesai), `-w` (*wide*, nama host tidak terpotong), `-z` (tampilkan nomor ASN jaringan), `-b` (tampilkan IP dan hostname), `-c 20` (kirim 20 paket lalu berhenti). Perhatikan kolom **`Loss%`**—jika 0% di hop awal lalu tiba-tiba muncul loss tinggi yang berlanjut sampai hop tujuan terakhir, di situlah letak kemacetannya!

---

## 4. Cek DNS Persis Seperti yang Dilihat Aplikasi (`getent`, `dig`, `resolvectl`)

Terkadang kamu baru mengubah `/etc/hosts` atau mengganti DNS server, tetapi hasilnya tidak sesuai dugaan. Gunakan tiga alat ini sesuai tujuannya:

- **`getent hosts namahost.lokal`:** Mengecek bagaimana sistem operasi Linux dan aplikasimu benar-benar menerjemahkan nama domain (membaca `/etc/hosts` **dan** DNS sesuai `/etc/nsswitch.conf`, sedangkan `dig` sengaja melewati `/etc/hosts`!).
- **`dig +short @1.1.1.1 domainkamu.com A`:** Mengambil jawaban singkat langsung dari DNS publik Cloudflare (`1.1.1.1`) tanpa terpengaruh cache lokal VPS. Bisa juga mengganti `A` dengan `AAAA` (IPv6), `MX` (email), atau `TXT` (SPF/verifikasi).
- **`resolvectl status`:** Pada Ubuntu/Debian modern yang memakai `systemd-resolved`, perintah ini memperlihatkan server DNS mana yang sedang aktif dipakai di masing-masing interface (misalnya DNS lokal `eth0` vs MagicDNS `tailscale0`).

---

## 5. Tes Port Terbuka & Jurus Rahasia `curl`

### Uji Port TCP Tanpa Harus Login (`nc`)

Ingin tahu apakah firewall memblokir akses ke PostgreSQL (`5432`) atau Redis (`6379`) di server lain? Gunakan *netcat*:

```bash
nc -zv -w 3 100.101.102.30 5432
```

Flag `-w 3` penting supaya perintah otomatis berhenti dalam 3 detik jika paket dibuang (*dropped*) oleh firewall, sehingga terminalmu tidak menggantung lama!

### 3 Jurus Rahasia `curl` untuk Admin Server

Selain sekadar mengunduh URL, `curl` adalah alat *debugging* HTTP/HTTPS terbaik di terminal:

1. **Uji server web baru SEBELUM DNS domain dipindahkan (`--resolve`)!**  
   Baru memindahkan website ke VPS baru (`203.0.113.10`), tetapi DNS publik `domainkamu.com` masih mengarah ke VPS lama? Uji konfigurasi Nginx/Caddy dan SSL di VPS baru secara langsung tanpa menyentuh DNS publik:
   ```bash
   curl -Iv --resolve domainkamu.com:443:127.0.0.1 https://domainkamu.com
   ```
   `curl` tetap mengirim header `Host: domainkamu.com` dan SNI TLS yang valid sambil menyambung langsung ke `127.0.0.1`!
2. **Ukur waktu tiap fase koneksi (DNS, TCP, TLS, Respon Server) dalam 1 baris:**
   ```bash
   curl -sS -o /dev/null -w "Status: %{http_code} | DNS: %{time_namelookup}s | TCP: %{time_connect}s | TLS: %{time_appconnect}s | Total: %{time_total}s\n" https://domainkamu.com
   ```
   Sangat ampuh untuk membuktikan apakah website lambat karena DNS (`time_namelookup`), handshake SSL (`time_appconnect`), atau memang backend aplikasinya yang lama memproses (`Total` jauh lebih besar dari `TLS`).
3. **Cek header & redirect saja tanpa mencetak HTML panjang (`-I`):**
   ```bash
   curl -IL https://domainkamu.com
   ```
   Flag `-L` mengikuti seluruh rantai redirect (`http://` -> `https://` -> `www`), sehingga langsung ketahuan kalau ada *redirect loop*!

---

## 6. Pantau Bandwidth & Mengintip Paket dengan `tcpdump`

### Cek Interface Mana yang Paling Sibuk (`ip -s link`)

Tanpa perlu menginstal apa pun, lihat jumlah byte & packet error (`RX`/`TX`) pada setiap interface:

```bash
ip -s -h link show dev eth0
```

Jika ingin tampilan grafik bandwidth *live* per detik yang ramah mata di terminal, kamu bisa memasang **`nload`** (`sudo apt install -y nload`) dan langsung jalankan `nload eth0`.

### Mengintip Paket Masuk/Keluar Secara Aman (`tcpdump`)

Ketika firewall atau aplikasi terasa membingungkan dan kamu hanya ingin bukti pasti: *"Apakah paket permintaan dari laptop benar-benar sampai ke server Linux ini?"*, gunakan `tcpdump`:

```bash
sudo tcpdump -ni any port 5432 -c 20
```

Dua flag wajib yang menyelamatkan pemula:
- **`-n`:** Jangan ubah IP ke nama domain DNS (tanpa `-n`, `tcpdump` lambat dan membanjiri traffic DNS sendiri!).
- **`-c 20`:** Berhenti otomatis setelah menangkap `20` paket supaya layar tidak dibanjiri ribuan baris!

*(Gunakan `tcpdump` hanya untuk memastikan lalu lintas jaringan datang/pergi dan verifikasi port; ingat bahwa isi data HTTPS/SSH/WireGuard tetap terenkripsi.)*

---

## 7. Cheatsheet Cepat: Kapan Memakai Perintah Apa?

| Pertanyaan / Masalah di Lapangan | Perintah Cepat yang Dipakai |
| --- | --- |
| Apa IP & status interface server sekarang? | `ip -br -c a` |
| Paket keluar ke suatu IP lewat interface mana? | `ip route get IP_TUJUAN` |
| Layanan apa yang mendengarkan di port `3000`? | `sudo ss -lntup 'sport = :3000'` |
| Koneksi apa saja yang sedang tersambung detik ini? | `sudo ss -ntp state established` |
| Koneksi bermasalah di internet atau di DNS? | `ping -c 4 1.1.1.1` vs `ping -c 4 google.com` |
| Di router hop mana latensi / packet loss terjadi? | `mtr -rwzbc 20 domain.com` |
| Apakah port `5432` server sebelah bisa ditembus? | `nc -zv -w 3 IP_TUJUAN 5432` |
| Apa jawaban DNS publik vs resolver lokal? | `dig +short @1.1.1.1 domain.com` / `getent hosts domain.com` |
| Uji situs & SSL di VPS baru sebelum ganti DNS? | `curl -Iv --resolve domain.com:443:127.0.0.1 https://domain.com` |
| Apakah paket benar-benar sampai ke server? | `sudo tcpdump -ni any port PORT -c 20` |

Untuk studi kasus mendalam menyelesaikan error jaringan dan layanan sehari-hari, lanjutkan ke [seri troubleshooting kendala server Linux](/posts/troubleshoot-web-502-504-port-bentrok/) dan [troubleshooting DNS, SSL, & jam server](/posts/troubleshoot-ssl-dns-jam-server/).

---

## Referensi

- [Debian Manpage: `ip(8)`](https://manpages.debian.org/trixie/iproute2/ip.8.en.html)
- [Debian Manpage: `ss(8)`](https://manpages.debian.org/trixie/iproute2/ss.8.en.html)
- [Debian Manpage: `ping(8)`](https://manpages.debian.org/trixie/iputils-ping/ping.8.en.html)
- [Debian Manpage: `mtr(8)`](https://manpages.debian.org/trixie/mtr-tiny/mtr.8.en.html)
- [Debian Manpage: `dig(1)`](https://manpages.debian.org/trixie/bind9-dnsutils/dig.1.en.html)
- [Debian Manpage: `resolvectl(1)`](https://manpages.debian.org/trixie/systemd-resolved/resolvectl.1.en.html)
- [Debian Manpage: `nc_openbsd(1)`](https://manpages.debian.org/trixie/netcat-openbsd/nc_openbsd.1.en.html)
- [Debian Manpage: `curl(1)`](https://manpages.debian.org/trixie/curl/curl.1.en.html)
- [Debian Manpage: `tcpdump(8)`](https://manpages.debian.org/trixie/tcpdump/tcpdump.8.en.html)
