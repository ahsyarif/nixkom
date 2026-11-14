---
title: "SSH tidak bisa login? Atasi refused, timeout, dan terkunci"
date: 2026-11-14T16:35:00+07:00
categories:
  - Linux
  - Server
  - Security
tags:
  - linux
  - ssh
  - troubleshooting
  - fail2ban
  - ufw
  - pemula
description: "Gagal SSH ke server Linux? Bedakan Connection refused, timed out, dan Permission denied (publickey), lalu buka blokir Fail2ban atau UFW lewat konsol."
---

Momen paling mendebarkan bagi pemula pemilik VPS adalah ketika mengetik `ssh user@ip-server`, lalu tiba-tiba gagal masuk. Pesan errornya bermacam-macam, dan cara memperbaikinya berbeda total tergantung pesan apa yang muncul.

Jangan langsung panik atau menginstal ulang VPS! Di bagian pertama seri troubleshooting ini, kita bedah tiga error SSH paling umum, penyebab aslinya, dan cara memperbaikinya dalam hitungan menit.

---

## Langkah 1: Baca Dulu Pesan Error-nya (Jangan Asal Tebak)

Setiap pesan gagal dari perintah `ssh` sebenarnya sudah memberi petunjuk besar:

| Pesan Error yang Muncul | Arti Sebenarnya di Balik Layar | Dugaan Penyebab Utama |
| --- | --- | --- |
| **`Connection refused`** | Paket sudah sampai ke server, tetapi tidak ada program yang mendengar di port tersebut. | Layanan `ssh` (`sshd`) mati, atau port SSH bukan `22` (misal diubah ke `2222`). |
| **`Connection timed out`** | Tidak ada balasan sama sekali dari server sampai batas waktu habis. | Port `22` diblokir oleh **UFW** / **Cloud Firewall**, IP-mu terblokir **Fail2ban**, atau IP VPS salah ketik. |
| **`Permission denied (publickey)`** | Koneksi sampai ke `sshd`, tetapi kunci SSH ditolak. | Salah file kunci, salah username, atau permission folder `~/.ssh` di server terlalu longgar! |

Tip cepat untuk melihat detail proses penolakan langsung dari laptopmu: tambahkan flag `-v` (*verbose*):

```bash
ssh -v user_kamu@203.0.113.10
```

Perhatikan baris menjelang akhir sebelum gagal untuk memastikan kunci mana yang dicoba dan port berapa yang dituju.

---

## Skenario A: Mengatasi `Permission denied (publickey)`

Kalau pesan ini muncul padahal kamu yakin sudah menempelkan kunci publik di `~/.ssh/authorized_keys`, biasanya pelakunya adalah salah satu dari tiga hal ini:

1. **Permission `~/.ssh` atau folder `$HOME` terlalu longgar!**  
   OpenSSH sangat ketat demi keamanan: jika file `authorized_keys` atau folder `~/.ssh` bisa diedit oleh user lain (misalnya kamu pernah menjalankan `chmod 777`!), **`sshd` diam-diam menolak kunci tersebut!**  
   Periksa dan rapikan izin dari konsol VPS (atau akun cadangan lain):
   ```bash
   chmod 755 ~
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   chown -R "$USER":"$USER" ~/.ssh
   ```
2. **Salah menunjuk file private key di laptop:**  
   Jika kamu punya lebih dari satu kunci (misalnya `id_ed25519_kantor` dan `id_ed25519_vps`), tentukan eksplisit:
   ```bash
   ssh -i ~/.ssh/id_ed25519_vps user_kamu@203.0.113.10
   ```
3. **Salah username bawaan OS:**  
   Ingat, username awal berbeda-beda tergantung distro dan cloud provider (sering kali `ubuntu` di image Ubuntu AWS, `debian` di Debian cloud, atau `root` di beberapa provider VPS).

*(Jika kamu ingin menyusun login SSH kunci Ed25519 dari awal secara rapi, ikuti panduan [login SSH pakai kunci Ed25519 di Debian](/posts/debian-ssh-key/).)*

---

## Skenario B: Mengatasi Terkunci Oleh Fail2ban (IP Sendiri Kena Ban!)

Sering terjadi: kamu salah mengetik password atau salah mencoba kunci SSH beberapa kali berturut-turut, lalu tiba-tiba koneksi langsung mati (`Connection timed out` atau `Connection refused` mendadak). Besar kemungkinan **Fail2ban mengira kamu adalah bot penyerang** dan memblokir IP publik internetmu!

### Cara Cek & Membuka Blokirnya

Masuk lewat **Web Console / VNC** di dashboard penyedia VPS-mu (karena VNC tidak melewati blokir jaringan SSH!), atau masuk lewat koneksi internet cadangan (misal hotspot HP yang IP publiknya berbeda), lalu cek status jail `sshd`:

