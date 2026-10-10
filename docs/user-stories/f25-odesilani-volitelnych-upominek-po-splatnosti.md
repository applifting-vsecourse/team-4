---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F25] Odesílání volitelných upomínek po splatnosti'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci posílat automatické upomínky jen podle zapnutého režimu a nastavených intervalů, abych mohl připomínat dluh bez automatického rušení účasti.

## Kontext

Feature [F25 — Automatické upomínky](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] Při zapnutých upomínkách, neuhrazeném dluhu a dosažení nastaveného intervalu po splatnosti se v testovací schránce zobrazí upomínka správné přihlášky.
- [ ] Odesílání dodrží nastavené intervaly a maximální počet upomínek; opakované vyhodnocení téhož intervalu nezpůsobí dvojí odeslání.
- [ ] Při vypnutých upomínkách ani po splatnosti nevznikne automatický e-mail účastníkovi; po vyrovnání dluhu se další dluhové upomínky neodesílají.
- [ ] Odeslání upomínky ani samotné neuhrazení nezruší přihlášku a neuvolní místo.
- [ ] Pokud akce nemá dluhy po splatnosti, automatické upomínky se neodesílají.

## Mimo rozsah

- Konfigurace upomínek a oznámení organizátorovi.
- Návaznosti: [F27](f27-konfigurace-upominek-pro-jednotlive-akce.md), [F30](f30-rucni-rozhodnuti-o-nezaplacene-prihlasce.md), [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md), [F46](f46-upozorneni-organizatorovi-na-dluh-po-splatnosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 29.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F25 z feature breakdownu akc.io.
