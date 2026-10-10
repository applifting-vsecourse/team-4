---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F49] Oddělené testovací a produkční prostředí s CI/CD'
labels: 'epic: technický základ, priority: MVP'
assignees: ''
---

## User story

Jako vývojář a provozovatel chci mít oddělený staging a produkci s automatickým nasazením, abych mohl ověřit změny před jejich vydáním.

## Kontext

Feature [F49 — Prostředí a automatické nasazení](coverage.md), epic Technický základ. Zajišťuje spolehlivý provoz a ochranu uložených dat.

## Akceptační kritéria

- [ ] Testovací a produkční aplikace mají samostatné adresy a změna testovacího záznamu se neobjeví v produkci.
- [ ] Po úspěšném schváleném CI/CD běhu lze v prohlížeči otevřít cílové prostředí s nasazenou verzí a v konzoli najít odpovídající běh.
- [ ] Neúspěšný povinný krok CI zastaví nasazení a v konzoli je vidět chyba; předchozí dostupná produkční verze není nahrazena neúspěšným buildem.
- [ ] Před prvním nasazením konzole uvádí, že prostředí nemá nasazenou verzi, nikoli úspěšné vydání.
- [ ] Technické ověření: V konfiguraci ověřit oddělené databáze, tajné hodnoty a cíle nasazení. CI/CD musí být skutečně spustitelné; prohlížečový přístup k aplikaci sám nedokazuje izolaci infrastruktury.

## Mimo rozsah

- Implementace produktových funkcí a automatické naplnění produkce testovacími daty.
- Návaznosti: [F47](f47-monitoring-dostupnosti-chyb-a-vykonu-s-upozornenim-tymu.md), [F48](f48-denni-zalohy-a-overena-obnova-databaze.md), [F52](f52-kriticke-end-to-end-testy-jako-podminka-nasazeni.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 53.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F49 z feature breakdownu akc.io.
