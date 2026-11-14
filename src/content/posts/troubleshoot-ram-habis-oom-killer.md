---
title: "Aplikasi Mati Mendadak karena RAM Habis (OOM Killer) & Cara Setup Swap"
date: 2026-11-14T16:37:00+07:00
categories:
  - Linux
  - Server
  - DevOps
tags:
  - linux
  - ram
  - swap
  - oom
  - docker
  - troubleshooting
  - pemula
description: "Cara membuktikan apakah aplikasi server yang mati mendadak dibunuh oleh Linux OOM Killer memakai dmesg/journalctl, serta langkah memasang file Swap dan membatasi memori aplikasi di VPS kecil."
---

Gejalanya sangat menjengkelkan: tidak ada pesan exception di log aplikasi Node.js atau Python-mu, tetapi proses aplikasi atau database MySQL/PostgreSQL tiba-tiba berhenti sendiri begitu ada lonjakan traffic atau saat menjalankan perintah build. Bahkan terkadang seluruh VPS ikut membeku sampai harus di-reboot dari panel provider.

Sebagian besar kasus seperti ini pada VPS berkapasitas RAM 512 MB hingga 2 GB disebabkan oleh satu mekanisme pertahanan kernel Linux bernama **OOM Killer (*Out of Memory Killer*)**.

---

## Apa Itu OOM Killer? (Analogi Sekering Listrik)

Ketika seluruh RAM fisik **dan** ruang cadangan (*Swap*) di server sudah habis terpakai sampai tetes terakhir, kernel Linux terancam macet total (*kernel panic*). Untuk menyelamatkan keseluruhan sistem operasi, Linux bertindak seperti sekering pengaman: ia memilih proses yang mengonsumsi memori paling rakus (sering kali database atau runtime aplikasimu!), lalu langsung **membunuhnya secara paksa (`SIGKILL`)**.

Karena dibunuh mendadak dari luar oleh kernel, aplikasi tidak sempat menulis pesan error ke log-nya sendiri!

---

## Langkah 1: Buktikan dengan Melihat Log Kernel (`dmesg` / `journalctl -k`)

Untuk melihat apakah benar OOM Killer baru saja beraksi di servermu, periksa log kernel:

```bash
sudo journalctl -k | grep -i -E "oom|killed process|out of memory"
```

Atau memakai `dmesg` dengan stempel waktu yang mudah dibaca (`-T`):

```bash
sudo dmesg -T | grep -i -E "oom|killed process"
```

Jika muncul baris seperti di bawah ini, pelakunya sudah 100% ketahuan:

```text
[Sat Nov 14 10:15:42 2026] Out of memory: Killed process 4812 (node) total-vm:1842304kB, anon-rss:1420100kB
```

---

## Langkah 2: Cek Apakah VPS Sudah Punya Swap (`free -h` & `swapon`)

Banyak image VPS cloud (seperti Ubuntu/Debian minimal) dikirim **tanpa Swap sama sekali**! Artinya begitu lonjakan RAM menyentuh batas 100%, tidak ada ruang napas darurat dan OOM Killer langsung memukul.

Cek kondisi memori dan swap sekarang:

```bash
free -h
swapon --show
```

Jika baris `Swap:` di `free -h` bernilai `0B` dan `swapon --show` kosong, menambahkan **Swap file** akan langsung memberi bantalan darurat yang sangat membantu.

---

## Langkah 3: Cara Menambah Swap File (Misalnya 2 GB) di VPS Linux

*(Catatan jujur: pada sebagian VPS berbasis container lama seperti OpenVZ/LXC tertentu, penambahan swap ditolak oleh kernel host; namun pada mayoritas VPS modern berbasis KVM seperti DigitalOcean, Hetzner, Vultr, AWS, dan Biznet/IDCloudHost, langkah ini berjalan mulus.)*

Jalankan langkah berurutan sebagai `root` (`sudo`):

1. **Buat file sebesar 2 GB di `/swapfile`:**
   ```bash
   sudo fallocate -l 2G /swapfile
   ```
   *(Jika `fallocate` gagal pada tipe filesystem tertentu seperti XFS versi lama, gunakan alternatif universal: `sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress`.)*
2. **Kunci izin file agar hanya `root` yang boleh membaca (wajib untuk keamanan RAM!):**
   ```bash
   sudo chmod 600 /swapfile
   ```
