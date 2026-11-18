---
title: "Push Gagal karena File > 100 MB atau Rahasia (.env / API Key) Bocor"
date: 2026-11-18T11:05:00+07:00
categories:
  - Git
  - Security
tags:
  - git
  - github
  - gitignore
  - security
  - troubleshooting
  - pemula
description: "Cara mengatasi penolakan git push GH001 Large files detected (> 100 MB) atau GitHub Push Protection saat tidak sengaja meng-commit .env, API key, atau node_modules, termasuk peringatan keamanan jika rahasia telanjur naik."
---

Ketika menjalankan `git push`, tiba-tiba GitHub menolak keras dengan salah satu dari dua pesan ini:

1. **`remote: error: File assets/video.zip is 145.00 MB; this exceeds GitHub's file size limit of 100.00 MB`** (`GH001: Large files detected`)
2. **`remote: error: GH013: Repository rule violations found ... Push cannot contain secrets`** (karena **GitHub Push Protection** mendeteksi API Key OpenAI, AWS, token GitHub, atau secret di dalam commit-mu!)

Kesalahan terbesar pemula saat melihat error ini adalah **sekadar menghapus file tersebut di laptop (`rm assets/video.zip`), lalu membuat commit baru** dan berharap masalahnya beres. Ternyata saat `git push`, GitHub **tetap menolak**!

---

## Mengapa Menghapus File di Commit Baru Tidak Mempan?

Karena Git menyimpan **seluruh rekaman riwayat dari commit pertama sampai terakhir**. Walaupun di Commit #4 file `video.zip` (atau `.env`) sudah dihapus, salinan raksasa atau rahasianya **masih tersimpan utuh di dalam Commit #3**—dan `git push` mengirimkan seluruh rangkaian commit yang belum ada di server!

Jadi solusinya bergantung pada seberapa dalam file itu tertanam di riwayatmu.

---

## Situasi A: File Besar / Rahasia Baru Saja Masuk di **Commit Terakhir** (Belum Ter-push)

Jika `file-besar.zip` atau `.env` baru saja masuk di **1 commit terakhir** yang baru saja kamu buat:

```bash
# 1. Batalkan commit terakhir, TAPI pertahankan seluruh file tetap aman di folder laptop (--soft)
git reset --soft HEAD~1

# 2. Keluarkan file besar/rahasia dari daftar staging (file asli di laptop TIDAK terhapus)
git restore --staged assets/video.zip
git restore --staged .env

# 3. Daftarkan file/folder tersebut di .gitignore agar tidak ikut lagi selamanya
echo "assets/*.zip" >> .gitignore
echo ".env" >> .gitignore

# 4. Commit ulang secara bersih tanpa file bermasalah tersebut
git add .gitignore
git commit -m "Rapikan commit tanpa file besar dan .env"
git push
```

*(Kalau file bukan berukuran > 100 MB melainkan telanjur dilacak Git sebelum masuk `.gitignore`, baca juga [cara melepas berkas yang telanjur dilacak Git dengan `git rm --cached`](/posts/git-rm-cached-gitignore/).)*

---

## Situasi B: File Besar Sudah Tertimbun Beberapa Commit ke Belakang (Belum Pernah Push)

Bagaimana jika kamu sudah membuat 5 commit sejak meng-commit file `200 MB` atau `node_modules/`, lalu baru sadar ketika mencoba `git push`?

Untuk menghapus jejak satu file dari seluruh riwayat commit sebelumnya, alat resmi modern yang direkomendasikan proyek Git adalah **`git filter-repo`** (jauh lebih cepat dan aman dibandingkan perintah usang `git filter-branch`):

```bash
# Contoh di Ubuntu/Debian atau macOS Homebrew:
# sudo apt install git-filter-repo   atau   brew install git-filter-repo

# Hapus file tertentu dari SELURUH riwayat commit lokal
git filter-repo --path assets/video.zip --invert-paths
```

