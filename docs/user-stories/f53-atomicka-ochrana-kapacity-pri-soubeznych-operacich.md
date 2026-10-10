---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F53] Atomická ochrana kapacity při souběžných operacích'
labels: 'epic: technický základ, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci, aby současné přihlášky a ruční schvalování nemohly přečerpat kapacitu, aby potvrzení účasti zůstalo ubytovatelné.

## Kontext

Feature [F53 — Atomická rezervace kapacity při souběhu](coverage.md), epic Technický základ. Zajišťuje spolehlivý provoz a ochranu uložených dat.

## Akceptační kritéria

- [ ] Při dvou současných automatických potvrzeních soupeřících o poslední využitelné místo je potvrzená nejvýše jedna osoba a druhá zůstane v odpovídajícím nepotvrzeném stavu.
- [ ] Stejná ochrana funguje při dvou ručních schváleních i při souběhu ručního schválení a nové přihlášky.
- [ ] Výsledné potvrzení nepřekročí skutečně využitelnou kapacitu dostupných jednotek při aktivních pravidlech v žádné kombinaci automatických režimů.
- [ ] Neúspěšně potvrzená přihláška zůstává uložená a dotčený uživatel vidí aktuální výsledek místo neplatné garance místa.
- [ ] Při nulové využitelné kapacitě není potvrzená žádná další osoba; přijetí přihlášky do evidence zůstává možné.
- [ ] Technické ověření: Automatizovaně vyvolat skutečně souběžné databázové operace pro všechny uvedené kombinace a následně zkontrolovat stav přes UI i databázi. Atomická rezervace je technická podmínka.

## Mimo rozsah

- Zvýšení skutečné kapacity a odmítání uložení přihlášek kvůli plné kapacitě.
- Návaznosti: [F05](f05-prijeti-prihlasky-a-poradi-podle-serveroveho-casu.md), [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md), [F14-1](f14-1-rucni-potvrzeni-ucasti-nebo-zarazeni-mezi-nahradniky.md), [F14-2](f14-2-rucni-umisteni-do-pokoje-a-ochrana-rozhodnuti-zamkem.md), [F16-1](f16-1-rucni-vyber-vhodnych-nahradniku-po-uvolneni-mista.md), [F16-2](f16-2-volitelne-automaticke-povysovani-nahradniku.md), [F20](f20-nezavisle-automaticke-a-manualni-rezimy-akce.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 57.
- Wireframe: bude doplněn později.

## Zdroj

- Tým (technická nutnost); feature F53 z feature breakdownu akc.io.