3. **Format sebagai area swap dan aktifkan sekarang:**
   ```bash
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```
4. **Daftarkan ke `/etc/fstab` agar tetap aktif setelah VPS reboot:**
   ```bash
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
5. **Atur `vm.swappiness=10` agar Linux memprioritaskan RAM asli:**  
   Secara default `swappiness` bernilai `60`, yang kadang terlalu cepat memindahkan data ke disk. Untuk server aplikasi, turunkan ke `10` supaya swap hanya dipakai saat RAM memang hampir penuh:
   ```bash
   echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf
   sudo sysctl -p /etc/sysctl.d/99-swap.conf
   ```

Verifikasi hasilnya dengan `free -h` dan `swapon --show`—kini baris `Swap` akan menunjukkan `2.0Gi`.

---

## Langkah 4: Pencegahan Jangka Panjang (Batasi Konsumsi Memori)

Swap hanya **bantalan darurat**, bukan pengganti RAM asli! Karena disk jauh lebih lambat dari RAM, kalau server terus-menerus menukar data ke swap, website akan terasa sangat lambat. Lakukan tiga pencegahan ini:

1. **Jangan menjalankan proses build berat di VPS kecil!**  
   Menjalankan `npm run build` (Next.js / Vite) di VPS 1 GB RAM adalah penyebab utama OOM Killer. Bangun aplikasi atau Docker image di **GitHub Actions** lalu tarik hasil jadinya ke VPS, seperti pola di [seri Docker CI/CD dari lokal ke VPS](/posts/docker-cicd-arsitektur/).
2. **Batasi memori per container di `compose.yaml`:**  
   Supaya satu aplikasi yang mengalami *memory leak* tidak ikut menyeret database sampai mati, pasang batas maksimal memori:
   ```yaml
   services:
     app:
       image: aplikasiku:latest
       mem_limit: 512m
   ```
3. **Batasi heap Node.js jika berjalan langsung di OS:**  
   Jika menjalankan proses Node.js di VPS 1 GB RAM, kamu bisa memberi batas eksplisit misalnya `NODE_OPTIONS="--max-old-space-size=512"` di file unit `systemd`-nya.

---

## Checklist Singkat Sebelum Lanjut

- [x] Sudah mengecek bukti pembunuhan proses oleh kernel lewat `sudo journalctl -k` atau `sudo dmesg -T`.
- [x] VPS kecil sudah memiliki `Swap` aktif (`swapon --show`) dengan izin `600`, terdaftar di `/etc/fstab`, dan `vm.swappiness=10`.
- [x] Proses build berat sudah dipisahkan dari VPS produksi dan container dibatasi batas memorinya.

Di **Bagian 4**, kita akan membedah error yang paling sering terlihat oleh pengunjung website saat sesuatu salah di server: **`502 Bad Gateway`**, **`504 Gateway Timeout`**, dan konflik port **`EADDRINUSE`**.

---

## Seri Troubleshooting Kendala Server Linux untuk Pemula

1. [Bagian 1 — SSH Tidak Bisa Login? Cara Atasi Connection Refused, Timeout, & Terkunci Sendiri](/posts/troubleshoot-ssh-tidak-bisa-login/)
2. [Bagian 2 — Disk Penuh (`No space left on device`): Bersihkan Aman Tanpa Merusak Sistem](/posts/troubleshoot-disk-penuh-no-space/)
3. **Bagian 3 — Aplikasi Mati Mendadak karena RAM Habis (OOM Killer) & Cara Setup Swap** *(sedang dibaca)*
4. [Bagian 4 — Website 502 Bad Gateway, 504 Timeout, & Port Bentrok (EADDRINUSE)](/posts/troubleshoot-web-502-504-port-bentrok/)
5. [Bagian 5 — apt / dpkg Error: Mengatasi Lock Error, Update Terputus, & Repo Gagal](/posts/troubleshoot-apt-dpkg-error-update/)
6. [Bagian 6 — Service Systemd Gagal Start & Error 403 Forbidden / Permission Denied](/posts/troubleshoot-service-gagal-start-permission/)
7. [Bagian 7 — Masalah SSL/HTTPS, DNS Tidak Mengarah, & Jam Server Melenceng](/posts/troubleshoot-ssl-dns-jam-server/)

---

## Referensi

- [Debian Manpage: `dmesg(1)`](https://manpages.debian.org/trixie/util-linux/dmesg.1.en.html)
- [Debian Manpage: `free(1)`](https://manpages.debian.org/trixie/procps/free.1.en.html)
- [Debian Manpage: `journalctl(1)`](https://manpages.debian.org/trixie/systemd/journalctl.1.en.html)
