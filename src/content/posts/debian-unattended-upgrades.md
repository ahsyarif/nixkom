---
title: "Update keamanan otomatis di Debian 13 dengan unattended-upgrades"
date: 2026-11-11T21:04:00+07:00
categories: ["Linux", "Server", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "unattended-upgrades", "apt"]
description: "Aktifkan unattended-upgrades di Debian 13, baca Origins-Pattern versi Debian, uji dry-run, cek timer dan log, serta tentukan reboot tanpa Automatic-Reboot."
---

Sama seperti HP atau laptop yang butuh pembaruan keamanan (*security patch*), server Debian juga rutin mendapatkan tambalan celah keamanan. Bedanya, kamu tentu tidak mau login ke server setiap pagi hanya untuk mengetik `apt update && apt upgrade`.

Di sinilah **`unattended-upgrades`** berperan. Alat ini berjalan diam-diam di latar belakang memakai jadwal (*timer*) APT di Debian 13 (*trixie*) untuk memasang pembaruan dari sumber yang kamu izinkan secara otomatis.

Yang terpenting bagi pemula: kita harus **memisahkan urusan memasang tambalan dari urusan me-restart (reboot) server**. Memasang update secara otomatis itu bagus, tetapi membiarkan server reboot mendadak di tengah hari tanpa sepengetahuanmu bisa memutus layanan yang sedang dipakai pengguna.

Semua perintah di bawah dijalankan **di server** memakai akun admin yang punya hak `sudo`. Panduan ini disusun dari dokumentasi resmi Debian, bukan hasil uji langsung di servermu; hasil di mesinmu bisa berbeda, jadi selalu cocokkan dengan keluaran perintah di layarmu.

## 1. Pasang dan nyalakan layanan update otomatis

Beberapa VPS Debian sudah menyertakan paket ini dari awal dengan pengaturan bawaan, sementara yang lain belum. Pasang saja lagi bersama dua paket pendampingnya (jika sudah terpasang, `apt` hanya akan memberi tahu):

```bash
# di server
sudo apt update
sudo apt install unattended-upgrades apt-listchanges needrestart
sudo dpkg-reconfigure -plow unattended-upgrades
```

Apa fungsi dua paket tambahan tadi?
- `apt-listchanges` (opsional): membantu mencatat ringkasan perubahan tiap paket.
- `needrestart`: nanti kita pakai untuk memeriksa apakah ada aplikasi atau *kernel* yang perlu di-restart sesudah update terpasang.

Saat menjalankan `dpkg-reconfigure -plow unattended-upgrades`, akan muncul layar tanya **"Automatically download and install stable updates?"** — pilih **Yes**.

Pilihan **Yes** tersebut akan membuatkan file konfigurasi `/etc/apt/apt.conf.d/20auto-upgrades`. Paket Debian menyediakan dua templat untuk file ini: yang aktif berisi angka `"1"`, sedangkan yang mati berisi `"0"`:

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

Angka `"1"` artinya berjalan otomatis **setiap 1 hari sekali**. Untuk memastikan setelan aktif yang benar-benar terbaca oleh APT (bukan cuma mengira-ngira dari satu file, karena bisa saja ada file lain yang menimpanya), jalankan:

```bash
# di server
apt-config dump APT::Periodic
cat /etc/apt/apt.conf.d/20auto-upgrades
```

Pastikan kamu melihat `Update-Package-Lists "1"` dan `Unattended-Upgrade "1"`.

## 2. Baca aturan sumber (`Origins-Pattern`) versi Debian, jangan salin dari Ubuntu!

Salah satu jebakan paling sering saat mencari tutorial di internet adalah menyalin konfigurasi Ubuntu untuk dipakai di Debian. Di Ubuntu, format daftar sumbernya tertulis seperti `"${distro_id}:${distro_codename}-security";`. **Format itu tidak cocok dengan konfigurasi bawaan Debian!**

File konfigurasi bawaan Debian berada di `/etc/apt/apt.conf.d/50unattended-upgrades` (dibuat dari templat `50unattended-upgrades.Debian`) dan memakai kata kunci **`origin`**, **`codename`**, dan **`label`**:

```text
Unattended-Upgrade::Origins-Pattern {
//      "origin=Debian,codename=${distro_codename}-updates";
//      "origin=Debian,codename=${distro_codename}-proposed-updates";
        "origin=Debian,codename=${distro_codename},label=Debian";
        "origin=Debian,codename=${distro_codename},label=Debian-Security";
        "origin=Debian,codename=${distro_codename}-security,label=Debian-Security";
};
```

Cara membacanya mudah:
- Tanda `//` di awal baris adalah komentar (tidak aktif).
- `${distro_codename}` akan otomatis diisi nama rilis Debian-mu (untuk Debian 13 isinya `trixie`).
- Sebuah baris aturan dianggap cocok hanya jika **semua** kata kunci di baris itu cocok dengan sumber paket. Secara bawaan, Debian mengizinkan paket rilis utama dan arsip keamanan resminya.

