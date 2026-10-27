# Sprint Review 2 — scénář pro prezentujícího

**Pondělí 26. října 2026 · akc.io · limit 9 minut, potom zpětná vazba PO.**

Text v uvozovkách je připravený k přednesu. Pokyny „Ukaž“ a „Ovládání“ nečti nahlas. Komentuj během automatického vyplňování; nečekej s celým komentářem až na konec kapitoly.

Časy níže jsou cílový rozpočet, nikoli změřená délka aktuálního skriptu. Po posledních změnách tempa potřebuje scénář společnou zkoušku s řečí, issues a schránkou. Cíl je skončit v 8:30 a mít 30 sekund rezervu. Samotný odhad délky automatizace nedokazuje splnění limitu.

## Příprava před vystoupením

1. Spusť z kořene repozitáře:

   ```bash
   E2E_BASE_URL=https://team-4.vsepractical.applifting.dev \
   DEMO_PARTICIPANT_EMAIL=team4vse@seznam.cz \
   pnpm frontend demo:v2
   ```

2. Nech demo čekat na úvodní obrazovce. Připrav desktopové okno organizátora a okno s vycentrovaným mobilním náhledem účastnice. Účastnická ukázka používá šířku 360 px; nejde o záznam z fyzického telefonu.
3. Ve **školním profilu Chrome** otevři přihlášenou schránku `team4vse@seznam.cz`. Pracovní profil ji nemusí mít přihlášenou. Nacvič zkopírování adresy tlačítka v e-mailu a vložení do dialogu v okně mobilního náhledu.
4. Otevři předem issues z jednotlivých bloků níže, board sprintu a jeden konkrétní výsledek CI / agentického review pro prezentovanou práci. Zkontroluj datum a commit důkazu. Neotvírej je během prezentace hledáním.
5. Před review ověř nasazenou verzi, aktuální stav boardu, známé chyby a skutečné výsledky ručního mobilního testu. Uzavřené issue není samo o sobě doklad testu nebo akceptace PO. Podklady neměň jen proto, aby vypadaly hotově.
6. Připrav viditelné stopky. Během zkoušky zapiš časy na konci jednotlivých bloků. Pokud je součet nad 8:30, nejprve zkrať komentář a přepínání mezi podklady; pokud nestačí, je potřeba upravit demo a znovu změřit průchod.

**Ovládání:** → / PageDown / Spustit spouští další kapitolu. Mezi kroky ← / PageUp otevře uložený náhled předchozího dokončeného kroku. Další ← jde zpět, → prochází vpřed a vrací se do živého dema. Teprve následující → spustí další kapitolu; formuláře ani platby se při prohlížení neopakují. **Alt+P (na Macu ⌥P)** pozastavuje a obnovuje automatické akce; mimo formulářová pole funguje i mezerník. Právě rozběhnutá akce může doběhnout. Úvodní souvislý scroll lze pozastavit během pohybu. Po návratu z GitHubu nejdříve zaměř správné okno dema.

**Pozor na titulek:** při čekání už pojmenovává následující kapitolu, zatímco aplikace ještě ukazuje výsledek předchozí. Výsledek dokonči komentářem, potom ukaž zadání dalšího bloku a až poté pokračuj.

## 0:00–0:35 · Cíl sprintu a landing page

