---
title: "SSH pakai kunci Ed25519 di Debian 13, lalu matikan sandi"
date: 2026-11-11T21:01:00+07:00
categories: ["Linux", "Server", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "ssh", "ssh-key", "ed25519"]
description: "Buat kunci SSH Ed25519, pasang di server Debian 13, uji di terminal kedua, lalu matikan login sandi dan root dengan cek konfigurasi efektif."
---

Login pakai kata sandi itu rentan: sandi bisa ditebak oleh bot otomatis di internet, bocor, atau kebetulan sama dengan akun lain. **SSH key** jauh lebih aman.

Bayangkan SSH key seperti sistem **gembok dan anak kunci unik**:
- **Kunci publik** (file berakhiran `.pub`) adalah **gemboknya**. Aman untuk dipasang di pintu server mana saja.
- **Kunci privat** (file tanpa `.pub`) adalah **anak kunci rahasianya** yang hanya disimpan di laptopmu. Jangan pernah dikirim ke siapa pun atau ditaruh di server.

Artikel ini akan memandumu membuat pasangan kunci tersebut, memasangnya di server, mengujinya di terminal terpisah, lalu mematikan login kata sandi agar tidak ada yang bisa masuk tanpa anak kunci milikmu—semuanya tanpa risiko terkunci.

Prasyarat: akun `admin` dengan `sudo` sudah aktif, seperti yang dibuat di [artikel pembuka seri](/posts/debian-server-keamanan-awal/). Angka `203.0.113.10` adalah IP contoh; **ganti dengan IP servermu**. Port SSH diasumsikan 22.

## 1. Buat pasangan kunci di laptop

Pertama, kita buat dulu pasangan gembok dan anak kuncinya di laptopmu (bukan di server). Jalankan di terminal laptop:

```bash
# di laptop
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_vps_nixkom -C "laptop-ke-vps-nixkom"
```

Apa arti bagian-bagian perintah itu?
- `mkdir -p ~/.ssh`: membuat folder `.ssh` di direktori home laptopmu kalau belum ada (`-p` artinya tidak akan error kalau foldernya sudah ada).
- `-t ed25519`: memilih jenis algoritma kunci. `Ed25519` adalah standar modern yang ringkas, cepat, dan sangat kuat.
- `-f ~/.ssh/id_ed25519_vps_nixkom`: menentukan nama dan lokasi file kuncinya agar unik. Tanpa `-f`, `ssh-keygen` akan memakai nama bawaan `~/.ssh/id_ed25519`, dan kalau file itu sudah ada, ia akan bertanya apakah mau menimpanya. **Jangan pernah jawab `y`** kalau kunci lama masih dipakai di server lain, karena kunci privat yang tertimpa tidak bisa dikembalikan!
- `-C "laptop-ke-vps-nixkom"`: menambahkan label komentar di bagian akhir kunci supaya nanti kamu ingat ini kunci dari perangkat mana ke server mana.

Saat diminta mengisi *passphrase*, **isi saja dengan kata sandi yang kuat**. Anggap *passphrase* ini sebagai PIN pengaman tambahan: kalau suatu saat laptopmu dicuri atau file kunci privatmu tersalin orang, mereka tetap tidak bisa memakainya tanpa tahu *passphrase*-nya.

Setelah selesai, kamu akan punya dua file:
- `id_ed25519_vps_nixkom` (kunci privat—rahasia, simpan baik-baik di laptop)
- `id_ed25519_vps_nixkom.pub` (kunci publik—aman untuk dipasang di server)

Cek isi kunci publikmu dengan perintah:

```bash
# di laptop
cat ~/.ssh/id_ed25519_vps_nixkom.pub
```

Bentuknya berupa satu baris teks panjang seperti: `ssh-ed25519 AAAA... laptop-ke-vps-nixkom`.

## 2. Verifikasi server lewat fingerprint

Saat pertama kali mengetuk pintu server lewat SSH, laptopmu akan menampilkan **fingerprint** (semacam sidik jari unik milik server) dan bertanya apakah kamu percaya dengan server tersebut.

