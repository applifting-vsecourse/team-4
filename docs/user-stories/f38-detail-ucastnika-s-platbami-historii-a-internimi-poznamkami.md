---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F38] Detail účastníka s platbami, historií a interními poznámkami'
labels: 'epic: přehledy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci otevřít přihlášku, platby, historii a interní poznámky na jedné stránce, abych měl potřebný kontext pro řešení účastníka.

## Kontext

Feature [F38 — Detail účastníka](coverage.md), epic Přehledy. Zpřístupňuje aktuální údaje pro účastníky a rozhodování pořadatele.

## Akceptační kritéria

- [ ] Po otevření účastníka detail zobrazuje jeho přihlášku, vybrané termíny, platby a historii dostupnou podle oprávnění.
- [ ] Oprávněná role vidí interní poznámky; role bez tohoto oprávnění je nevidí ani po změně odkazu.
- [ ] Detail jednoznačně patří vybranému účastníkovi a hodnoty plateb odpovídají jeho saldu.
- [ ] Pokud záznam není dostupný, zobrazí se nedostupný detail bez údajů jiné osoby a cesta zpět do seznamu.
- [ ] Sekce bez plateb, změn nebo poznámek zobrazí vlastní prázdný stav; nechybějící sekce zůstávají čitelné.

## Mimo rozsah

- Nová pole přihlášky a zpřístupnění interních poznámek neoprávněným osobám.
- Návaznosti: [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md), [F37-1](f37-1-filtrovani-seznamu-ucastniku.md), [F37-2](f37-2-csv-export-opravneneho-seznamu-ucastniku.md), [F39](f39-nemenna-historie-zmen.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 42.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F38 z feature breakdownu akc.io.
