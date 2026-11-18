---
title: "Perbedaan iptables dan nftables: Fungsi Dasar, Kelebihan, & Cara Setting untuk Pemula"
date: 2026-11-18T13:00:00+07:00
categories:
  - Linux
  - Security
  - Server
  - Networking
tags:
  - linux
  - firewall
  - nftables
  - iptables
  - keamanan
  - pemula
description: "Memahami fungsi mendasar firewall kernel Linux (Netfilter), perbedaan lengkap iptables dan nftables beserta kelebihan kekurangannya, serta tutorial praktis setting nftables bagi pemula."
---

Jika pernah mencari tutorial firewall di Linux, kamu pasti sering melihat tiga nama berbeda: **`iptables`**, **`nftables`**, dan **`ufw`** (atau `firewalld`). Pemula sering bingung mengira ketiganya adalah tiga program firewall terpisah yang saling bersaing.

Di artikel ini, kita luruskan konsep dasarnya dari awal: **apa fungsi mendasar `iptables` dan `nftables`**, **apa saja perbedaan serta kelebihan-kekurangannya**, hingga **contoh nyata cara men-setting `nftables` dari nol dengan aman**.

---

## 1. Fungsi Mendasar `iptables` dan `nftables`

Pertama, kenali dulu mesin penjaga gerbang asli yang ada di dalam **kernel Linux**, namanya **Netfilter**.

Bayangkan server Linux-mu seperti sebuah gedung kantor:
- **Netfilter (di dalam kernel)** adalah **pos satpam fisik** yang memeriksa setiap paket data yang mau masuk ke server, keluar dari server, atau numpang lewat.
- **`iptables` dan `nftables` (di terminal / *user space*)** adalah **buku instruksi / alat pengatur satpam**. Kamu tidak bisa memberi perintah langsung ke kernel dengan bahasa manusia, jadi kamu mengetik aturan lewat `iptables` atau `nftables` untuk memprogram Netfilter!

**Empat fungsi mendasar yang dilakukan Netfilter lewat `iptables` / `nftables`:**
1. **Penyaringan Paket (*Packet Filtering*):** Memutuskan apakah paket boleh masuk (`ACCEPT` / `accept`), dibuang diam-diam (`DROP` / `drop`), atau ditolak dengan pesan error (`REJECT` / `reject`).
2. **Pelacakan Koneksi (*Stateful Inspection / Conntrack*):** Membedakan paket "orang asing mengetuk pintu dari internet" dengan paket "balasan sah" dari permintaan yang memang dimulai oleh servermu sendiri (misalnya saat `apt update`).
3. **NAT (*Network Address Translation*) & Port Forwarding:** Menerjemahkan alamat IP privat agar bisa keluar ke internet lewat 1 IP publik (*masquerade*), atau membelokkan trafik dari satu port ke port lain (sering dipakai di router, VPN, dan container Docker).
4. **Penandaan & Manipulasi Paket (*Mangling*):** Memberi tanda khusus pada paket tertentu untuk pengaturan prioritas bandwidth (*QoS*) atau routing lanjutan.

> **Di mana posisi UFW dan firewalld?**  
> Alat seperti **`ufw`** (di Ubuntu/Debian) atau **`firewalld`** (di Fedora/RHEL/Rocky) hanyalah **"kulit pembungkus" (*frontend*)** agar pemula cukup mengetik `ufw allow 22`. Di belakang layar, `ufw` tetap menerjemahkan perintah itu menjadi aturan **`nftables`** (di distro modern) atau **`iptables`** (di distro lawas). *(Untuk penggunaan praktis tercepat bagi pemula, kamu juga bisa melihat [panduan firewall UFW di Debian](/posts/debian-firewall-ufw/).)*

---

## 2. Perbedaan Utama `iptables` vs `nftables`

