---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F37-1] Filtrování seznamu účastníků'
labels: 'epic: přehledy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci filtrovat účastníky podle termínu a stavu platby, abych rychle našel potřebnou skupinu osob.

## Kontext

Feature [F37 — Seznam účastníků s filtry a exportem](coverage.md), epic Přehledy. Zpřístupňuje aktuální údaje pro účastníky a rozhodování pořadatele.

## Akceptační kritéria

- [ ] Seznam obsahuje účastníky dostupné podle oprávnění a viditelné ovladače filtrů termínu a stavu platby.
- [ ] Po použití jednoho nebo kombinace filtrů jsou vidět pouze osoby splňující všechny aktivní filtry.
- [ ] Po vymazání filtrů se vrátí celý oprávněný seznam a otevření řádku vede na správný detail účastníka.
- [ ] Při nulových výsledcích seznam vysvětlí, že filtrům nikdo neodpovídá, a umožní filtry vymazat; bez účastníků uvede, že nejsou přihlášky.

## Mimo rozsah

- CSV export a nové údaje přihlášek.
- Návaznosti: [F38](f38-detail-ucastnika-s-platbami-historii-a-internimi-poznamkami.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 41.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F37 z feature breakdownu akc.io.
