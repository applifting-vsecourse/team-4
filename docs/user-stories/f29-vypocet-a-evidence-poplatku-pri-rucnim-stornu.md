---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F29] Výpočet a evidence poplatku při ručním stornu'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci před ručním stornem vidět poplatek z potvrzené verze podmínek, abych mohl správně vyřešit finanční dopad zrušení.

## Kontext

Feature [F29 — Výpočet storno poplatku](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] Před potvrzením ručního storna organizátor vidí vypočtenou částku a verzi odsouhlasených pravidel použitou k výpočtu.
- [ ] Pokud od přihlášení vznikla nová verze pravidel, výpočet stále vychází z verze potvrzené danou přihláškou.
- [ ] Po dokončení storna je poplatek evidovaný a promítnutý do příslušného salda.
- [ ] Dokončení výpočtu ani storna nespustí převod peněz zpět účastníkovi.
- [ ] Chybějí-li potvrzená pravidla potřebná k výpočtu, detail jasně uvede nemožnost výpočtu a nepředstírá hotový poplatek.

## Mimo rozsah

- Převod peněz zpět účastníkovi.
- Návaznosti: [F10-1](f10-1-rucni-uprava-prihlasky-a-navaznych-stavu.md), [F10-2](f10-2-rucni-zruseni-prihlasky-a-uvolneni-kapacity.md), [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md), [F28](f28-verzovana-konfigurace-storno-pravidel.md), [F31](f31-odlozena-evidence-vraceni-penez-mimo-aplikaci.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 33.
- Wireframe: bude doplněn později.

## Zdroj

- Upřesnění požadavků; feature F29 z feature breakdownu akc.io.
