---
title: "Update keamanan otomatis di Debian 13 dengan unattended-upgrades"
date: 2026-11-11T21:04:00+07:00
categories: ["Linux", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "unattended-upgrades", "apt"]
description: "Aktifkan unattended-upgrades di Debian 13, baca Origins-Pattern versi Debian, uji dry-run, cek timer dan log, serta tentukan reboot tanpa Automatic-Reboot."
---

`unattended-upgrades` memasang pembaruan paket yang sesuai dengan sumber yang diizinkan, melalui timer APT di Debian 13 (*trixie*). Aktifkan pembaruan otomatis setelah memeriksa sumber paket, lalu pisahkan keputusan memasang tambalan dari keputusan me-restart layanan atau server.

Semua perintah di bawah dijalankan **di server**, sebagai akun admin yang bisa `sudo`. Panduan ini ditulis dari dokumentasi Debian, bukan dari hasil uji di servermu; hasil di mesinmu bisa berbeda, jadi selalu cocokkan dengan keluaran perintah yang kamu lihat sendiri.

## Pasang dan aktifkan

Debian kadang sudah memasang paketnya dengan pengaturan konservatif, tetapi bisa juga belum terpasang atau terpasang dalam keadaan mati. Pasang lagi saja; kalau sudah ada, `apt` hanya memberi tahu.

```bash
# di server
sudo apt update
sudo apt install unattended-upgrades apt-listchanges needrestart
sudo dpkg-reconfigure -plow unattended-upgrades
```

Pertanyaan debconf "Automatically download and install stable updates?" jawab **Yes**. Jawaban itu menulis `/etc/apt/apt.conf.d/20auto-upgrades`. Paket Debian menyertakan dua templat untuk berkas itu: versi aktif berisi

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

dan versi nonaktif berisi dua angka yang sama dengan nilai `"0"`. Jadi cara paling cepat mengecek status aktif adalah membaca konfigurasi yang benar-benar dipakai APT:

```bash
# di server
apt-config dump APT::Periodic
cat /etc/apt/apt.conf.d/20auto-upgrades
```

Kamu mau melihat `Update-Package-Lists "1"` dan `Unattended-Upgrade "1"`. Angka `"1"` berarti jalan setiap hari. Kalau ada berkas lain di `/etc/apt/apt.conf.d/` yang menimpa nilainya jadi `"0"`, `apt-config dump` yang akan menunjukkannya, karena perintah itu menampilkan hasil gabungan semua berkas.

`apt-listchanges` opsional, tetapi berguna untuk membaca catatan perubahan paket. `needrestart` dipakai di bagian akhir panduan ini.

## Baca Origins-Pattern versi Debian, jangan salin dari Ubuntu

Banyak contoh di internet ditulis untuk Ubuntu, dengan baris seperti `"${distro_id}:${distro_codename}-security";`. Format itu berbeda dari berkas bawaan Debian. Berkas yang dipakai paket Debian (`50unattended-upgrades` di `/etc/apt/apt.conf.d/`, dibuat dari templat `50unattended-upgrades.Debian`) memakai kata kunci `origin`, `codename`, dan `label`:

```text
Unattended-Upgrade::Origins-Pattern {
//      "origin=Debian,codename=${distro_codename}-updates";
//      "origin=Debian,codename=${distro_codename}-proposed-updates";
        "origin=Debian,codename=${distro_codename},label=Debian";
        "origin=Debian,codename=${distro_codename},label=Debian-Security";
        "origin=Debian,codename=${distro_codename}-security,label=Debian-Security";
};
```

Satu baris cocok kalau **semua** kata kuncinya cocok dengan metadata paket. Pola bawaan mencakup rilis Debian yang terpasang dan arsip keamanannya; pola `-updates` di contoh masih dikomentari. `${distro_codename}` dikembangkan oleh unattended-upgrades menjadi nama rilis, misalnya `trixie`. Gunakan hasil `--dry-run -d` untuk melihat pola yang benar-benar dipakai.

Jangan berasumsi nilainya cocok dengan mesinmu. Lihat sendiri apa yang dilaporkan APT:

