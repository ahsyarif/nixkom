---
title: "Cek Kesehatan Server: Pantau CPU, RAM, & Disk Penuh dengan Cepat"
date: 2026-11-14T12:22:00+07:00
categories:
  - Linux
  - DevOps
  - Server
tags:
  - linux
  - monitoring
  - htop
  - disk
  - ram
  - tips
  - pemula
description: Cara mendiagnosis VPS yang lambat atau penuh dalam hitungan detik memakai uptime, htop, free -h, df -ih, du, dan lsof +L1 untuk file terhapus yang masih menahan ruang disk.
---

Suatu hari aplikasimu mendadak terasa sangat lambat, database gagal menyimpan data, atau proses deploy macet dengan error *"No space left on device"*.

Pemula sering panik dan langsung me-restart VPS—padahal me-restart tanpa tahu akar masalahnya hanya menunda kejadian yang sama terulang besok! Di bagian ini kita akan belajar 4 langkah diagnosis cepat untuk memeriksa **CPU**, **RAM**, dan **Disk** server Linux dalam kurang dari satu menit.

---

## Langkah 1: Cek Beban CPU dengan `uptime` & `nproc`

Mulai dari perintah tercepat:

```bash
nproc
uptime
```

Contoh output:

```text
2
 12:30:05 up 45 days,  3:12,  1 user,  load average: 0.45, 0.38, 0.30
```

Cara membacanya:
- **`nproc` (`2`)** adalah jumlah core CPU di VPS-mu.
- **`load average: 0.45, 0.38, 0.30`** adalah rata-rata antrean pekerjaan dalam **1 menit**, **5 menit**, dan **15 menit** terakhir.
- **Aturan praktis:** Bandingkan load average dengan angka `nproc`. Pada VPS dengan `2` core, load `0.45` masih sangat santai (~22% kapasitas). Jika angkanya konsisten melebihi `2.0` (atau jauh lebih tinggi seperti `8.5`), berarti ada proses yang membuat CPU kewalahan atau antrean baca-tulis disk menumpuk!

### Intip Proses Pemakan CPU/RAM Secara Live (`htop`)

Jika `top` bawaan terasa kaku, pasang **`htop`** (`sudo apt install -y htop` atau `sudo dnf install -y htop`) lalu jalankan `htop`:

- Tekan **`F6`** untuk memilih urutan berdasarkan **`PERCENT_CPU`** (pemakan CPU terbanyak) atau **`PERCENT_MEM`** (pemakan RAM terbanyak).
- Tekan **`M`** (huruf besar) untuk pintasan urut RAM, **`P`** untuk urut CPU.
- Perhatikan warna merah atau angka **`wa`** (I/O wait) jika memakai `top`: angka `%wa` tinggi artinya bukan prosesormu yang kurang cepat, melainkan **disk sedang sibuk berat** menunggu baca-tulis!

---

## Langkah 2: Cek RAM dengan `free -h` (Jangan Tertipu Kolom `free`!)

Ini kesalahpahaman paling klasik di dunia Linux. Jalankan:

```bash
free -h
```

Contoh output:

```text
               total        used        free      shared  buff/cache   available
Mem:           3.8Gi       1.1Gi       210Mi        12Mi       2.5Gi       2.4Gi
Swap:          2.0Gi          0B       2.0Gi
```

Banyak pemula langsung panik melihat **`free: 210Mi`** dari total `3.8Gi` (*"Waduh, RAM serverku sisa 210 MB saja!"*).

**Faktanya, RAM server ini masih sangat lega!** Lihat penjelasannya:

- Linux memiliki prinsip *"RAM yang menganggur adalah RAM yang mubazir"*. Jadi ruang sisa sengaja dipinjam oleh OS sebagai **`buff/cache` (`2.5Gi`)** untuk mempercepat pembacaan file dan disk.
- Begitu aplikasimu (Node.js/PostgreSQL/Docker) membutuhkan memori baru, kernel Linux langsung mengembalikan sebagian `buff/cache` tersebut secara instan.
- **Kolom yang benar-benar harus kamu perhatikan adalah `available` (`2.4Gi`), bukan `free`!** Selama `available` masih besar dan `Swap` terpakai mendekati `0B`, memori servermu sangat sehat.

---

## Langkah 3: Cek Kapasitas Disk (`df -h`) & Jebakan Inode (`df -i`)

Ketika ada error gagal upload, gagal menyimpan log, atau database error saat menulis, cek dua perintah sekaligus:

```bash
df -h
df -i
```

Mengapa harus mengecek keduanya?

1. **`df -h` (kapasitas ruang dalam GB):** Lihat baris yang terpasang di `/` (root). Jika kolom **`Use%`** sudah `95%`–`100%`, artinya ruang penyimpanan memang penuh.
2. **`df -i` (kapasitas *inode* / jumlah file):** Ini jebakan tersembunyi! Setiap file kecil (meski ukurannya cuma `0 byte`, seperti file session PHP atau ribuan log cache kecil) menghabiskan **1 inode**. Pernah ada server yang `df -h`-nya masih tersisa **40% ruang kosong**, tapi tetap menolak membuat file baru karena `df -i` menunjukkan **`IUse% = 100%`**!

