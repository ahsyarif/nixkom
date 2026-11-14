---
title: "Mengamankan VPS Debian 13 baru: urutan langkah awal"
date: 2026-11-11T21:00:00+07:00
categories: ["Linux", "Server", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "vps", "sudo", "ssh"]
description: "Urutan aman menyiapkan VPS Debian 13 baru: update, akun admin bersudo, lalu kunci SSH, firewall, patch otomatis, dan backup tanpa terkunci."
---

Baru menyewa VPS Debian 13 (*trixie*) dan bingung harus mulai dari mana supaya aman? Tenang, langkah awalnya tidak seseram kelihatannya. Intinya cuma dua: **perbarui sistem dan buat akun admin biasa** terlebih dahulu, baru setelah itu kita batasi akses SSH dan pasang firewall.

Satu aturan emas yang wajib dipegang dari awal sampai akhir: **jangan menutup pintu masuk lama sebelum pintu masuk baru terbukti bisa dibuka.** Anggap saja seperti mengganti gembok rumah—pastikan kunci baru sudah dicoba dan berhasil memutar gembok sebelum gembok lama dibuang.

Dalam semua contoh di artikel ini, `203.0.113.10` adalah IP contoh (IP dokumentasi). **Selalu ganti dengan IP server aslimu.** Kita juga mengasumsikan port SSH ada di angka 22 dan nama akun admin barunya adalah `admin` (sesuaikan kalau punyamu berbeda). Perhatikan juga komentar `# di server` atau `# di laptop` di setiap kotak kode agar kamu tidak salah tempat saat menjalankan perintah.

## Sebelum mulai: siapkan jalan darurat

Sebelum menyentuh konfigurasi apa pun, cari dulu menu **konsol recovery / VNC / serial console** di panel penyedia VPS (provider) kamu.

Kenapa ini penting? Konsol ini tidak lewat jaringan SSH, melainkan ibarat "monitor dan keyboard yang dicolokkan langsung ke server" di gedung data center. Jadi, kalau nanti kamu tidak sengaja salah mengatur firewall atau SSH hingga terkunci, konsol inilah pintu daruratmu. Coba login lewat konsol ini sekali saja menggunakan kredensial `root` dari provider supaya kamu yakin jalan darurat ini benar-benar berfungsi *sebelum* kamu membutuhkannya.

Sekalian di panel provider, cek apakah ada fitur **cloud firewall** atau **security group**. Bayangkan ini sebagai satpam di gerbang kompleks perumahan, sedangkan firewall di dalam server nanti adalah satpam di depan pintu rumahmu. Keduanya terpisah dan sama-sama bisa memblokir koneksi kalau ada yang tidak diizinkan.

## Langkah 1: masuk pertama kali dan perbarui sistem

Dari laptopmu, buka terminal lalu masuk ke server menggunakan akun awal yang diberikan provider:

```bash
# di laptop
ssh root@203.0.113.10
```

Di sini kita memakai akun `root`, yaitu akun "penguasa penuh" di Linux yang bisa mengubah segala hal di sistem. Kalau provider kamu tidak memberi akses `root` secara langsung melainkan akun biasa yang sudah punya hak `sudo`, masuklah dengan akun itu dan awali perintah-perintah administrasi nanti dengan kata `sudo`. Kalau image VPS-mu sejak awal hanya menerima SSH key (kunci), gunakan opsi `-i /lokasi/kunci` (`-i` adalah singkatan dari *identity file*, untuk menunjuk lokasi file kunci privatmu); jangan mengaktifkan login kata sandi hanya demi mengikuti contoh.

Saat pertama kali terhubung, SSH akan memunculkan pertanyaan tentang **fingerprint** (semacam sidik jari unik milik server untuk memastikan kamu tidak nyasar ke server palsu). Jangan langsung mengetik `yes`. Cocokkan dulu sidik jari tersebut dengan yang ada di konsol provider; langkah lengkapnya ada di [artikel SSH key](/posts/debian-ssh-key/).

Setelah berhasil masuk ke server, kita perlu memperbarui sistem. Kenapa? Server baru biasanya masih membawa paket bawaan yang mungkin sudah punya tambalan celah keamanan (*security patch*) terbaru. Jalankan dua perintah ini dulu:

