---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F48] Denní zálohy a ověřená obnova databáze'
labels: 'epic: technický základ, priority: MVP'
assignees: ''
---

## User story

Jako provozovatel chci mít denní zálohy databáze a pravidelně ověřovat jejich obnovu, abych mohl obnovit data po incidentu.

## Kontext

Feature [F48 — Automatické zálohy a test obnovy](coverage.md), epic Technický základ. Zajišťuje spolehlivý provoz a ochranu uložených dat.

## Akceptační kritéria

- [ ] V provozní konzoli je dohledatelná úspěšná záloha databáze pro každý den a stav neúspěšného zálohování není skrytý jako úspěch.
- [ ] Po testovací obnově do izolovaného prostředí lze v prohlížeči otevřít obnovenou akci, přihlášku a platbu odpovídající záloze.
- [ ] Výsledek testu obnovy uvádí použitou zálohu, čas provedení a úspěch nebo konkrétní selhání.
- [ ] Bez existující zálohy konzole jasně uvede, že obnova není možná, a nezobrazuje úspěšný test.
- [ ] Technické ověření: Denní frekvenci ověřit v konfiguraci a historii zálohovacího systému. Obnovu provést do oddělené databáze; zkontrolovat integritu dat a browser scénář.

## Mimo rozsah

- Obnova do živé produkce v rámci testu obnovitelnosti.
- Návaznosti: [F49](f49-oddelene-testovaci-a-produkcni-prostredi-s-ci-cd.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 52.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F48 z feature breakdownu akc.io.
