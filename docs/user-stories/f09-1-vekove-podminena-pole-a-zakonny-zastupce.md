---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F09-1] Věkově podmíněná pole a zákonný zástupce'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako účastník nebo zákonný zástupce chci, aby formulář odpovídal věkové skupině přihlašované osoby, abych mohl doplnit správné povinné údaje.

## Kontext

Feature [F09 — Věková pravidla registrace](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Po zadání údajů určujících věkovou skupinu se zobrazí povinná pole odpovídající nastavenému pravidlu této skupiny.
- [ ] U nezletilého formulář vyžaduje zákonného zástupce a bez požadovaných údajů zobrazí chyby a přihlášku neodešle.
- [ ] Při změně věkových údajů se před odesláním znovu vyhodnotí povinná pole a uživatel vidí aktuální požadavky.
- [ ] Bez věkových údajů potřebných k zařazení formulář vyzve k jejich doplnění.

## Mimo rozsah

- Časová registrační okna a pravidla ubytování.
- Návaznosti: [F03](f03-vyplneni-prihlasky-na-mobilu.md), [F44-1](f44-1-evidence-zneni-a-casu-souhlasu-vcetne-zastupce.md), [F44-2](f44-2-odvolani-souhlasu-se-zachovanim-historie.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 13.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F09 z feature breakdownu akc.io.
