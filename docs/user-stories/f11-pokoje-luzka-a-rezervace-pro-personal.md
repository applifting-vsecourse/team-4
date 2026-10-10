---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F11] Pokoje, lůžka a rezervace pro personál'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci evidovat ubytovací jednotky po termínech včetně míst pro personál, aby kapacita odpovídala skutečně použitelným pokojům.

## Kontext

Feature [F11 — Ubytovací kapacita a jednotky](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Po přidání pokoje s počtem lůžek a dostupností v termínech jej pořadatel vidí v přehledu ubytovacích jednotek.
- [ ] Když pořadatel rezervuje lůžka pro personál, přehled termínu rozliší tuto rezervaci od kapacity dostupné ostatním osobám.
- [ ] Pokoje se stejným celkovým součtem lůžek zůstávají samostatnými jednotkami; přehled nepřevádí model pouze na jeden součet.
- [ ] Záporný počet lůžek nebo rezervace vyšší než počet lůžek jednotky se neuloží a pořadatel vidí chybu.
- [ ] Bez pokojů přehled nabídne přidání jednotky a neprezentuje neevidovaná lůžka jako dostupnou kapacitu.

## Mimo rozsah

- Automatické schvalování účasti a přidělování pokojů.
- Návaznosti: [F12](f12-zapinani-pravidel-ubytovani-a-priorit-pro-akci.md), [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md), [F17](f17-obsazenost-a-vyuzitelna-kapacita-po-terminech.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 15.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F11 z feature breakdownu akc.io.