```bash
# di server
apt update
apt list --upgradable
```

- `apt` adalah manajer paket di Debian (ibarat toko aplikasi sekaligus pembaru sistem).
- `apt update` bertugas menyegarkan daftar katalog paket terbaru dari internet (belum menginstal apa-apa).
- `apt list --upgradable` menampilkan daftar aplikasi atau komponen sistem yang punya versi lebih baru.

Kalau daftar pembaruannya terlihat wajar, baru jalankan pembaruan sebenarnya:

```bash
# di server
apt upgrade
```

APT akan menampilkan ringkasan paket apa saja yang akan dipasang, diganti, atau dihapus, lalu meminta konfirmasi. **Biasakan membaca ringkasan ini**, terutama kalau ada baris bertuliskan "akan dihapus" (*to be REMOVED*), supaya tidak ada layanan penting yang ikut terhapus tanpa sengaja. Kalau muncul dialog tentang berkas konfigurasi yang pernah diubah, pilih pertahankan versi lokal jika kamu ragu, lalu cek nanti. Jika inti sistem (*kernel*) ikut diperbarui, kamu bisa melakukan `reboot` nanti setelah akun `admin` siap dan kamu sudah yakin punya akses konsol darurat.

## Langkah 2: buat akun admin dengan sudo

Kenapa tidak pakai `root` saja seterusnya? Bekerja sehari-hari sebagai `root` itu seperti mengendarai mobil tanpa rem: satu kali saja kamu salah ketik perintah (misalnya salah menghapus direktori), sistem langsung menurut tanpa bertanya.

Solusinya, kita buat akun pengguna biasa (`admin`) yang sehari-hari punya hak terbatas, tapi bisa meminjam "hak akses super" kapan pun dibutuhkan dengan mengetik `sudo` (*superuser do*). Karena beberapa image Debian minimal belum menyertakan `sudo`, kita pasang dulu paketnya lalu buat akunnya:

```bash
# di server (sebagai root)
apt install sudo adduser
adduser admin
usermod -aG sudo admin
```

Mari kita bedah perintah di atas:
- `adduser admin` akan membuat user baru bernama `admin` dan memintamu membuat kata sandi. Pilih kata sandi yang panjang dan unik. Isian lain seperti nama lengkap atau nomor telepon boleh dikosongkan dengan menekan Enter.
- `usermod -aG sudo admin` memasukkan `admin` ke dalam grup `sudo`. Di sini, `-G` berarti menetapkan grup, sedangkan `-a` (*append*) berarti **menambahkan** ke grup baru tanpa menghapus grup-grup yang sudah dimiliki sebelumnya. Opsi `-a` ini penting sekali karena tanpanya grup lama bisa terhapus.

Sekarang cek apakah akun `admin` sudah resmi masuk ke grup `sudo`:

```bash
# di server
id admin
```

Pastikan keluarannya memuat kata `sudo`, misalnya `groups=1001(admin),27(sudo)`. Perubahan grup ini baru akan dibaca sistem saat kita melakukan login baru, jadi langkah berikutnya kita tes dari jendela terminal baru.

## Langkah 3: sambung ulang dan buktikan sudo berfungsi

**Jangan tutup sesi `root` yang sekarang terbuka!** Biarkan ia tetap menyala sebagai tali penyelamat. Buka **terminal kedua** di laptopmu, lalu coba login sebagai `admin`:

```bash
# di laptop, terminal kedua
ssh admin@203.0.113.10
```

Kalau VPS-mu sejak awal hanya menerima SSH key, pasang dulu kunci publik milik `admin` lewat sesi `root` yang masih terbuka (ikuti bagian pemasangan manual di [panduan kunci SSH](/posts/debian-ssh-key/)), baru ulangi login `admin` memakai kunci tersebut.

Setelah berhasil masuk sebagai `admin`, uji apakah `sudo` berjalan dengan menanyakan ke sistem siapa kita saat memakai `sudo`:

```bash
# di server, sebagai admin
sudo whoami
```

