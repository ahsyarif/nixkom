---
title: "Audit Tailscale, cabut akses, dan akses darurat break-glass"
date: 2026-11-14T10:06:00+07:00
categories:
  - Linux
  - Server
  - Security
  - Networking
tags:
  - linux
  - tailscale
  - audit
  - keamanan
  - pemulihan
  - pemula
description: "Siapkan audit log Tailscale, prosedur cabut akses saat perangkat hilang atau auth key bocor, dan akses darurat agar tidak terkunci dari server."
---

Keamanan server bukan pekerjaan sekali pasang lalu dilupakan. Setelah arsitektur Tailscale, firewall UFW, SSH Check Mode, Grants, dan Serve terpasang di Bagian 1 sampai Bagian 6, pertanyaan terpenting berikutnya adalah:

- *Bagaimana cara mengetahui jika ada perubahan mencurigakan di jaringan?*
- *Apa yang harus dilakukan dalam 5 menit pertama jika laptop admin hilang atau auth key bocor?*
- *Bagaimana cara masuk ke server kalau suatu hari daemon Tailscale crash dan port SSH publik sudah telanjur kita tutup?*

Artikel penutup ini merangkum SOP pemantauan, respons insiden, dan rencana pemulihan darurat (*break-glass*) agar operasional servermu tetap tenang dalam situasi terburuk sekalipun.

---

## Bagian 1: Pemantauan Rutin di Server & Admin Console

Biasakan memeriksa dua hal ini saat melakukan pengecekan rutin mingguan atau setelah update sistem:

### 1. Kondisi Daemon `tailscaled` di Server Linux

```bash
# Cek layanan systemd tailscaled aktif tanpa error
sudo systemctl status tailscaled

# Cek status koneksi antar-node (apakah direct atau memantul lewat relay DERP)
tailscale status

# Cek log sistem khusus daemon Tailscale jika terasa lambat/putus
sudo journalctl -u tailscaled -n 50 --no-pager
```

### 2. Audit Log & Flow Log di Tailscale Admin Console

Di tab **Logs** pada Tailscale Admin Console, ada dua jenis log dengan fungsi dan ketersediaan paket yang berbeda—penting dipahami agar ekspektasimu tepat:

| Jenis Log | Apa yang dicatat? | Ketersediaan Paket & Catatan |
| --- | --- | --- |
| **Configuration Audit Logs** | Perubahan file policy (`grants`/`ssh`), pembuatan/pencabutan Auth Key, persetujuan/penghapusan mesin, dan perubahan Tailnet Lock. | **Semua paket** (termasuk **Free/Personal**). Aktif otomatis, retensi **90 hari**, dan tidak bisa dimatikan demi akuntabilitas. |
| **Network Flow Logs** | *Metadata* koneksi jaringan antar-node (IP Tailscale asal, IP tujuan, port, protokol, jumlah byte—**bukan** isi data terenkripsi). | Paket berbayar (**Premium / Enterprise**), retensi **30 hari**, tidak kompatibel dengan flag `--no-logs-no-support`. |

**Tips bagi pengguna paket Free/Personal:** Kamu tetap bisa melihat catatan siapa mencoba terhubung atau diblokir di dalam server Linux sendiri menggunakan log firewall (`sudo ufw logging on` lalu baca `/var/log/ufw.log` atau `journalctl -k | grep UFW`) serta log autentikasi SSH lokal di `sudo journalctl -u tailscaled`.

---

## Bagian 2: SOP Tanggap Cepat Saat Insiden Terjadi

Simpan panduan tiga skenario ini di catatan timmu agar tidak panik ketika keadaan darurat benar-benar datang:

### Skenario A: Laptop atau HP Admin Hilang / Dicuri

1. **Segera cabut perangkat dari Tailnet:** Buka Admin Console dari perangkat lain -> tab **Machines** -> klik menu titik tiga pada laptop yang hilang -> pilih **Remove**. Saat itu juga koneksi WireGuard dan akses Tailscale SSH perangkat tersebut putus.
2. **Cabut sesi akun identitas (SSO/MFA):** Ganti password dan klik *"Sign out all sessions"* pada akun Google/GitHub/Microsoft/Okta yang terhubung ke Tailscale agar pencuri tidak bisa mengklik verifikasi ulang maupun mendaftar ulang.
3. **Periksa Configuration Audit Logs:** Pastikan tidak ada perubahan policy atau auth key baru yang sempat dibuat oleh akun tersebut sebelum dicabut.
4. **Jika memakai Tailnet Lock:** Segera hapus kunci penandatangan (`tlpub:...`) milik laptop yang hilang dari daftar *trusted signing keys* memakai perangkat penandatangan cadanganmu.

