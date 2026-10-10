---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F50] Ověřená odesílací doména a doručitelnost zpráv'
labels: 'epic: technický základ, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci obdržet potvrzení přihlášky z ověřeného odesílatele, abych neztratil důležité instrukce kvůli chybnému nastavení e-mailů.

## Kontext

Feature [F50 — Doručitelnost e-mailů](coverage.md), epic Technický základ. Zajišťuje spolehlivý provoz a ochranu uložených dat.

## Akceptační kritéria

- [ ] Testovací transakční e-mail dorazí do určené schránky a obsahuje očekávaného odesílatele a správný obsah.
- [ ] V detailu autentizace testovací zprávy jsou výsledky SPF, DKIM a DMARC úspěšné pro použitou odesílací doménu.
- [ ] V konzoli odesílací služby je dohledatelný výsledek odeslání; selhání se nezobrazuje jako doručení.
- [ ] Bez ověřené domény je konfigurace uvedená jako nedokončená, nikoli připravená pro produkční odesílání.
- [ ] Technické ověření: Ověřit DNS záznamy SPF/DKIM/DMARC a autentizační hlavičky skutečně doručeného testovacího e-mailu.

## Mimo rozsah

- Garance zařazení zpráv do doručené pošty každého příjemce a marketingové kampaně.
- Návaznosti: [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 54.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F50 z feature breakdownu akc.io.
