---
title: "10 alias Git yang saya pakai setiap hari"
date: 2026-11-11T09:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "alias"]
description: "Sepuluh alias ~/.gitconfig buat lihat log bercabang, batalin commit terakhir, amend cepat, dan bersih-bersih branch."
---

Siapa yang masih ngetik `git log --graph --oneline --decorate --all` lengkap tiap mau ngecek pohon *branch*? Taruh saja di `[alias]` dalam `~/.gitconfig`. Sepuluh alias di bawah ini yang paling sering kepakai di terminal saya dari pagi sampai sore.

## Daftar alias

| Alias | Perintah aslinya | Buat apa |
|---|---|---|
| `st` | `status -sb` | Cek status singkat satu baris per berkas, lengkap sama info *branch* dan *upstream*. |
| `lg` | `log --graph --oneline --decorate --all` | Lihat pohon riwayat *commit* semua *branch* dalam tampilan padat. |
| `last` | `log -1 HEAD --stat` | Intip *commit* terakhir plus daftar berkas yang ikut berubah. |
| `sw` | `switch` | Pindah *branch* pakai `switch` tanpa ngetik penuh. |
| `undo` | `reset --soft HEAD~1` | Bongkar *commit* terakhir, tapi perubahannya tetap tersimpan di *staging*. |
| `unstage` | `restore --staged` | Keluarkan berkas dari *staging area* tanpa menghapus isi editannya. |
| `amend` | `commit --amend --no-edit` | Sisipkan berkas yang ketinggalan ke *commit* terakhir tanpa buka editor. |
| `pushf` | `push --force-with-lease` | *Force push* yang nolak jalan kalau *remote* ternyata sudah berubah duluan. |
| `wip` | `!git add -A && git commit -m wip --no-verify` | Bungkus semua editan jadi *commit* sementara tanpa dicegat *hook*. |
| `gone` | `!git fetch -p && git branch -vv \| awk '/: gone]/{print $1}' \| xargs -r git branch -D` | Sapu bersih *branch* lokal yang pasangannya di *remote* sudah dihapus. |

## Versi siap salin

Tempel ke bagian `[alias]` di `~/.gitconfig`:

```ini
[alias]
	st = status -sb
	lg = log --graph --oneline --decorate --all
	last = log -1 HEAD --stat
	sw = switch
	undo = reset --soft HEAD~1
	unstage = restore --staged
	amend = commit --amend --no-edit
	pushf = push --force-with-lease
	wip = "!git add -A && git commit -m wip --no-verify"
	gone = "!git fetch -p && git branch -vv | awk '/: gone]/{print $1}' | xargs -r git branch -D"
```

Kalau dijalankan, `git lg` ngasih tampilan kayak gini:

```text
* a4f81c2 (HEAD -> main, origin/main) Merge branch 'feat/dark-mode'
|\
| * 79b3e10 persist theme preference in localStorage
| * 31d09fa add dark color tokens to theme.css
|/
* c8204ab initial navbar component layout
```

## Tiga hal yang perlu kamu tahu

`git undo` di atas memakai `--soft`, beda jauh dengan `reset --hard`. Waktu kamu jalankan `git undo`, *commit* terakhirnya lepas, tapi semua ketikanmu masih utuh di *staging area*. Pas banget dipakai kalau habis *commit* baru sadar ada satu berkas ketinggalan, salah tulis pesan, atau mau membongkar *commit* sementara yang tadi dibuat pakai `git wip`.

Buat *force push* sesudah *rebase* atau `git amend`, biasakan pakai `git pushf` (`--force-with-lease`) daripada `--force` mentah. Git bakal ngecek dulu apakah posisi *branch* di server masih sama dengan yang terakhir kamu *fetch*. Kalau teman setimmu barusan *push* ke *branch* itu, perintahnya otomatis ditolak supaya kerjaan mereka nggak ketimpa.

Terakhir, `git gone` enak dipakai sehabis banyak *pull request* digabung ke `main`. Perintah ini memangkas referensi *remote* yang sudah mati, mencari *branch* lokal yang bertanda `: gone]`, lalu menghapusnya. Karena di dalamnya pakai `-D`, pastikan dulu perubahan di *branch* itu memang sudah masuk ke `main`. Opsi `xargs -r` (jangan jalankan `git branch -D` kalau daftarnya kosong) bawaan GNU `xargs`, dan sudah didukung juga oleh `xargs` bawaan macOS sejak macOS 13.

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. **10 alias Git yang saya pakai setiap hari**
3. [Commit sebagian perubahan dengan git add -p](/posts/git-add-patch/)
4. [Kerja di banyak branch sekaligus dengan git worktree](/posts/git-worktree/)
5. [Identitas Git beda untuk kantor dan pribadi dengan includeIf](/posts/git-identitas-kantor-pribadi/)
6. [Salah commit atau salah edit? Cara membatalkan perubahan di Git](/posts/git-membatalkan-perubahan/)
7. [Berhenti pakai git checkout untuk semuanya: pakai switch dan restore](/posts/git-switch-restore/)
8. [Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git](/posts/git-rm-cached-gitignore/)
9. [Titip kodingan setengah jadi dengan git stash](/posts/git-stash-pemula/)
10. [Penyelamat terakhir waktu salah reset atau hapus branch: git reflog](/posts/git-reflog-penyelamat/)
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