### Skenario B: Auth Key (`tskey-auth-...`) Tidak Sengaja Ter-commit ke Git atau Bocor

1. **Segera hapus key tersebut:** Buka **Settings** -> **Keys** -> klik **Revoke** pada auth key yang bocor. (Ingat, mencabut key di Git saja dengan `git commit` baru tidak cukup—riwayat commit lama dan log CI tetap menyimpan jejaknya!)
2. **Audit tab Machines:** Cek apakah ada perangkat baru asing yang sempat bergabung memakai key tersebut sebelum kamu cabut.
3. **Cek Configuration Audit Logs** untuk melihat apakah ada event *node key registered* menggunakan auth key tersebut. Jika ada mesin asing, langsung **Remove** dari tab **Machines**.

### Skenario C: Salah Satu Server Web Diduga Diretas

Berkat segmentasi **Bagian 5**, peretas di `tag:web` tidak bisa SSH ke `tag:db` maupun laptop admin. Untuk langsung mengkarantina server yang terkompromi:

1. **Putus komunikasi instan dari Admin Console:** Hapus sementara akses `tag:web` dari `grants` di policy file (atau ubah tag server tersebut ke `tag:quarantine` yang tidak punya `grants` ke mana pun) -> dalam hitungan detik, `tailscale0` berhenti meneruskan paket dari/ke server itu.
2. **Ambil snapshot/backup untuk forensik** dari panel cloud sebelum menghancurkan server, lalu bangun ulang server dari image bersih ketimbang sekadar "membersihkan" server yang sudah terinjeksi rootkit.

---

## Bagian 3: Menyiapkan Akses Darurat (*Break-Glass*) Agar Tidak Pernah Terkunci

Pertanyaan paling jujur saat menutup port `22` publik di **Bagian 3**: *"Bagaimana kalau setelah `apt upgrade` atau kernel update, service `tailscaled` gagal menyala atau jaringan Tailscale terputus?"*

Jika tidak punya pintu cadangan, kamu akan benar-benar terkunci di luar server! Karena itu, siapkan **prosedur Break-Glass** berikut:

1. **Pastikan Web Console / VNC / Serial Console Penyedia VPS Aktif & Teruji**  
   Hampir semua penyedia VPS modern (DigitalOcean Droplet Console, Hetzner VNC Console, AWS EC2 Serial Console, Vultr View Console, Proxmox noVNC) menyediakan layar virtual yang tersambung langsung ke "monitor dan keyboard" server, **tanpa melewati port SSH `22` maupun firewall UFW**!
2. **Simpan Satu Akun User Sudo Lokal dengan Password Kuat di Password Manager**  
   Login lewat SSH biasa memakai SSH key atau Tailscale SSH tanpa password. **Sebaliknya, login lewat VNC / Serial Console biasanya menanyakan username dan password Linux lokal!** Pastikan kamu punya user `sudo` lokal yang password-nya masih valid dan tersimpan aman di password manager (jangan matikan login password untuk console lokal, cukup matikan autentikasi password untuk akses SSH jarak jauh).
3. **Alur Pemulihan 3 Menit Lewat Konsol Darurat:**  
   Jika suatu saat server tidak muncul di `tailscale status` atau tidak bisa di-SSH lewat Tailscale:
   - Buka Web Console/VNC di dashboard penyedia VPS dan login dengan akun lokal.
   - Cek penyebab `tailscaled` berhenti:
     ```bash
     sudo systemctl status tailscaled
     sudo journalctl -u tailscaled -n 40 --no-pager
     ```
   - Coba jalankan ulang:
     ```bash
     sudo systemctl restart tailscaled
     ```
   - Jika sedang ada gangguan jaringan tailnet global dan kamu mendesak harus transfer file lewat SSH biasa sementara waktu, buka port `22` hanya khusus dari **IP publik rumah/kantormu saat ini** (bukan `0.0.0.0/0`!), lalu **segera hapus lagi** begitu selesai:
     ```bash
     # Buka sementara hanya untuk IP publikmu saat ini (misal 198.51.100.25)
     sudo ufw allow from 198.51.100.25 to any port 22 proto tcp
     # ... setelah Tailscale pulih, hapus rule sementara tadi:
     sudo ufw delete allow from 198.51.100.25 to any port 22 proto tcp
     ```

