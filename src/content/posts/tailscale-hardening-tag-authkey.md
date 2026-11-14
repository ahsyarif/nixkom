---
title: Pasang Tailscale di Server Linux Pakai Tag & Auth Key (Bukan Akun Pribadi)
date: 2026-11-14T10:01:00+07:00
categories:
  - Linux
  - Server
  - Security
  - Networking
tags:
  - linux
  - tailscale
  - keamanan
  - auth-key
  - tags
  - pemula
description: Cara mendaftarkan server Linux ke Tailscale secara aman memakai tagOwners dan auth key agar server memiliki identitas mandiri, bukan menempel ke akun pribadi admin.
---

Di [artikel pengenalan Tailscale untuk pemula](/posts/tailscale-debian-pemula/), cara termudah menyambungkan server Linux adalah menjalankan `sudo tailscale up`, lalu membuka tautan login di browser memakai akun Google atau GitHub pribadimu.

Untuk belajar atau sekadar mengakses server rumah pribadi, cara itu sah-sah saja. Namun untuk **server Linux produksi** (apalagi jika dikelola lebih dari satu orang), mendaftarkan server memakai akun manusia punya tiga risiko besar:

1. **Server mewarisi hak akses milikmu.** Secara default, perangkat milik satu user dapat saling mengakses dengan leluasa (`autogroup:self`). Jika suatu hari server web jebol disusupi penyerang, penyerang berada di bawah identitas akunmu.
2. **Server bergantung pada akun satu orang.** Jika suatu saat admin resign, ganti email, atau akun pribadinya bermasalah, kepemilikan server ikut berantakan.
3. **Key expiry memutus server secara diam-diam.** Perangkat milik user manusia memiliki masa kedaluwarsa kunci (*key expiry*, bawaan sekitar 180 hari). Kalau lupa diperpanjang, server tiba-tiba offline dari tailnet padahal sedang dipakai.

Solusinya di Tailscale adalah memberikan server **identitas non-manusia** memakai **Tag (`tag:...`)** dan mendaftarkannya dengan **Auth Key**.

---

## Analogi Sederhana: ID Karyawan vs Kartu Akses Mesin Gudang

- **Login akun pribadi (`user@email.com`):** Seperti memakai kartu karyawan pribadimu untuk mengaktifkan mesin fotokopi dan komputer gudang. Siapa pun yang membajak mesin itu jadi seolah-olah punya kartumu.
- **Memberi Tag (`tag:server`) + Auth Key:** Seperti mencetak kartu akses khusus bertuliskan *"Mesin Web Produksi"*. Kartu itu tidak punya jabatan manajer, hanya boleh melakukan tugas web server, dan tidak ikut nonaktif jika salah satu karyawan berhenti.

Begitu sebuah perangkat diberi `tag:` di Tailscale, identitas user manusianya dilepas dan berubah menjadi **service identity** berdasarkan tag tersebut.

---

## Langkah 1: Daftarkan Nama Tag di Policy File (`tagOwners`)

Sebelum boleh menempelkan `tag:server` ke perangkat mana pun, Tailscale mewajibkan kita mendefinisikan terlebih dahulu **siapa yang berhak membuat dan memberikan tag itu** di bagian `tagOwners` pada **Access controls** di Tailscale Admin Console.

Buka dashboard Tailscale -> tab **Access controls** (file policy berformat JSON/HuJSON), lalu tambahkan atau sesuaikan blok `tagOwners`:

```json
{
  "tagOwners": {
    "tag:server": ["autogroup:admin"],
    "tag:web": ["autogroup:admin"],
    "tag:db": ["autogroup:admin"]
  }
}
```

Penjelasan singkat:

- `"tag:server"`, `"tag:web"`, `"tag:db"` adalah nama tag yang kita ciptakan sesuai fungsi server. Nama tag bebas, biasanya huruf kecil agar rapi.
- `["autogroup:admin"]` artinya siapa saja yang berstatus admin/owner di tailnet ini berhak menetapkan tag tersebut ke perangkat (ataupun membuat auth key untuk tag tersebut).

Klik **Save** sebelum melanjutkan ke langkah berikutnya. Jika belum disimpan, nanti CLI akan menolak saat kamu mencoba memakai `--advertise-tags=tag:server`.

