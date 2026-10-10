---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F06-2] Soukromé označení pravděpodobných duplicit'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci vidět pravděpodobné duplicity přihlášek pouze v oprávněném přehledu, abych mohl rozhodnout o opravě bez zveřejnění osobních údajů.

## Kontext

Feature [F06 — Ochrana proti duplicitám a spamu](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Když systém podle pravidel detekce zjistí pravděpodobnou duplicitu, pořadatel vidí označení u odpovídající přihlášky.
- [ ] Účastník při odeslání neobdrží informaci, zda nebo s jakými údaji již daná osoba v systému existuje.
- [ ] Označení duplicity samo nezruší dříve uloženou přihlášku ani neuvolní její rezervovanou kapacitu.
- [ ] Pokud nejsou pravděpodobné duplicity, přehled je uvedený jako prázdný a běžné přihlášky zůstávají dostupné.

## Mimo rozsah

- Automatické slučování přihlášek; blokace odeslání.
- Návaznosti: [F10-1](f10-1-rucni-uprava-prihlasky-a-navaznych-stavu.md), [F10-2](f10-2-rucni-zruseni-prihlasky-a-uvolneni-kapacity.md), [F38](f38-detail-ucastnika-s-platbami-historii-a-internimi-poznamkami.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 10.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F06 z feature breakdownu akc.io.
