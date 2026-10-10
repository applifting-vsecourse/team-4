---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F41] Oddělení dat organizací včetně přímých odkazů'
labels: 'epic: přístupy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci, aby data mé organizace byla oddělená od ostatních pořadatelů, aby se cizí organizace nedostala k našim údajům.

## Kontext

Feature [F41 — Izolace dat pořadatelů](coverage.md), epic Přístupy. Umožňuje spolupráci při zachování oprávnění a soukromí dat.

## Akceptační kritéria

- [ ] Po přihlášení do organizace A jsou v přehledech, detailech a exportech dostupné pouze záznamy v povoleném rozsahu organizace A.
- [ ] Při použití přímého odkazu na záznam organizace B se data nezobrazí ani při znalosti jeho identifikátoru.
- [ ] Nově vytvořená akce, přihláška či platba se zobrazí pouze v příslušné organizaci.
- [ ] Organizace bez vlastních dat ukáže prázdný stav; nenaplní jej daty jiné organizace.
- [ ] Technické ověření: Vedle browser scénářů musí kontrola izolace probíhat přímo v databázi a automatický test úniku musí ověřit čtení i zápis mezi dvěma organizacemi. Výsledek testu je dohledatelný v CI; samotné skrytí odkazu v UI nestačí.

## Mimo rozsah

- Agregované statistiky a benchmarky.
- Návaznosti: [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md), [F52](f52-kriticke-end-to-end-testy-jako-podminka-nasazeni.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 45.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F41 z feature breakdownu akc.io.