---

## Langkah 4: Temukan Folder/File Pemakan Disk Terbesar dalam 30 Detik

Begitu tahu `/` hampir penuh, jangan menebak-nebak satu per satu. Telusuri secara bertahap dari folder teratas (`/`):

```bash
sudo du -xh --max-depth=1 / | sort -h
```

Penjelasan flag penting di perintah ini:

- **`-x` (`--one-file-system`):** **Sangat penting saat memindai `/`!** Mencegah `du` ikut menghitung folder virtual seperti `/proc`, `/sys`, atau `/dev` yang tidak memakan ruang disk asli.
- **`-h`:** Ukuran tampil dalam `M` dan `G`.
- **`--max-depth=1`:** Hanya tampilkan ringkasan folder tingkat pertama agar output ringkas.
- **`| sort -h`:** Mengurutkan dari yang terkecil ke terbesar, jadi biang keroknya selalu muncul di baris paling bawah!

Misalnya baris paling bawah menunjukkan `/var` memakan `18G`. Tinggal turun satu level ke `/var`:

```bash
sudo du -xh --max-depth=1 /var | sort -h
```

Biasanya pelakunya ada di antara tiga tempat ini:
- `/var/log` (log aplikasi atau `journald` membengkak).
- `/var/lib/docker` (image lama, build cache, atau log container Docker menumpuk — cek dengan `docker system df`).
- `/home` atau `/tmp` (sisa file backup / upload sementara yang lupa dihapus).

---

## Trik Bonus: File Raksasa Sudah Dihapus, Tapi Disk Tetap Penuh (`lsof +L1`)

Pernahkah kamu menghapus file log `15 GB` memakai `sudo rm /var/log/app.log`, lalu saat cek `df -h` ruang disk-nya **sama sekali tidak bertambah**?

Penyebabnya: meskipun nama file sudah dihapus dari folder, aplikasi yang sedang berjalan masih **membuka dan memegang file tersebut** di memori—sehingga Linux belum benar-benar melepas blok disk-nya sampai proses itu melepasnya!

Temukan pelakunya dengan perintah:

```bash
sudo lsof +L1
```

Lihat nama layanan yang tercantum di sebelah file berstatus `(deleted)` tersebut (misalnya `nginx` atau `node`), lalu **restart layanan tersebut** (`sudo systemctl restart nginx`). Seketika itu juga seluruh ruang disk yang tertahan langsung kembali lega!

*(Jika `lsof` belum terpasang di server Debian/Ubuntu, pasang cepat dengan `sudo apt install -y lsof`.)*

---

## Checklist Singkat Sebelum Lanjut

- [x] Paham membandingkan `load average` pada `uptime` dengan jumlah core CPU `nproc`.
- [x] Membaca kolom **`available`** (bukan `free`) pada `free -h`.
- [x] Selalu mengecek **`df -h`** sekaligus **`df -i`** saat investigasi error penyimpanan.
- [x] Bisa melacak folder pemakan disk terbesar bertahap memakai `sudo du -xh --max-depth=1` + `sort -h` dan mengecek `sudo lsof +L1`.

Di **Bagian 4**, kita akan mempelajari cara mengendalikan semua layanan server (Nginx, PostgreSQL, Docker, aplikasi backend) memakai **`systemctl`** dan menyelidiki pesan error dengan **`journalctl`**.

---

## Seri Tips & Trik Command Linux untuk Manajemen Server

1. [Bagian 1 — Trik Navigasi Terminal & Manajemen File Cepat di Server Linux](/posts/linux-cli-navigasi-file/)
2. [Bagian 2 — Membaca Config, Pipe, Redirection, & Trik Edit File di Server](/posts/linux-cli-teks-pipe-redirection/)
3. **Bagian 3 — Cek Kesehatan Server: Pantau CPU, RAM, & Disk Penuh dengan Cepat** *(sedang dibaca)*
4. [Bagian 4 — Mengelola Service dengan systemctl & Investigasi Error di journalctl](/posts/linux-cli-service-systemd-log/)
5. [Bagian 5 — Mengelola Proses Bandel, Port Terbuka, & Troubleshooting Jaringan](/posts/linux-cli-proses-jaringan-port/)
6. [Bagian 6 — Manajemen Paket, User, sudo, & Permission Tanpa Panik](/posts/linux-cli-paket-user-permission/)
7. [Bagian 7 — Menjalankan Tugas Otomatis (cron vs systemd timer) & Kebiasaan Aman](/posts/linux-cli-otomatis-cron-systemd-timer/)

---

## Referensi

- [Debian Manpage: `htop(1)`](https://manpages.debian.org/trixie/htop/htop.1.en.html)
- [Debian Manpage: `free(1)`](https://manpages.debian.org/trixie/procps/free.1.en.html)
- [Debian Manpage: `df(1)`](https://manpages.debian.org/trixie/coreutils/df.1.en.html)
- [Debian Manpage: `du(1)`](https://manpages.debian.org/trixie/coreutils/du.1.en.html)
- [Debian Manpage: `lsof(8)`](https://manpages.debian.org/trixie/lsof/lsof.8.en.html)
