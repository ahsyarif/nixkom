---
title: "Permission file di Debian 13: perbaiki upload tanpa chmod 777"
date: 2026-11-11T21:05:00+07:00
categories: ["Linux", "Server", "Security"]
tags: ["debian", "linux", "keamanan", "pemula", "permission", "chmod"]
description: "Perbaiki izin folder unggahan di Debian 13 tanpa chmod 777: telusuri pemilik, batasi akses proses aplikasi, lalu uji baca dan tulis."
---

Pernah mengalami fitur upload foto di website tiba-tiba gagal dengan pesan `Permission denied`? Saat mencari solusi di internet, saran paling sering (dan paling berbahaya) yang muncul adalah menjalankan `chmod -R 777` ke seluruh folder proyek.

**Jangan lakukan itu!** Menjalankan `chmod -R 777` ibarat membuka semua pintu lemari dan membiarkan siapa saja di server—termasuk akun layanan lain yang mungkin terinfeksi—bebas mengubah atau menghapus seluruh kode dan datamu.

Solusi yang benar sebenarnya sederhana: cari tahu **akun mana** yang menjalankan aplikasimu dan **folder mana** yang menolak akses, lalu berikan izin menulis hanya pada folder tempat menyimpan unggahan tersebut saja.

Semua perintah di bawah dijalankan **di server** Debian 13 memakai akun admin yang punya `sudo`. Contohnya memakai aplikasi fiktif bernama `tokoku` di `/srv/tokoku`. Ganti nama aplikasi, path folder, dan nama akun sesuai dengan yang ada di servermu.

## 1. Cara membaca permission: file berbeda dengan folder

Saat kamu mengetik `ls -l`, Linux menampilkan izin akses dalam format 10 karakter di kolom paling kiri:

```text
-rw-r----- 1 root tokoku 214 Nov 11 20:10 app.env
drwxr-x--- 2 tokoku www-data 4096 Nov 11 20:12 uploads
```

Huruf paling depan menandakan jenisnya (`-` untuk file biasa, `d` untuk *directory*/folder). Sembilan karakter berikutnya dibagi menjadi **tiga kelompok** (masing-masing 3 huruf):
1. **Pemilik (*owner*)** — 3 huruf pertama (`rw-` atau `rwx`).
2. **Grup (*group*)** — 3 huruf tengah (`r--` atau `r-x`).
3. **Pengguna lain (*others*)** — 3 huruf terakhir (`---`).

Arti huruf `r`, `w`, dan `x` ternyata **berbeda** antara file dan folder:

| Huruf | Pada file | Pada folder |
|---|---|---|
| `r` (read) | Isi file boleh dibaca | Daftar nama file di dalam folder boleh dilihat (`ls`) |
| `w` (write) | Isi file boleh diubah/ditulis | Boleh membuat, menghapus, atau mengganti nama file di dalam folder ini |
| `x` (execute) | File boleh dijalankan sebagai program | Boleh **melintas masuk** (`cd`) ke dalam folder dan mengakses file di dalamnya |

Poin terakhir ini yang paling sering membuat pemula bingung. Bayangkan sebuah gedung dengan beberapa lorong. Untuk membuka `/srv/tokoku/uploads/foto.jpg`, sebuah akun wajib punya izin `x` ("boleh lewat lorong") di **setiap folder** sepanjang jalan: `/srv`, `/srv/tokoku`, dan `/srv/tokoku/uploads`, baru kemudian izin `r` pada file `foto.jpg`. Jika satu folder di tengah jalan tidak memberi izin `x`, seluruh akses ke dalamnya akan langsung ditolak walaupun izin file akhirnya terbuka lebar!

Perhatikan juga soal penghapusan: di Linux, izin menghapus sebuah file ditentukan oleh izin **`w` + `x` pada folder induknya**, bukan pada file-nya sendiri. Jadi meski sebuah file hanya punya izin baca (`r`), seseorang yang punya izin `wx` pada folder induknya tetap bisa menghapus file itu.

