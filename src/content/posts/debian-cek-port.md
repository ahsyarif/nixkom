---
title: "Cek port yang terbuka di server Debian 13 dengan ss dan nmap"
date: 2026-11-11T21:03:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "ss", "nmap", "port"]
description: "Baca keluaran ss -lntup, cari proses di balik tiap port, bind layanan ke localhost, lalu pindai dari luar dengan nmap secara bertanggung jawab."
---

Pertanyaan keamanan paling dasar: layanan apa saja di servermu yang bisa dijangkau dari jaringan? Ada dua sudut pandang. Dari **dalam** server, `ss` menunjukkan siapa yang mendengarkan di port mana. Dari **luar**, `nmap` menunjukkan port mana yang benar-benar tembus lewat firewall. Keduanya perlu, karena jawabannya bisa berbeda.

Perintah bertanda `# di server` dijalankan di server Debian 13, `# di laptop` di laptopmu. `203.0.113.10` adalah IP dokumentasi; **ganti dengan IP servermu**.

## Baca daftar port dengan ss

```bash
# di server
sudo ss -lntup
```

Arti opsinya: `-l` hanya soket yang *listening*, `-n` angka (tanpa menerjemahkan nama), `-t` TCP, `-u` UDP, `-p` proses pemilik soket (butuh `sudo`). Contoh keluaran yang dipersingkat:

```text
Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
udp   UNCONN 0      0      127.0.0.54:53        0.0.0.0:*       users:(("systemd-resolve",pid=412,fd=15))
tcp   LISTEN 0      4096   127.0.0.1:5432       0.0.0.0:*       users:(("postgres",pid=801,fd=6))
tcp   LISTEN 0      128    0.0.0.0:22           0.0.0.0:*       users:(("sshd",pid=655,fd=3))
tcp   LISTEN 0      128    [::]:22              [::]:*          users:(("sshd",pid=655,fd=4))
tcp   LISTEN 0      511    *:80                 *:*             users:(("nginx",pid=902,fd=6))
```

Ini ilustrasi bentuknya, bukan keluaran servermu. Yang perlu dibaca adalah kolom `Local Address:Port`:

| Alamat lokal | Artinya |
|---|---|
| `127.0.0.1:5432` atau `[::1]:5432` | Hanya menerima koneksi dari server itu sendiri (loopback). Tidak terjangkau dari internet. |
| `0.0.0.0:22` | Mendengarkan di semua antarmuka IPv4. Terjangkau dari luar kalau firewall mengizinkan. |
| `[::]:22` | Mendengarkan di semua alamat IPv6; pada soket dual-stack dapat menerima IPv4 juga. Periksa kedua keluarga alamat. |
| `*:80` | Wildcard; bergantung pada tampilan, biasanya mencakup semua alamat. |
| IP tertentu, mis. `10.0.0.5:3000` | Hanya antarmuka dengan IP itu, misalnya jaringan privat. |

TCP berstatus `LISTEN` menunggu koneksi. UDP tidak punya koneksi, jadi statusnya `UNCONN`; baris itu tetap berarti ada proses yang menerima paket di port tersebut.

## Cari layanan di balik port

Kolom `Process` memberi nama dan PID. Untuk detail lebih lanjut:

```bash
# di server
sudo ss -ltnp 'sport = :5432'
ps -p 801 -o pid,user,cmd
systemctl status 801
```

`systemctl status <pid>` menunjukkan unit systemd yang memiliki proses itu. Port yang kamu tidak kenal bukan otomatis jahat, tapi harus jelas asal-usulnya: paket apa, unit apa, kenapa nyala. Kalau memang tidak dipakai, hentikan dan nonaktifkan:

```bash
# di server
sudo systemctl disable --now nama-layanan
```

Gunakan nama unit dari hasil `systemctl status`, dan pastikan layanan itu memang tidak dibutuhkan sebelum menjalankannya.

## Bind ke localhost: database dan server pengembangan

Layanan yang hanya dipakai aplikasi di server yang sama sebaiknya mendengarkan di `127.0.0.1`. Kalau `ss` menunjukkan database di `0.0.0.0:5432`, cari opsi *bind* di konfigurasinya, misalnya `listen_addresses = 'localhost'` di PostgreSQL atau `bind-address = 127.0.0.1` di MariaDB. Cek lagi dengan `ss` setelah restart layanan.

