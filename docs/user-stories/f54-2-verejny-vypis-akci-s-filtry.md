---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F54-2] Veřejný výpis akcí s filtry'
labels: 'epic: katalog akcí, priority: MVP'
assignees: ''
---

## User story

Jako návštěvník chci prohlížet veřejné akce a filtrovat termín, místo a věkovou skupinu, abych našel vhodnou akci.

## Kontext

Feature [F54 — Veřejný výpis akcí](coverage.md), epic Katalog akcí. Pomáhá návštěvníkům najít akci a přejít k registraci.

## Akceptační kritéria

- [ ] Bez přihlášení návštěvník v katalogu vidí pouze veřejně publikované akce.
- [ ] Po nastavení termínu, místa či věkové skupiny výpis zobrazí pouze odpovídající publikované akce; kombinace filtrů zohlední všechny aktivní filtry.
- [ ] Po vymazání filtrů se zobrazí celý veřejný výpis a kliknutí na akci otevře její správný veřejný detail.
- [ ] Pokud filtrům nic neodpovídá, katalog zobrazí nulový výsledek a možnost vymazat filtry; bez publikovaných akcí zobrazí obecný prázdný stav.

## Mimo rozsah

- Placené pořadí, hodnocení, doporučování a pravidla publikace.
- Návaznosti: [F55](f55-verejny-detail-akce-s-odkazem-na-prihlasku.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 58.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F54 z feature breakdownu akc.io.