**Ukaž zadání:** [S2-01 — landing page](https://github.com/applifting-vsecourse/team-4/issues/80). Stačí nadpis a příslušné akceptační kritérium, nečti celé issue.

> „Ve Sprintu 2 jsme chtěli propojit přípravu akce s přihlášením účastníka a evidencí platby. Ukážeme to na víkendu první pomoci: Alena ho pořádá za Spolek Jasan a Jana se na něj hlásí. Běžíme na nasazené aplikaci, nikoli na localhostu.“

**Ukaž aplikaci:** spusť úvod. Nech landing page pomalu projet. U dvou vstupů zůstane čekat.

> „Zadáním byl srozumitelný vstup do aplikace. Organizátor se přihlašuje heslem, účastník se vrací ke svým přihláškám přes e-mailový odkaz.“

**Ovládání:** po dojetí scrollu ještě neklikej, dokud nedokončíš komentář a neukážeš zadání následující části.

## 0:35–1:15 · Krok 1/9 — Alena a její organizace

**Ukaž zadání:** [S2-02 — registrace organizátora a organizace](https://github.com/applifting-vsecourse/team-4/issues/81).

> „Organizátor má mít vlastní účet a organizaci. Alena se proto zaregistruje a založí Spolek Jasan, pod kterým bude pořádat akce.“

**Ukaž aplikaci:** spusť krok 1. Během psaní krátce komentuj; nevyjmenovávej jednotlivé inputy. Na konci ukaž název organizace a přehled „Akce a turnusy“.

> „Po založení je rovnou ve své organizaci. Teď už může připravit konkrétní akci.“

Tento průchod ukazuje jednu organizaci. Netvrď, že právě předvádíš přepínání více organizací nebo všechny varianty přihlášení.

## 1:15–2:30 · Krok 2/9 — Konkrétní víkend a dva termíny

**Ukaž zadání:** [S2-04 — více termínů a cen](https://github.com/applifting-vsecourse/team-4/issues/83), [S2-17 — upozornění na chybějící termín](https://github.com/applifting-vsecourse/team-4/issues/141), [Kontextová navigace](https://github.com/applifting-vsecourse/team-4/issues/133).

> „Akce má mít vlastní popis, místo a více samostatně oceněných termínů. Vytvoříme víkend 7. a 8. listopadu na Chatě Rozvoj v Krkonoších.“

**Ukaž aplikaci:** spusť krok 2. Po vytvoření akce krátce ukaž přehled s upozorněním na chybějící termín. Pokud potřebuješ delší komentář, použij Alt+P před přechodem přes „Přidat termín“, potom pokračuj.

> „Prázdný přehled napoví další krok. Navigace přitom drží stejnou organizaci a stejnou akci.“

Při ukládání termínů:

> „Sobota stojí tisíc korun a neděle patnáct set. Účastník si později zvolí konkrétní dny, takže potřebujeme cenu i účast evidovat po jednotlivých termínech.“

**Výsledek:** oba uložené termíny, jejich data a ceny. Nepopisuj každý klik v kalendáři.

## 2:30–3:30 · Krok 3/9 — Platební údaje, checklist a kapacita

**Ukaž zadání:** [S2-09 — platební konfigurace](https://github.com/applifting-vsecourse/team-4/issues/88), [Upřesnění data připomenutí](https://github.com/applifting-vsecourse/team-4/issues/138), [S2-05 — pokoje a lůžka](https://github.com/applifting-vsecourse/team-4/issues/84).

> „Před otevřením přihlášek nastaví Alena účet a počet dní do připomenutí platby. Podle upřesnění s PO jde o datum připomenutí, nikoli pevný deadline nebo automatické rušení účasti.“

**Ukaž aplikaci:** spusť krok 3. Po uložení platebních údajů nech viditelný checklist; skript zde má navíc pětisekundovou prodlevu.

> „Checklist ukazuje připravenost k otevření přihlašování. Ubytování pak určí skutečnou kapacitu: podkrovní pokoj má dvanáct lůžek dostupných v sobotu i neděli.“

**Výsledek:** uložený pokoj a jeho dostupnost. Neříkej, že jsou konkrétní lidé přiřazení do pokojů — to se v tomto sprintovém průchodu nedělá. Kapacita vzniká z dostupných lůžek, ne z ručně zadaného limitu termínu.

## 3:30–3:55 · Krok 4/9 — Otevření přihlášek

**Ukaž zadání:** [S2-06 — otevření a přímý odkaz](https://github.com/applifting-vsecourse/team-4/issues/85).

> „Jakmile má akce potřebné údaje, Alena otevře přihlašování a pošle účastníkům přímý odkaz. Veřejný katalog není součástí tohoto sprintu.“

**Ukaž aplikaci:** spusť krok 4. Ukaž stav „Přihlašování je otevřené“ a veřejný odkaz.

> „Tím je příprava organizátora hotová a přejdeme na druhou stranu stejného příběhu.“

## 3:55–4:55 · Krok 5/9 — Jana se hlásí na mobilu

**Ukaž zadání:** [S2-07 — formulář a výběr termínů](https://github.com/applifting-vsecourse/team-4/issues/86), [S2-08 — přijetí přihlášky](https://github.com/applifting-vsecourse/team-4/issues/87).

> „Jana dostala odkaz a přihlašuje se z telefonu. Zadáním byl jednoduchý formulář s výběrem více termínů a cenou před odesláním.“

**Ukaž aplikaci:** spusť krok 5. Ve vycentrovaném mobilním náhledu ukaž název a místo, oba termíny, cenu a kontaktní formulář.

> „Vybere oba dny a ještě před odesláním vidí celkem dva a půl tisíce korun. Mobilní ukázka zahrnuje celý formulář i jeho výsledek, nejen zmenšenou úvodní stránku.“

Kontaktní údaje se vyplní rychleji, stále postupně po znacích. Odeslání a zobrazení výsledku zachovávají běžné tempo. Během vyplňování nech publikum sledovat formulář. **Výsledek:** viditelné potvrzení uložení. V tomto happy pathu není potřeba předvádět neplatný telefon nebo duplicitu.

## 4:55–5:25 · Krok 6/9 — Potvrzení a platební instrukce

**Ukaž zadání:** [S2-14 — výsledek a účastnický přehled](https://github.com/applifting-vsecourse/team-4/issues/93), [S2-16 — platební povinnost](https://github.com/applifting-vsecourse/team-4/issues/128).

> „Jana má hned vědět, zda byla přijata a kolik má zaplatit. Protože jsou v obou dnech volná lůžka, oba termíny jsou potvrzené a částka je dva a půl tisíce.“

**Ukaž aplikaci:** spusť krok 6; ukaž oba stavy, částku, účet, variabilní symbol a datum připomenutí.

> „Instrukce jsou konkrétní pro její přihlášku. Kdyby byl některý termín pouze náhradnický, do platební povinnosti se nezapočítá.“

Poslední věta vysvětluje pravidlo; dnešní krátký scénář smíšené potvrzení a náhradnictví nepředvádí. Nepopisuj ho jako právě ukázaný výsledek.

## 5:25–6:05 · Krok 7/9 — Organizátor vidí účast a dluh

**Ukaž zadání:** [S2-10 — obsazenost](https://github.com/applifting-vsecourse/team-4/issues/89), [S2-11 — seznam a detail přihlášek](https://github.com/applifting-vsecourse/team-4/issues/90).

> „Alena potřebuje vidět, jak se přihláška promítla do kapacity a plateb. Po aktualizaci má každý den jedno obsazené a jedenáct volných míst.“

**Ukaž aplikaci:** spusť krok 7. Ukaž oba řádky obsazenosti, potom Janinu přihlášku a její detail. Skript po ověření obsazenosti vyčká dalších 5 sekund a v seznamu přihlášek další 4 sekundy před otevřením detailu.

> „V detailu má její kontakty, vybrané dny a zatím neuhrazenou částku. Nemusí přihlášku přepisovat mezi více nástroji.“

Filtry do zadání S2-11 patří, ale krátký skript je neproklikává. Pokud se na ně PO zeptá, ukaž je až ve zpětné vazbě; během devíti minut neopouštěj připravený detail platby.

## 6:05–6:35 · Krok 8/9 — Evidence přijaté platby

**Ukaž zadání:** [S2-12 — ruční zápis platby](https://github.com/applifting-vsecourse/team-4/issues/91).

> „Předpokládejme, že Jana mezitím zaplatila. Alena zaeviduje přijatých dva a půl tisíce a přihláška se vyrovná.“

**Ukaž aplikaci:** spusť krok 8. Po uložení ukaž přijatou částku a vyrovnání.

> „Jde o evidenci již přijaté platby. Bankovní import a automatické párování jsou mimo tento sprint.“

Tato akce neposílá peníze a není bankovním převodem. Nezdržuj se popisem implementace platebního dialogu.

## 6:35–7:40 · Krok 9/9 — Skutečný e-mail a návrat Jany

**Ukaž zadání:** [S2-15 — potvrzovací e-mail](https://github.com/applifting-vsecourse/team-4/issues/94), [S2-13 — magic link](https://github.com/applifting-vsecourse/team-4/issues/92), návaznost na S2-14.

**Než spustíš krok 9:** přepni do schránky. Otevři nejnovější potvrzení registrace z tohoto běhu. Ověř název akce, oba termíny, částku a čas zprávy; opakované zkoušky mohou mít stejné názvy akcí.

> „Po registraci dorazí skutečný potvrzovací e-mail se stejnými termíny a platebními instrukcemi. Tady ukazujeme jeho doručení do schránky, ne pouze hlášku aplikace o odeslání.“

**Potom:** vrať se do dema a spusť krok 9. Mobilní náhled nejprve otevře landing page a přes její vstup „Moje přihlášky“ přejde na zadání e-mailu. Potom skript vyžádá nový přihlašovací odkaz. Vrať se do schránky a otevři nejnovější zprávu „Přihlašovací odkaz do akc.io“.

> „Když se Jana později vrací, na úvodní stránce zvolí Moje přihlášky a zadá svůj e-mail. Nepotřebuje heslo. Přes jednorázový odkaz otevře svoje přihlášky a aktuální stav plateb.“

**Přesný ruční úkon:** zkopíruj adresu tlačítka „Zobrazit moje přihlášky“. Vlož ji do dialogu „Vložte přihlašovací odkaz…“, který demo otevře v okně mobilního náhledu, a potvrď OK. Skript odkaz otevře uvnitř mobilního náhledu. Nepřepisuj adresní řádek prohlížeče — ten patří prezentačnímu oknu.

Skript sám otevře detail právě vytvořené přihlášky. Ukaž ho stále v mobilním okně:

> „Jana už vidí zaplaceno dva a půl tisíce a zbývá nula. Obě strany tedy pracují se stejnou přihláškou i stejnou evidovanou platbou.“

Při opakovaném použití nebo vypršení odkazu si vyžádej nový. Přístupový token nečti nahlas ani ho nevkládej do prezentace.

## 7:40–8:10 · Neviditelná práce a proces

**Ukaž zadání a doklad:** připravené issues a krátce jeden skutečný výsledek CI / review. Nečti výpis testů ani kód.

- [S2-03 — oddělení dat](https://github.com/applifting-vsecourse/team-4/issues/82): ukaž odkaz na konkrétní test izolace, pokud jeho úspěšný výsledek máš doložený. Pouhý název organizace v sidebaru ochranu dat neprokazuje.
- [S2-T1 — datový model](https://github.com/applifting-vsecourse/team-4/issues/74), [S2-T2 — nasazení](https://github.com/applifting-vsecourse/team-4/issues/75): vazby organizace → akce → přihláška → platba a nasazená aplikace.
- [S2-T3 — e-mailová infrastruktura](https://github.com/applifting-vsecourse/team-4/issues/76): skutečně doručené zprávy z předchozího bloku.
- [S2-T5 — agentické review](https://github.com/applifting-vsecourse/team-4/issues/78) a [S2-T5b — pravidla blokujících nálezů](https://github.com/applifting-vsecourse/team-4/issues/115): jeden konkrétní dohledatelný review výsledek.
- [S2-T6 — design systém](https://github.com/applifting-vsecourse/team-4/issues/79): společné formuláře, dialogy a stavové prvky už ukázané v aplikaci.

> „Vedle viditelných funkcí jsme řešili společný datový model, nasazení, e-maily, ochranu dat a jednotné UI. K práci máme dohledatelné kontroly a agentické review. Tady je konkrétní výsledek; jeho rozsah nepovažujeme automaticky za ověření všech scénářů.“

Poslední dvě věty použij jen s připraveným skutečným dokladem. Netvrď, že každý úkol prošel všemi branami, pokud to aktuální board a historie nedokládají. Není potřeba popisovat proces klikání do boardu.

## 8:10–8:30 · Stav dodávky, omezení a akceptace

**Ukaž:** aktuální sprintový board a [S2-T4 — závěrečné integrační a E2E ověření](https://github.com/applifting-vsecourse/team-4/issues/77).

Ověřený stav při přípravě tohoto scénáře 25. 10.: produktové stories S2-01–S2-17 byly uzavřené, stejně jako uvedené technické úkoly kromě S2-T4. S2-T4 zůstával otevřený. Stav samotného sloupce Done ani finální akceptace PO tím nejsou potvrzené. Některé checkboxy mohou zaostávat za provedeným testováním; jejich nevyplnění samo neprokazuje chybějící implementaci. Před vystoupením toto znovu zkontroluj.

**Připravená formulace, pokud stav zůstane stejný:**

> „Hlavní happy path máme funkční. Závěrečný testovací úkol je na boardu stále otevřený; stav jeho evidence a dokončení chceme oddělit od fungování předvedených částí. Dnešní ukázku předkládáme k vaší zpětné vazbě a akceptaci.“

**Známé omezení nasazené verze z dry runu:** při zkoušce nebyl v kalendáři dostupný rok 2027. Oprava byla v lokální větvi; nasazení opravy nebylo potvrzené. Proto demo používá listopad 2026. Pokud omezení před review pořád platí, řekni ho dopředu při kroku 2:

> „V nasazeném kalendáři víme o omezení výběru budoucích let. Opravu máme připravenou, pro dnešní ukázku používáme listopadový termín.“

Pokud mezitím ověříš nasazenou opravu, tento komentář vynech. Další chyby doplň podle skutečného posledního dry runu. Nevymýšlej nedokončené funkce a nezaměňuj věci mimo sprint za resty.

**Přesné vymezení dnešních důkazů:** dřívější automatický vzdálený průchod prošel kroky 1–8, ale vypršel na předání e-mailového odkazu. Návrat a zaplacený detail byly potom ověřeny ručně v běžném Chrome. Pozdější změny dema prošly lokálními kontrolami a cílenými browserovými zkouškami. To není společný úspěšný automatický průchod aktuální verze na nasazené aplikaci. Neříkej „celé produkční E2E nám prošlo“, dokud ho nemáš skutečně doložené.

## 8:30–9:00 · Rezerva a předání PO

> „To byl průchod od přípravy akce přes mobilní přihlášku až po shodný stav platby u organizátora i účastníka. Rádi bychom od vás teď zpětnou vazbu k tomuto toku.“

Pak přestaň klikat a nech prostor na přibližně tříminutovou zpětnou vazbu. Další ukázky spouštěj až podle dotazu PO.

## Když se něco zdrží

- **E-mail nepřichází:** stručně řekni „Přihláška je uložená, čekáme na doručení zprávy.“ Během čekání můžeš odříkat blok o neviditelné práci. Zkontroluj nejnovější zprávy a spam. Pokud doručení neověříš, řekni to; úspěšnou hlášku nenahrazuj tvrzením o doručení.
- **Do 8:00 ještě nejsi v posledním bloku:** použij krátké formulace a připravené podklady. Jestli poslední krok nestihneš, řekni, co dnes předvedeno nebylo, a zakonči do devíti minut. Nespouštěj znovu celý scénář.
- **Zasekne se aplikace:** Alt+P zastaví další automatické akce. Popiš, co právě selhalo. Připravený screenshot můžeš ukázat jako výsledek dřívějšího ověření, nikoli jako právě probíhající úspěšnou akci. Důkaz je například [dřívější ověřený účastnický detail](../output/playwright/review-participant-paid.png), pokud ho máš stále lokálně k dispozici.

## Kontrola proti zadání učitelů

| Požadavek                          | Kde ho scénář pokrývá / co zbývá ověřit                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zadání issue → výsledek            | Odkazy a řečené zadání před každým blokem; související úkoly jsou seskupené, každý odkaz ukaž.                                                                                                                   |
| Nasazená aplikace                  | Celý příběh na týmové HTTPS URL. V repozitáři jde o staging; neoznačuj ho nepravdivě za oddělenou produkční infrastrukturu.                                                                                      |
| Dva happy pathy a realistická data | Alena / Spolek Jasan / kurz první pomoci / Jana, dva termíny a jedna skutečná evidovaná platba.                                                                                                                  |
| Mobil a UI/UX                      | Účastnický formulář, výsledek a vlastní detail na 360 px; organizátor podle domluvy pouze na desktopu. Před review navíc skutečně ověř fyzický telefon. Neříkej, že demo ukazuje každou funkci v obou rozměrech. |
| Neviditelná práce                  | Datový model, nasazení, e-maily, izolace, review a společné UI s konkrétními doklady.                                                                                                                            |
| Chyby, nedokončené části, proces   | Poslední blok, aktuální board, otevřený S2-T4 a předem ověřená známá omezení. Akceptaci PO nenahrazuje uzavřené issue.                                                                                           |
| Komunikace a scope s PO            | Připomenuté upřesnění data připomenutí; další komunikaci ve sprintu uváděj jen podle skutečné historie.                                                                                                          |
| Dry run a 9 minut                  | Celý aktuální scénář včetně řeči a schránky ještě změř; rozpočet zde není důkaz délky.                                                                                                                           |