---

## Langkah 2: Buat Auth Key dengan Prinsip Hak Minimal

Sekarang buka tab **Settings** -> **Keys** di Tailscale Admin Console, lalu klik **Generate auth key...**. Di jendela pengaturan, kamu akan melihat beberapa sakelar penting. Jangan asal mencentang semuanya—pahami artinya satu per satu:

| Opsi Auth Key | Rekomendasi untuk VPS / Server Permanen | Penjelasan untuk Pemula |
| --- | --- | --- |
| **Reusable** | **Mati (One-off)** | Jika mati (*one-off*), kunci langsung hangus setelah dipakai mendaftarkan satu server. Jauh lebih aman jika file riwayat terminal sampai terbaca orang lain. |
| **Ephemeral** | **MATI** (Jangan dicentang!) | Jika nyala, perangkat langsung **dihapus** dari tailnet saat mati/restart cukup lama. Ini hanya cocok untuk container CI/CD sementara, bukan VPS! |
| **Pre-approved** | Opsional (Nyalakan jika *Device Approval* aktif) | Mengizinkan server langsung bergabung tanpa menunggu klik persetujuan manual admin. |
| **Tags** | **Wajib isi** (misal `tag:web` atau `tag:server`) | Mengunci agar auth key ini langsung menempelkan tag yang sudah kita daftarkan pada Langkah 1. |
| **Expiration** | Pilih sesingkat kebutuhan (misal 1 hari / 7 hari) | Batas waktu *auth key* ini boleh dipakai mendaftarkan perangkat baru (bukan batas hidup servernya). |

Setelah klik **Generate key**, salin string kunci yang berawalan `tskey-auth-...` dan simpan sementara di password manager. Kunci ini hanya ditampilkan sekali!

> **Catatan keamanan:** Anggap `tskey-auth-...` sama rahasianya dengan password `root`. Siapa pun yang memegang auth key yang belum kedaluwarsa bisa mendaftarkan mesin asing ke jaringan tailnetmu!

---

## Langkah 3: Pasang Tailscale di Server Linux & Hubungkan dengan Auth Key

Masuk ke server Linux-mu (untuk tahap ini masih via SSH biasa atau konsol VPS) lalu pasang Tailscale lewat repositori resmi Tailscale jika belum terpasang:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

*(Kalau kamu sudah mengikuti [artikel pemasangan Tailscale di Debian](/posts/tailscale-debian-pemula/) sebelumnya, cukup pastikan paket sudah terbaru dengan `sudo apt update && sudo apt upgrade tailscale`.)*

Sekarang, jalankan `tailscale up` dengan menyertakan auth key dan tag. Supaya token `tskey-auth-...` tidak tercatat polos di file `~/.bash_history`, kamu bisa membaca kunci dari variabel sementara atau memberi **satu spasi di awal perintah** (pada konfigurasi bash standar dengan `HISTCONTROL=ignorespace` / `ignoreboth`):

```bash
read -s TS_AUTHKEY
sudo tailscale up --auth-key="$TS_AUTHKEY" --advertise-tags=tag:web
unset TS_AUTHKEY
```

Penjelasan langkah demi langkah agar tidak bingung:

1. `read -s TS_AUTHKEY` meminta kamu menempelkan `tskey-auth-...` secara tersembunyi (karakter tidak tampil di layar dan tidak masuk history terminal), lalu tekan **Enter**.
2. `sudo tailscale up --auth-key="$TS_AUTHKEY" --advertise-tags=tag:web` menyuruh daemon `tailscaled` login menggunakan kunci tersebut sekaligus mendaftarkan server sebagai `tag:web`.
3. `unset TS_AUTHKEY` langsung menghapus variabel kunci dari memori shell saat itu juga.

Jika berhasil, perintah selesai dalam beberapa detik tanpa perlu membuka browser sama sekali!

---

## Langkah 4: Verifikasi Identitas Tag & Key Expiry

Pastikan server benar-benar sudah memakai tag dan bukan akun pribadimu:

```bash
tailscale status
```

Perhatikan baris milik server tersebut—di dashboard **Machines** pada Admin Console, pemilik (*owner*) mesin sekarang menampilkan label **`tag:web`**, bukan alamat email pribadimu.

