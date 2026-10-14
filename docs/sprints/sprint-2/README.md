# Sprint 2 — návrh backlogu

Připraveno 14. 10. 2026 pro týmovou kontrolu a publikaci v repozitáři. Produktové stories S2-01 až S2-15 zůstávají návrhy v dokumentaci; technické issues #74–#79 jsou publikované a přiřazené do Sprintu 2 se stavem Sprint Backlog. Původní stories a jejich importní manifest nejsou změněné.

## Cíl

Funkční průchod přihláška → ubytovací kapacita a potvrzení účasti → evidence platby na stagingu. Ubytování v tomto sprintu znamená evidenci pokojů a lůžek a rezervaci kapacity potvrzenou účastí; konkrétní přiřazení osoby do pokoje je mimo rozsah tohoto sprintu.

## Zadání PO

Zdroj: text „kemp.io · definice MVP · říjen 2026“ dodaný PM v konverzaci. Toto je přepis požadavků, nikoli samostatně ověřený dokument PO.

### Návštěvník

1. Na landing page produktu si přečte, co systém umí, a proklikne se na přihlášení.

### Organizátor

1. Přihlásí se ke své organizaci a vidí jen její akce a přihlášky.
2. Založí akci s více termíny a cenou za termín a rozešle přímý odkaz na přihlášku.
3. Zadá ubytování, tedy pokoje a lůžka. Kapacita termínu se počítá z nich, ne z jednoho čísla „volná místa“.
4. Vidí obsazenost po termínech a seznam přihlášek s filtrem podle termínu, stavu a placení.
5. Potvrzuje účast podle volné kapacity ubytování. Ručně, nebo automaticky, podle volby týmu.
6. Zapíše přijatou platbu a vidí, kdo kolik dluží.

### Účastník

1. Přes odkaz od organizátora vyplní pevný přihlašovací formulář, i na mobilu.
2. Vybere jeden nebo víc termínů a hned vidí cenu.
3. Přihláška se uloží vždy, i když je plno. Účastník je pak potvrzený, nebo náhradník.
4. Po odeslání vidí svůj stav a kolik a kam zaplatit, a dostane potvrzovací e-mail.

„Uloží se vždy“ znamená platnou přihlášku bez odmítnutí kvůli kapacitě; neznamená ignorovat validaci či předstírat úspěch při chybě databáze.

## Rozhodnutí PM ze 14. 10. 2026

- Pouze dospělý účastník; jméno, příjmení, e-mail, telefon, výběr termínů. Nezletilí a zástupci zůstávají v původním backlogu.
- Automatické potvrzení samostatně pro každý vybraný termín. Při plnu náhradník; lze kombinovat oba stavy v jedné přihlášce.
- Kapacita podle dostupných lůžek po termínech, bez pravidel věku, pohlaví a skupin.
- Náhradník kapacitu nespotřebuje a za nepotvrzený termín neplatí. Povyšování náhradníků mimo sprint.
- Cena výběru je součet vybraných termínů; dluh vychází pouze z potvrzených termínů po odečtení přijatých plateb.
- CZK, účet u akce, unikátní VS přihlášky, bez QR.
- Organizátor ručně zapisuje částku a datum přijaté platby. Platby jsou společné pro přihlášku.
- Jedna splatnost celé přihlášky: okamžik automatického potvrzení plus počet dní nastavený organizátorem u akce. Žádné rozdělování plateb mezi termíny.
- Organizátor se sám zaregistruje, může založit více vlastních organizací a přepínat mezi nimi.
- Účastník má aktuální přehled a opakovaný přístup přes magic link na svůj e-mail, bez hesla.
- Potvrzovací e-mail po uložení: termíny, stavy, cena/částka k úhradě a platební instrukce. Nejde pouze o zprávu na obrazovce.

## Další uzavřená rozhodnutí PM