*(Catatan kecil untuk pengguna **UFW** dan `sshd`: jika pada Bagian 4 kamu menonaktifkan `sshd` total, pada situasi darurat di atas kamu juga perlu menjalankan `sudo systemctl start ssh` sementara setelah masuk konsol darurat.)*

---

## Checklist Lengkap Seri Mengamankan Server Linux dengan Tailscale

Gunakan daftar ini untuk memeriksa apakah satu server Linux-mu sudah melewati seluruh 7 tahap pengamanan:

- [x] **OS & Backup Dasar:** Update otomatis aktif, user non-root `sudo`, dan backup teruji berjalan ([Seri keamanan Debian](/posts/debian-server-keamanan-awal/)).
- [x] **Identitas Mandiri:** Server terhubung dengan `--auth-key` (one-off, non-ephemeral) dan memakai `tag:...`, bukan akun email pribadi.
- [x] **Firewall Rapat:** `ufw default deny incoming`, hanya membuka `tailscale0` (dan `80`/`443` jika web publik). Kontainer Docker diikat ke `127.0.0.1` atau IP Tailscale.
- [x] **Tailscale SSH + Check Mode:** Akses admin memakai `--ssh` dan aturan `"action": "check"`, tanpa mengandalkan kunci SSH statis bertebaran.
- [x] **Segmentasi `grants` + `tests`:** Antar-server saling terisolasi per tag dan port, lengkap dengan blok `"tests"` otomatis (plus Tailnet Lock bila dibutuhkan).
- [x] **Layanan Internal Terlindung:** Database terikat loopback/tailnet, dan panel admin memakai `tailscale serve --bg` (bukan `funnel`).
- [x] **Siap Insiden & Break-Glass:** Tahu lokasi Audit Log, punya akun sudo lokal untuk Web Console/VNC VPS, dan pernah mengujinya sebelum dibutuhkan saat panik!

Selamat! Dengan tujuh lapisan ini, server Linux-mu tidak lagi bergantung pada keberuntungan agar luput dari serangan otomatis di internet. Setiap akses punya identitas yang jelas, terenkripsi, tercatat, dan mudah dicabut kapan saja.

---

## Seri Mengamankan Server Linux dengan Tailscale

1. [Bagian 1 — Cara Kerja & Arsitektur Mengamankan Server Linux dengan Tailscale](/posts/tailscale-hardening-arsitektur/)
2. [Bagian 2 — Pasang Tailscale di Server Linux Pakai Tag & Auth Key](/posts/tailscale-hardening-tag-authkey/)
3. [Bagian 3 — Kunci Firewall Server Linux (UFW & tailscale0) Lalu Tutup Port Publik](/posts/tailscale-hardening-firewall-port/)
4. [Bagian 4 — Masuk Server Tanpa Ribet Kunci Manual dengan Tailscale SSH & Check Mode](/posts/tailscale-hardening-tailscale-ssh/)
5. [Bagian 5 — Isolasi Antar-Server Pakai Tag, Grants, dan Tailnet Lock](/posts/tailscale-hardening-acl-grants/)
6. [Bagian 6 — Amankan Database & Dashboard Internal dengan Loopback + Tailscale Serve](/posts/tailscale-hardening-layanan-internal/)
7. **Bagian 7 — Pemantauan, Audit Log, Pencabutan Akses, & Akses Darurat** *(sedang dibaca)*

---

## Referensi

- [Tailscale Docs: Configuration audit logs](https://tailscale.com/docs/features/logging/audit-logging)
- [Tailscale Docs: Network flow logs](https://tailscale.com/docs/features/logging/network-flow-logs)
- [Tailscale Docs: Tailnet Lock](https://tailscale.com/docs/features/tailnet-lock)
- [Tailscale Docs: Secure an Ubuntu/Linux server with UFW](https://tailscale.com/docs/how-to/secure-ubuntu-server-with-ufw)