```bash
sudo fail2ban-client status sshd
```

Jika alamat IP rumah/kantormu terlihat di daftar *Banned IP list*, langsung bebaskan dengan:

```bash
sudo fail2ban-client set sshd unbanip 198.51.100.25
```

**Supaya tidak terulang:** Masukkan IP tetap kantor/VPN privat (atau jalur Tailscale) ke `ignoreip` pada `/etc/fail2ban/jail.local`, seperti yang dijelaskan di [panduan Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/).

---

## Skenario C: Mengatasi `sshd` Mati atau Terkunci Firewall (`UFW`)

Jika kamu barusan mengubah `/etc/ssh/sshd_config` atau menyalakan `ufw enable` lupa mengizinkan SSH, satu-satunya pintu masuk adalah **Web Console / Serial Console / VNC** di panel penyedia VPS.

Setelah login lokal di Web Console VPS:

### 1. Cek apakah layanan SSH mati karena typo config

```bash
sudo systemctl status ssh
sudo sshd -t
```

Perintah `sudo sshd -t` mengecek syntax konfigurasi sebelum dijalankan. Jika ada baris error yang ditunjuk, perbaiki dulu file `/etc/ssh/sshd_config` (atau file di `/etc/ssh/sshd_config.d/`), cek ulang dengan `sudo sshd -t`, baru jalankan:

```bash
sudo systemctl restart ssh
```

### 2. Cek apakah UFW memblokir port SSH

```bash
sudo ufw status verbose
```

Jika UFW aktif (`Status: active`) dan port SSH (default `22/tcp`, atau `tailscale0` jika memakai Tailscale) belum ada di daftar `ALLOW IN`:

```bash
# Untuk SSH publik biasa:
sudo ufw allow OpenSSH

# Atau jika sudah mengamankan server lewat Tailscale:
sudo ufw allow in on tailscale0 to any port 22 proto tcp
```

*(Lihat juga [panduan lengkap akses darurat Break-Glass dengan Tailscale](/posts/tailscale-hardening-audit-pemulihan/) agar kamu selalu punya rencana cadangan saat mengelola VPS jarak jauh.)*

---

## Checklist Pencegahan Supaya Tidak Terkunci Lagi

- [x] Sebelum mengubah firewall atau `sshd_config`, **selalu buka 2 sesi terminal SSH**—jangan tutup sesi pertama sebelum sesi kedua berhasil login ulang!
- [x] Selalu jalankan `sudo sshd -t` sebelum me-restart layanan `ssh`.
- [x] Pastikan satu user lokal punya password kuat tersimpan di *password manager* agar selalu bisa login lewat Web Console/VNC VPS saat darurat.

Di **Bagian 2**, kita akan menghadapi kendala server nomor dua paling sering bikin aplikasi macet mendadak: **disk server penuh (`No space left on device`)** beserta trik menemukan biang kerok tersembunyi seperti *inode* habis dan file terhapus yang masih ditahan proses!

---

## Seri Troubleshooting Kendala Server Linux untuk Pemula

1. **Bagian 1 — SSH Tidak Bisa Login? Cara Atasi Connection Refused, Timeout, & Terkunci Sendiri** *(sedang dibaca)*
2. [Bagian 2 — Disk Penuh (`No space left on device`): Bersihkan Aman Tanpa Merusak Sistem](/posts/troubleshoot-disk-penuh-no-space/)
3. [Bagian 3 — Aplikasi Mati Mendadak karena RAM Habis (OOM Killer) & Cara Setup Swap](/posts/troubleshoot-ram-habis-oom-killer/)
4. [Bagian 4 — Website 502 Bad Gateway, 504 Timeout, & Port Bentrok (EADDRINUSE)](/posts/troubleshoot-web-502-504-port-bentrok/)
5. [Bagian 5 — apt / dpkg Error: Mengatasi Lock Error, Update Terputus, & Repo Gagal](/posts/troubleshoot-apt-dpkg-error-update/)
6. [Bagian 6 — Service Systemd Gagal Start & Error 403 Forbidden / Permission Denied](/posts/troubleshoot-service-gagal-start-permission/)
7. [Bagian 7 — Masalah SSL/HTTPS, DNS Tidak Mengarah, & Jam Server Melenceng](/posts/troubleshoot-ssl-dns-jam-server/)

---

## Referensi

- [Debian Manpage: `sshd_config(5)`](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)
- [Debian Manpage: `ufw(8)`](https://manpages.debian.org/trixie/ufw/ufw.8.en.html)
- [Artikel Terkait: Login SSH pakai kunci Ed25519 di Debian](/posts/debian-ssh-key/)
- [Artikel Terkait: Fail2ban untuk SSH di Debian](/posts/debian-fail2ban-ssh/)
