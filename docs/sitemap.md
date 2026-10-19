# Sitemapa akc.io

## Zdroj a platnost

[Schválená cílová struktura ve FigJamu](https://www.figma.com/board/OA9rJWigqEqyMFAuFYXJNk/Sitemapa?node-id=0-1). Textový přepis uzlů a vazeb ověřen 17. 10. 2026.

FigJam určuje cílovou strukturu, tento dokument je její textový přepis pro agenty. Rozsah implementace určují schválené stories a rozhodnutí příslušného sprintu. Přítomnost uzlu v mapě neznamená hotovou funkci ani požadavek implementovat ji v aktuální story. Strom neurčuje URL, podobu menu ani to, zda je uzel samostatná stránka, záložka nebo část pohledu.

## Cílová struktura

### Veřejná část

- [Landing page](https://www.figma.com/board/OA9rJWigqEqyMFAuFYXJNk/Sitemapa?node-id=30-3)
  - Moje přihlášky
    - Zadání e-mailu → účastnický magic link → vlastní přihlášky
  - Organizátor
    - Přihlášení e-mailem a heslem → vlastní organizace
    - Registrace organizátora (jméno, e-mail, heslo) → založení organizace
  - Ochrana osobních údajů
  - Podmínky použití
- [Katalog akcí (veřejné)](https://www.figma.com/board/OA9rJWigqEqyMFAuFYXJNk/Sitemapa?node-id=30-8)
  - Detail akce
    - Přihláška na akci

Veřejný přístup zpřístupňuje informace a přihlášku podle stavu akce, nikoli pořadatelská nebo účastnická soukromá data. Mapa propojuje přihlášku s účtem účastníka; konkrétní přístupový mechanismus stanoví story.

### Účet účastníka

[Účet účastníka](https://www.figma.com/board/OA9rJWigqEqyMFAuFYXJNk/Sitemapa?node-id=30-11) obsahuje pouze vlastní údaje ověřeného účastníka:

- Moje přihlášky
  - Detail přihlášky
    - Úprava / odhlášení
- Moje platby
  - Platba (QR)
- Souhlasy

Účastnický přístup nezpřístupňuje správu organizací, ani při shodném e-mailu organizátora.

### Organizace (pořadatel)

[Organizace](https://www.figma.com/board/OA9rJWigqEqyMFAuFYXJNk/Sitemapa?node-id=30-18) vymezuje data a oprávnění pro zvolenou organizaci:

- Seznam akcí
  - Nová akce
- Tým
  - Pozvání člena
- Role a oprávnění

Výběrem konkrétní akce se přechází do její správy. Tento přechod vychází ze sprintových stories; ve FigJamu jsou organizace a správa akce samostatné hlavní oblasti.

### Správa akce (pořadatel)

[Správa akce](https://www.figma.com/board/OA9rJWigqEqyMFAuFYXJNk/Sitemapa?node-id=30-24) pracuje s jednou akcí v oprávněné organizaci:

- Dashboard
- Nastavení akce
  - Termíny a kapacita
  - Ceny a typy účastníků
  - Otevření registrace
  - Podmínky a storno
  - Automatizace
  - Publikace
- Přihlášky
  - Seznam přihlášených
    - Detail účastníka
  - Ke schválení
  - Náhradníci
  - Možné duplicity
- Ubytování
  - Pokoje
  - Pravidla ubytování
  - Obsazenost
  - Rozdělení do pokojů
- Platby
  - Přehled plateb
    - Detail platby
  - Import výpisu
  - Párování
  - Nezaplacené
- Komunikace
  - Šablony e-mailů
  - Upomínky
  - Upozornění

Dashboard má v mapě přechody do Přihlášek, Ubytování a Plateb. „Detail účastníka“ je v této větvi pořadatelský pohled; účastnický „Detail přihlášky“ patří do jiné přístupové oblasti.

## Výřez pro Sprint 2

Autoritou rozsahu jsou GitHub issues odkazované v [indexu stories](sprints/sprint-2/story-index.md). [Plán Sprintu 2](sprints/sprint-2/README.md) je historický kontext; při rozdílu má přednost příslušné issue. Jejich navigační kontext popisuje umístění funkce, nepřidává další obrazovky ani akceptační kritéria.

- Landing page nabízí dva vstupy: „Moje přihlášky“ a „Organizátor“. „Moje přihlášky“ vede na účastnický přístup pomocí magic linku bez hesla; „Organizátor“ na přihlášení e-mailem a heslem s možností registrace organizátora. Nejde o společný přihlašovací formulář. Účastník se dostává na formulář přímým odkazem od organizátora; veřejný katalog je mimo sprint.
- Organizátor zakládá a přepíná vlastní organizace. Po založení nebo přepnutí otevře seznam akcí dané organizace; účet bez organizací nabízí založení první.
- Správa konkrétní akce pokrývá údaje, termíny a ceny, pokoje a lůžka, otevření registrace, platební konfiguraci, obsazenost a seznam/detail přihlášek. Zápis přijaté platby je v detailu přihlášky; cílová větev Platby nevyžaduje další samostatnou stránku.
- Po odeslání formuláře účastník vidí pouze výsledek nové přihlášky. Opakovaný přístup přes magic link vede na seznam vlastních přihlášek a jejich detaily, včetně platebních údajů a historie. Samostatné Moje platby ani QR nejsou tímto přepisem zadány.
- Týmové role a pozvánky, samoobslužné změny a storna, souhlasy, konkrétní rozdělení do pokojů, ruční schvalování, povyšování náhradníků, duplicity, bankovní import/párování a upomínky zůstávají mimo sprint podle stories. E-mailové potvrzení S2-15 samo nezadává editor šablon.

## Práce agenta a údržba

Před implementací story přečti tuto mapu, příslušná sprintová rozhodnutí a story. Urči přístupovou oblast, rozsah dat, umístění funkce a vstupní i navazující přechody. Zkontroluj existující routy a pohledy; URL nepřebírej odhadem z názvů uzlů. Sdílené přehledy rozšiřuj podle jejich účelu a nevytvářej novou stránku pro každou story.

Při rozporu mezi mapou, story a implementací popiš konkrétní rozdíl PM; nezměň svévolně produktový rozsah ani navigační strukturu. Schválená story určuje rozsah práce, rozpor ve struktuře vyžaduje rozhodnutí PM.

Změny cílové struktury schvaluje PM. Při schválené změně aktualizuj společně FigJam, tento přepis (včetně data ověření) a dotčený navigační kontext stories v rozsahu výslovného pověření. Pokud nelze některý podklad aktualizovat, označ nesoulad a uveď jej při předání; synchronizaci nepředstírej. Přepis ani navigační poznámka samy nemění stav READY nebo schválení požadavků. GitHub issue bodies se synchronizují pouze při výslovně autorizované publikaci.
