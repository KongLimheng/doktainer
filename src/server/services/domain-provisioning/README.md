# Domain Provisioning Modules

Folder ini berisi modularisasi business logic dari `domain-provisioning.service.ts`.

Struktur:

- `types.ts`: kontrak publik dan type internal utama.
- `shell.ts`: helper shell command dan privileged execution.
- `filesystem.ts`: helper baca/tulis/hapus file remote.
- `names.ts`: helper nama file dan identifier config.
- `container-upstream.ts`: resolusi port container dan upstream target.
- `nginx.ts`: provisioning dan cleanup config Nginx.
- `caddy.ts`: provisioning dan cleanup config Caddy.
- `traefik.ts`: provisioning dan cleanup config Traefik.
- `service.ts`: orchestration API publik untuk provisioning domain.
- `index.ts`: public barrel.

Pattern:

- Helper umum dipisah dari provider-specific logic.
- Setiap provider proxy punya file sendiri.
- `service.ts` hanya mengorkestrasi pemilihan provider.
- `../domain-provisioning.service.ts` dipertahankan sebagai compatibility facade.
