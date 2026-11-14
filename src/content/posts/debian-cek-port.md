---
title: "Cek port yang terbuka di server Debian 13 dengan ss dan nmap"
date: 2026-11-11T21:03:00+07:00
categories: ["Linux", "Server", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "ss", "nmap", "port"]
description: "Baca keluaran ss -lntup, cari proses di balik tiap port, bind layanan ke localhost, lalu pindai dari luar dengan nmap secara bertanggung jawab."
---

Jika alamat IP server adalah alamat sebuah gedung kantor, maka **port** adalah nomor-nomor pintu atau loket di dalam gedung tersebut—misalnya pintu `22` untuk SSH, pintu `80` dan `443` untuk web, atau pintu `5432` untuk database PostgreSQL.

Pertanyaan keamanan paling dasar saat mengelola server adalah: **pintu mana saja yang sedang terbuka, dan siapa saja yang bisa mengetuknya?**

Untuk menjawabnya, kita butuh pemeriksaan dari **dua sudut pandang**:
1. **Dari dalam server (`ss`)**: melihat program apa saja yang sedang membuka pintu dan menunggu koneksi.
2. **Dari luar server (`nmap`)**: mengetuk dari internet untuk membuktikan pintu mana yang benar-benar tembus melewati firewall.

Keduanya penting karena jawabannya bisa berbeda—bisa saja sebuah program membuka pintu ke semua arah, tetapi firewall menahannya di pagar depan (atau sebaliknya).

Perintah bertanda `# di server` dijalankan di server Debian 13, sedangkan `# di laptop` di laptopmu. `203.0.113.10` adalah IP contoh; **ganti dengan IP servermu**.

## 1. Melihat daftar pintu yang terbuka dari dalam (`ss`)

Jalankan perintah berikut di server:

```bash
# di server
sudo ss -lntup
```

Kenapa banyak huruf di `-lntup`? Ini arti masing-masing opsinya:
- `-l` (*listening*): hanya tampilkan soket/pintu yang sedang terbuka menunggu koneksi masuk.
- `-n` (*numeric*): tampilkan angka port (mis. `22`), bukan namanya (`ssh`), agar jelas dan cepat.
- `-t` (*TCP*) dan `-u` (*UDP*): sertakan protokol TCP maupun UDP.
- `-p` (*process*): tampilkan nama program/aplikasi pemilik pintu tersebut (membutuhkan `sudo` agar semua proses terlihat).

Contoh keluaran yang sudah diringkas (ini hanya ilustrasi bentuknya, bukan hasil dari servermu):

```text
Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
udp   UNCONN 0      0      127.0.0.54:53        0.0.0.0:*       users:(("systemd-resolve",pid=412,fd=15))
tcp   LISTEN 0      4096   127.0.0.1:5432       0.0.0.0:*       users:(("postgres",pid=801,fd=6))
tcp   LISTEN 0      128    0.0.0.0:22           0.0.0.0:*       users:(("sshd",pid=655,fd=3))
tcp   LISTEN 0      128    [::]:22              [::]:*          users:(("sshd",pid=655,fd=4))
tcp   LISTEN 0      511    *:80                 *:*             users:(("nginx",pid=902,fd=6))
```

Bagian terpenting bagi pemula adalah kolom **`Local Address:Port`**. Alamat di sebelah kiri tanda titik dua menentukan **dari mana** pintu itu bisa diketuk:

| Alamat lokal | Artinya untuk pemula |
|---|---|
| `127.0.0.1:5432` atau `[::1]:5432` | **Aman (khusus dalam rumah).** Alamat *loopback* (`localhost`). Hanya program di dalam server itu sendiri yang bisa terhubung. Tidak bisa diakses dari internet. |
| `0.0.0.0:22` | **Terbuka ke semua jalur IPv4.** Mendengarkan di semua kartu jaringan IPv4, termasuk IP publik. Bisa diakses dari internet jika firewall mengizinkannya. |
| `[::]:22` | **Terbuka ke semua jalur IPv6.** Pada sistem dual-stack, soket ini sering kali juga menerima IPv4 sekaligus. Jadi cek keduanya! |
| `*:80` | **Wildcard.** Biasanya mencakup semua alamat jaringan di server. |
| IP tertentu, mis. `10.0.0.5:3000` | **Khusus satu jalur.** Hanya mendengarkan pada jaringan dengan IP tersebut (misalnya jaringan VPN privat). |

