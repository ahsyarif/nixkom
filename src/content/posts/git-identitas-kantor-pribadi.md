---
title: "Identitas Git beda untuk kantor dan pribadi dengan includeIf"
date: 2026-11-11T12:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "config", "ssh"]
description: "Biar email dan SSH key otomatis ganti sendiri sesuai folder repo, nggak ada lagi cerita salah pakai email waktu commit."
---

Salah satu kejadian paling nyebelin waktu pakai satu laptop buat kerja sekaligus proyek sampingan: baru sadar *commit* di repo kantor tercatat pakai email pribadi sesudah belasan *commit* naik ke server. Daripada mengandalkan ingatan buat ngetik `git config user.email` tiap habis *clone* repo baru, pakai saja `includeIf` di `~/.gitconfig` supaya email dan *SSH key* otomatis menyesuaikan folder tempat repo itu disimpan.

## Pisahkan dulu foldernya

Taruh semua repo kantor dan repo pribadi di dua folder induk yang terpisah:

```text
~/
├── Projects/   # semua repo pribadi & open-source
└── Work/       # semua repo kantor
```

## Cara mengaturnya

Di `~/.gitconfig` utama, tulis identitas pribadi sebagai setelan bawaan, lalu tambahkan blok `includeIf` di bagian bawahnya:

```ini
[user]
	name = Ahmad
	email = ahmad@pribadi.id

[includeIf "gitdir:~/Work/"]
	path = ~/.gitconfig-work
```

Habis itu, bikin berkas baru `~/.gitconfig-work` khusus buat urusan kantor:

```ini
[user]
	name = Ahmad
	email = ahmad@kantor.co.id

[core]
	sshCommand = ssh -i ~/.ssh/id_ed25519_work -o IdentitiesOnly=yes
```

Opsi `-o IdentitiesOnly=yes` di situ penting supaya SSH langsung menyodorkan kunci `id_ed25519_work` dan nggak mencoba kunci pribadi yang kebetulan lagi nongkrong di `ssh-agent`.

## Empat jebakan yang sering bikin aturan nggak jalan

1. **Garis miring di ujung `~/Work/` jangan sampai ketinggalan.** Tanda `/` di akhir bikin Git otomatis menambahkan `**` di belakangnya, jadi semua subfolder di dalam `~/Work/` ikut kena aturan. Tanpa garis miring penutup, subfoldernya malah dicuekin.
2. **Huruf besar-kecil di macOS dan Windows.** Karena sistem berkas bawaan macOS dan Windows nggak membedakan huruf besar-kecil, kalau kamu kadang masuk folder lewat `~/work/` (huruf kecil), ganti syaratnya jadi `gitdir/i:~/Work/` supaya tetap cocok.
3. **Taruh `includeIf` di bawah `[user]` bawaan.** Git membaca konfigurasi dari atas ke bawah dan memakai nilai yang paling akhir ditemukan. Kalau `includeIf` ditaruh di baris paling atas, nilainya bakal ketimpa lagi sama `[user]` pribadi di bawahnya.
4. **Waktu pertama kali `git clone`.** Saat perintah `git clone` baru mulai jalan, folder `.git` lokal belum terbentuk sehingga aturan `gitdir` belum aktif. Kalau repo kantornya tertutup dan butuh *SSH key* kantor sejak proses *clone*, jalankan *clone* sambil menyertakan variabel lingkungan sementara (atau daftarkan alias *host* di `~/.ssh/config`):

```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_work -o IdentitiesOnly=yes" git clone git@github.com:kantor/layanan.git
```

## Alternatif: cocokkan dari alamat remote

Sejak Git 2.36, kamu juga bisa memasang syarat berdasarkan URL *remote* tanpa peduli repo itu ditaruh di folder mana:

```ini
[includeIf "hasconfig:remote.*.url:git@github.com:kantor/**"]
	path = ~/.gitconfig-work
```

Cara ini kepakai kalau ada repo kantor yang terpaksa ditaruh di luar `~/Work/`. Catatannya cuma satu: aturan baru menyala sesudah *remote* `origin` terdaftar di repo itu.

## Cara ngetesnya

Masuk ke salah satu repo di dalam `~/Work/`, lalu cek apakah email dan perintah SSH yang aktif memang diambil dari `~/.gitconfig-work`:

```bash
git config --show-origin user.email
git config --show-origin core.sshCommand
ssh -i ~/.ssh/id_ed25519_work -T git@github.com
```

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. [10 alias Git yang saya pakai setiap hari](/posts/git-alias-harian/)
3. [Commit sebagian perubahan dengan git add -p](/posts/git-add-patch/)
4. [Kerja di banyak branch sekaligus dengan git worktree](/posts/git-worktree/)
5. **Identitas Git beda untuk kantor dan pribadi dengan includeIf**
6. [Salah commit atau salah edit? Cara membatalkan perubahan di Git](/posts/git-membatalkan-perubahan/)
7. [Berhenti pakai git checkout untuk semuanya: pakai switch dan restore](/posts/git-switch-restore/)
8. [Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git](/posts/git-rm-cached-gitignore/)
9. [Titip kodingan setengah jadi dengan git stash](/posts/git-stash-pemula/)
10. [Penyelamat terakhir waktu salah reset atau hapus branch: git reflog](/posts/git-reflog-penyelamat/)
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
