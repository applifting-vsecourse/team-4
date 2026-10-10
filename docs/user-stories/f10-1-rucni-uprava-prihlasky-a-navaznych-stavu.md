---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F10-1] Ruční úprava přihlášky a návazných stavů'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci upravit přihlášku a vidět dopad změny do kapacity, plateb a komunikace, abych mohl opravit údaje bez nekonzistentních návazností.

## Kontext

Feature [F10 — Změny přihlášek a návazností](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Když oprávněný organizátor otevře přihlášku a uloží platnou změnu, po opětovném otevření vidí nové údaje.
- [ ] Po změně termínu či údajů ovlivňujících cenu nebo kapacitu se příslušné přehledy aktualizují podle aktivních pravidel; změna nemůže potvrdit neubytovatelnou kombinaci.
- [ ] Neplatná změna se neuloží a detail ukáže důvod; původní údaje a kapacitní stav zůstávají zachované.
- [ ] Provedená změna se objeví v historii s tím, kdo a kdy ji provedl, a komunikační stav odpovídá skutečnému výsledku.
- [ ] Pokud přihláška není dostupná, organizátor vidí nedostupný detail a možnost vrátit se do seznamu.

## Mimo rozsah

- Samoobslužná změna účastníkem, ruční umístění do pokoje a prodloužení splatnosti.
- Návaznosti: [F14-1](f14-1-rucni-potvrzeni-ucasti-nebo-zarazeni-mezi-nahradniky.md), [F14-2](f14-2-rucni-umisteni-do-pokoje-a-ochrana-rozhodnuti-zamkem.md), [F30](f30-rucni-rozhodnuti-o-nezaplacene-prihlasce.md), [F35-1](f35-1-nastaveni-obdobi-a-povolenych-samoobsluznych-zmen.md), [F35-2](f35-2-samoobsluzna-zmena-nebo-odhlaseni-s-dopadem-do-ceny.md), [F39](f39-nemenna-historie-zmen.md), [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 14.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F10 z feature breakdownu akc.io.