**`iptables`** adalah generasi lama (lahir sekitar tahun 2001), sedangkan **`nftables`** adalah **penerus resmi modern** di kernel Linux (hadir sejak kernel 3.13 dan menjadi sistem firewall bawaan di Debian 10+, Ubuntu 20.04+/22.04+, Fedora, hingga RHEL/Rocky Linux 8+).

*(Catatan teknis menarik: di Debian/Ubuntu modern, ketika kamu mengetik perintah `iptables`, sering kali sistem diam-diam menjalankan `iptables-nft`—yaitu lapisan penerjemah agar skrip lama tetap berjalan di atas mesin `nftables`!)*

| Aspek Perbandingan | `iptables` (Generasi Lama) | `nftables` (Generasi Modern) |
| --- | --- | --- |
| **IPv4 vs IPv6** | **Terpisah!** Wajib menulis aturan ganda: `iptables` untuk IPv4 dan `ip6tables` untuk IPv6 (ditambah `arptables` & `ebtables`). | **Satu kesatuan (`family inet`):** Satu table `inet` langsung melindungi lalu lintas **IPv4 dan IPv6 sekaligus**! |
| **Chain & Tabel Bawaan** | Memiliki tabel/chain wajib bawaan (`INPUT`, `OUTPUT`, `FORWARD`) meski tidak dipakai, menambah sedikit beban pemrosesan. | **Kosong sesuai kebutuhan:** Kamu hanya membuat table & chain yang benar-benar dibutuhkan. |
| **Pembaruan Aturan** | Memproses aturan per baris (*non-atomic*); saat me-reload ratusan aturan, sempat ada celah jeda milidetik. | **Atomik (*Atomic Replacement*):** Seluruh file `/etc/nftables.conf` ditukar serempak dalam satu transaksi bersih tanpa celah jeda! |
| **Banyak IP / Port (Skala Besar)** | Setiap IP/port butuh baris terpisah kecuali memasang alat tambahan `ipset`. Evaluasi linear O(N) melambat jika aturan ribuan baris. | Mendukung **`set`** (`{ 22, 80, 443 }`) dan **`map`** bawaan langsung di dalam sintaks dengan lookup cepat. |
| **Keterbacaan Sintaks** | Berbasis deretan flag CLI panjang (`-A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j ACCEPT`). | Berbasis blok terstruktur mirip konfigurasi C/Nginx/JSON (`tcp dport { 22, 80, 443 } accept`). |

---

## 3. Kelebihan dan Kekurangan Masing-Masing

### `iptables`

- **Kelebihan:**
  - Jutaan artikel, skrip siap pakai, dan forum tanya jawab di internet memakai contoh `iptables`.
  - Didukung hampir semua perangkat jaringan lawas dan skrip lama.
- **Kekurangan:**
  - **Rawan lupa IPv6!** Banyak admin pemula sibuk memblokir port lewat `iptables`, lupa bahwa servernya juga punya IPv6 sehingga port tersebut tetap terbuka lewat `ip6tables`!
  - Sulit memelihara ribuan aturan blokir tanpa alat tambahan (`ipset`), serta pembaruan aturan besar tidak bersifat atomik secara langsung.
  - Statusnya kini berstatus *legacy* (dipertahankan demi kompatibilitas ke belakang).

### `nftables`

- **Kelebihan:**
  - **Lebih rapi & anti lupa IPv6:** Satu aturan di `table inet` langsung berlaku untuk IPv4 + IPv6.
  - **Lebih cepat & efisien:** Tidak membuang waktu memeriksa chain kosong, memakai bytecode ringan di kernel, dan punya fitur `set`/`map` bawaan.
  - **Reload atomik & bisa dicek dulu (`nft -c -f`):** Konfigurasi bisa diuji validasinya sebelum diterapkan!