Sekaligus, pahami perbedaan antara dua hal ini agar tidak tertukar:

- **Auth Key Expiration:** Masa berlaku *tiket pendaftaran*. Begitu server sudah berhasil bergabung, tiket *one-off* sudah hangus dan server **tidak ikut mati** meski masa tiketnya lewat.
- **Node Key Expiry:** Masa berlaku kunci kriptografis milik node di server. Secara default perangkat non-tag kedaluwarsa tiap beberapa bulan; perangkat bertag secara bawaan **menonaktifkan key expiry** agar layanan server tidak mendadak putus. Namun jika perusahaanmu mewajibkan rotasi berkala, kamu bisa tetap mengaktifkannya dari menu **Machines** atau kebijakan perangkat.

---

## Bagaimana Jika Ingin Mengubah Tag Server Nanti?

Ada dua hal penting tentang perilaku tag di Tailscale yang sering membuat pemula terkejut:

1. **Mengubah tag perangkat yang didaftarkan via Auth Key butuh re-autentikasi (atau auth key baru).**  
   Kamu tidak selalu bisa seenaknya mengganti `--advertise-tags` di CLI tanpa otorisasi ulang jika key aslinya mengunci tag tertentu. Jika ingin memindahkan peran server, buat auth key baru dengan tag tujuan lalu jalankan `sudo tailscale up --auth-key="$TS_AUTHKEY" --advertise-tags=tag:baru --force-reauth`.
2. **Perangkat bertag harus menyisakan minimal 1 tag.**  
   Begitu sebuah mesin berubah menjadi entitas bertag (*tagged device*), seluruh tag-nya tidak bisa dihapus habis menjadi mesin user biasa begitu saja—minimal harus ada satu tag, atau perangkat harus didaftarkan ulang sebagai perangkat milik user.

---

## Checklist Singkat Sebelum Lanjut

- [x] `tagOwners` sudah tersimpan di **Access controls** Tailscale.
- [x] Auth key dibuat *one-off*, **bukan** *ephemeral*, dan langsung ditempeli tag.
- [x] Server sudah terhubung tanpa browser lewat `--auth-key` dan tampil dengan label `tag:...` di **Machines**.
- [x] `tskey-auth-...` sudah tidak tersimpan di file atau skrip mana pun di server.

Servermu kini sudah punya identitas layanan yang bersih. Di **Bagian 3**, kita akan mengunci firewall server (`UFW` dan interface `tailscale0`) agar port SSH publik dan port manajemen lainnya menghilang dari internet, tanpa terkena jebakan Docker!

---

## Seri Mengamankan Server Linux dengan Tailscale

1. [Bagian 1 — Cara Kerja & Arsitektur Mengamankan Server Linux dengan Tailscale](/posts/tailscale-hardening-arsitektur/)
2. **Bagian 2 — Pasang Tailscale di Server Linux Pakai Tag & Auth Key** *(sedang dibaca)*
3. [Bagian 3 — Kunci Firewall Server Linux (UFW & tailscale0) Lalu Tutup Port Publik](/posts/tailscale-hardening-firewall-port/)
4. [Bagian 4 — Masuk Server Tanpa Ribet Kunci Manual dengan Tailscale SSH & Check Mode](/posts/tailscale-hardening-tailscale-ssh/)
5. [Bagian 5 — Isolasi Antar-Server Pakai Tag, Grants, dan Tailnet Lock](/posts/tailscale-hardening-acl-grants/)
6. [Bagian 6 — Amankan Database & Dashboard Internal dengan Loopback + Tailscale Serve](/posts/tailscale-hardening-layanan-internal/)
7. [Bagian 7 — Pemantauan, Audit Log, Pencabutan Akses, & Akses Darurat](/posts/tailscale-hardening-audit-pemulihan/)

---

## Referensi

- [Tailscale Docs: Group devices with tags (`tagOwners`)](https://tailscale.com/docs/features/tags)
- [Tailscale Docs: Auth keys](https://tailscale.com/docs/features/access-control/auth-keys)
- [Tailscale Docs: Key expiry](https://tailscale.com/docs/features/access-control/key-expiry)
- [Tailscale Docs: Install Tailscale on Linux](https://tailscale.com/docs/install/linux)
