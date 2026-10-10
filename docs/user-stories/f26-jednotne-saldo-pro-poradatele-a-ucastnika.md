---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F26] Jednotné saldo pro pořadatele a účastníka'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci vidět aktuální cenu, přijaté platby a dluh nebo přeplatek, abych znal přesný stav své úhrady.

## Kontext

Feature [F26 — Výpočet salda](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] Detail přihlášky zobrazí cenu, součet přijatých spárovaných plateb a saldo jako dluh, přeplatek nebo vyrovnanou úhradu.
- [ ] Při ceně 1 000 a úhradě 600 ve stejné měně se zobrazí dluh 400; při úhradě 1 200 přeplatek 200; při úhradě 1 000 vyrovnané saldo.
- [ ] Po změně platby nebo ceny se saldo aktualizuje a pořadatel i účastník vidí stejné částky pro stejnou přihlášku.
- [ ] Nespárovaná transakce neovlivní saldo konkrétní osoby, dokud k ní není přiřazená.
- [ ] Bez plateb je přijatá částka 0 a dluh odpovídá ceně; chybějící cena není nahrazená domnělou nulou.

## Mimo rozsah

- Splátkový plán a refundace.
- Návaznosti: [F04](f04-vyber-vice-terminu-a-okamzity-prehled-ceny.md), [F24](f24-parovani-podle-vs-a-rucni-reseni-nesparovanych-plateb.md), [F29](f29-vypocet-a-evidence-poplatku-pri-rucnim-stornu.md), [F34](f34-moje-platby-dluh-qr-a-historie.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 30.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F26 z feature breakdownu akc.io.
