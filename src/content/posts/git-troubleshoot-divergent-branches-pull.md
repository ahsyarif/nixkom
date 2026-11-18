---
title: "Error Saat Git Pull: Divergent Branches & Perubahan Lokal Tertimpa"
date: 2026-11-18T11:03:00+07:00
categories:
  - Git
tags:
  - git
  - pull
  - stash
  - troubleshooting
  - pemula
description: "Cara mengatasi pesan hint: Need to specify how to reconcile divergent branches dan Your local changes would be overwritten by merge saat melakukan git pull atau berpindah branch."
---

Jika menarik pembaruan dari GitHub memakai `git pull`, ada dua pesan yang hampir selalu menghentikan pemula di versi Git modern:

1. **`fatal: Need to specify how to reconcile divergent branches`**
2. **`error: Your local changes to the following files would be overwritten by merge`**

Keduanya muncul bukan karena Git rusak—justru karena Git sedang melindungi kodemu agar tidak saling tabrak secara diam-diam!

---

## Kasus 1: `Need to specify how to reconcile divergent branches`

Ketika kamu mengetik `git pull`, tiba-tiba Git berhenti dan menampilkan saran panjang:

```text
hint: You have divergent branches and need to specify how to reconcile them.
hint: You can do so by running one of the following commands sometime before
hint: your next pull:
hint:
hint:   git config pull.rebase false  # merge
hint:   git config pull.rebase true   # rebase
hint:   git config pull.ff only       # fast-forward only
fatal: Need to specify how to reconcile divergent branches.
```

### Kenapa Ini Terjadi?

Artinya branch di laptopmu dan branch di GitHub sudah **bercabang (*divergent*)**: ada commit baru di laptop yang belum di-push, **sekaligus** ada commit baru di GitHub yang belum ada di laptopmu. Git versi baru menolak menebak dan memintamu memilih cara menggabungkannya.

### Pilih Salah Satu dari 2 Solusi yang Aman

- **Cara A — Paling direkomendasikan agar riwayat commit tetap lurus & bersih (`rebase`):**
  ```bash
  git pull --rebase
  ```
  Untuk menjadikannya setelan bawaan di seluruh laptopmu supaya tidak ditanya lagi setiap kali pull:
  ```bash
  git config --global pull.rebase true
  ```
- **Cara B — Menggabungkan memakai commit merge (`merge`):**
  ```bash
  git pull --no-rebase
  ```
  *(Atau set permanen dengan `git config --global pull.rebase false`.)*

*(Catatan: `pull.ff only` sangat bagus bila dipakai di branch `main` yang tidak pernah kamu edit langsung, karena ia menolak penggabungan kalau ada cabang divergen tak sengaja—mencegah commit merge yang tidak perlu!)*

---

## Kasus 2: `Your local changes to the following files would be overwritten by merge`

Error ini muncul saat kamu belum meng-commit perubahan di laptop, lalu mencoba menjalankan `git pull` (atau `git switch branch-lain`) yang kebetulan juga menyentuh file yang sama:

```text
error: Your local changes to the following files would be overwritten by merge:
        src/app.js
Please commit or stash your changes before you merge.
Aborting
```

Git menolak melanjutkan supaya editanmu di `src/app.js` yang belum di-save ke commit **tidak langsung terhapus tertimpa** oleh versi dari GitHub!

### Solusi Paling Bersih: Titipkan Sebentar dengan `git stash`

Ikuti 3 langkah aman ini tanpa kehilangan satu baris kodingan pun:

```bash
# 1. Titipkan perubahan lokal yang belum di-commit ke laci sementara (-u ikut sertakan file baru)
git stash -u

# 2. Sekarang tarik pembaruan dari GitHub dengan mulus
git pull --rebase

# 3. Ambil kembali editanmu dari laci sementara
git stash pop
```

