---
title: "Login SSH pakai kunci Ed25519 di Debian 13, lalu matikan sandi"
date: 2026-11-11T21:01:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "ssh", "ssh-key", "ed25519"]
description: "Buat kunci SSH Ed25519, pasang di server Debian 13, uji di terminal kedua, lalu matikan login sandi dan root dengan cek konfigurasi efektif."
---

Kata sandi SSH bisa ditebak, bocor, atau dipakai ulang. Kunci SSH jauh lebih sulit dibobol: kamu punya kunci privat di laptop, server hanya menyimpan kunci publiknya. Artikel ini membawamu dari membuat kunci sampai mematikan login sandi, dengan pengujian di setiap langkah supaya tidak terkunci.

Prasyarat: akun `admin` dengan `sudo` sudah jalan, seperti di [artikel pembuka seri](/posts/debian-server-keamanan-awal/). `203.0.113.10` adalah IP dokumentasi; **ganti dengan IP servermu**. Port SSH diasumsikan 22.

## 1. Buat kunci di laptop

```bash
# di laptop
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_vps_nixkom -C "laptop-ke-vps-nixkom"
```

- `-f` memberi nama berkas yang unik. Tanpa itu, `ssh-keygen` memakai `~/.ssh/id_ed25519`, dan kalau berkas itu sudah ada ia bertanya apakah mau menimpanya. **Jangan jawab `y`** kalau kunci lama masih dipakai di tempat lain: kunci privat yang tertimpa tidak bisa dipulihkan.
- Saat diminta *passphrase*, isi. Passphrase melindungi kunci kalau laptopmu dicuri atau berkasnya tersalin.
- Hasilnya dua berkas: `id_ed25519_vps_nixkom` (privat, rahasia, jangan dikirim ke siapa pun) dan `id_ed25519_vps_nixkom.pub` (publik, aman dipasang di server).

Cek isi kunci publik:

```bash
# di laptop
cat ~/.ssh/id_ed25519_vps_nixkom.pub
```

Bentuknya satu baris: `ssh-ed25519 AAAA... laptop-ke-vps-nixkom`.

## 2. Verifikasi server lewat fingerprint

Saat pertama kali terhubung, SSH menampilkan fingerprint server dan bertanya apakah kamu percaya. Cocokkan lewat jalur terpisah sebelum menyimpan identitas server ke `known_hosts`. Ambil fingerprint lewat **konsol provider**:

```bash
# di server (lewat konsol provider)
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Keluarannya mirip `256 SHA256:xxxxxxxx... root@namahost (ED25519)`. Waktu SSH dari laptop menampilkan `ED25519 key fingerprint is SHA256:...`, cocokkan karakternya. Kalau sama, ketik `yes`. Kalau berbeda, berhenti dan jangan lanjut.

## 3. Pasang kunci publik di server

**Cara utama: `ssh-copy-id`** (dari laptop, masih memakai sandi `admin`):

```bash
# di laptop
ssh-copy-id -i ~/.ssh/id_ed25519_vps_nixkom.pub admin@203.0.113.10
```

Perintah ini menambahkan kunci ke `~/.ssh/authorized_keys` milik `admin` dan mengatur izin yang diperlukan.

**Cadangan, kalau login sandi sudah tidak bisa** (misalnya image cloud hanya menerima kunci untuk `root`): masuk dengan cara yang masih jalan atau lewat konsol, lalu pasang manual. Di laptop, tampilkan kunci publik (`cat` seperti di atas) dan salin satu barisnya. Di server, sebagai `root`:

```bash
# di server (sebagai root)
install -d -m 700 -o admin -g admin /home/admin/.ssh
nano /home/admin/.ssh/authorized_keys
```

Tempel satu baris kunci publik, simpan, lalu:

```bash
# di server (sebagai root)
chown admin:admin /home/admin/.ssh/authorized_keys
chmod 600 /home/admin/.ssh/authorized_keys
```

Izin penting karena `sshd` menolak kunci kalau `~/.ssh` atau home bisa ditulis orang lain (`StrictModes`). Cek:

```bash
# di server
ls -ld /home/admin /home/admin/.ssh
ls -l /home/admin/.ssh/authorized_keys
```

Harapannya `.ssh` berizin `drwx------` dan `authorized_keys` berizin `-rw-------`, keduanya milik `admin`.

## 4. Uji di terminal kedua: hanya kunci

Biarkan sesi lama terbuka. Di terminal baru:

```bash
# di laptop, terminal kedua
ssh -i ~/.ssh/id_ed25519_vps_nixkom \
    -o PreferredAuthentications=publickey \
    -o PasswordAuthentication=no \
    admin@203.0.113.10
```

Opsi itu memaksa SSH mencoba hanya kunci, jadi kalau berhasil, itu benar-benar kunci, bukan sandi diam-diam. Kamu akan diminta passphrase kunci (bukan sandi akun). Setelah masuk, buktikan `sudo`:

```bash
# di server, sebagai admin
sudo whoami
```

Harus `root`. Kalau salah satunya gagal, **jangan lanjut ke langkah berikutnya**; perbaiki dulu.

Supaya tidak mengetik `-i` terus, tambahkan di `~/.ssh/config` laptop:

```text
Host vps-nixkom
    HostName 203.0.113.10
    User admin
    IdentityFile ~/.ssh/id_ed25519_vps_nixkom
    IdentitiesOnly yes
