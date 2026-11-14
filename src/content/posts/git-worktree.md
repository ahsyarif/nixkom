---
title: "Kerja di banyak branch sekaligus dengan git worktree"
date: 2026-11-11T11:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "workflow"]
description: "Review PR atau ngerjain hotfix mendadak tanpa git stash dan tanpa clone ulang, cukup buka folder worktree baru."
---

Bayangkan kamu sedang asyik membongkar fitur baru di satu *branch*, lalu tiba-tiba diminta mengecek *pull request* teman atau menambal *bug* darurat di `main`.

Kalau kamu memakai cara biasa (`git stash` lalu `git switch main`), sering kali banyak pekerjaan jadi terganggu: *server* pengembangan (*dev server*) harus dimatikan, *cache* build atau kompilasi mengulang dari nol, dan tab-tab di code editor ikut berubah semua.

Dengan **`git worktree`**, kamu bisa membuka "meja kerja kedua" berupa folder baru tepat di sebelah folder proyekmu sekarang. Kedua folder itu tetap berbagi satu riwayat Git (`.git`) yang sama—tidak perlu `git clone` ulang, tidak perlu mengacak-acak meja kerja pertamamu.

## 1. Membuka folder *worktree* baru

Misalkan kamu sedang berada di folder `proyek/` pada *branch* fitur, lalu tiba-tiba harus membuat perbaikan darurat (*hotfix*) dari `main`:

```bash
git worktree add ../proyek-hotfix -b hotfix/login main
```

Apa yang terjadi saat perintah itu dijalankan?
- Git membuat folder baru bernama `proyek-hotfix` satu tingkat di sebelah folder `proyek/`.
- Di dalam folder baru itu, Git otomatis membuatkan *branch* baru `hotfix/login` yang bercabang dari `main`.
- Kamu tinggal pindah ke sana (`cd ../proyek-hotfix`), perbaiki *bug*-nya, *commit*, dan *push*—sementara folder `proyek/` pertamamu tetap utuh persis seperti kondisi terakhir kamu meninggalkannya!

Kalau kamu cuma mau meninjau atau menjalankan kode dari *branch* rekan kerja tanpa berniat membuat *branch* lokal baru, arahkan langsung ke referensi servernya (`origin/fitur-x`). Git akan membukanya dalam mode *detached HEAD* (mode hanya melihat/menguji di titik commit itu tanpa terikat ke nama *branch* lokal):

```bash
git fetch origin
git worktree add ../proyek-review origin/fitur-x
```

## 2. Melihat daftar dan menghapus *worktree* yang sudah selesai

Begitu urusan *hotfix* atau *review* selesai, kembali ke folder utama, cek daftar *worktree* yang aktif, lalu tutup dengan `remove`:

```bash
git worktree list
git worktree remove ../proyek-review
```

Jika foldernya tadi telanjur kamu hapus manual memakai `rm -rf` atau dari File Manager/Finder, bersihkan sisa catatan yang tertinggal di `.git/worktrees` dengan:

```bash
git worktree prune
```

## 3. Tiga aturan main *worktree* yang wajib diketahui

1. **Satu *branch* hanya boleh dibuka di satu *worktree* pada waktu bersamaan.** Jika kamu mencoba membuka `main` di dua folder sekaligus, Git menolak dengan pesan `fatal: 'main' is already used by worktree at ...`. Aturan ini menjaga agar dua folder tidak saling menimpa riwayat *commit*.
2. **Riwayat dan *fetch* dibagi bersama.** Semua catatan *commit*, *stash*, dan hasil `git fetch` dipakai bareng oleh seluruh *worktree*. Begitu kamu membuat *commit* atau menjalankan `git fetch` di satu folder, folder sebelahnya langsung mengetahuinya tanpa perlu mengunduh ulang dari internet.
3. **Berkas yang ada di `.gitignore` tidak ikut disalin.** Karena `git worktree` hanya memunculkan berkas yang dilacak oleh Git, folder seperti `node_modules/`, `dist/`, atau file rahasia `.env` lokal tidak otomatis muncul di folder baru. Kamu perlu menjalankan `npm install` atau menyalin file `.env` sendiri ke *worktree* baru tersebut.

## 4. Opsional: pola *bare repo* untuk yang sering membuka banyak *branch*

*(Catatan untuk pemula: bagian ini adalah teknik lanjutan yang boleh kamu lewati kalau baru belajar—cara `git worktree add` di langkah 1 sudah lebih dari cukup untuk kebutuhan harian.)*

Jika pekerjaanmu sehari-hari memang selalu membuka tiga sampai empat *branch* secara bersamaan, banyak pengembang suka melakukan `git clone --bare` agar tidak ada satu folder yang dianggap "folder utama", melainkan setiap *branch* punya kamar sejajar:

```bash
git clone --bare git@github.com:user/proyek.git proyek/.bare
cd proyek
echo "gitdir: ./.bare" > .git
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git fetch origin
git worktree add main main
```

Susunan foldernya menjadi sangat rapi dan sejajar seperti ini:

```text
proyek/
├── .bare/
├── .git
├── main/
└── hotfix-login/
```

## Tip tambahan

Jika kamu menaruh salah satu *worktree* di hard disk/SSD eksternal yang kadang dicabut dari laptop, kunci dulu catatannya dengan `git worktree lock ../proyek-eksternal` supaya catatannya tidak dianggap hilang dan ikut terhapus saat `git worktree prune` berjalan.

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. [10 alias Git yang saya pakai setiap hari](/posts/git-alias-harian/)
3. [Commit sebagian perubahan dengan git add -p](/posts/git-add-patch/)
4. **Kerja di banyak branch sekaligus dengan git worktree**
5. [Identitas Git beda untuk kantor dan pribadi dengan includeIf](/posts/git-identitas-kantor-pribadi/)
6. [Salah commit atau salah edit? Cara membatalkan perubahan di Git](/posts/git-membatalkan-perubahan/)
7. [Berhenti pakai git checkout untuk semuanya: pakai switch dan restore](/posts/git-switch-restore/)
8. [Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git](/posts/git-rm-cached-gitignore/)
9. [Titip kodingan setengah jadi dengan git stash](/posts/git-stash-pemula/)
10. [Penyelamat terakhir waktu salah reset atau hapus branch: git reflog](/posts/git-reflog-penyelamat/)
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
