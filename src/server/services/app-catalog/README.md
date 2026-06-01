# App Catalog Modules

Folder ini berisi modularisasi business logic untuk `app-catalog.service.ts`.

Struktur:

- `types.ts`: kontrak publik dan type cache.
- `catalog-options.ts`: opsi sumber katalog yang diexpose ke route.
- `cache.ts`: cache remote catalog dan helper result cache.
- `utils.ts`: helper generik untuk parsing value dan structured text.
- `normalize.ts`: normalisasi field template generik.
- `manifest-parsers.ts`: parser manifest CasaOS, Umbrel, dan generic manifest.
- `remote.ts`: normalisasi URL remote, deteksi ZIP response, dan fetch wrapper.
- `archive.ts`: scan archive ZIP dan ekstraksi katalog.
- `service.ts`: orchestration utama `getCatalogTemplates()`.
- `index.ts`: public barrel untuk API modul ini.

Pattern:

- Helper generik disimpan di file kecil sesuai concern.
- `service.ts` hanya mengorkestrasi alur, tidak memuat detail parsing besar.
- Hanya `index.ts` yang menjadi surface API publik modul baru.
- `../app-catalog.service.ts` dipertahankan sebagai compatibility facade untuk callsite lama.