```

Sesudahnya cukup `ssh vps-nixkom`.

## 5. Matikan sandi dan login root lewat snippet

Debian memakai `Include /etc/ssh/sshd_config.d/*.conf` di bagian **awal** `/etc/ssh/sshd_config`. Aturan `sshd_config`: untuk tiap opsi, **nilai pertama yang terbaca yang dipakai**. Artinya berkas snippet diproses sebelum isi `sshd_config`, dan di antara snippet urutannya alfabetis. Snippet yang sudah mengatur `PasswordAuthentication yes` di nama berkas lebih awal akan mengalahkan setelanmu. Image cloud kadang membawa snippet seperti itu (misalnya `50-cloud-init.conf`), jadi lihat dulu:

```bash
# di server
ls -l /etc/ssh/sshd_config.d/
sudo grep -RniE '^\s*(PasswordAuthentication|PermitRootLogin|KbdInteractiveAuthentication|AuthenticationMethods|UsePAM)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/
```

Buat snippet dengan nama yang diurutkan paling awal:

```bash
# di server
sudo nano /etc/ssh/sshd_config.d/00-hardening.conf
```

Isi:

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
```

Catatan cakupan: opsi di atas cocok untuk server yang hanya memakai kunci SSH. Kalau kamu memakai 2FA atau `AuthenticationMethods` yang melibatkan kata sandi + kode (`keyboard-interactive`), jangan matikan `KbdInteractiveAuthentication` begitu saja; itu bisa memutus login 2FA-mu. Sesuaikan dengan metode yang kamu pakai.

Sebelum menerapkan perubahan, periksa sintaks dan nilai efektifnya. Layanannya bernama `ssh` di Debian, bukan `sshd`:

```bash
# di server
sudo /usr/sbin/sshd -t
sudo /usr/sbin/sshd -T | grep -iE '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication)'
```

Berhenti kalau cek sintaks gagal. Harapannya `permitrootlogin no`, `passwordauthentication no`, `kbdinteractiveauthentication no`, `pubkeyauthentication yes`. Blok `Match` dapat mengubah hasil untuk koneksi tertentu. Periksa dengan konteks koneksi nyata sebelum reload:

```bash
# di server
sudo /usr/sbin/sshd -T -C user=admin,host=laptop,addr=198.51.100.7
```

Ganti `198.51.100.7` dengan IP publik laptopmu dan `host=laptop` dengan nama klien yang cocok jika kamu memakai `Match Host`. Sertakan `laddr` dan `lport` sesuai koneksi jika aturanmu mencocokkan alamat atau port lokal. Kalau nilainya berbeda, perbaiki snippet atau `Match` yang menyebabkan perbedaan sebelum lanjut.

## 6. Reload dan buktikan login baru

Setelah semua pemeriksaan cocok:

```bash
# di server
sudo /usr/sbin/sshd -t && sudo systemctl reload ssh
```

Reload tidak memutus sesi SSH yang sudah berjalan. Biarkan sesi lama terbuka, lalu ulangi perintah login hanya-kunci dari langkah 4 di terminal ketiga dan jalankan `sudo whoami` lagi. Coba juga bahwa sandi benar-benar ditolak:

```bash
# di laptop
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no admin@203.0.113.10
```

Harus berakhir `Permission denied (publickey)`. Setelah semua cocok dan `sudo whoami` masih jalan di login baru, baru sesi lama boleh ditutup.

## Kalau terkunci: jalan mundur

- **Sesi lama masih terbuka**: hapus atau ubah `/etc/ssh/sshd_config.d/00-hardening.conf`, jalankan `sudo sshd -t && sudo systemctl reload ssh`, ulangi uji.
- **Sesi sudah tertutup**: masuk lewat konsol provider, login sebagai `root`/`admin` dengan sandi lokal (sandi akun tetap ada walau SSH menolaknya), lalu perbaiki snippet yang sama.
- **Lupa passphrase**: tidak ada pemulihan. Masuk lewat konsol dan pasang kunci baru.

Kunci privat tidak boleh dikirim lewat chat atau disimpan di server. Punya laptop lain? Buat kunci terpisah per perangkat dan tambahkan masing-masing barisnya ke `authorized_keys`, jadi satu perangkat hilang bisa dicabut tanpa mengganggu yang lain.

Mengganti port SSH tidak dibahas di sini karena hanya mengurangi bising log, bukan memperkuat apa pun, dan menambah peluang salah konfigurasi firewall. Firewall datang di [artikel berikutnya](/posts/debian-firewall-ufw/).

## Referensi

- [sshd_config(5), Debian trixie](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html): urutan nilai pertama, `Include`, `Match`
- [ssh-copy-id(1)](https://manpages.debian.org/trixie/openssh-client/ssh-copy-id.1.en.html)
- [ssh-keygen(1)](https://manpages.debian.org/trixie/openssh-client/ssh-keygen.1.en.html)
- [ssh(1)](https://manpages.debian.org/trixie/openssh-client/ssh.1.en.html)

## Seri keamanan server Debian

1. [Mengamankan VPS Debian 13 baru](/posts/debian-server-keamanan-awal/)
2. **Login SSH pakai kunci Ed25519 (artikel ini)**
3. [Firewall UFW tanpa terkunci](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka dengan ss dan nmap](/posts/debian-cek-port/)
5. [Update keamanan otomatis dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. [Permission berkas tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. [Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)
8. [Backup dan uji restore](/posts/debian-backup-restore/)