*(Sebagai pengaman, `git filter-repo` secara bawaan menolak berjalan di repo yang belum fresh-clone kecuali ditambah `--force`; selalu buat cadangan copy folder `.git` atau direktori proyekmu sebelum memodifikasi riwayat commit!)*

Setelah itu, pastikan path file besar tersebut langsung dimasukkan ke `.gitignore` (atau gunakan **Git LFS** bila memang wajib menyimpan aset biner besar bersama tim) baru lakukan `git push`.

---

## Situasi C: API Key / `.env` **Sudah Terlanjur Lolos Push ke GitHub!**

Ini bagian paling penting dan tidak boleh ditawar:

> **JIKA SEBUAH API KEY, PASSWORD DATABASE, ATAU PRIVATE KEY SUDAH PERNAH TER-PUSH KE GITHUB (TERUTAMA REPO PUBLIK)—ANGGAP RAHASIA ITU SUDAH DICURI DETIK ITU JUGA!**

Bot pemindai otomatis memantau commit publik GitHub dalam hitungan **detik**! Menghapus commit lewat force push **tidak** menjamin kunci tersebut belum sempat disalin oleh bot atau tersimpan di cache web.

**Urutan wajib yang harus kamu lakukan:**
1. **LANGKAH #1 (PALING UTAMA): SEGERA REVOKE / GANTI KUNCI TERSEBUT!** Masuk ke dashboard AWS/OpenAI/database/Stripe, cabut (*revoke/rotate*) API key yang bocor dan buat kunci baru!
2. **LANGKAH #2:** Baru keluarkan `.env` dari pelacakan Git, tambahkan `.env` ke `.gitignore`, dan bersihkan riwayat jika diperlukan.

---

## Checklist Singkat Sebelum Lanjut

- [x] Paham bahwa menghapus file besar/rahasia di commit baru tidak menghapusnya dari commit sebelumnya.
- [x] Jika masih di commit terakhir dan belum di-push: pakai `git reset --soft HEAD~1` + `git restore --staged` + `.gitignore`.
- [x] Jika rahasia pernah ter-push ke GitHub: **wajib langsung revoke/ganti kunci rahasia tersebut terlebih dahulu**!

Di **Bagian 7** (artikel penutup seri ini), kita akan membereskan masalah menyebalkan yang sering muncul ketika bekerja lintas Windows, macOS, dan server Linux: **`git status` mendadak merah semua padahal belum edit apa-apa (CRLF vs LF)**, **rename huruf besar/kecil file tidak terdeteksi**, dan error **`dubious ownership`**!

---

## Seri Troubleshooting Kendala Git untuk Pemula

1. [Bagian 1 — Git Push Ditolak (Rejected / Non-Fast-Forward & No Upstream Branch)](/posts/git-troubleshoot-push-rejected-non-fast-forward/)
2. [Bagian 2 — Terjebak di Detached HEAD: Cara Keluar & Menyelamatkan Commit](/posts/git-troubleshoot-detached-head/)
3. [Bagian 3 — Gagal Clone/Push GitHub (Password Dihapus, SSH Key, & Author Unknown)](/posts/git-troubleshoot-auth-ssh-https-github/)
4. [Bagian 4 — Error Saat Git Pull: Divergent Branches & Perubahan Lokal Tertimpa](/posts/git-troubleshoot-divergent-branches-pull/)
5. [Bagian 5 — Salah Commit di Branch Main atau Lupa Buat Branch Fitur](/posts/git-troubleshoot-salah-branch-salah-commit/)
6. **Bagian 6 — Push Gagal karena File > 100 MB atau Rahasia (.env / API Key) Bocor** *(sedang dibaca)*
7. [Bagian 7 — Masalah Lintas OS: CRLF vs LF, Huruf Besar/Kecil Nama File, & Dubious Ownership](/posts/git-troubleshoot-line-ending-case-filename/)

---

## Referensi

- [GitHub Docs: About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
- [GitHub Docs: Working with secret scanning and push protection](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/work-with-leak-prevention)
- [Git Official Docs: `git-reset`](https://git-scm.com/docs/git-reset)
