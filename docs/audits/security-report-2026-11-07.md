# Security report — závislosti akc.io (7. listopadu 2026)

Kontrola knihoven a závislostí obou aplikací (#166). Zdroj nálezů: `pnpm audit` nad celým monorepem, tj. databáze GitHub Advisory.

## Výsledek

|            | Před aktualizací | Po aktualizaci |
| ---------- | ---------------: | -------------: |
| Kritické   |               11 |              0 |
| Vysoké     |               56 |              0 |
| Střední    |               65 |              0 |
| Nízké      |               15 |              1 |
| **Celkem** |          **147** |          **1** |

## Co bylo zranitelné a jak je to opravené

| Oblast            | Balíček                                                                                                                                    | Verze                                         | Riziko                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Přihlašování      | `better-auth`                                                                                                                              | 1.7.1 → 1.7.18                                | přihlášení za jiného uživatele přes OAuth (kritické), obejití rate limitu                                      |
| E-maily           | `nodemailer`                                                                                                                               | 9.0.5 → 10.4.0                                | chybné parsování adres (doručení na cizí doménu), DoS, únik SMTP údajů mezi transporty                         |
| HTTP server       | `express` a jeho `body-parser`, `qs`, `proxy-addr`                                                                                         | 2.3.0 → 2.4.0, 6.15.3 → 6.17.1, 2.0.7 → 2.0.8 | podvržení IP klienta za proxy (kritické), DoS při parsování požadavku                                          |
| Nahrávání fotek   | `multer` (přes `@nestjs/platform-express`)                                                                                                 | 2.2.0 → 2.5.0                                 | DoS a únik souborových deskriptorů při nahrávání, obejití limitu velikosti                                     |
| Frontend          | `vite`, `zod`, `seroval` (router)                                                                                                          | 8.2.1 → 8.3.6, 4.4.3 → 4.6.7, 1.6.2 → 1.7.10  | čtení souborů mimo projekt dev serverem, vyčerpání paměti při validaci, vložení kódu a DoS při (de)serializaci |
| Nepoužívané       | `next` a s ním `sharp`, `postcss` (volitelná závislost `better-auth`)                                                                      | odstraněno                                    | 46 nálezů v Next.js a jeho závislostech, které akc.io vůbec nepoužívá                                          |
| Vývojové nástroje | Jest, Nest CLI, ESLint, Vitest, jsdom/`undici`, `handlebars`, `js-yaml`, `glob`, `minimatch`, `brace-expansion`, `shell-quote`, `fast-uri` | na opravené verze                             | běží jen při vývoji a v CI, nikoli v produkci                                                                  |

Přímé závislosti jsou aktualizované v rámci povolených rozsahů. `nodemailer` přešel na novou hlavní verzi; akc.io z něj používá jen `createTransport` a `sendMail`. Opravené verze tranzitivních balíčků, které jejich rodiče zatím nevyžadují, vynucuje `overrides` v `pnpm-workspace.yaml`. Každý záznam lze odstranit, jakmile rodičovský balíček opravenou verzi vyžaduje sám.

Ověření: lint, typová kontrola, unit testy, databázové testy, testy Storybooku a end-to-end testy prošly s aktualizovanými závislostmi.

## Zbývající nález

| Závažnost | Balíček                                                              | Proč zůstává                                                                                                                                 |
| --------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Nízká     | `deepmerge` 4.3.1 v `@nestjs/cli` → `fork-ts-checker-webpack-plugin` | Opravená verze neexistuje. Jde o vývojový nástroj pro build backendu, který nezpracovává data uživatelů. Odstraní ho až nová verze Nest CLI. |

## Průběžné sledování zranitelností

- **GitHub Dependabot alerts** jsou zapnuté pro repozitář a hlásí nové advisory k závislostem v záložce _Security_.
- **Workflow `Security audit`** (`.github/workflows/security-audit.yml`) spouští `pnpm audit --audit-level=high`:
  - u každého PR, který mění závislosti, takže nová zranitelná verze neprojde bez povšimnutí;
  - každé pondělí v 6:00 UTC nad celým stromem, protože nové advisory vznikají i bez změny v kódu;
  - ručně přes _Run workflow_.
- Vysoký nebo kritický nález workflow shodí. Opravu tým řeší jako běžný PR; nízké a střední nálezy zůstávají viditelné v alertech a v logu workflow.