Catatan kecil soal kolom `State`: koneksi TCP yang menunggu tamu bertuliskan `LISTEN`. Sementara UDP tidak memakai konsep "sambungan tetap" seperti TCP, jadi statusnya tertulis `UNCONN`—baris itu tetap berarti ada program yang siap menerima paket UDP di port tersebut.

## 2. Mencari tahu program di balik sebuah port

Kalau kamu melihat ada port asing yang menyala dan penasaran itu program apa, lihat kolom `Process` untuk mencari **PID** (nomor ID proses, misalnya `801` pada `postgres`), lalu selidiki asalnya:

```bash
# di server
sudo ss -ltnp 'sport = :5432'
ps -p 801 -o pid,user,cmd
systemctl status 801
```

- `ps -p 801 -o pid,user,cmd` menunjukkan akun Linux mana yang menjalankan proses itu dan perintah lengkapnya.
- `systemctl status 801` menunjukkan layanan (`unit systemd`) mana yang mengelola proses tersebut.

Port yang belum kamu kenal belum tentu virus atau program jahat—bisa saja itu layanan bawaan sistem. Namun, semua port yang menyala harus jelas asal-usulnya: paket apa, untuk apa, dan apakah memang dibutuhkan. Jika yakin suatu layanan memang tidak dipakai, matikan dan cegah menyala otomatis saat boot:

```bash
# di server (ganti nama-layanan dengan nama unit dari systemctl status)
sudo systemctl disable --now nama-layanan
```

Pastikan layanan itu benar-benar tidak dibutuhkan sistem sebelum mematikannya.

## 3. Kunci layanan internal ke `localhost` (dan pakai SSH tunnel)

Layanan yang cuma dipakai oleh aplikasi di dalam server yang sama—seperti database (PostgreSQL, MySQL/MariaDB) atau Redis—sebaiknya **hanya mendengarkan di `127.0.0.1`** (*loopback*).

Jika `ss` memperlihatkan database-mu mendengarkan di `0.0.0.0:5432`, ubah pengaturannya agar terikat (*bind*) ke localhost saja: misalnya `listen_addresses = 'localhost'` di PostgreSQL atau `bind-address = 127.0.0.1` di MariaDB. Setelah itu, restart layanannya dan cek ulang dengan `ss`.

Hal yang sama berlaku untuk **server pengembangan** (*dev server*), misalnya Vite. Jangan menjalankan `npm run dev -- --host 0.0.0.0` di VPS publik hanya supaya aplikasinya bisa dibuka dari browser laptopmu!

Cara yang aman adalah memakai **SSH local tunnel**—ibarat memasang pipa rahasia terenkripsi dari laptop ke dalam rumah server:

```bash
# di laptop
ssh -o ExitOnForwardFailure=yes -N -L 127.0.0.1:5173:127.0.0.1:5173 admin@203.0.113.10
```

Cara membaca perintah ini:
- `-L 127.0.0.1:5173:127.0.0.1:5173`: dengarkan di port `5173` milik laptopmu, lalu teruskan lalu lintasnya lewat jalur SSH ke alamat `127.0.0.1:5173` **di server**.
- `-N`: tidak perlu membuka layar terminal server, cukup buka terowongannya saja.
- `-o ExitOnForwardFailure=yes`: langsung berhenti kalau port `5173` di laptop kebetulan sudah dipakai program lain. (Jika bentrok, ubah saja angka port laptopnya menjadi misalnya `-L 127.0.0.1:5174:127.0.0.1:5173`).

Selama perintah itu berjalan, buka `http://localhost:5173` di browser laptopmu—kamu sedang melihat aplikasi yang berjalan di server dengan aman tanpa harus membuka port `5173` di firewall! Tekan `Ctrl+C` di terminal kalau sudah selesai.

## 4. Mengetuk dari luar dengan `nmap`

Ingat, `ss` hanya menunjukkan pintu apa yang dibuka oleh program di dalam server; `ss` tidak tahu apakah pintu itu sebenarnya sudah dihadang oleh satpam firewall (UFW atau *cloud firewall* provider).

Untuk melihat server dari sudut pandang orang luar/penyerang, lakukan pemindaian dari mesin lain—misalnya dari laptopmu. Pasang `nmap` di laptop, bukan di server:

```bash
# di laptop (Debian/Ubuntu; untuk macOS pakai: brew install nmap)
sudo apt install nmap
nmap -Pn -p- 203.0.113.10
```

