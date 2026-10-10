---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F55] Veřejný detail akce s odkazem na přihlášku'
labels: 'epic: katalog akcí, priority: MVP'
assignees: ''
---

## User story

Jako návštěvník chci vidět informace o akci a přejít na její přihlášku, abych mohl rozhodnout o účasti.

## Kontext

Feature [F55 — Veřejná stránka akce](coverage.md), epic Katalog akcí. Pomáhá návštěvníkům najít akci a přejít k registraci.

## Akceptační kritéria

- [ ] Bez přihlášení detail publikované akce ukáže popis, termíny, místo, cenu a podmínky účasti z dat správné akce.
- [ ] Odkaz na přihlášku vede do existujícího registračního toku této akce a respektuje jeho časová a věková omezení.
- [ ] Počet volných míst je veřejný pouze při povolení pořadatelem; jinak se nezobrazí ani v jiném veřejném pohledu.
- [ ] Nepublikovaný nebo nedostupný detail nezobrazí soukromá data a nabídne návrat do veřejného katalogu.
- [ ] Bez dostupného termínu detail vysvětlí, že nelze zvolit termín; nulová kapacita sama neblokuje přijetí přihlášky mezi náhradníky.

## Mimo rozsah

- Nový registrační tok a povinné veřejné zobrazení kapacity.
- Návaznosti: [F02](f02-casove-rizene-otevreni-a-uzavreni-registrace.md), [F03](f03-vyplneni-prihlasky-na-mobilu.md), [F05](f05-prijeti-prihlasky-a-poradi-podle-serveroveho-casu.md), [F17](f17-obsazenost-a-vyuzitelna-kapacita-po-terminech.md), [F54-1](f54-1-publikovani-akce-do-verejneho-katalogu.md), [F54-2](f54-2-verejny-vypis-akci-s-filtry.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 59.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F55 z feature breakdownu akc.io.