- **Kekurangan:**
  - Sintaks kurung kurawal `{ ... }` awalnya terasa agak asing jika kamu sudah terbiasa dengan gaya perintah CLI `iptables`.
  - **Peringatan jika server memakai Docker atau UFW:** Jangan mencampur pengelolaan manual `/etc/nftables.conf` (terutama perintah `flush ruleset`) dengan **UFW** atau **Docker** di server yang sama tanpa kehati-hatian! Karena `flush ruleset` akan **menghapus seluruh aturan milik UFW dan rantai NAT jaringan container Docker** sampai Docker di-restart. *(Jika memakai Docker di VPS, umumnya lebih praktis membiarkan Docker mengelola rantai NAT-nya dan mengamankan host memakai UFW + binding `127.0.0.1` seperti di [panduan firewall UFW & Docker](/posts/tailscale-hardening-firewall-port/).)*

---

## 4. Contoh Praktis: Cara Setting `nftables` untuk Pemula

Mari kita praktikkan konfigurasi `nftables` yang bersih, modern, dan aman di VPS Debian atau Ubuntu (tanpa Docker/UFW aktif bersamaan).

### Langkah 0: Pengaman Wajib Agar Tidak Terkunci SSH

1. **Buka 2 sesi terminal SSH**, atau pastikan **Web Console / VNC** penyedia VPS bisa dibuka sebelum menyalakan firewall.
2. Pastikan UFW tidak sedang aktif bersamaan agar tidak saling menimpa:
   ```bash
   sudo ufw status
   # Jika statusnya "active" dan kamu memang ingin beralih penuh ke nftables, nonaktifkan dulu:
   # sudo ufw disable
   ```

### Langkah 1: Pastikan `nftables` Terpasang & Cek Kondisi Awal

Di Debian/Ubuntu modern biasanya `nftables` sudah terpasang. Jika belum:

```bash
sudo apt update && sudo apt install -y nftables
```

Intip aturan yang sedang aktif saat ini:

```bash
sudo nft list ruleset
```

### Langkah 2: Tulis Konfigurasi Dasar yang Aman di `/etc/nftables.conf`

Buat salinan cadangan file bawaannya dulu, lalu edit `/etc/nftables.conf`:

```bash
sudo cp /etc/nftables.conf{,.bak}
sudo nano /etc/nftables.conf
```

Isi dengan konfigurasi ramah pemula berikut (melindungi IPv4 & IPv6 sekaligus, hanya membuka SSH, HTTP, dan HTTPS):

```text
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        # Kaitkan ke trafik masuk dengan kebijakan bawaan TOLAK SEMUA (drop)
        type filter hook input priority filter; policy drop;

        # 1. Izinkan komunikasi internal di dalam server sendiri (loopback)
        iif "lo" accept

        # 2. Izinkan paket balasan dari koneksi yang memang dimulai oleh server
        ct state established,related accept
        ct state invalid drop

        # 3. Izinkan ICMP (ping IPv4) & ICMPv6 (wajib agar jaringan IPv6 tetap sehat)
        ip protocol icmp accept
        ip6 nexthdr ipv6-icmp accept

        # 4. Izinkan port masuk untuk SSH (22), HTTP (80), dan HTTPS (443)
        tcp dport { 22, 80, 443 } accept

        # Opsional jika memakai Tailscale (izinkan semua trafik dari interface virtual tailscale0):
        # iifname "tailscale0" accept
    }

    chain forward {
        type filter hook forward priority filter; policy drop;
    }

    chain output {
        type filter hook output priority filter; policy accept;
    }
}
```