### Dari mana datangnya angka seperti `644` atau `750`?

Setiap huruf punya bobot angka: **`r` = 4**, **`w` = 2**, **`x` = 1**, dan tidak ada izin (`-`) = **0**. Kita tinggal menjumlahkan bobot per kelompok (Pemilik, Grup, Others):
- `rwx` = 4 + 2 + 1 = **7**
- `rw-` = 4 + 2 + 0 = **6**
- `r-x` = 4 + 0 + 1 = **5**
- `r--` = 4 + 0 + 0 = **4**

Inilah angka mode yang paling sering dipakai sehari-hari:

| Mode | Arti | Cocok dipakai untuk |
|---|---|---|
| `644` | Pemilik baca-tulis (`6`), grup & lainnya cuma baca (`4`) | File kode program atau aset web publik |
| `640` | Pemilik baca-tulis (`6`), grup baca (`4`), lainnya tidak boleh sama sekali (`0`) | File konfigurasi/rahasia yang dibaca oleh satu grup |
| `600` | Hanya pemilik yang boleh baca-tulis (`6`), semua lainnya nol | Kunci SSH privat, file password |
| `755` | Pemilik penuh (`7`), grup & lainnya boleh melihat daftar & melintas (`5`) | Folder kode atau folder publik |
| `750` | Pemilik penuh (`7`), grup boleh melihat & melintas (`5`), lainnya nol | Folder privat yang hanya dibuka untuk satu grup |

## 2. Cari tahu akun mana yang menjalankan aplikasimu

Jangan langsung mengira semua aplikasi web berjalan dengan akun `www-data`. Memang `www-data` adalah akun bawaan Nginx atau PHP-FPM standar, tetapi aplikasi yang dijalankan lewat `systemd` (seperti Node.js, Python, atau Go) sering memakai akun khusus lain, dan setiap *pool* PHP-FPM pun bisa memiliki `user =` sendiri.

Mengubah izin untuk `www-data` tidak akan ada gunanya jika aplikasimu ternyata berjalan sebagai akun `tokoku`. Cek langsung dari sumbernya:

```bash
# di server: cek akun untuk layanan systemd
systemctl show -p User -p Group tokoku.service

# di server: cek akun dari proses yang sedang berjalan (ganti node dengan nama prosesmu)
ps -o user=,group=,pid=,cmd= -C node

# di server: cek akun PHP-FPM di berkas pool-nya
sudo grep -E '^(user|group)\s*=' /etc/php/*/fpm/pool.d/*.conf
```

Jika `User=` pada hasil `systemctl show` tampak kosong, artinya aplikasi tersebut sedang berjalan sebagai **`root`**. Ini temuan keamanan tersendiri: menjalankan aplikasi web sebagai `root` sangat berisiko, karena satu saja celah keamanan di kode aplikasi langsung memberi penyerang kendali penuh atas seluruh server.

Jika belum ada akun khusus, buat akun sistem biasa (yang tidak bisa dipakai login SSH) khusus untuk menjalankan aplikasi ini:

```bash
# di server
sudo adduser --system --group --no-create-home --home /srv/tokoku tokoku
id tokoku
```

Setelah itu, pastikan unit `systemd`-nya memakai akun tersebut dengan menambahkan `User=tokoku` dan `Group=tokoku` di bawah bagian `[Service]`. Mulai bagian selanjutnya, kita memakai `tokoku` sebagai akun yang menjalankan aplikasi (ganti dengan `www-data` atau nama akun punyamu bila berbeda).

## 3. Pola aman: kode hanya-baca, folder `uploads` boleh ditulis

