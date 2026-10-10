---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F04] Výběr více termínů a okamžitý přehled ceny'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci vybrat jeden nebo více termínů jedné akce a ihned vidět cenu, abych věděl, na které termíny se hlásím a kolik zaplatím.

## Kontext

Feature [F04 — Výběr termínu](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Když uživatel vybírá termíny, nabízí se pouze termíny právě otevřené akce a výběr je viditelně označený.
- [ ] Po každé změně výběru se ihned zobrazí cena odpovídající zvolené kombinaci a typu účastníka podle nastavených cenových pravidel.
- [ ] Když uživatel odešle platný výběr, detail uložené přihlášky obsahuje všechny vybrané termíny pod jednou akcí.
- [ ] Bez vybraného termínu nebo při nepovolené kombinaci nelze přihlášku odeslat a uživatel vidí důvod.
- [ ] Při nulovém výběru formulář vyzve k volbě termínu; akce bez dostupných termínů zobrazí informaci o nedostupnosti registrace.

## Mimo rozsah

- Vymyšlené slevy za více termínů; samostatná přihláška pro každou akci v jednom odeslání.
- Návaznosti: [F01-1](f01-1-vytvoreni-a-sprava-vice-akci.md), [F01-2](f01-2-terminy-akce-s-vlastni-cenou-a-kapacitou.md), [F08](f08-typ-ucastnika-s-odpovidajici-cenou-a-pravidly.md), [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 8.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F04 z feature breakdownu akc.io.
