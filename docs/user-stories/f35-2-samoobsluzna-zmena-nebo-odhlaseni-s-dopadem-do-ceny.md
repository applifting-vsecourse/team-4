---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F35-2] Samoobslužná změna nebo odhlášení s dopadem do ceny'
labels: 'epic: přehledy, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci v povoleném období změnit přihlášku nebo se odhlásit a předem vidět dopad do ceny, abych mohl rozhodnout o změně se znalostí následků.

## Kontext

Feature [F35 — Samoobslužná správa přihlášky](coverage.md), epic Přehledy. Zpřístupňuje aktuální údaje pro účastníky a rozhodování pořadatele.

## Akceptační kritéria

- [ ] V povoleném období účastník může upravit povolené údaje či termín a před uložením vidí výslednou cenu a její změnu.
- [ ] Při odhlášení před potvrzením vidí příslušný storno dopad podle potvrzené verze podmínek.
- [ ] Po úspěšném potvrzení je změna viditelná u účastníka i pořadatele a aktualizují se příslušné kapacitní a platební návaznosti.
- [ ] Změna, kterou nelze bezpečně provést podle kapacitních pravidel, se neuloží a uživatel vidí důvod; zamčené pole nelze změnit.
- [ ] Při chybě uložení se nezobrazí úspěšná změna a původní přihláška zůstane zachovaná.
- [ ] Bez vlastní dostupné přihlášky není nabídnutá operace změny; mimo období je vysvětlené omezení.

## Mimo rozsah

- Editace zamčených polí a automatické refundace.
- Návaznosti: [F10-1](f10-1-rucni-uprava-prihlasky-a-navaznych-stavu.md), [F10-2](f10-2-rucni-zruseni-prihlasky-a-uvolneni-kapacity.md), [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md), [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md), [F29](f29-vypocet-a-evidence-poplatku-pri-rucnim-stornu.md), [F31](f31-odlozena-evidence-vraceni-penez-mimo-aplikaci.md), [F39](f39-nemenna-historie-zmen.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 39.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F35 z feature breakdownu akc.io.