Prinsip keamanan yang rapi memisahkan antara **kode aplikasi**, **folder unggahan pengguna**, dan **file rahasia**:
- **Kode aplikasi** dimiliki oleh `root`: akun aplikasi (`tokoku`) boleh membacanya, tetapi tidak boleh mengubahnya. (Ini membatasi agar proses aplikasi tidak bisa diam-diam memodifikasi file kode di disk, meski tentu tidak melindungi dari eksploitasi di memori atau penyalahgunaan akses data aplikasi).
- **Hanya folder `uploads`** yang boleh ditulisi oleh akun aplikasi (`tokoku`).
- **File rahasia** (password database, API key, `.env`) ditaruh di luar folder yang dilayani oleh web server.

Susunan idealnya terlihat seperti ini:

```text
/srv/tokoku/app/        kode, milik root:root, folder 755, file 644
/srv/tokoku/uploads/    milik tokoku:www-data, mode 2750 (ditulis aplikasi, dibaca Nginx)
/etc/tokoku/app.env     milik root:tokoku, mode 640 (rahasia, di luar root web)
```

### Langkah A: Lacak di titik mana izin terputus

Daripada menebak-nebak, gunakan perintah `namei -l` untuk memecah jalur folder menjadi satu per satu dan melihat siapa pemilik serta izin di setiap langkahnya:

```bash
# di server
namei -l /srv/tokoku/uploads/foto.jpg
```

Contoh ilustrasinya (bukan hasil asli servermu):

```text
f: /srv/tokoku/uploads/foto.jpg
dr-xr-xr-x root   root     /
drwxr-xr-x root   root     srv
drwx------ root   root     tokoku
drwxr-x--- tokoku www-data uploads
```

Lihat baris `tokoku` di tengah itu: izinnya `drwx------`. Artinya hanya `root` yang boleh lewat; akun `www-data` atau `tokoku` langsung mentok di pintu `tokoku` meskipun folder `uploads` di bawahnya sudah memberi izin. Baca dari atas ke bawah untuk menemukan gerbang pertama yang menghalangi jalan.

Cek juga apakah ada file di folder kode yang secara tidak sengaja bisa ditulisi oleh akun aplikasi:

```bash
# di server
sudo -u tokoku find /srv/tokoku/app -writable -print
```

Periksa hasil yang muncul maupun pesan *permission denied* jika ada (hasil kosong baru meyakinkan kalau seluruh folder memang bisa ditelusuri tanpa error). Sekali lagi: jangan pernah menjalankan `chown -R` atau `chmod -R` membabi-buta ke seluruh `/srv/tokoku`.

### Langkah B: Perbaiki hanya folder dan file yang bermasalah

Untuk folder `uploads`, kita atur agar dimiliki oleh `tokoku`, ber-grup `www-data` (supaya Nginx bisa membacanya), dan memakai angka **`2`** di depan (`2750`):

```bash
# di server
sudo install -d -o tokoku -g www-data -m 2750 /srv/tokoku/uploads
```

Apa arti angka `2` pada `2750`? Itu adalah bit **setgid**. Fungsinya sangat praktis: setiap file baru yang dibuat di dalam folder `uploads` akan otomatis mewarisi grup `www-data` milik foldernya, bukan grup pribadi `tokoku`.

Perintah `install -d` akan membuat folder jika belum ada, atau memperbarui pemilik dan izinnya jika folder sudah ada, tanpa mengubah isi file-file lama di dalamnya. Catatan tambahan: `setgid` hanya mengatur pewarisan grup; aplikasi itu sendiri tetap harus membuat file baru dengan izin baca untuk grup (misalnya mode `640` lewat `umask 0027`). Periksa satu unggahan baru untuk memastikannya—dan jika Nginx melayani folder `uploads` ini, pastikan Nginx dikonfigurasi agar tidak pernah mengeksekusi file unggahan sebagai skrip PHP atau program lain.

Jika ada file lama di `uploads` yang kepemilikan atau izinnya terlanjur keliru, cari dulu yang salah saja sebelum memperbaikinya:

```bash
# di server
sudo find /srv/tokoku/uploads ! -user tokoku -print
sudo find /srv/tokoku/uploads -type f ! -perm -g=r -print
```