```bash
# di server
apt-cache policy | grep -E 'o=|n=' | sort -u
grep -v '^\s*//' /etc/apt/apt.conf.d/50unattended-upgrades | grep -v '^\s*$' | head -30
apt-config dump Unattended-Upgrade::Origins-Pattern
```

Baris `apt-cache policy` memuat `o=` (origin), `n=` (codename), dan `l=` (label) tiap sumber. Cocokkan tiga nilai itu dengan pola aktif. Kalau server memakai repositori pihak ketiga, pola bawaan sengaja tidak mencakupnya, jadi paket dari sana tidak akan ikut otomatis. Itu perilaku yang aman; tambahkan pola hanya kalau kamu percaya sumbernya dan sudah paham risikonya.

Dokumentasi Debian menyarankan menaruh perubahanmu di berkas terpisah. Contoh di bawah hanya berisi opsi yang kamu ubah, jadi kamu tidak perlu menyalin berkas 50 yang panjang:

```bash
# di server
sudoedit /etc/apt/apt.conf.d/52unattended-upgrades-local
```

```text
// Sengaja tidak reboot otomatis. Reboot diputuskan manusia.
Unattended-Upgrade::Automatic-Reboot "false";
```

Nilai `false` memang bawaan, tetapi menuliskannya mengunci niatmu dan menjadi tempat jelas untuk berubah pikiran. Berkas yang namanya lebih akhir menang atas yang lebih awal untuk nilai skalar, jadi `52` menimpa `50`. Cek hasil akhirnya:

```bash
# di server
apt-config dump Unattended-Upgrade::Automatic-Reboot
```

Dokumentasi bawaan paket menjelaskan opsi ini: reboot dijalankan **tanpa konfirmasi** kalau berkas `/var/run/reboot-required` ditemukan setelah upgrade. Alasan kedua kenapa kamu sebaiknya tidak mengandalkannya ada di bagian reboot di bawah.

## Uji dengan dry-run

`--dry-run` menghitung apa yang akan dipasang tanpa memasangnya, dan `-d` menambah keluaran debug. Dokumentasi Debian memakai `-d` untuk debugging manual.

```bash
# di server
sudo unattended-upgrade --dry-run -d
```

Yang kamu cari di keluarannya:

- daftar origins yang diizinkan harus sesuai dengan pola Debian yang tadi kamu cek (rumusan barisnya bisa berbeda antarversi, jadi cari kata "origin" di keluaran);
- nama paket yang dinilai, plus alasan kalau sebuah paket dilewati karena asalnya tidak cocok dengan pola;
- pesan bahwa tidak ada paket yang bisa di-upgrade tanpa pengawasan berarti tidak ada yang perlu dipasang sekarang. Itu hasil normal untuk server yang sudah mutakhir, bukan galat.

Kalau paket keamanan yang kamu tahu tertunda tidak muncul sama sekali, mulai dari pola origins, bukan dari timer.

## Cek timer dan log

Di Debian, dua timer systemd menjalankan pekerjaan harian: `apt-daily.timer` mengunduh daftar paket, dan `apt-daily-upgrade.timer` menjalankan upgrade-nya.

```bash
# di server
systemctl list-timers 'apt-daily*'
systemctl status apt-daily-upgrade.timer
sudo journalctl -u apt-daily-upgrade.service --since "7 days ago"
```

`list-timers` menampilkan kapan timer terakhir jalan dan kapan berikutnya. Untuk mengubah jam, Debian wiki menganjurkan `sudo systemctl edit apt-daily-upgrade.timer` lalu mengosongkan `OnCalendar=` sebelum mengisi nilai baru, dan menyisakan `RandomizedDelaySec` supaya server tidak menyerbu mirror Debian pada detik yang sama.

Log yang menjawab "apa yang sebenarnya dipasang":

```bash
# di server
sudo tail -n 50 /var/log/unattended-upgrades/unattended-upgrades.log
sudo less /var/log/unattended-upgrades/unattended-upgrades-dpkg.log
grep -E 'Start-Date|Upgrade:' /var/log/apt/history.log | tail -n 10
```