Masukkan kata sandi `admin` jika diminta. Perintah ini harus mencetak `root`. Jika benar mencetak `root`, selamat—kamu sekarang sudah punya pintu masuk non-root yang aman dan berfungsi! Kalau gagal (misalnya muncul pesan `admin is not in the sudoers file`), jangan panik dan jangan tutup sesi `root` di terminal pertama; perbaiki langsung dari sesi `root` tersebut.

## Langkah 4: lanjutkan pengamanan bertahap, satu per satu

Sekarang fondasi awal sudah aman. Lanjutkan pengamanan server mengikuti urutan berikut agar setiap langkah bisa diuji satu per satu dan selalu ada jalan mundur jika terjadi kesalahan:

1. **[Kunci SSH](/posts/debian-ssh-key/)**: login memakai kunci kriptografi, uji di terminal kedua, baru nonaktifkan login kata sandi dan login `root`.
2. **[Firewall UFW](/posts/debian-firewall-ufw/)**: izinkan pintu SSH dulu, baru nyalakan satpam firewall.
3. **[Cek port yang terbuka](/posts/debian-cek-port/)**: periksa pintu mana saja yang terbuka dan pastikan hanya layanan yang memang kamu butuhkan yang bisa diakses.
4. **[Update keamanan otomatis](/posts/debian-unattended-upgrades/)**: pasang sistem tambalan keamanan otomatis agar tidak lupa.
5. **[Permission tanpa 777](/posts/debian-permission-tanpa-777/)**: atur izin akses berkas seperlunya saja.
6. **[Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)**: blokir otomatis pihak yang mencoba menebak kata sandi berkali-kali.
7. **[Backup dan uji restore](/posts/debian-backup-restore/)**: jaring pengaman terakhir kalau semua pertahanan di atas kebobolan atau terjadi kesalahan fatal.

Kenapa kunci SSH kita uji sebelum menyalakan firewall? Supaya kamu tidak mengubah dua jalur akses sekaligus dalam satu waktu—kalau ada yang macet, kamu langsung tahu penyebabnya. Jika server sudah mulai menyimpan data penting, pastikan kamu sudah membuat dan menguji backup sebelum melakukan eksperimen konfigurasi besar.

## Hal yang sengaja tidak kita lakukan

- **Jangan mematikan login `root` atau login kata sandi sebelum login pakai SSH key + `sudo` terbukti berhasil** dari terminal terpisah.
- **Jangan asal salin-tempel skrip "hardening satu klik"** dari internet. Kalau kamu tidak tahu apa saja yang diubah skrip itu, kamu juga tidak akan tahu cara memperbaikinya saat ada layanan yang error.
- **Jangan menutup sesi SSH yang sedang aktif** saat kamu sedang mengutak-atik pengaturan SSH atau firewall. Sesi lama yang masih tersambung itulah penyelamatmu kalau konfigurasi baru ternyata salah.

## Cek akhir

Sebelum menutup tahap awal ini dan lanjut ke artikel berikutnya, pastikan tiga hal ini sudah beres:

- Login `admin` dan perintah `sudo whoami` berhasil dijalankan di terminal terpisah.
- Kamu sudah tahu cara membuka konsol recovery di panel provider.
- Perintah `apt update && apt list --upgradable` sudah tidak menyisakan pembaruan keamanan yang tertunda.

## Referensi

- [Debian Reference, bab 4: autentikasi dan kontrol akses](https://www.debian.org/doc/manuals/debian-reference/ch04.en.html)
- [adduser(8), Debian trixie](https://manpages.debian.org/trixie/adduser/adduser.8.en.html)
- [sudo(8), Debian trixie](https://manpages.debian.org/trixie/sudo/sudo.8.en.html)

## Seri keamanan server Debian

1. **Mengamankan VPS Debian 13 baru (artikel ini)**
2. [Login SSH pakai kunci Ed25519](/posts/debian-ssh-key/)
3. [Firewall UFW tanpa terkunci](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka dengan ss dan nmap](/posts/debian-cek-port/)
5. [Update keamanan otomatis dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. [Permission berkas tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. [Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)
8. [Backup dan uji restore](/posts/debian-backup-restore/)