Arti opsinya:
- `-Pn`: lewati tes *ping* awal (karena banyak server memblokir ping sehingga dikira mati oleh `nmap`).
- `-p-`: periksa seluruh 65.535 port TCP. Karena ini memakan waktu cukup lama, untuk pengecekan cepat kamu bisa menjalankan `nmap -Pn 203.0.113.10` tanpa `-p-` (hanya memindai 1.000 port paling umum).

Contoh di atas hanya mengecek TCP melalui IPv4. Jika servermu punya IPv6 publik, uji juga dari jaringan yang mendukung IPv6 dengan `nmap -6 -Pn -p- ALAMAT_IPV6_SERVER`. Untuk layanan UDP (seperti DNS port 53 atau NTP port 123), lakukan pengecekan terpisah dengan `sudo nmap -sU -Pn -p 53,123 ALAMAT_SERVER`—perlu dicatat bahwa hasil `open|filtered` pada UDP belum membuktikan layanannya terbuka.

> **Aturan etika dan hukum:** **Hanya pindai server milikmu sendiri atau server yang kamu punya izin tertulis untuk mengujinya.** Memindai server milik orang lain dapat melanggar hukum dan aturan penyedia hosting. Bahkan beberapa provider VPS meminta pemberitahuan lebih dulu sebelum kamu memindai IP servermu sendiri; cek kebijakan providermu.

Cara membaca tiga status utama dari `nmap`:
- **`open`**: pintu terbuka, ada layanan yang menjawab ketukan dari internet.
- **`closed`**: server bisa dijangkau, tetapi tidak ada program yang mendengarkan di port tersebut.
- **`filtered`**: ketukan paket ditahan di tengah jalan (biasanya oleh firewall), sehingga `nmap` tidak mendapat jawaban apakah pintunya terbuka atau tidak.

## 5. Cara membaca hasil tanpa salah paham

- **Port terbuka bukan otomatis berarti servermu rentan.** Port `22` yang berstatus `open` untuk SSH (dengan login pakai kunci dan sistem terbarui) adalah hal wajar. Yang berbahaya adalah layanan internal (seperti database atau panel debug) yang ikut terbuka ke publik tanpa autentikasi.
- **Status `filtered` di `nmap` bukan alasan membiarkan layanan mendengarkan di `0.0.0.0`.** Kalau `ss` menampilkan `0.0.0.0:6379` (Redis), lalu `nmap` tidak melihatnya karena ditahan UFW, itu artinya pertahananmu cuma satu lapis. Jika suatu hari UFW mati atau salah ubah, Redis langsung bocor ke dunia! Selalu kunci layanan internal ke `127.0.0.1` langsung dari konfigurasinya.
- **Bandingkan sudut pandang dalam dan luar:**
  - Ada di `ss`, tidak seharusnya publik → periksa atau ikat ke `127.0.0.1`.
  - Muncul `open` di `nmap`, tetapi tidak terlihat di `ss` → kemungkinan ada NAT, proxy dari provider, atau pemetaan port oleh Docker (ingat catatan Docker di [artikel UFW](/posts/debian-firewall-ufw/)). Telusuri penyebabnya sebelum menyimpulkan.
- Hasil `nmap` hanya memotret kondisi pada saat itu dari jaringan tempatmu memindai. Ulangi pemindaian setiap kali kamu mengubah aturan firewall atau menambah layanan baru.

## Cek akhir

Pada server yang baru saja diamankan dengan sehat, gambarannya kira-kira begini:
- `ss -lntup` hanya menampilkan SSH (dan port `80`/`443` kalau melayani web) di alamat publik (`0.0.0.0` / `[::]`), sementara database dan layanan internal lainnya berada di `127.0.0.1`.
- `nmap` dari laptop hanya melaporkan port-port yang memang sengaja kamu buka untuk publik.

## Referensi

- [ss(8), Debian trixie](https://manpages.debian.org/trixie/iproute2/ss.8.en.html)
- [nmap(1), Debian trixie](https://manpages.debian.org/trixie/nmap/nmap.1.en.html)
- [ssh(1): opsi `-L` dan `-N`](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html)

## Seri keamanan server Debian

1. [Mengamankan VPS Debian 13 baru](/posts/debian-server-keamanan-awal/)
2. [Login SSH pakai kunci Ed25519](/posts/debian-ssh-key/)
3. [Firewall UFW tanpa terkunci](/posts/debian-firewall-ufw/)
4. **Cek port yang terbuka dengan ss dan nmap (artikel ini)**
5. [Update keamanan otomatis dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. [Permission berkas tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. [Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)
8. [Backup dan uji restore](/posts/debian-backup-restore/)
