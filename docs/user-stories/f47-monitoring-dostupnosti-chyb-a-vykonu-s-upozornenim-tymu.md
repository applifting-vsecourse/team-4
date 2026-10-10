---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F47] Monitoring dostupnosti, chyb a výkonu s upozorněním týmu'
labels: 'epic: technický základ, priority: MVP'
assignees: ''
---

## User story

Jako provozovatel chci sledovat dostupnost, chyby a výkon a být upozorněn na výpadek, abych mohl reagovat na problém dříve, než zablokuje registrace.

## Kontext

Feature [F47 — Monitoring a upozornění na výpadek](coverage.md), epic Technický základ. Zajišťuje spolehlivý provoz a ochranu uložených dat.

## Akceptační kritéria

- [ ] V prohlížeči je oprávněnému týmu dostupný monitoring s rozlišenou dostupností, chybami a výkonem sledovaného prostředí.
- [ ] Při řízeném výpadku v testovacím prostředí monitoring ukáže výpadek a odpovědná osoba obdrží testovací upozornění ve schváleném kanálu.
- [ ] Po obnovení služby přehled zobrazí zotavení a zůstane dohledatelná předchozí událost.
- [ ] Bez historie měření monitoring uvede nedostatek dat, nikoli garantovanou dostupnost.
- [ ] Technické ověření: Řízený výpadek probíhá pouze na stagingu. V monitorovací konzoli otevřené v prohlížeči ověřit dostupnost, chybový signál, výkonový signál a doručení upozornění.

## Mimo rozsah

- Nové produktové obrazovky a opravy monitorovaných produktových funkcí.
- Návaznosti: [F49](f49-oddelene-testovaci-a-produkcni-prostredi-s-ci-cd.md), [F51](f51-bezpecne-prijeti-registraci-pri-spickove-zatezi.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 51.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F47 z feature breakdownu akc.io.