Jangan menebak apakah polanya cocok dengan sumber repositori servermu—lihat sendiri data aslinya dari APT:

```bash
# di server
apt-cache policy | grep -E 'o=|n=' | sort -u
grep -v '^\s*//' /etc/apt/apt.conf.d/50unattended-upgrades | grep -v '^\s*$' | head -30
apt-config dump Unattended-Upgrade::Origins-Pattern
```

Pada hasil `apt-cache policy`, perhatikan kode `o=` (origin), `n=` (codename), dan `l=` (label) dari setiap sumber, lalu cocokkan dengan aturan aktifmu. Jika kamu memasang repositori pihak ketiga (misalnya repositori Docker atau NodeSource), pola bawaan di atas **sengaja tidak mencakupnya**, sehingga paket dari pihak ketiga tidak ikut di-upgrade otomatis. Itu perilaku yang aman—hanya tambahkan sumber pihak ketiga kalau kamu percaya pengelolanya dan paham risikonya.

### Matikan reboot otomatis secara eksplisit

Dokumentasi Debian menyarankan untuk tidak mengedit file `50unattended-upgrades` yang panjang secara langsung. Taruh saja perubahan kecilmu di file baru dengan nomor lebih besar (misalnya `52`), karena dalam aturan baca APT, file bernomor lebih akhir akan menang atas nilai tunggal di file sebelumnya:

```bash
# di server
sudoedit /etc/apt/apt.conf.d/52unattended-upgrades-local
```

Isi dengan:

```text
// Sengaja tidak reboot otomatis. Reboot diputuskan manusia.
Unattended-Upgrade::Automatic-Reboot "false";
```

Meskipun nilai bawaannya memang `false`, menuliskannya di file lokal membuat niatmu tercatat jelas dan gampang diubah suatu hari nanti. Pastikan nilainya sudah terbaca dengan benar:

```bash
# di server
apt-config dump Unattended-Upgrade::Automatic-Reboot
```

Kenapa kita menolak reboot otomatis? Karena dokumentasi paket menjelaskan bahwa opsi `Automatic-Reboot` akan me-restart seluruh server **tanpa konfirmasi** begitu menemukan file `/var/run/reboot-required` setelah upgrade—dan ada alasan penting lain di bagian akhir artikel ini.

## 3. Uji coba aman dengan `--dry-run`

Sebelum membiarkannya bekerja sendiri, lakukan "simulasi latihan" (*dry run*) untuk melihat paket apa saja yang bakal di-upgrade tanpa benar-benar menginstal apa pun. Opsi `-d` menambahkan rincian debug agar kamu bisa melihat cara kerjanya:

```bash
# di server
sudo unattended-upgrade --dry-run -d
```

Perhatikan tiga hal di layar keluarannya:
1. Daftar *origins* yang diizinkan sudah cocok dengan pola Debian yang tadi kamu cek (cari kata `"origin"` pada teksnya).
2. Nama-nama paket yang diperiksa, beserta alasan jika ada paket yang dilewati karena berasal dari luar pola yang diizinkan.
3. Jika muncul pesan bahwa tidak ada paket yang perlu di-upgrade tanpa pengawasan, artinya servermu memang sudah mutakhir—itu hasil normal, bukan error.

Jika kamu tahu ada pembaruan keamanan yang tertunda tetapi tidak muncul di simulasi ini, masalahnya hampir selalu ada di kecocokan `Origins-Pattern`, bukan pada jadwal timernya.

## 4. Cek jadwal (`timer`) dan catatan kerja (`log`)

Di Debian, ada dua jadwal latar belakang (*systemd timer*) yang bekerja berpasangan setiap hari:
- `apt-daily.timer`: mengunduh daftar katalog paket terbaru (ibarat `apt update`).
- `apt-daily-upgrade.timer`: menjalankan pemasangan update otomatisnya.

Cara mengecek kapan terakhir kali jadwal ini berjalan dan kapan jadwal berikutnya:

```bash
# di server
systemctl list-timers 'apt-daily*'
systemctl status apt-daily-upgrade.timer
sudo journalctl -u apt-daily-upgrade.service --since "7 days ago"
```

Jika ingin mengubah jam berjalannya, Debian Wiki menyarankan memakai `sudo systemctl edit apt-daily-upgrade.timer`, lalu mengosongkan `OnCalendar=` lebih dulu sebelum mengisi jam baru, sambil menyisakan `RandomizedDelaySec` agar ribuan server di dunia tidak menyerbu server mirror Debian pada detik yang persis sama.

Untuk menjawab pertanyaan **"paket apa saja yang kemarin benar-benar terpasang?"**, baca tiga file log ini:

```bash
# di server
sudo tail -n 50 /var/log/unattended-upgrades/unattended-upgrades.log
sudo less /var/log/unattended-upgrades/unattended-upgrades-dpkg.log
grep -E 'Start-Date|Upgrade:' /var/log/apt/history.log | tail -n 10
```

