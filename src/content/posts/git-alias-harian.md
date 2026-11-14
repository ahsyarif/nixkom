---
title: "10 alias Git yang saya pakai setiap hari"
date: 2026-11-11T09:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "alias"]
description: "Sepuluh alias ~/.gitconfig buat lihat log bercabang, batalin commit terakhir, amend cepat, dan bersih-bersih branch."
---

Pernah merasa capek mengetik perintah Git yang panjang berulang-ulang setiap hari—seperti `git log --graph --oneline --decorate --all` cuma untuk melihat riwayat *branch*?

Di Git, kamu bisa membuat **alias** (nama singkatan buatan sendiri) di dalam bagian `[alias]` pada file `~/.gitconfig` (file setelan Git global yang berlaku untuk semua proyek di komputermu). Dengan alias, perintah panjang bisa dipanggil cukup dengan dua atau tiga huruf. Sepuluh alias di bawah ini adalah singkatan yang paling sering membantu pekerjaan harian di terminal.

## 1. Daftar 10 alias dan fungsinya

Sebelum menyalinnya, mari pahami dulu apa tugas masing-masing alias ini:

| Alias | Perintah aslinya | Penjelasan untuk pemula |
|---|---|---|
| `st` | `status -sb` | Mengecek status perubahan berkas dengan tampilan super ringkas (satu baris per berkas), lengkap dengan nama *branch* aktif dan status hubungannya dengan server (*upstream*). |
| `lg` | `log --graph --oneline --decorate --all` | Menampilkan gambar pohon riwayat *commit* semua *branch* secara padat dan mudah dibaca. |
| `last` | `log -1 HEAD --stat` | Mengintip isi *commit* paling akhir beserta daftar berkas apa saja yang ikut berubah di dalamnya. |
| `sw` | `switch` | Singkatan untuk pindah *branch* memakai `git switch` (misalnya `git sw main`). |
| `undo` | `reset --soft HEAD~1` | Membongkar *commit* terakhir yang baru dibuat di lokal, tetapi seluruh editanmu tetap aman tersimpan di keranjang siap *commit* (*staging area*). |
| `unstage` | `restore --staged` | Mengeluarkan berkas yang telanjur di-`git add` kembali ke luar *staging area* tanpa menghapus ketikanmu. |
| `amend` | `commit --amend --no-edit` | Menempelkan perubahan baru yang ketinggalan ke *commit* terakhir tanpa membuka editor untuk mengubah pesan *commit*-nya. |
| `pushf` | `push --force-with-lease` | Mengirim ulang riwayat (*force push*) dengan pengaman—otomatis menolak jalan kalau ternyata ada rekan tim yang baru saja *push* ke *branch* yang sama di server. |
| `wip` | `!git add -A && git commit -m wip --no-verify` | Membungkus semua perubahan saat ini menjadi satu *commit* sementara bertuliskan `"wip"` (*work in progress*) dengan melewati pengecekan otomatis (*hook*). |
| `gone` | `!git fetch -p && git branch -vv \| awk '/: gone]/{print $1}' \| xargs -r git branch -D` | Menyapu bersih *branch* di laptopmu yang pasangannya di server (*remote*) sudah dihapus setelah digabung. |

## 2. Versi siap salin ke `~/.gitconfig`

Buka file `~/.gitconfig` di komputermu, lalu tempel blok ini di bagian bawah (tanda `!` di depan dua alias terakhir memberi tahu Git bahwa perintah itu dijalankan lewat terminal/shell biasa):

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

Sebagai gambaran, saat kamu mengetik `git lg`, tampilannya di terminal akan rapi berbentuk pohon seperti ini:

```text
* a4f81c2 (HEAD -> main, origin/main) Merge branch 'feat/dark-mode'
|\
| * 79b3e10 persist theme preference in localStorage
| * 31d09fa add dark color tokens to theme.css
|/
* c8204ab initial navbar component layout
```

## 3. Tiga hal penting yang wajib dipahami sebelum memakai alias ini

### Bedakan `git undo` (`--soft`) dengan `reset --hard`
`git undo` di atas menggunakan `--soft`, bukan `--hard`. Saat dijalankan, bungkus *commit* terakhirnya dilepas, tetapi seluruh perubahan kodemu **masih utuh** di *staging area*. Ini sangat berguna kalau kamu baru sadar ada satu berkas ketinggalan, salah tulis pesan, atau ingin membongkar lagi *commit* sementara yang tadi dibuat memakai `git wip`. (Jangan pernah gunakan `git reset --hard` kalau kamu tidak benar-benar ingin membuang kodemu!).

### Gunakan `git pushf` alih-alih `git push --force`
Jika kamu mengubah *commit* yang sudah sempat di-*push* ke *branch* fitur pribadimu (misalnya sesudah `git amend` atau `git rebase`), Git meminta *force push*. Biasakan selalu memakai `git pushf` (`--force-with-lease`), jangan `--force` mentah. Dengan `--force-with-lease`, Git mengecek dulu apakah isi *branch* di server masih sama dengan catatan terakhir di laptopmu—jika ada teman yang baru saja mengirim *commit* ke sana, perintah langsung dibatalkan supaya kerjaan temanmu tidak tertimpa hilang.

### Hati-hati saat memakai `git gone`
Alias `git gone` sangat membantu bersih-bersih *branch* lama setelah banyak *pull request* selesai digabung ke `main`. Cara kerjanya:
1. `git fetch -p`: memperbarui daftar *branch* dari server dan menghapus catatan *remote* yang sudah tidak ada.
2. `git branch -vv | awk ...`: menyaring *branch* lokal yang status servernya bertanda `: gone]` (artinya pasangannya di server sudah dihapus).
3. `xargs -r git branch -D`: langsung menghapus paksa *branch* lokal tersebut.

Karena perintah di dalamnya memakai `-D` (hapus paksa tanpa cek), **pastikan dulu perubahan di *branch* yang mau dibersihkan itu memang sudah digabung ke `main`**, dan pastikan kamu sedang berdiri di `main` (bukan di dalam *branch* yang akan dihapus). Opsi `-r` pada `xargs` (mencegah `git branch -D` jalan saat daftar kosong) tersedia di GNU `xargs` Linux maupun `xargs` bawaan macOS sejak macOS 13.

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
