// Backward-compatibility facade.
//
// Business logic app catalog sudah dipindahkan ke folder `./app-catalog/*`.
// File asli sebelum modularisasi disimpan di `./backup/app-catalog.service.ts`.
// Semua export publik tetap dipertahankan lewat re-export di bawah ini.

export * from "./app-catalog";
