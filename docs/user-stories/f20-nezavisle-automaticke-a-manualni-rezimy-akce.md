---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F20] Nezávislé automatické a manuální režimy akce'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci nezávisle řídit automatické schvalování, náhradníky a návrh pokojů, abych mohl u každého procesu zvolit míru automatizace.

## Kontext

Feature [F20 — Nastavení automatických a manuálních režimů](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Nastavení akce obsahuje tři nezávislé přepínače pro schvalování přihlášek, správu náhradníků a návrh pokojů.
- [ ] Změna jednoho přepínače nemění zbývající dva a uložené nastavení je zachované po znovuotevření i oddělené od jiné akce.
- [ ] Při vypnuté automatizaci je odpovídající ruční postup nadále dostupný.
- [ ] Samotná změna režimu nepřepíše existující potvrzení, umístění ani uzamčená rozhodnutí.
- [ ] Ve všech kombinacích režimů zůstává povinná kontrola skutečně využitelné kapacity.
- [ ] U nové akce jsou výchozí režimy jasně zobrazené.

## Mimo rozsah

- Automatické upomínky, které mají vlastní nastavení.
- Návaznosti: [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md), [F14-1](f14-1-rucni-potvrzeni-ucasti-nebo-zarazeni-mezi-nahradniky.md), [F14-2](f14-2-rucni-umisteni-do-pokoje-a-ochrana-rozhodnuti-zamkem.md), [F16-1](f16-1-rucni-vyber-vhodnych-nahradniku-po-uvolneni-mista.md), [F16-2](f16-2-volitelne-automaticke-povysovani-nahradniku.md), [F19](f19-volitelny-navrh-pokoju-s-rucni-kontrolou.md), [F27](f27-konfigurace-upominek-pro-jednotlive-akce.md), [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 24.
- Wireframe: bude doplněn později.

## Zdroj

- Upřesnění zadání; feature F20 z feature breakdownu akc.io.