Server pengembangan juga begitu. Vite misalnya, bawaannya hanya `localhost`; jangan jalankan dengan `--host 0.0.0.0` di VPS publik hanya agar bisa dibuka dari laptop. Pakai **SSH local tunnel**:

```bash
# di laptop
ssh -o ExitOnForwardFailure=yes -N -L 127.0.0.1:5173:127.0.0.1:5173 admin@203.0.113.10
```

Bagian `127.0.0.1:5173:127.0.0.1:5173` berarti: dengarkan di port 5173 laptop (hanya loopback laptop), teruskan lewat SSH ke `127.0.0.1:5173` **di server**. `-N` berarti tidak membuka shell, hanya tunnel. Dengan tunnel hidup, buka `http://localhost:5173` di browser laptop. Hentikan dengan `Ctrl+C`. Karena port server tetap di loopback, tidak ada yang perlu dibuka di firewall.

Kalau port 5173 di laptop sudah terpakai, SSH akan menolak membuat tunnel; pilih port lokal lain, misalnya `-L 127.0.0.1:5174:127.0.0.1:5173`.

## Pindai dari luar dengan nmap

`ss` hanya bilang apa yang mendengarkan; ia tidak tahu apakah firewall menghalanginya. Untuk melihat dari sisi penyerang, pindai dari mesin lain, misalnya laptop. Pasang `nmap` di sana, bukan di server:

```bash
# di laptop (Debian/Ubuntu; di macOS: brew install nmap)
sudo apt install nmap
nmap -Pn -p- 203.0.113.10
```

`-Pn` melewati ping, `-p-` memindai semua 65.535 port TCP. Pemindaian penuh bisa lambat; untuk cek cepat, `nmap -Pn 203.0.113.10` hanya memeriksa 1000 port paling umum.

Contoh itu hanya memeriksa TCP melalui IPv4. Kalau server punya IPv6 publik, ulangi dari jaringan yang mendukung IPv6 dengan `nmap -6 -Pn -p- ALAMAT_IPV6_SERVER` setelah mengganti alamatnya. UDP perlu pemeriksaan terpisah, misalnya `sudo nmap -sU -Pn -p 53,123 ALAMAT_SERVER` untuk layanan yang memang kamu jalankan; hasil `open|filtered` belum membuktikan layanan terbuka.

**Pindai hanya server milikmu atau yang kamu punya izin tertulis untuk diuji.** Memindai milik orang lain bisa melanggar aturan provider dan hukum. Sebagian provider meminta pemberitahuan lebih dulu; baca kebijakannya.

Arti status utama nmap: `open` ada layanan yang menjawab, `closed` terjangkau tapi tidak ada layanan, `filtered` paket tertahan (biasanya firewall) sehingga nmap tidak bisa memastikan.

## Menafsirkan hasil dengan hati-hati

- **Port terbuka bukan otomatis kerentanan.** Port 22 yang terbuka dengan SSH berkunci dan terbarui itu wajar. Yang berisiko adalah layanan yang tidak perlu publik, tanpa autentikasi, atau berversi lama.
- **Tertutup/filtered di nmap bukan berarti tidak mendengarkan.** Kalau `ss` menunjukkan layanan di `0.0.0.0:6379` tetapi nmap dari luar tidak melihatnya, kemungkinan firewall menahannya. Itu perlindungan, tapi satu lapis. Menutup layanan di sumbernya (bind ke localhost) lebih kuat daripada hanya mengandalkan firewall.
- **Cocokkan kedua sudut pandang.** Port dari `ss` yang tidak kamu harapkan terbuka → periksa. Port terbuka di nmap tapi tidak ada di `ss` → mungkin ada NAT, proxy provider, atau pemetaan Docker; telusuri sebelum menyimpulkan. Soal Docker, lihat catatannya di [artikel UFW](/posts/debian-firewall-ufw/).
- Hasil nmap menggambarkan saat dipindai dari satu lokasi. Pindai ulang setelah mengubah firewall atau layanan.

## Cek akhir

Pada server yang baru kamu amankan, kondisi sehatnya kira-kira begini: `ss -lntup` hanya menampilkan SSH (dan 80/443 kalau melayani web) di alamat publik, sisanya di loopback; `nmap` dari laptop melaporkan hanya port yang kamu niatkan.

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
