// Backward-compatibility facade.
//
// Business logic domain provisioning sudah dipindahkan ke folder
// `./domain-provisioning/*`. File asli sebelum modularisasi disimpan di
// `./backup/domain-provisioning.service.ts`. Semua export publik tetap
// dipertahankan lewat re-export di bawah ini.

export * from "./domain-provisioning";
