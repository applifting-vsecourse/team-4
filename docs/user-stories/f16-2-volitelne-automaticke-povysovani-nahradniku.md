---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F16-2] Volitelné automatické povyšování náhradníků'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci samostatně zapnout automatické povyšování podle nastavené politiky, aby se uvolněná místa mohla obsazovat bez jednotlivých ručních kroků.

## Kontext

Feature [F16 — Volitelné automatické povyšování náhradníků](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Při zapnutém automatickém režimu a uvolnění kapacity se vybere vhodný náhradník podle nastaveného pořadí, termínu a aktivních pravidel.
- [ ] Výsledek odpovídá nastavené politice přímého potvrzení nebo časově omezené nabídky a organizátor i dotčený účastník vidí odpovídající stav.
- [ ] Při vypnutém režimu stejná situace nevyvolá automatické povýšení a nabídne ruční výběr.
- [ ] Žádné automatické povýšení nepřekročí skutečně využitelnou kapacitu ani nepřepíše uzamčené rozhodnutí.
- [ ] Bez vhodného náhradníka systém ponechá kapacitu volnou a v přehledu uvede, že není koho povýšit.

## Mimo rozsah

- Automatické rušení nezaplacených přihlášek a přiřazování konkrétních pokojů.
- Návaznosti: [F14-1](f14-1-rucni-potvrzeni-ucasti-nebo-zarazeni-mezi-nahradniky.md), [F14-2](f14-2-rucni-umisteni-do-pokoje-a-ochrana-rozhodnuti-zamkem.md), [F20](f20-nezavisle-automaticke-a-manualni-rezimy-akce.md), [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md), [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 20.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F16 z feature breakdownu akc.io.