- Značka aplikace je akc.io; kemp.io zachováme pouze v původní citaci PO.
- Akce: povinný název, popis a místo. Termín: označení, začátek, konec a cena v CZK.
- Akce začíná jako koncept. Organizátor ručně otevře a zavře přihlašování. Otevření vyžaduje doplněnou akci, termín, účet a počet dní splatnosti. Bez pokojů lze přijímat náhradníky.
- Od prvního otevření jsou termíny a ceny zamčené, i po pozdějším zavření. Účet a výchozí splatnost lze měnit pro nové přihlášky; existující instrukce se nemění.
- Podmínky účasti a souhlasy mimo tento sprint; původní #10 zachované pro později.
- Ubytování je samostatné pro každou akci; termíny jedné akce se nepřekrývají.
- Ubytování lze upravit, pokud kapacita neklesne pod počet potvrzených. Nová lůžka nevyvolají povýšení existujících náhradníků, ale lze je využít pro nové přihlášky.
- Účast i vznik částky a jedné splatnosti jsou automatické. Ruční potvrzení pořadatelem a ruční nastavení platby jednotlivé přihlášky se neimplementují. Ruční je pouze evidence již přijatých plateb.
- Filtr termínu a účasti hodnotí tentýž termín; bez vybraného termínu stačí shoda u libovolného termínu přihlášky.
- Placení se filtruje za celou přihlášku: bez povinnosti / nezaplaceno / částečně zaplaceno / zaplaceno / přeplatek.
- Opravy, editace a mazání plateb mimo sprint.
- Stejný e-mail může mít obě role; účastnický magic link nepřihlásí organizátora do správy organizací.
- Magic link platí 15 minut, je jednorázový; účastnická relace 7 dní s možností odhlášení.

## Zbývající příprava týmu

Produktové otázky položené PM jsou uzavřené. Finální texty a aktualizované wireframy připraví UX/PM. Tech lead ověří autentizaci, navrhne datový model, ochranu proti dvojímu uložení, zabezpečení přístupů a e-mailovou službu. Jedna splatnost se počítá od okamžiku automatického potvrzení, nikoli jako individuální splatnosti termínů ani jako ručně zadané datum. Zobrazení musí jednoznačně uvádět časové pásmo Europe/Prague.

Všechny stories zůstávají NÁVRH bez READY: uzavření pravidel samo nenahrazuje UX pokrytí, technickou a QA kontrolu ani odhad kapacity týmu.

## Mapa pokrytí PO

| Požadavek                    | Sprint stories             |
| ---------------------------- | -------------------------- |
| Landing a přihlášení         | S2-01, S2-02, S2-13        |
| Organizace a izolace         | S2-02, S2-03               |
| Akce, termíny, cena a odkaz  | S2-04, S2-06               |
| Pokoje a lůžka               | S2-05                      |
| Obsazenost a filtry          | S2-10, S2-11               |
| Potvrzení podle kapacity     | S2-08                      |
| Zápis platby a dluh          | S2-09, S2-12               |
| Mobilní formulář a výběr     | S2-07                      |
| Přijetí při plnu             | S2-08                      |
| Výsledek, instrukce a e-mail | S2-09, S2-13, S2-14, S2-15 |

[Seznam 15 stories a původních issues](story-index.md) · [Technické úkoly a ověření](delivery.md)

## Zachování původního backlogu

Původní stories, feature codes, širší akceptační kritéria a odkazy zůstávají zachované. Nové stories používají samostatná ID S2-xx a nejsou součástí existujícího importu. Po schválení doplnit obousměrné odkazy a explicitní zbývající rozsah do původních issues. Neuzavírat původní issue pouze kvůli dokončení sprintového výřezu.

#4 vyžaduje vyjasnění odvozené kapacity a #43 doplnění filtru účasti. Při publikaci znovu načíst živý backlog a ověřit READY. Lokální starý import nepouštět proti upraveným issues bez synchronizace textů: mohl by změny přepsat.

## Demo

1. Nový organizátor založí účet a organizaci.
2. Připraví akci se dvěma termíny, cenami, pokoji, účtem a splatností.
3. Zkopíruje odkaz; dospělý účastník na mobilu vybere oba termíny a odešle formulář.
4. Jeden termín má místo, druhý je plný: přihláška je uložená s potvrzením a náhradnictvím, dluh vznikne pouze za potvrzený termín.
5. Přijde skutečný e-mail; účastník otevře svůj přehled a později si vyžádá nový magic link.
6. Organizátor vidí obsazenost a použije filtry; ručně zapíše částečnou a následně úplnou platbu. Účastník vidí stejné saldo.
7. Jiná organizace nezíská přístup k těmto datům; souběh na poslední místo nepřečerpá kapacitu.

Toto je návrh rozsahu, ne potvrzení kapacity čtyřčlenného týmu. Odhady, vlastníky a pořadí musí tým schválit.

## Technické issues v GitHubu

- [S2-T1 — #74](https://github.com/applifting-vsecourse/team-4/issues/74)
- [S2-T2 — #75](https://github.com/applifting-vsecourse/team-4/issues/75)
- [S2-T3 — #76](https://github.com/applifting-vsecourse/team-4/issues/76)
- [S2-T4 — #77](https://github.com/applifting-vsecourse/team-4/issues/77)
- [S2-T5 — #78](https://github.com/applifting-vsecourse/team-4/issues/78)
- [S2-T6 — #79](https://github.com/applifting-vsecourse/team-4/issues/79)