Kenapa ini penting? Supaya kamu yakin benar-benar terhubung ke servermu sendiri, bukan ke server palsu yang menyamar di tengah jalan. Sebelum mengetik `yes` dan menyimpannya ke daftar tepercaya (`known_hosts`), cocokkan dulu sidik jari tersebut lewat jalur terpisah, yaitu **konsol provider**:

```bash
# di server (lewat konsol provider)
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Opsi `-l` menampilkan fingerprint, dan `-f` menunjuk file kunci identitas server. Keluarannya mirip `256 SHA256:xxxxxxxx... root@namahost (ED25519)`. Ketika terminal laptopmu menampilkan `ED25519 key fingerprint is SHA256:...`, cocokkan karakternya. Kalau sama persis, ketik `yes`. Kalau berbeda, langsung hentikan dan jangan lanjutkan.

## 3. Pasang kunci publik di server

Sekarang saatnya menempelkan "gembok" (kunci publik) ke server agar akun `admin` mengenalinya.

**Cara utama: pakai `ssh-copy-id`** (dijalankan dari laptop, masih memakai kata sandi `admin` untuk terakhir kalinya):

```bash
# di laptop
ssh-copy-id -i ~/.ssh/id_ed25519_vps_nixkom.pub admin@203.0.113.10
```

Opsi `-i` menunjuk file kunci publik yang ingin disalin. Perintah ini otomatis menyalin kunci publikmu ke file `~/.ssh/authorized_keys` milik `admin` di server, sekaligus mengatur izin akses (*permission*) foldernya agar sesuai standar keamanan.

**Cara cadangan (manual), kalau login kata sandi sudah tidak bisa** (misalnya image cloud dari awal hanya mengizinkan kunci untuk `root`): masuklah ke server dengan cara yang masih bisa atau lewat konsol provider. Di laptop, tampilkan isi kunci publik (`cat` seperti di langkah 1) lalu salin satu baris tersebut. Di server, sebagai `root`, siapkan folder `.ssh` dan file `authorized_keys`:

```bash
# di server (sebagai root)
install -d -m 700 -o admin -g admin /home/admin/.ssh
nano /home/admin/.ssh/authorized_keys
```

Perintah `install -d -m 700 -o admin -g admin` membuat direktori (`-d`) dengan izin ketat `700` (hanya pemilik yang boleh membuka/menulis, `-m 700`) dan langsung menetapkan pemilik (`-o`) serta grup (`-g`) ke `admin`. Tempelkan satu baris kunci publik tadi ke dalam `nano`, simpan (`Ctrl+O`, `Enter`, lalu `Ctrl+X`), lalu atur pemilik dan izin filenya:

```bash
# di server (sebagai root)
chown admin:admin /home/admin/.ssh/authorized_keys
chmod 600 /home/admin/.ssh/authorized_keys
```

Kenapa izin akses ini harus ketat (`700` dan `600`)? Karena layanan SSH di server (`sshd`, program yang berjalan diam-diam di latar belakang menunggu koneksi masuk) punya fitur pengaman bernama `StrictModes`. Kalau folder `.ssh` atau file `authorized_keys` bisa ditulis oleh user lain, `sshd` akan menganggap kunci itu tidak aman dan menolaknya. Pastikan izinnya sudah benar:

```bash
# di server
ls -ld /home/admin /home/admin/.ssh
ls -l /home/admin/.ssh/authorized_keys
```

(`-d` pada `ls -ld` artinya lihat info foldernya sendiri, bukan daftar isinya). Pastikan `.ssh` berizin `drwx------` dan `authorized_keys` berizin `-rw-------`, dan keduanya milik `admin`.

## 4. Uji di terminal kedua: wajib pakai kunci

**Biarkan sesi SSH yang sekarang tetap terbuka.** Buka jendela terminal baru (terminal kedua) di laptop, lalu uji login khusus menggunakan kunci:

```bash
# di laptop, terminal kedua
ssh -i ~/.ssh/id_ed25519_vps_nixkom \
    -o PreferredAuthentications=publickey \
    -o PasswordAuthentication=no \
    admin@203.0.113.10
