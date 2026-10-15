# Technické úkoly a společné dokončení

Tyto úkoly nejsou produktové stories a nepředstírají browserové ověření všech technických vlastností.

## T1 — společný datový model a migrace

Vlastník návrhu: tech lead. Před paralelní implementací odsouhlasit organizaci a vazbu účtu, akci, termín, pokoj/lůžka a dostupnost, přihlášku, vybrané termíny a jejich účast, rezervaci kapacity, jednu platební povinnost a splatnost za přihlášku a záznamy plateb. Účastnické účty jsou odlišné od osobních údajů jednotlivých přihlášek. Organizátor může vlastnit více organizací a přepínat mezi nimi. Potvrzení každého termínu je samostatné; souhrnný stav nesmí zakrýt smíšený výsledek.

Výstup: krátký popis modelu, vztahů a omezení, Prisma schema a migrace, způsob vytvoření izolovaných testovacích dat. Model v tomto návrhu ještě není implementovaný. Kontrola nezávislým agentem a tech leadem; migrace ověřit na čisté databázi. Peněžní hodnoty, jedinečnost VS, izolaci organizací a souběh navrhnout výslovně. Schéma má jasného vlastníka při souběžné práci.

## T2 — staging a nasazení

Návaznost: #58. Ověřit dostupné přístupy, doménu, tajné hodnoty, databázi a workflow. Výstup: funkční staging URL, dohledatelná nasazená verze, opakovatelné migrace a demo data bez skutečných osobních údajů. Povinné neúspěšné kontroly musí blokovat nasazení. Produkční izolaci původní #58 nevykazovat jako hotovou, pokud se v tomto sprintu neověřuje.

## T3 — e-mailová infrastruktura

Návaznost: #59 a S2-15. Použít závazně službu Resend a nakonfigurovat odesílatele, konfiguraci oddělit od repozitáře, ověřit skutečné doručení, hlavičky a stav odesílání. Konzolový mailer není doklad doručení. Zajistit magic link pro S2-13 a potvrzení pro S2-15. Dohledatelnost selhání nesmí znamenat zveřejnění přístupových tokenů.

## T4 — integrační a E2E ověření

Návaznost: #61. Automatizovat skutečný sprintový tok s izolovanými daty; neposuzovat úspěch podle načtení stránky nebo prázdných test suites. Ověřit:

- Registraci organizátora a vlastní organizaci.
- Více termínů, cenu výběru a smíšené potvrzení/náhradnictví.
- Uložení při nulové kapacitě a skutečně souběžné přihlášky na poslední místo.
- Dluh jen za potvrzené termíny, částečnou platbu, vyrovnání a přeplatek.
- Stejný stav organizátora a účastníka.
- Magic link, odmítnutí použitého/expirovaného tokenu a cizího detailu.
- Izolaci dvou organizací přímo přes API pro čtení i zápis.
- Chybu uložení, chybu e-mailu a opakování požadavku bez náhodné duplikace.

QA ručně projde staging demo, mobil 360 px, klávesnici a viditelné odchylky od specifikace. Skutečný e-mail ověřit testovací schránkou; místní mock není důkaz doručení. Původní #61 s bankovním párováním a storny zůstává širší než tento úkol.

## T5 — nezávislé agentické code review

Autoritativní technické zadání: [#78](https://github.com/applifting-vsecourse/team-4/issues/78).

Opakovatelný review proces nad aktuálním PR a zadáním, s dohledatelnými nálezy a ověřením po opravách. Reviewer běží nezávisle na implementujícím agentovi. Nastavit před prvními implementačními PR.

## T6 — design systém akc.io

Autoritativní technické zadání: [#79](https://github.com/applifting-vsecourse/team-4/issues/79).

Rozšířit stávající Tailwind/shadcn tokeny a UI kit, doplnit DESIGN.md a pravidla pro implementující agenty. UX schválí vizuální hodnoty a QA ověří stavy a přístupnost. Připravit před rozsáhlou paralelní UI implementací.

## Podmínky READY

PM schválí rozsah a produktová pravidla, tech lead závislosti/model, UX pokrytí aktuálními wireframy a QA ověřitelnost kritérií. Otázky měnící chování jsou uzavřené a zaznamenané. Původní Figma obrazovka ani tato dokumentace samy READY nedokazují.

## Podmínky dokončení každé dodávky

- Implementace splňuje vlastní akceptační kritéria, nikoli pouze část původního issue.
- Nezávislý agent code review je doložen odkazem/reportem a relevantní nálezy jsou vyřešené.
- Relevantní automatizované kontroly mají dohledatelné výsledky; testování je průběžné.
- QA ověření odpovídá skutečně nasazené verzi a uvádí známé nedostatky.
- GitHub stav, odkazy na wireframy a podklady odpovídají rozpracovanosti.
- Výsledek je dostupný na stagingu; schválení PO je samostatný krok.

## Doporučené pořadí

T1 a T2 začít nejdřív, T3 souběžně. T5 připravit před prvními implementačními PR a T6 před rozsáhlou implementací UI. S2-02/03/04 → S2-05/06/07 → S2-08/09 → S2-10/11/12/13/14/15. Landing a UX příprava mohou běžet nezávisle; pořadí odpovídá kontraktům, ne nutně sériové práci na celých stories. Review a QA patří ke každému kroku. Vlastníci a odhady jsou zatím nezadané.

### Upřesnění platební závislosti

S2-04 → S2-09 část A (konfigurace akce) → S2-06 → S2-07/S2-08 → S2-09 část B (výpočet povinnosti přihlášky). S2-06 nečeká na dokončení celé S2-09; ta zůstává otevřená do ověření obou částí.