**Penjelasan detail penting agar kamu benar-benar paham:**
- **`table inet filter`:** Kata kunci `inet` berarti aturan di dalamnya otomatis berlaku untuk **IPv4 maupun IPv6** tanpa perlu menulis dua kali!
- **`policy drop;` pada `input`:** Segala sesuatu yang tidak diizinkan secara eksplisit di baris-baris bawahnya otomatis ditolak.
- **`iif "lo" accept`:** Memastikan aplikasi web di server tetap bisa menghubungi database di `127.0.0.1` (localhost).
- **`ip6 nexthdr ipv6-icmp accept`:** Jangan hapus baris ini jika servermu memakai IPv6—protokol IPv6 mengandalkan ICMPv6 untuk menemukan alamat gateway (*Neighbor Discovery*). Jika diblokir total, koneksi IPv6 bisa lumpuh!
- **`tcp dport { 22, 80, 443 } accept`:** Inilah contoh fitur **set** di `nftables`—cukup satu baris untuk membuka beberapa port sekaligus! *(Dan jika nanti memakai Tailscale, lihat betapa praktisnya `iifname "tailscale0" accept`: memakai `iifname` aman untuk interface virtual seperti `tailscale0` yang baru muncul setelah daemon menyala.)*

### Langkah 3: Uji Syntax Sebelum Diterapkan (`-c` = Check Only!)

Ini salah satu keunggulan terbaik `nftables`: periksa apakah ada typo sebelum aturan menyentuh jaringan asli:

```bash
sudo nft -c -f /etc/nftables.conf
```

Jika perintah tersebut diam tanpa pesan error (exit code `0`), artinya sintaksmu 100% valid!

### Langkah 4: Terapkan Aturan & Aktifkan Saat Boot

```bash
sudo nft -f /etc/nftables.conf
sudo systemctl enable --now nftables
```

**Sekarang uji langsung di terminal kedua di laptopmu** (jangan tutup terminal pertama dulu!): coba `ssh user@ip-vps` untuk memastikan kamu masih bisa login dengan mulus, lalu periksa aturan aktif beserta jumlah paket yang terhitung (`counter` jika dipakai) atau nomor `handle`:

```bash
sudo nft -a list ruleset
```

### Langkah 5: Cara Menambah atau Menghapus Aturan dengan Cepat

Misalnya suatu hari kamu ingin menambah satu port sementara (misalnya `8080/tcp`) atau menghapus sebuah aturan tanpa merestart seluruh firewall:

- **Menambah aturan langsung ke `chain input`:**
  ```bash
  sudo nft add rule inet filter input tcp dport 8080 accept
  ```
  *(Ingat: perubahan lewat CLI `nft add rule` saja hanya hidup di memori sampai reboot; kalau mau permanen, tulis juga ke `/etc/nftables.conf`!)*
- **Menghapus 1 aturan tertentu menggunakan nomor `handle`:**  
  Jalankan `sudo nft -a list ruleset`, lihat angka `# handle 9` di ujung baris aturan yang ingin dihapus, lalu hapus dengan:
  ```bash
  sudo nft delete rule inet filter input handle 9
  ```

---

## Jadi, Pemula Sebaiknya Pilih Mana?

- **Ingin cepat aman untuk VPS harian biasa tanpa pusing sintaks detail (apalagi jika pakai Docker)?** Pakai **`ufw`** (yang di sistem modern sudah otomatis berjalan di atas kernel `nftables`!).
- **Ingin kontrol penuh, aturan IPv4+IPv6 rapi dalam satu file, performa tinggi untuk router/server khusus, atau menonaktifkan overhead tambahan?** Pelajari dan gunakan **`nftables`** langsung lewat `/etc/nftables.conf`.
- **Kapan masih menyentuh `iptables`?** Umumnya hanya saat membaca skrip/tutorial lama atau memelihara sistem Linux generasi lawas.

---

## Referensi

- [Debian Manpage: `nft(8)` (`nftables`)](https://manpages.debian.org/trixie/nftables/nft.8.en.html)
- [Debian Manpage: `iptables(8)`](https://manpages.debian.org/trixie/iptables/iptables.8.en.html)
- [nftables Official Wiki: Main Documentation](https://wiki.nftables.org/wiki-nftables/index.php/Main_Page)
- [nftables Official Wiki: Moving from iptables to nftables](https://wiki.nftables.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables)
- [Artikel Terkait: Firewall UFW di Debian 13 tanpa mengunci diri sendiri](/posts/debian-firewall-ufw/)