Jika ingin mendapat laporan lewat email, kamu bisa mengaktifkan opsi `Unattended-Upgrade::Mail` di file `52unattended-upgrades-local`. Namun perlu dicatat: fitur email ini membutuhkan program pengirim email (*MTA*, Mail Transfer Agent) yang aktif di server dan paket `mailx`. Tanpa itu, email tidak akan terkirim dan tidak muncul peringatan error yang mencolok. Selama belum ada notifikasi email, biasakan memeriksa log di atas secara berkala, misalnya seminggu sekali.

## 5. Kapan harus restart layanan atau reboot server?

Pembaruan keamanan sering kali memperbarui pustaka inti (*library*, seperti `libc6` atau `libssl`) atau inti sistem operasi (*kernel*). Masalahnya: program yang sudah telanjur berjalan di server masih memakai versi lama yang berada di memori RAM sampai program itu di-restart.

Jadi ada dua pertanyaan terpisah setelah update masuk:
1. Layanan mana yang masih memakai pustaka versi lama?
2. Apakah *kernel* yang sedang berjalan lebih tua daripada *kernel* baru yang baru saja terpasang?

Jangan hanya mengandalkan ada-tidaknya file penanda `/var/run/reboot-required`. Pada Debian, tidak adanya file tersebut belum menjamin seluruh layanan dan kernel sudah memakai versi terbaru. Gunakan **`needrestart`** untuk memeriksa dengan akurat:

```bash
# di server
sudo needrestart -r l      # tampilkan daftar layanan yang perlu restart (tidak langsung me-restart)
sudo needrestart -k        # cek apakah kernel yang berjalan sudah usang
uname -r                   # lihat versi kernel yang sedang aktif dipakai
ls /boot/vmlinuz-*         # lihat semua versi kernel yang terpasang di disk
```

Opsi `-r l` (*list*) hanya menampilkan daftar tanpa mengubah apa-apa, dan `-k` fokus memeriksa kernel. Catatan penting: saat paket di-upgrade, skrip bawaan paket tertentu terkadang tetap dapat me-restart layanannya sendiri; `Automatic-Reboot "false"` hanya mencegah `unattended-upgrades` me-reboot seluruh mesin secara otomatis, bukan menjamin pembaruan berjalan tanpa jeda layanan.

Cara bertindak dari hasil `needrestart`:

- **Jika ada layanan di daftar:** Restart layanan tersebut satu per satu pada jam sepi pengguna (misalnya `sudo systemctl restart nginx`), lalu cek `systemctl status nginx` dan pastikan situs/aplikasinya kembali normal. Untuk server produksi penting, hindari me-restart semua layanan sekaligus.
- **Jika kernel usang:** Jadwalkan `sudo systemctl reboot` di waktu sepi saat kamu siap siaga dengan akses konsol penyedia hosting di tangan. Pastikan SSH dan semua layanan penting kembali menyala sebelum menutup konsol. Jangan buru-buru reboot server produksi hanya karena melihat opsi ini—reboot adalah keputusan terjadwal, bukan tindakan panik saat itu juga.

Kalau suatu saat kamu mengelola server non-kritis yang sudah punya sistem pemantauan (*monitoring*) dan memang ingin mengaktifkan reboot otomatis, nyalakan dengan sadar di file `52` menggunakan `Automatic-Reboot "true"` beserta `Automatic-Reboot-Time "04:00"`, sambil tetap mengingat batasan penanda reboot di atas.

## Referensi

- [Debian Wiki: PeriodicUpdates (tujuan pengalihan UnattendedUpgrades)](https://wiki.debian.org/UnattendedUpgrades)
- [Berkas bawaan 50unattended-upgrades.Debian, paket 2.12 (trixie)](https://sources.debian.org/data/main/u/unattended-upgrades/2.12/data/50unattended-upgrades.Debian)
- [Berkas 20auto-upgrades pada paket yang sama](https://sources.debian.org/data/main/u/unattended-upgrades/2.12/data/20auto-upgrades)
- [unattended-upgrade(8), Debian trixie](https://manpages.debian.org/trixie/unattended-upgrades/unattended-upgrade.8.en.html)
- [needrestart(1), Debian trixie](https://manpages.debian.org/trixie/needrestart/needrestart.1.en.html)

## Seri keamanan server Debian

1. [Mengamankan VPS Debian 13 baru](/posts/debian-server-keamanan-awal/)
2. [Login SSH pakai kunci Ed25519](/posts/debian-ssh-key/)
3. [Firewall UFW tanpa terkunci](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka dengan ss dan nmap](/posts/debian-cek-port/)
5. **Update keamanan otomatis dengan unattended-upgrades (artikel ini)**
6. [Permission berkas tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. [Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)
8. [Backup dan uji restore](/posts/debian-backup-restore/)
