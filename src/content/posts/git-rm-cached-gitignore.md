---
title: "Kenapa .gitignore nggak mempan? Cara hapus berkas yang telanjur masuk Git"
date: 2026-11-11T15:00:00+07:00
categories: ["Git"]
tags: ["git", "tips", "pemula"]
description: "Menambahkan .env atau node_modules ke .gitignore sesudah telanjur di-commit nggak bikin Git berhenti melacaknya. Lepas dulu pakai git rm --cached."
---

Sudah nulis `.env` atau `dist/` di dalam `.gitignore`, tapi tiap kali berkas itu berubah masih saja nongol di `git status`? Penyebabnya sederhana: `.gitignore` hanya berlaku buat berkas yang belum pernah dikenal Git (*untracked*). Begitu sebuah berkas pernah masuk *commit* walaupun cuma sekali, Git mencatatnya sebagai berkas resmi (*tracked*) dan aturan di `.gitignore` langsung dicuekin untuk berkas itu.

## Solusinya: lepas dari catatan Git tanpa menghapus berkas aslinya

Jangan pakai `git rm <berkas>` biasa karena itu bakal ikut menghapus berkasnya dari laptopmu. Tambahkan opsi `--cached` supaya Git hanya menghapus berkas itu dari daftar lacakannya (*index*), sementara berkas aslinya di folder kerjamu tetap aman:

```bash
echo ".env" >> .gitignore
git rm --cached .env
git commit -m "chore: stop tracking .env"
```

Kalau yang telanjur masuk adalah satu folder penuh seperti `node_modules/` atau `.idea/`, tambahkan opsi `-r` (*recursive*):

```bash
echo "node_modules/" >> .gitignore
git rm -r --cached node_modules/
git commit -m "chore: remove node_modules from git tracking"
```

Sehabis *commit* di atas selesai, ubah isi `.env` sesuka hati lalu cek `git status`. Berkas itu tidak akan pernah ikut terdeteksi lagi.

## Cek aturan mana yang mengabaikan sebuah berkas

Kadang kebalikannya yang kejadian: kamu mau menambahkan berkas baru, tapi Git menolak karena dianggap masuk daftar abaikan, padahal kamu merasa tidak pernah menulisnya di `.gitignore`. Pakai `git check-ignore -v` untuk melacak baris aturan mana yang menahan berkas tersebut:

```bash
git check-ignore -v build/output.bin
```

Outputnya langsung menunjuk nama berkas konfigurasi beserta nomor barisnya:

```text
.gitignore:14:*.bin	build/output.bin
```

Kalau memang satu berkas `.bin` itu wajib masuk repo sebagai pengecualian, tambahkan tanda seru (`!`) di bawah aturan `*.bin` pada `.gitignore`:

```text
*.bin
!build/output.bin
```

## Peringatan penting soal berkas rahasia (`.env` dan kunci API)

Perintah `git rm --cached .env` hanya menghentikan pelacakan mulai dari *commit* terbaru ke depan. Kalau berkas `.env` berisi *password database* atau *API key* itu sebelumnya **sudah sempat di-*push* ke GitHub/GitLab**, isinya masih tersimpan jelas di riwayat *commit* lama dan siapa pun yang punya akses ke repo bisa membukanya.

Jangan cuma menghapus berkasnya dari Git. Segera cabut (*revoke*) dan ganti (*rotate*) semua kunci rahasia yang sempat bocor di dalam berkas tersebut. Anggap kunci yang pernah menyentuh *remote repository* sudah tidak aman lagi meskipun *commit*-nya dihapus paksa.

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
