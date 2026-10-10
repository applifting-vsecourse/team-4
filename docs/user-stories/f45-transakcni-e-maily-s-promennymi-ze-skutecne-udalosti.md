---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F45] Transakční e-maily s proměnnými ze skutečné události'
labels: 'epic: připomínky, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci dostávat transakční e-maily s údaji své přihlášky, abych měl potvrzení a důležité změny dostupné i v e-mailu.

## Kontext

Feature [F45 — Transakční e-maily a šablony](coverage.md), epic Připomínky. Informuje o změnách a položkách vyžadujících řešení.

## Akceptační kritéria

- [ ] Při transakční události se v testovací schránce objeví e-mail odpovídající šablony se správnou akcí, termínem a přihláškou.
- [ ] Proměnné jsou nahrazené skutečnými hodnotami; příjemce nevidí zástupné značky ani data jiné osoby.
- [ ] Upomínka účastníkovi se odešle pouze při zapnutém režimu a podle nastavené politiky.
- [ ] Při chybě odeslání není komunikace uvedená jako úspěšně doručená; příslušný stav chyby je dohledatelný oprávněnou obsluhou.
- [ ] Bez spouštěcí události se neodešle žádný transakční e-mail; chybějící proměnná nevytvoří zprávu s cizím náhradním údajem.

## Mimo rozsah

- Marketingové kampaně a rozhodování o stavu účasti.
- Návaznosti: [F15](f15-prubezne-dostupny-stav-ucasti.md), [F25](f25-odesilani-volitelnych-upominek-po-splatnosti.md), [F43-1](f43-1-pozvani-clena-tymu-e-mailem.md), [F43-2](f43-2-okamzite-odebrani-pristupu-clena-tymu.md), [F46](f46-upozorneni-organizatorovi-na-dluh-po-splatnosti.md), [F50](f50-overena-odesilaci-domena-a-dorucitelnost-zprav.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 49.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F45 z feature breakdownu akc.io.
