---
title: "Membatalkan Request Fetch Lama di React dengan AbortController"
date: 2026-11-05T14:30:00+07:00
categories: ["Frontend"]
tags: ["frontend", "react", "typescript", "performance"]
description: "Cara mencegah data pencarian tertimpa oleh request lama yang datang terlambat saat pengguna mengetik cepat di React."
---

Bayangkan kamu membuat kotak pencarian (*search bar*) di React yang langsung mencari data ke server setiap kali pengguna mengetik huruf di dalam `useEffect`.

Saat pengguna mengetik cepat—misalnya mengetik kata `"buku"`—aplikasi mengirim permintaan (*request*) `fetch` berurutan untuk `"b"`, `"bu"`, `"buk"`, lalu `"buku"`. Masalahnya, koneksi internet tidak selalu menjawab sesuai urutan kirim!

Bisa saja permintaan `"buku"` (yang terbaru) selesai lebih cepat, tetapi permintaan `"bu"` (yang lama dan lambat) baru sampai dua detik kemudian dan langsung menimpa *state* hasil pencarian dengan daftar untuk `"bu"`. Di dunia pemrograman, masalah adu balapan seperti ini disebut *race condition*.

Solusinya adalah **`AbortController`**. Anggap saja `AbortController` sebagai "tombol batal jarak jauh" yang kita pasang ke `fetch`. Sebelum React menjalankan pencarian untuk ketikan terbaru (atau saat komponen ditutup), fungsi pembersih (*cleanup*) di `useEffect` akan menekan tombol batal itu sehingga browser langsung membatalkan *request* lama di tingkat jaringan.

## Contoh `useEffect` dengan pembersih `AbortController`

Berikut contoh *custom hook* `useSearchResults` dalam React dan TypeScript:

```tsx
import { useEffect, useState } from "react";

export function useSearchResults<T>(query: string) {
	const [data, setData] = useState<T[]>([]);

	useEffect(() => {
		// Jika kolom pencarian kosong, bersihkan hasil dan tidak perlu fetch
		if (!query.trim()) {
			setData([]);
			return;
		}

		// 1. Buat pengendali pembatalan baru untuk request ini
		const controller = new AbortController();

		// 2. Pasang signal dari controller ke opsi fetch
		fetch(`/api/search?q=${encodeURIComponent(query)}`, {
			signal: controller.signal,
		})
			.then((res) => res.json())
			.then((items: T[]) => setData(items))
			.catch((err: unknown) => {
				// 3. Abaikan error jika penyebabnya memang karena kita batalkan sendiri
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error(err);
			});

		// 4. Fungsi cleanup: berjalan saat query berubah lagi atau komponen ditutup
		return () => controller.abort();
	}, [query]);

	return data;
}
```

Mari lihat alur kerjanya langkah demi langkah:
1. Setiap kali `query` berubah, React menjalankan fungsi `cleanup` (`() => controller.abort()`) milik `useEffect` sebelumnya terlebih dulu.
2. `controller.abort()` membatalkan `fetch` lama yang belum selesai.
3. Setelah itu, `useEffect` yang baru membuat `AbortController` baru dan mengirim `fetch` dengan `query` paling mutakhir.
4. Ketika `fetch` dibatalkan oleh `abort()`, Promise akan melempar error bernama `AbortError`. Karena pembatalan ini disengaja, kita menangkap dan mengabaikannya agar tidak dianggap kegagalan jaringan sungguhan.

## Tiga hal penting yang wajib diingat

- **Selalu abaikan `err.name === "AbortError"` di blok `.catch()`:** Ketika pengguna mengetik cepat, request lama yang dibatalkan itu bukan error. Kalau tidak disaring, kamu bisa tidak sengaja memunculkan pesan *"Gagal memuat data"* atau memicu *error boundary* padahal aplikasinya baik-baik saja.
- **Gabungkan dengan jeda ketik (*debounce*) 150–250 ms:** `AbortController` mencegah data lama menimpa data baru, tetapi tanpa *debounce*, setiap satu ketukan huruf tetap membuka lalu langsung membatalkan koneksi jaringan. Menunggu sebentar (sekitar 150–250 milidetik) setelah pengguna berhenti mengetik akan membuat server dan koneksi internet jauh lebih hemat.
- **Tambahkan batas waktu tunggu (*timeout*) bila perlu:** Jika kamu ingin permintaan otomatis batal kalau server terlalu lama tidak merespons (misalnya lewat 5 detik), gunakan `signal: AbortSignal.timeout(5000)`. Untuk menggabungkan pembatalan React sekaligus batas waktu dalam satu `fetch`, pakai `AbortSignal.any([controller.signal, AbortSignal.timeout(5000)])`.