```

Dua opsi `-o` di atas memaksa SSH untuk **hanya mencoba kunci** dan melarang penggunaan kata sandi. Kenapa harus repot pakai opsi itu? Supaya kamu yakin 100% bahwa kamu berhasil masuk memang karena kuncinya bekerja, bukan karena SSH diam-diam meminta kata sandi. Saat diminta, masukkan *passphrase* kuncimu (bukan kata sandi akun `admin`).

Setelah masuk, pastikan `sudo` masih aman:

```bash
# di server, sebagai admin
sudo whoami
```

Harus muncul `root`. Kalau ada yang gagal, **jangan lanjut ke langkah 5**—perbaiki dulu dari sesi lama yang masih terbuka.

Supaya ke depannya kamu tidak capek mengetik `-i ~/.ssh/...` dan IP server terus-menerus, kamu bisa menyimpan pintasannya di file `~/.ssh/config` di laptop:

```text
Host vps-nixkom
    HostName 203.0.113.10
    User admin
    IdentityFile ~/.ssh/id_ed25519_vps_nixkom
    IdentitiesOnly yes
```

(`IdentitiesOnly yes` memastikan laptopmu hanya menyodorkan kunci tersebut ke server ini). Setelah disimpan, kamu cukup mengetik `ssh vps-nixkom`.

## 5. Matikan login kata sandi dan login root lewat file snippet

Setelah terbukti bisa masuk pakai kunci, barulah kita tutup pintu login pakai kata sandi dan login `root`.

Cara kerja pengaturan SSH di Debian punya satu aturan penting yang perlu kamu tahu: Debian memakai baris `Include /etc/ssh/sshd_config.d/*.conf` di bagian **awal** file utama `/etc/ssh/sshd_config`. Aturan main `sshd_config` adalah: **nilai yang pertama kali terbaca adalah yang dipakai** (menang).

Artinya, file-file konfigurasi kecil (*snippet*) di dalam folder `sshd_config.d/` dibaca lebih dulu secara alfabetis sebelum isi utama `sshd_config`. Kalau image VPS cloud kamu sudah membawa file bawaan seperti `50-cloud-init.conf` yang isinya mengaktifkan `PasswordAuthentication yes`, aturan itu bisa mengalahkan aturanmu kalau namamu ditaruh setelah angka `50`.

Jadi, kita cek dulu isi folder snippet dan cari pengaturan yang sudah ada:

```bash
# di server
ls -l /etc/ssh/sshd_config.d/
sudo grep -RniE '^\s*(PasswordAuthentication|PermitRootLogin|KbdInteractiveAuthentication|AuthenticationMethods|UsePAM)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/
```

(`grep -RniE` mencari teks terkait secara rekursif di seluruh folder tersebut tanpa mempedulikan huruf besar/kecil).

Sekarang buat file snippet dengan awalan `00-` agar urutannya dibaca **paling pertama** dan mengalahkan file lain:

```bash
# di server
sudo nano /etc/ssh/sshd_config.d/00-hardening.conf
```

Isi dengan baris berikut:

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
```

Artinya: dilarang login langsung sebagai `root`, dilarang login pakai kata sandi biasa maupun interaktif, dan login hanya diizinkan memakai kunci publik (`PubkeyAuthentication yes`).

Catatan penting: pengaturan di atas cocok untuk server yang murni hanya memakai kunci SSH. Kalau kamu memakai autentikasi dua faktor (2FA) atau `AuthenticationMethods` yang meminta kata sandi + kode verifikasi (`keyboard-interactive`), jangan langsung mematikan `KbdInteractiveAuthentication` karena bisa memutus login 2FA-mu. Sesuaikan dengan kebutuhanmu.

Sebelum menerapkan aturan baru ini, **wajib cek dulu** apakah ada salah ketik (sintaks) dan apakah nilai akhirnya sudah sesuai harapan. Perlu diingat juga: di Debian, nama layanannya adalah `ssh`, bukan `sshd`:

```bash
# di server
sudo /usr/sbin/sshd -t
sudo /usr/sbin/sshd -T | grep -iE '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication)'
```

- `sshd -t` (*test*) memeriksa apakah ada kesalahan penulisan di konfigurasi. **Berhenti dan perbaiki kalau langkah ini gagal.**
- `sshd -T` mencetak seluruh konfigurasi efektif yang benar-benar akan dipakai server. Harapannya muncul: `permitrootlogin no`, `passwordauthentication no`, `kbdinteractiveauthentication no`, `pubkeyauthentication yes`.

Kalau di konfigurasimu ada blok `Match` (aturan khusus untuk user atau IP tertentu), nilai efektif bisa berubah tergantung siapa yang terhubung. Uji dengan simulasi konteks koneksi nyata (`-C`) sebelum reload:

```bash
# di server
sudo /usr/sbin/sshd -T -C user=admin,host=laptop,addr=198.51.100.7
```

Ganti `198.51.100.7` dengan IP publik laptopmu dan `host=laptop` dengan nama klien yang cocok jika kamu memakai `Match Host`. Sertakan juga `laddr` dan `lport` sesuai koneksi jika aturanmu mencocokkan alamat atau port lokal. Jika hasilnya berbeda dari yang diharapkan, perbaiki dulu snippet atau blok `Match`-nya sebelum lanjut.

## 6. Terapkan (reload) dan buktikan login baru

Kalau semua pemeriksaan di atas sudah bersih, terapkan konfigurasi baru:

```bash
# di server
sudo /usr/sbin/sshd -t && sudo systemctl reload ssh
```

Perintah `reload` menyegarkan aturan layanan `ssh` tanpa memutus sesi SSH yang sedang berjalan. Jadi sesi lamamu tetap aman.

Sekarang, biarkan sesi lama tetap terbuka, lalu buka **terminal ketiga** di laptop dan ulangi perintah login hanya-kunci dari langkah 4, kemudian cek `sudo whoami` lagi.

Sekalian, uji bahwa login pakai kata sandi memang sudah ditolak mentah-mentah:

```bash
# di laptop
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no admin@203.0.113.10
```

Hasilnya harus berakhir dengan `Permission denied (publickey)`. Setelah semuanya cocok dan `sudo whoami` tetap jalan di sesi baru, barulah sesi lama boleh kamu tutup.

## Kalau sampai terkunci: jalan mundur

- **Sesi lama masih terbuka**: hapus atau perbaiki `/etc/ssh/sshd_config.d/00-hardening.conf`, jalankan `sudo sshd -t && sudo systemctl reload ssh`, lalu ulangi pengujian.
- **Sesi sudah telanjur tertutup**: buka **konsol provider** dari browser, login sebagai `root` atau `admin` memakai kata sandi lokal (kata sandi akunnya masih ada kok, cuma pintu SSH-nya saja yang menolak), lalu perbaiki file snippet yang sama.
- **Lupa passphrase kunci**: tidak ada tombol "lupa password" untuk *passphrase*. Masuk lewat konsol provider dan pasang kunci publik baru.

Ingat: kunci privat tidak boleh dikirim lewat chat atau disimpan di server. Kalau kamu punya lebih dari satu laptop atau komputer, buatlah pasangan kunci terpisah untuk masing-masing perangkat dan tempelkan baris kunci publiknya ke `authorized_keys`. Jadi kalau satu laptop hilang, kamu tinggal menghapus satu baris kuncinya di server tanpa mengganggu perangkat lain.

Di artikel ini kita sengaja tidak mengganti port SSH (tetap 22) karena mengganti port hanya mengurangi ramainya catatan log dari bot pemindai, bukan menambah keamanan nyata, dan malah sering membuat pemula salah mengatur firewall. Pembahasan firewall ada di [artikel berikutnya](/posts/debian-firewall-ufw/).

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
