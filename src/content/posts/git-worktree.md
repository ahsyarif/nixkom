---
title: "Kerja di banyak branch sekaligus dengan git worktree"
date: 2026-11-11T11:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "workflow"]
description: "Review PR atau ngerjain hotfix mendadak tanpa git stash dan tanpa clone ulang, cukup buka folder worktree baru."
---

Lagi asyik ngoprek fitur, tiba-tiba diminta ngecek *pull request* teman atau nambal *bug* darurat di `main`. Kalau pakai `git stash` terus pindah *branch*, tembolok kompilasi sering ulang dari nol, *dev server* harus dimatikan, dan tab editor ikut berantakan. Pakai `git worktree`, kamu tinggal membuka folder kerja kedua di sebelah folder lama yang tetap berbagi satu isi `.git` yang sama.

## Bikin worktree baru

Misalnya kamu lagi di folder `proyek/` pada *branch* fitur, lalu harus bikin *hotfix* dari `main`:

```bash
git worktree add ../proyek-hotfix -b hotfix/login main
```

Perintah itu langsung membuat folder `../proyek-hotfix` berisi *branch* baru `hotfix/login` yang bercabang dari `main`. Kamu tinggal `cd ../proyek-hotfix`, bereskan masalahnya, *commit*, dan *push* tanpa menyentuh folder `proyek/` yang pertama.

Kalau cuma mau meninjau atau menjalankan kode dari *branch* rekan kerja tanpa bikin *branch* lokal baru, arahkan langsung ke referensi *remote*-nya (*detached HEAD*):

```bash
git fetch origin
git worktree add ../proyek-review origin/fitur-x
```

## Lihat daftar dan hapus kalau sudah kelar

Begitu urusan *hotfix* atau *review* selesai, cek daftar *worktree* yang masih nyangkut lalu hapus lewat Git:

```bash
git worktree list
git worktree remove ../proyek-review
```

Kalau foldernya tadi telanjur kamu hapus manual pakai `rm -rf`, bersihkan sisa catatannya di `.git/worktrees` dengan:

```bash
git worktree prune
```

## Tiga aturan mainnya

Satu *branch* cuma boleh dibuka di satu *worktree* pada saat yang sama. Kalau kamu coba membuka `main` di dua tempat, Git langsung menolak dengan pesan `fatal: 'main' is already used by worktree at ...` supaya dua folder nggak saling menimpa *commit*.

Semua objek Git, *stash*, dan hasil `git fetch` dipakai bareng-bareng. Begitu kamu bikin *commit* atau *fetch* di satu *worktree*, *worktree* sebelahnya langsung bisa melihat *commit* itu tanpa perlu ambil ulang dari internet.

Berkas yang masuk `.gitignore` nggak ikut disalin ke folder baru. Jadi folder seperti `node_modules/`, `dist/`, atau berkas `.env` lokal perlu kamu pasang atau salin sendiri di *worktree* baru.

## Pola bare repo buat yang sering loncat branch

Kalau sehari-hari kamu memang selalu membuka tiga sampai empat *branch* barengan, enak sekalian melakukan *clone* sebagai *bare repository* supaya tiap *branch* punya kamar sejajar:

```bash
git clone --bare git@github.com:user/proyek.git proyek/.bare
cd proyek
echo "gitdir: ./.bare" > .git
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git fetch origin
git worktree add main main
```

Susunan foldernya jadi bersih karena nggak ada lagi satu folder yang dianggap "repo utama":

```text
proyek/
├── .bare/
├── .git
├── main/
└── hotfix-login/
```

## Tip tambahan

Kalau kamu menaruh salah satu *worktree* di diska eksternal yang kadang dicabut, kunci dulu pakai `git worktree lock ../proyek-eksternal` supaya catatannya nggak ikut disapu waktu `git worktree prune` jalan.

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
