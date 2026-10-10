---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F52] Kritické end-to-end testy jako podmínka nasazení'
labels: 'epic: technický základ, priority: MVP'
assignees: ''
---

## User story

Jako vývojář chci automaticky ověřovat kritické uživatelské toky v CI před nasazením, aby se známá chyba nedostala do produkce.

## Kontext

Feature [F52 — Automatizované testy kritických toků](coverage.md), epic Technický základ. Zajišťuje spolehlivý provoz a ochranu uložených dat.

## Akceptační kritéria

- [ ] V browser reportu CI jsou dohledatelné automatické scénáře přihlášení, vyhodnocení kapacity, změny přihlášky a párování plateb.
- [ ] Každý scénář ověřuje viditelný výsledek a stav souvisejícího záznamu, nikoli jen načtení stránky.
- [ ] Při řízeném selhání jednoho povinného scénáře CI ukáže neúspěch a nasazení neproběhne.
- [ ] Při úspěchu všech povinných scénářů je report dohledatelný u příslušné verze.
- [ ] Chybějící povinný test nebo nulový počet spuštěných scénářů není vyhodnocený jako splněná kontrola nasazení.
- [ ] Technické ověření: Testy musí běžet automaticky v CI s izolovanými testovacími daty. Prověřit skutečnou závislost deploy kroku na jejich úspěchu.

## Mimo rozsah

- Nové produktové funkce a nahrazování ověření pouze testem načtení stránky.
- Návaznosti: [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md), [F24](f24-parovani-podle-vs-a-rucni-reseni-nesparovanych-plateb.md), [F35-1](f35-1-nastaveni-obdobi-a-povolenych-samoobsluznych-zmen.md), [F35-2](f35-2-samoobsluzna-zmena-nebo-odhlaseni-s-dopadem-do-ceny.md), [F41](f41-oddeleni-dat-organizaci-vcetne-primych-odkazu.md), [F49](f49-oddelene-testovaci-a-produkcni-prostredi-s-ci-cd.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 56.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F52 z feature breakdownu akc.io.