*(Untuk mengenal lebih jauh cara mengelola banyak titipan stash, baca [titip kodingan setengah jadi dengan `git stash`](/posts/git-stash-pemula/).)*

Alternatif lainnya: jika editan lokalmu memang sudah siap disimpan sebagai satu langkah pekerjaan, cukup `git add . && git commit -m "Simpan progres lokal"` dulu, baru jalankan `git pull --rebase`!

### Bagaimana Jika Justru Memang Ingin Membuang Perubahan Lokal yang Tidak Terpakai?

Jika editan di `src/app.js` itu cuma coretan uji coba yang ingin kamu buang agar sama persis dengan versi server, kembalikan satu file tersebut terlebih dahulu dengan `git restore`:

```bash
git restore src/app.js
git pull
```

---

## Kasus 3: Muncul `CONFLICT` di Tengah `git pull` & Ingin Mundur Dulu

Kadang saat `git pull` (atau setelah `git stash pop`), Git menampilkan `CONFLICT (content): Merge conflict in ...` sementara kamu belum siap menyelesaikannya sekarang.

Jangan pernah langsung mengedit file acak atau menghapus folder `.git`! Mundur kembali dengan aman ke keadaan bersih sebelum pull:

- Jika tadi menjalankan **`git pull`** (mode merge):
  ```bash
  git merge --abort
  ```
- Jika tadi menjalankan **`git pull --rebase`**:
  ```bash
  git rebase --abort
  ```

Setelah tenang dan siap menyelesaikannya, ikuti langkah lengkap membaca tanda `<<<<<<<` dan `>>>>>>>` di [cara menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/).

---

## Checklist Singkat Sebelum Lanjut

- [x] Memilih strategi pull yang konsisten (`git config --global pull.rebase true` atau `false`) agar tidak terhambat error *divergent branches*.
- [x] Membiasakan urutan **`git stash -u` -> `git pull` -> `git stash pop`** saat ada perubahan lokal belum di-commit.
- [x] Tahu cara mundur bersih memakai `git merge --abort` atau `git rebase --abort` saat konflik terjadi mendadak.

Di **Bagian 5**, kita akan membahas kecelakaan kerja sehari-hari yang hampir semua developer pernah lakukan: **koding dan terlanjur `git commit` di branch `main` (lupa membuat branch fitur)**, serta cara memindahkannya rapi ke branch baru tanpa mengulang koding!

---

## Seri Troubleshooting Kendala Git untuk Pemula

1. [Bagian 1 — Git Push Ditolak (Rejected / Non-Fast-Forward & No Upstream Branch)](/posts/git-troubleshoot-push-rejected-non-fast-forward/)
2. [Bagian 2 — Terjebak di Detached HEAD: Cara Keluar & Menyelamatkan Commit](/posts/git-troubleshoot-detached-head/)
3. [Bagian 3 — Gagal Clone/Push GitHub (Password Dihapus, SSH Key, & Author Unknown)](/posts/git-troubleshoot-auth-ssh-https-github/)
4. **Bagian 4 — Error Saat Git Pull: Divergent Branches & Perubahan Lokal Tertimpa** *(sedang dibaca)*
5. [Bagian 5 — Salah Commit di Branch Main atau Lupa Buat Branch Fitur](/posts/git-troubleshoot-salah-branch-salah-commit/)
6. [Bagian 6 — Push Gagal karena File > 100 MB atau Rahasia (.env / API Key) Bocor](/posts/git-troubleshoot-file-besar-rahasia-github/)
7. [Bagian 7 — Masalah Lintas OS: CRLF vs LF, Huruf Besar/Kecil Nama File, & Dubious Ownership](/posts/git-troubleshoot-line-ending-case-filename/)

---

## Referensi

- [Git Official Docs: `git-pull`](https://git-scm.com/docs/git-pull)
- [Git Official Docs: `git-stash`](https://git-scm.com/docs/git-stash)
- [Git Official Docs: `git-config`](https://git-scm.com/docs/git-config)
