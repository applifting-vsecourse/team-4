---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F06-1] Ochrana formuláře proti spamu'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci bezpečně odeslat přihlášku přes formulář chráněný proti spamu, aby zneužití formuláře neomezovalo skutečné zájemce.

## Kontext

Feature [F06 — Ochrana proti duplicitám a spamu](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Běžné platné odeslání projde ochranným mechanismem a uživatel obdrží potvrzení přijetí.
- [ ] Když ochrana vyhodnotí odesílání jako spam, formulář zobrazí srozumitelné omezení a další povolený postup bez potvrzení přijetí neuložené přihlášky.
- [ ] Zpráva ochrany neprozradí, zda systém eviduje osobu se zadaným e-mailem ani její přihlášky.
- [ ] Ochrana funguje i před přijetím první přihlášky; veřejná hláška neodkazuje na existující data osob.

## Mimo rozsah

- Označování pravděpodobných duplicit a změny přihlášek.
- Návaznosti: [F06-2](f06-2-soukrome-oznaceni-pravdepodobnych-duplicit.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 10.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F06 z feature breakdownu akc.io.
