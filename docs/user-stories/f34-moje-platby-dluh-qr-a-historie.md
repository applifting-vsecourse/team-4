---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F34] Moje platby, dluh, QR a historie'
labels: 'epic: přehledy, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci vidět své saldo, platební QR a historii plateb, abych mohl zjistit, zda a kolik zbývá zaplatit.

## Kontext

Feature [F34 — Moje platby](coverage.md), epic Přehledy. Zpřístupňuje aktuální údaje pro účastníky a rozhodování pořadatele.

## Akceptační kritéria

- [ ] V platebním přehledu jsou pro vlastní přihlášku vidět cena, dluh či přeplatek a historie přijatých plateb.
- [ ] QR a textové instrukce odpovídají správné přihlášce a příslušné dlužné částce.
- [ ] Po spárování další platby se aktualizují historie a saldo na stejné hodnoty jako u pořadatele.
- [ ] Cizí přihlášku a její platby nelze zobrazit ani přes přímý odkaz.
- [ ] Bez plateb historie zobrazí prázdný stav a aktuální dluh; při nulovém dluhu je úhrada zřetelně vyrovnaná.

## Mimo rozsah

- Společné platební transakce více přihlášek, splátkový plán a refundace.
- Návaznosti: [F21](f21-platebni-instrukce-variabilni-symbol-a-qr-platba.md), [F22](f22-odlozeny-platebni-plan-se-zalohou-a-splatkami.md), [F24](f24-parovani-podle-vs-a-rucni-reseni-nesparovanych-plateb.md), [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md), [F31](f31-odlozena-evidence-vraceni-penez-mimo-aplikaci.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 38.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F34 z feature breakdownu akc.io.