Jika `namei` tadi menunjukkan ada folder induk (seperti `/srv/tokoku`) yang menghalangi jalan karena tidak ada izin `x` untuk `others`, cukup tambahkan izin melintas (`o+x`) tanpa memberi izin melihat daftar file (`r`) atau menulis (`w`):

```bash
# di server: others hanya boleh melintas, tidak boleh mendaftar isi foldernya
sudo chmod o+x /srv/tokoku
```

Dan jika hasil `find` di kode aplikasi menemukan file yang izinnya salah, perbaiki satu per satu secara spesifik (contoh untuk satu file):

```bash
# di server
sudo chown root:root /srv/tokoku/app/server.js
sudo chmod 644 /srv/tokoku/app/server.js
```

### Langkah C: Uji langsung memakai akun aplikasi

Jangan mengetes memakai akun `admin` atau `root`—karena mereka punya hak tinggi dan bisa lolos di tempat yang sebenarnya membuat akun aplikasi gagal. Simulasikan langsung memakai akun aplikasinya (`sudo -u tokoku`):

```bash
# di server: harus berhasil (bisa baca kode, bisa tulis ke uploads)
sudo -u tokoku test -r /srv/tokoku/app/server.js && echo "kode terbaca"
sudo -u tokoku touch /srv/tokoku/uploads/.probe && echo "uploads bisa ditulis"
sudo -u tokoku rm /srv/tokoku/uploads/.probe

# di server: harus gagal (kode tidak boleh bisa ditulis oleh aplikasi!)
sudo -u tokoku test -w /srv/tokoku/app/server.js || echo "benar: kode tidak bisa ditulis"

# di server: web server harus bisa membaca file di uploads
sudo -u www-data test -r /srv/tokoku/uploads/foto.jpg && echo "www-data bisa baca"
```

Tes terakhir hanya perlu jika Nginx memang melayani folder `uploads` secara langsung. Jika semua hasil tes sudah sesuai harapan, coba lakukan upload langsung dari aplikasimu.

## 4. Pindahkan rahasia (`.env`) ke luar folder web

Jangan pernah menyimpan file `.env` berisi password database atau API key di dalam folder publik yang dilayani oleh web server. Jika konfigurasi Nginx meleset sedikit saja, file `.env` bisa diunduh oleh siapa pun lewat browser.

Pindahkan keluar ke folder konfigurasi sistem, misalnya `/etc/tokoku/app.env`:

```bash
# di server
sudo install -d -o root -g tokoku -m 750 /etc/tokoku
sudo test -e /etc/tokoku/app.env || sudo install -o root -g tokoku -m 640 /dev/null /etc/tokoku/app.env
sudoedit /etc/tokoku/app.env
```

Perintah `test -e ... || ...` di baris kedua memastikan kita hanya membuat file kosong jika file-nya memang belum ada—supaya tidak sengaja menimpa file rahasia yang sudah berisi data. Jika file sudah ada, cek dan rapikan izinnya ke `chown root:tokoku` serta `chmod 640`.

Di dalam unit `systemd`, muat file tersebut dengan `EnvironmentFile=/etc/tokoku/app.env`. Menurut manual `systemd.exec(5)`, file ini dibaca oleh `systemd` sendiri (bukan oleh proses aplikasinya), jadi mode `root:root` `600` sudah cukup; gunakan `root:tokoku` `640` apabila proses aplikasimu yang membuka file itu langsung.

> **Penting:** Jika file rahasia seperti `.env` pernah terlanjur berada di folder publik atau sempat terunggah ke repositori Git, sekadar memindahkannya tidaklah cukup. Anggap kata sandi dan token di dalamnya sudah bocor, lalu **segera ganti** semua kredensial tersebut!

## 5. Bagaimana kalau mode sudah benar tapi tetap ditolak?

Terkadang hasil `namei` dan tes `sudo -u` sudah benar semua, tetapi aplikasi tetap mendapat `Permission denied`. Di Linux, ada lapisan pengaman lain di luar izin baca-tulis biasa. Periksa empat hal ini (jika `getfacl` belum ada, pasang dulu dengan `sudo apt install acl`):

