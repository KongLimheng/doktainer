# SSH Service Modules

Folder ini adalah implementasi modular untuk domain SSH service.

Status saat ini:

- Implementasi publik sudah dipindahkan dari file lama ke modul-modul di folder ini.
- `../ssh.service.ts` sekarang berfungsi sebagai backward-compatibility barrel yang me-re-export API publik dari folder ini.
- Backup implementasi monolitik lama disimpan di `../backup/ssh.service.ts` sebagai referensi migrasi.

Tujuan:

- Memisahkan domain logic agar mudah dibaca, diuji, dan di-maintain.
- Menjaga surface API publik tetap kompatibel selama callsite lama belum dimigrasikan.
- Menyediakan pola yang jelas untuk refactor lanjutan.

## Mapping file → domain

- `connection.ts`: pooling & lifecycle koneksi, test koneksi
- `commands.ts`: eksekusi command (strict / streaming)
- `metrics.ts`: pengambilan system metrics + helper format
- `platform.ts`: deteksi distro/package manager + status Docker runtime
- `server-config.ts`: snapshot konfigurasi server, service list, disk mount, reboot/reset/restart
- `web-stack.ts`: inspeksi capability web server & manage komponen (install/upgrade/remove)
- `docker-engine.ts`: install/uninstall/reinstall engine + prune
- `docker-networks.ts`: list/inspect/create/remove network
- `docker-containers.ts`: list container, logs/action/inspect/stats/top + file ops + run container
- `firewall.ts`: status & rule UFW/firewall
- `fail2ban.ts`: status/enable/disable/install/unban Fail2ban
- `domains.ts`: discovery domain
- `ssl.ts`: list/resolve/issue/renew/delete SSL certificate

## Struktur layer

- `index.ts`: public barrel untuk modul SSH publik.
- `internal/*`: helper privat lintas-domain, tidak diexport lewat `index.ts`.
- domain file (`connection.ts`, `docker-containers.ts`, dst): hanya berisi API bisnis yang memang ingin dipakai dari luar.

Rule of thumb:

- Kalau helper hanya dipakai oleh satu domain, simpan lokal di file domain tersebut.
- Kalau helper dipakai lintas domain tapi bukan bagian dari API bisnis, simpan di `internal/`.
- Hanya export dari `index.ts` untuk API yang memang boleh dipakai callsite luar.
- Hindari domain file import dari `index.ts`; import langsung dari file domain/internal yang dibutuhkan untuk mengurangi risiko circular dependency.

## Pattern yang dipakai

- `connection.ts` adalah fondasi koneksi.
- `commands.ts` berada di atas `connection.ts` sebagai abstraction untuk eksekusi command.
- Modul domain lain bergantung pada `commands.ts`, `platform.ts`, atau helper `internal/*` sesuai kebutuhan.
- `internal/*` boleh dipakai oleh beberapa domain, tetapi tidak menjadi bagian dari kontrak publik service.

Pattern ini sengaja menjaga dependency graph tetap satu arah:

- `connection` -> dipakai oleh `commands`
- `commands`/`platform`/`internal` -> dipakai oleh domain modules
- `index` -> hanya re-export public modules

## Checklist maintainability

Saat menambah modul baru, usahakan mengikuti checklist ini:

1. Tentukan dulu apakah logic tersebut domain publik atau helper internal.
2. Simpan type/interface sedekat mungkin dengan domain yang memakainya.
3. Export hanya API yang memang dibutuhkan callsite luar.
4. Jangan import balik dari barrel `index.ts` ke dalam modul domain.
5. Jika file domain mulai terlalu besar, pecah lagi berdasarkan subdomain perilaku, bukan berdasarkan jenis syntax.

Kandidat split lanjutan yang wajar bila file terus membesar:

- `docker-containers.ts`: bisa dipisah menjadi inventory, runtime actions, dan file operations.
- `web-stack.ts`: bisa dipisah menjadi detection dan component management.
- `ssl.ts`: bisa dipisah menjadi discovery/resolution dan issue/renew/delete flow.

## Langkah refactor berikutnya (opsional)

Kalau sudah siap memecah implementasi, step aman biasanya:

1. Ubah callsite di routes/services lain secara bertahap agar import dari domain file yang relevan atau dari `services/ssh-services`.
2. Pertahankan `ssh.service.ts` sebagai compatibility barrel selama migration window masih dibutuhkan.
3. Jaga agar helper baru masuk ke `internal/` bila bukan bagian dari kontrak publik.
4. Review file domain yang masih besar, lalu split berdasarkan subdomain logic saat ada perubahan besar berikutnya.
