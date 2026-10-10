---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F16-1] Ruční výběr vhodných náhradníků po uvolnění místa'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci po uvolnění kapacity vidět vhodné náhradníky pro ruční výběr, abych mohl doplnit akci bez automatického povyšování.

## Kontext

Feature [F16 — Volitelné automatické povyšování náhradníků](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Po skutečném uvolnění kapacity organizátor vidí náhradníky vhodné pro daný termín a aktivní ubytovací pravidla.
- [ ] Při vypnutém automatickém povyšování se nikdo nepovýší bez ručního rozhodnutí.
- [ ] Při ručním potvrzení vybraného náhradníka se znovu ověří kapacita a zobrazí potvrzená účast nebo důvod nemožnosti potvrzení.
- [ ] Ruční výběr zůstává dostupný i v akci se zapnutým automatickým povyšováním.
- [ ] Pokud pro uvolněné místo není vhodný náhradník, přehled to uvede a místo zůstane volné.

## Mimo rozsah

- Automatické povyšování a rušení přihlášek pro neuhrazení.
- Návaznosti: [F10-1](f10-1-rucni-uprava-prihlasky-a-navaznych-stavu.md), [F10-2](f10-2-rucni-zruseni-prihlasky-a-uvolneni-kapacity.md), [F14-1](f14-1-rucni-potvrzeni-ucasti-nebo-zarazeni-mezi-nahradniky.md), [F14-2](f14-2-rucni-umisteni-do-pokoje-a-ochrana-rozhodnuti-zamkem.md), [F20](f20-nezavisle-automaticke-a-manualni-rezimy-akce.md), [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 20.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F16 z feature breakdownu akc.io.
