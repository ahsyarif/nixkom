---
title: "Identitas Git beda untuk kantor dan pribadi dengan includeIf"
date: 2026-11-11T12:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "config", "ssh"]
description: "Biar email dan SSH key otomatis ganti sendiri sesuai folder repo, nggak ada lagi cerita salah pakai email waktu commit."
---

Jika kamu memakai satu laptop yang sama untuk proyek kantor sekaligus proyek pribadi/belajar, ada satu kejadian klasik yang sering bikin kesal: baru sadar semua *commit* di repositori kantor tercatat memakai email pribadi—atau gagal `git push` karena SSH menggunakan akun GitHub yang salah!

Daripada mengandalkan ingatan untuk mengetik `git config user.email` setiap kali baru melakukan `git clone`, kamu bisa memanfaatkan fitur **`includeIf`** di file `~/.gitconfig`. Dengan `includeIf`, Git otomatis mengganti nama, alamat email, dan kunci SSH menyesuaikan folder tempat proyek itu disimpan.

## 1. Pisahkan proyek kantor dan pribadi ke dua folder induk

Langkah pertamanya sederhana: rapikan letak folder proyek di laptopmu ke dalam dua folder induk yang jelas terpisah, misalnya:

```text
~/
├── Projects/   # semua repo pribadi & latihan
└── Work/       # semua repo kantor
```

## 2. Atur konfigurasi utama dan konfigurasi khusus kantor

Di file konfigurasi global utama `~/.gitconfig`, tulis identitas pribadimu sebagai setelan bawaan, lalu tambahkan syarat `includeIf` di bagian bawahnya:

```ini
[user]
	name = Ahmad
	email = ahmad@pribadi.id

[includeIf "gitdir:~/Work/"]
	path = ~/.gitconfig-work
```

Artinya dalam bahasa manusia: *"Secara bawaan pakai email pribadiku; tetapi **jika** repositori ini berada di dalam folder `~/Work/`, baca juga setelan tambahan dari file `~/.gitconfig-work`."*

Selanjutnya, buat file baru bernama `~/.gitconfig-work` khusus untuk urusan kantor:

```ini
[user]
	name = Ahmad
	email = ahmad@kantor.co.id

[core]
	sshCommand = ssh -i ~/.ssh/id_ed25519_work -o IdentitiesOnly=yes
```

Catatan penting tentang baris `sshCommand`:
- `-i ~/.ssh/id_ed25519_work`: menunjuk file kunci SSH khusus kantor.
- `-o IdentitiesOnly=yes`: memastikan SSH **hanya** menyodorkan kunci kantor tersebut dan tidak mencoba kunci pribadi yang kebetulan sedang aktif di `ssh-agent` (pengelola kunci SSH di latar belakang).

## 3. Empat jebakan yang sering membuat `includeIf` tidak bekerja

1. **Garis miring (`/`) di akhir `~/Work/` wajib ditulis.** Tanda `/` di ujung itu membuat Git otomatis menganggap semua subfolder di dalam `~/Work/` ikut terkena aturan. Tanpa garis miring penutup, folder proyek di dalamnya tidak akan cocok!
2. **Perbedaan huruf besar-kecil di macOS dan Windows.** Sistem berkas bawaan macOS dan Windows tidak membedakan huruf besar-kecil. Jika kamu kadang masuk lewat `~/work/` (huruf kecil), tambahkan `/i` (`gitdir/i:~/Work/`) agar pencocokan tidak mempedulikan huruf kapital.
3. **Taruh blok `includeIf` di bawah `[user]` bawaan.** Git membaca file konfigurasi dari atas ke bawah dan memakai nilai yang paling akhir dibaca. Kalau `includeIf` diletakkan di bagian paling atas, nilainya akan tertimpa kembali oleh `[user]` pribadi di bawahnya.
4. **Saat pertama kali menjalankan `git clone`.** Ketika perintah `git clone` baru mulai jalan, folder `.git` lokal belum terbentuk di komputermu sehingga aturan `gitdir` belum sempat aktif. Jika repo kantormu bersifat privat dan langsung membutuhkan SSH key kantor saat `git clone`, sertakan variabel lingkungan `GIT_SSH_COMMAND` sementara di awal perintah (atau buat alias *host* di `~/.ssh/config`):

```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_work -o IdentitiesOnly=yes" git clone git@github.com:kantor/layanan.git
```

## 4. Alternatif: cocokkan berdasarkan URL server (*remote*)

Sejak Git versi 2.36, kamu juga bisa memasang aturan berdasarkan alamat server (*remote* URL), tidak peduli di folder mana repositori itu ditaruh:

```ini
[includeIf "hasconfig:remote.*.url:git@github.com:kantor/**"]
	path = ~/.gitconfig-work
```

Ini cocok kalau kamu kadang menyimpan proyek kantor di luar folder `~/Work/`. Satu catatannya: aturan ini baru mulai bekerja setelah *remote* `origin` terdaftar di dalam repo tersebut.

## 5. Cara mengetesnya

Masuk ke salah satu folder proyek di dalam `~/Work/`, lalu pastikan Git benar-benar membaca email dan perintah SSH dari file `~/.gitconfig-work`:

```bash
git config --show-origin user.email
git config --show-origin core.sshCommand
ssh -i ~/.ssh/id_ed25519_work -T git@github.com
```

Opsi `--show-origin` akan menampilkan dari file mana setelan itu berasal, sedangkan perintah `ssh -T` mengetes apakah kunci kantormu diterima dengan benar oleh GitHub.

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
