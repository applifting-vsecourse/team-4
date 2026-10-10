---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F51] Bezpečné přijetí registrací při špičkové zátěži'
labels: 'epic: technický základ, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci spolehlivě odeslat přihlášku i při náporu v okamžiku otevření, aby se moje přihláška neztratila.

## Kontext

Feature [F51 — Špičková zátěž při otevření registrací](coverage.md), epic Technický základ. Zajišťuje spolehlivý provoz a ochranu uložených dat.

## Akceptační kritéria

- [ ] Při dohodnuté souběžné zátěži na stagingu každé úspěšně potvrzené odeslání odpovídá jedné dohledatelné uložené přihlášce.
- [ ] Žádný účastník nevidí potvrzení přijetí, pokud přihláška nebyla uložená; případné omezení je srozumitelně zobrazené.
- [ ] Pokud se tým rozhodne použít řízenou frontu, čekající uživatel vidí svůj čekající stav a další postup, nikoli falešné potvrzení účasti.
- [ ] Po náporu zůstává přehled uložených přihlášek dostupný a potvrzené osoby nepřekračují využitelnou kapacitu.
- [ ] Bez odeslání nevzniká přihláška ani pořadí; fronta se nezobrazuje jako naplněná bez čekajících požadavků.
- [ ] Technické ověření: Spustit reprodukovatelný zátěžový test v čase otevření a porovnat potvrzené odpovědi s uloženými záznamy. Archivovat profil zátěže, odezvy, chyby a kontrolu kapacity.

## Mimo rozsah

- Zvýšení fyzické kapacity ubytování; řízená fronta je volitelný mechanismus.
- Návaznosti: [F02](f02-casove-rizene-otevreni-a-uzavreni-registrace.md), [F05](f05-prijeti-prihlasky-a-poradi-podle-serveroveho-casu.md), [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 55.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F51 z feature breakdownu akc.io.