```bash
# di server: 1. Cek ACL tambahan (lihat apakah ada tanda '+' di ujung izin, atau cek getfacl)
ls -ld /srv/tokoku/uploads
getfacl /srv/tokoku/uploads

# di server: 2. Cek apakah partisi disk terpasang sebagai read-only atau noexec
findmnt -T /srv/tokoku/uploads

# di server: 3. Cek atribut khusus file/folder (misalnya 'i' = immutable / tidak bisa diubah siapa pun)
lsattr -d /srv/tokoku/uploads

# di server: 4. Cek pembatasan bawaan di file layanan systemd
systemctl cat tokoku.service
```

Penyebab paling sering nomor 4 adalah aturan keamanan di file unit `systemd`. Cari baris `ProtectSystem=`, `ProtectHome=`, `ReadOnlyPaths=`, dan `ReadWritePaths=`. Jika layanan memakai `ProtectSystem=strict`, seluruh sistem file otomatis dijadikan hanya-baca bagi layanan itu—kecuali folder yang kamu daftarkan di `ReadWritePaths=`. Jadi walaupun mode foldernya `750` dan pemiliknya sudah benar, `systemd` tetap memblokir proses penulisan!

Cara membukanya dengan aman lewat *override* `systemd`:

```bash
# di server
sudo systemctl edit tokoku.service
```

Tambahkan baris berikut:

```ini
[Service]
ReadWritePaths=/srv/tokoku/uploads
```

Simpan, lalu restart layanannya (`sudo systemctl restart tokoku.service`) dan ulangi tes unggahan. Pengaturan `ProtectSystem` lainnya hanya ubah kalau kamu benar-benar tahu direktori lain mana yang wajib ditulisi aplikasi. Selain itu, jika AppArmor aktif di Debian, catatan penolakannya bisa dicek lewat `sudo journalctl -k | grep -i apparmor`.

Setelah semuanya berjalan normal, tutup dengan satu pengecekan akhir untuk memastikan tidak ada satu pun file atau folder di bawah `/srv/tokoku` yang bisa ditulisi oleh sembarang orang (*others*):

```bash
# di server
sudo find /srv/tokoku -perm -o+w ! -type l -print
```

Jika perintah tersebut tidak mencetak apa pun (hasil kosong), berarti izinnya sudah bersih dan aman.

## Referensi

- [chmod(1), Debian trixie](https://manpages.debian.org/trixie/coreutils/chmod.1.en.html)
- [namei(1), Debian trixie](https://manpages.debian.org/trixie/util-linux/namei.1.en.html)
- [install(1), Debian trixie](https://manpages.debian.org/trixie/coreutils/install.1.en.html)
- [adduser(8), Debian trixie](https://manpages.debian.org/trixie/adduser/adduser.8.en.html)
- [getfacl(1), Debian trixie](https://manpages.debian.org/trixie/acl/getfacl.1.en.html)
- [systemd.exec(5): EnvironmentFile, ProtectSystem, ReadWritePaths](https://manpages.debian.org/trixie/systemd/systemd.exec.5.en.html)

## Seri keamanan server Debian

1. [Mengamankan VPS Debian 13 baru](/posts/debian-server-keamanan-awal/)
2. [Login SSH pakai kunci Ed25519](/posts/debian-ssh-key/)
3. [Firewall UFW tanpa terkunci](/posts/debian-firewall-ufw/)
4. [Cek port yang terbuka dengan ss dan nmap](/posts/debian-cek-port/)
5. [Update keamanan otomatis dengan unattended-upgrades](/posts/debian-unattended-upgrades/)
6. **Permission berkas tanpa chmod 777 (artikel ini)**
7. [Fail2ban untuk SSH](/posts/debian-fail2ban-ssh/)
8. [Backup dan uji restore](/posts/debian-backup-restore/)
