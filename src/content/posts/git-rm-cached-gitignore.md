---
title: ".gitignore nggak mempan? Lepas berkas yang sudah dilacak Git"
date: 2026-11-11T15:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Menambahkan .env atau node_modules ke .gitignore sesudah telanjur di-commit nggak bikin Git berhenti melacaknya. Lepas dulu pakai git rm --cached."
---

Pernah mengalami ini? Kamu sudah menambahkan `.env` atau `dist/` ke dalam file `.gitignore` (file daftar berkas yang ingin diabaikan Git), tetapi setiap kali isi `.env` berubah, namanya tetap saja muncul di `git status`!

Penyebabnya sebenarnya sangat sederhana: **`.gitignore` hanya berlaku untuk berkas baru yang belum pernah dikenal Git (*untracked*)**. Begitu sebuah berkas sudah pernah masuk ke dalam *commit* walaupun cuma sekali, Git menandainya sebagai berkas resmi yang dilacak (*tracked*). Setelah berstatus *tracked*, aturan `.gitignore` akan langsung diabaikan untuk berkas itu.

## 1. Solusinya: lepas dari pantauan Git tanpa menghapus berkas aslinya

Jangan pernah memakai `git rm <berkas>` biasa, karena perintah itu juga akan **menghapus berkas fisiknya** dari laptopmu!

Tambahkan opsi **`--cached`** supaya Git hanya mencabut berkas itu dari daftar lacakannya (*staging/index*), sementara file `.env` asli di folder kerjamu tetap utuh aman di tempatnya:

```bash
echo ".env" >> .gitignore
git rm --cached .env
git commit -m "chore: stop tracking .env"
```

*(Penjelasan baris pertama: `echo ".env" >> .gitignore` menambahkan teks `.env` ke baris paling bawah `.gitignore` tanpa menimpa isi sebelumnya).*

Jika yang telanjur masuk adalah satu folder penuh—seperti `node_modules/` atau `.idea/`—tambahkan opsi `-r` (*recursive*, mencakup seluruh folder beserta semua file di dalamnya):

```bash
echo "node_modules/" >> .gitignore
git rm -r --cached node_modules/
git commit -m "chore: remove node_modules from git tracking"
```

Setelah *commit* di atas selesai dibuat, coba ubah isi `.env` lalu cek `git status`. Berkas itu sekarang benar-benar sudah diabaikan dan tidak akan muncul lagi!

## 2. Mengecek aturan mana yang menahan sebuah berkas

Terkadang kejadiannya terbalik: kamu mau memasukkan berkas baru, tetapi Git terus mengabaikannya padahal kamu merasa tidak pernah menuliskannya di `.gitignore`. Gunakan `git check-ignore -v` untuk melacak persis baris aturan mana yang menahan berkas tersebut:

```bash
git check-ignore -v build/output.bin
```

Keluarannya langsung menunjuk nama file aturan beserta nomor barisnya:

```text
.gitignore:14:*.bin	build/output.bin
```

Ternyata baris ke-14 di `.gitignore` melarang semua berkas `.bin`! Jika satu berkas tertentu seperti `build/output.bin` itu memang wajib masuk repo sebagai pengecualian, tambahkan tanda seru (`!`, artinya "kecuali ini") tepat di bawah aturan `*.bin` pada `.gitignore`:

```text
*.bin
!build/output.bin
```

## 3. Peringatan keras soal berkas rahasia (`.env` dan kunci API)

Pahami batasan penting ini: perintah `git rm --cached .env` hanya menghentikan pelacakan **mulai dari *commit* terbaru ke depan**.

Jika file `.env` yang berisi *password database* atau *API key* itu sebelumnya **sudah sempat di-*push* ke GitHub atau GitLab**, maka salinannya masih tersimpan jelas di riwayat *commit* lama! Siapa pun yang punya akses ke repo tersebut masih bisa membuka *commit* sebelumnya dan melihat isinya.

Karena itu, jangan cuma berhenti setelah menghapus berkasnya dari Git:
- Segera cabut (*revoke*) dan ganti (*rotate*) semua password, token, dan kunci API yang pernah tercantum di dalam berkas tersebut.
- Anggap kredensial apa pun yang pernah menyentuh server *remote* sudah bocor, bahkan meskipun *commit*-nya sudah dihapus paksa.

## Seri tips Git

1. [Konfigurasi Git yang sebaiknya langsung kamu aktifkan](/posts/git-config-wajib/)
2. [10 alias Git yang saya pakai setiap hari](/posts/git-alias-harian/)
3. [Commit sebagian perubahan dengan git add -p](/posts/git-add-patch/)
4. [Kerja di banyak branch sekaligus dengan git worktree](/posts/git-worktree/)
5. [Identitas Git beda untuk kantor dan pribadi dengan includeIf](/posts/git-identitas-kantor-pribadi/)
6. [Salah commit atau salah edit? Cara membatalkan perubahan di Git](/posts/git-membatalkan-perubahan/)
7. [Berhenti pakai git checkout untuk semuanya: pakai switch dan restore](/posts/git-switch-restore/)
8. **Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git**
9. [Titip kodingan setengah jadi dengan git stash](/posts/git-stash-pemula/)
10. [Penyelamat terakhir waktu salah reset atau hapus branch: git reflog](/posts/git-reflog-penyelamat/)
11. [Cara membaca dan menyelesaikan merge conflict tanpa panik](/posts/git-merge-conflict/)
12. [Beda git fetch dan git pull: intip perubahan server sebelum digabung](/posts/git-fetch-vs-pull/)
13. [Rapikan commit terakhir sebelum push dengan git commit --amend](/posts/git-commit-amend/)