Kalau kamu ingin dikabari, buka komentar `Unattended-Upgrade::Mail` di berkas 52. Opsi itu memerlukan MTA yang berfungsi di server dan paket yang menyediakan `mailx`; tanpa itu, surelnya tidak terkirim dan tidak ada tanda galat yang mencolok. Selama belum ada surel, jadwalkan kebiasaan membaca log di atas, misalnya tiap Senin.

## Reboot dan restart layanan: periksa, jangan percaya satu penanda

Pembaruan keamanan sering menyentuh pustaka (misalnya `libc6` atau `libssl`) atau kernel. Proses yang sudah berjalan tetap memakai versi lama di memori sampai di-restart. Dua pertanyaan terpisah:

1. Layanan mana yang masih memakai pustaka lama?
2. Apakah kernel yang berjalan lebih tua dari yang terpasang?

Jangan menganggap `/var/run/reboot-required` selalu dibuat pada Debian. Ketiadaan penanda tersebut tidak membuktikan kernel dan layanan sudah memakai versi terbaru. Gunakan `needrestart` untuk memeriksa proses serta kernel:

```bash
# di server
sudo needrestart -r l      # daftar layanan yang perlu restart, tanpa mengubah apa pun
sudo needrestart -k        # cek apakah kernel yang berjalan sudah usang
uname -r                   # kernel yang sedang berjalan
ls /boot/vmlinuz-*         # kernel yang terpasang
```

Opsi `-r l` meminta mode daftar tanpa restart, sedangkan `-k` membatasi pemeriksaan ke kernel. Ini berlaku untuk perintah pemeriksaan di atas. Pembaruan paket tetap dapat menjalankan restart layanan lewat skrip paket atau hook lain; `Automatic-Reboot "false"` hanya melarang reboot otomatis oleh unattended-upgrades, bukan menjanjikan pembaruan tanpa gangguan.

Cara bertindaknya:

- **Layanan di daftar:** restart satu per satu pada jam sepi, misalnya `sudo systemctl restart nginx`, lalu cek `systemctl status nginx` dan situsnya. Server produksi dengan satu layanan penting sebaiknya tidak di-restart serentak.
- **Kernel usang:** jadwalkan reboot saat kamu punya akses konsol penyedia hosting, lalu jalankan `sudo systemctl reboot`. Pastikan SSH dan layanan naik lagi sebelum menutup konsol. Jangan reboot server produksi hanya karena panduan ini menyebutnya; reboot adalah keputusan jadwal, bukan langkah wajib saat itu juga.

Kalau suatu hari kamu memang mau reboot otomatis (server tanpa beban kritis, ada monitoring), nyalakan dengan sadar: `Automatic-Reboot "true"` plus `Automatic-Reboot-Time "04:00"`, dan ingat caveat penanda di atas.

## Referensi

- [Debian Wiki: PeriodicUpdates (tujuan pengalihan UnattendedUpgrades)](https://wiki.debian.org/UnattendedUpgrades)
- [Berkas bawaan 50unattended-upgrades.Debian, paket 2.12 (trixie)](https://sources.debian.org/data/main/u/unattended-upgrades/2.12/data/50unattended-upgrades.Debian)
- [Berkas 20auto-upgrades pada paket yang sama](https://sources.debian.org/data/main/u/unattended-upgrades/2.12/data/20auto-upgrades)
- [unattended-upgrade(8), Debian trixie](https://manpages.debian.org/trixie/unattended-upgrades/unattended-upgrade.8.en.html)
- [needrestart(1), Debian trixie](https://manpages.debian.org/trixie/needrestart/needrestart.1.en.html)

## Seri keamanan server Debian

1. [Langkah awal mengamankan server Debian 13](/posts/debian-server-keamanan-awal/)
2. [Login SSH pakai key di Debian 13](/posts/debian-ssh-key/)
3. [Firewall sederhana dengan UFW di Debian 13](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka di server Debian 13](/posts/debian-cek-port/)
5. **Update keamanan otomatis di Debian 13 dengan unattended-upgrades**
6. [Permission file di Debian 13 tanpa chmod 777](/posts/debian-permission-tanpa-777/)
7. [Fail2ban untuk SSH di Debian 13](/posts/debian-fail2ban-ssh/)
8. [Backup dan restore server Debian 13 dengan restic](/posts/debian-backup-restore/)
