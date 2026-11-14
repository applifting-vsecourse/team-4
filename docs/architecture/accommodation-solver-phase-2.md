# Návrh pokojů – fáze 2 řešiče: tvrdá omezení a měkké preference

> Specifikace pro [#325](https://github.com/applifting-vsecourse/team-4/issues/325) (S4-T06), návrh pokojů z [#26](https://github.com/applifting-vsecourse/team-4/issues/26) (F19). Navazuje na specifikaci v4 z [#181](https://github.com/applifting-vsecourse/team-4/issues/181#issuecomment-6587193285) a na řešič z [#223](https://github.com/applifting-vsecourse/team-4/issues/223) (`apps/backend/src/modules/accommodation/solver/`). Před implementací ji schvaluje PM podle kap. 10.

## 1. Účel a hranice

Fáze 1 rozhoduje, **kdo** může být v termínu ubytován (návrh vyhodnocení, F13-1). Fáze 2 navrhuje, **ve kterém pokoji** bude spát každý, kdo už je v termínu potvrzený.

- Fáze 2 pracuje jen s **potvrzenými účastníky** termínu. Účast nepotvrzuje, neruší, nemění pořadí ani nevytváří dluh. Výsledek fáze 1 nezávisí na ničem z této specifikace.
- Měkké preference vstupují **jen do fáze 2**. Jejich změna neučiní návrh vyhodnocení fáze 1 neaktuálním (kap. 7.1).
- Návrh pokojů je **návrh**. Uložené umístění mění až organizátor tím, že návrh použije (kap. 7.2), nebo ručně (F14-2, [#20](https://github.com/applifting-vsecourse/team-4/issues/20)).
- **Zamčené umístění návrh nikdy nezmění. Nezamčené umístění je jen výchozí stav:** návrh ho změní, pokud tím zlepší vyšší úroveň cíle (kap. 5). Kdo má zůstat, kde je, musí být zamčený.
- Každý termín se navrhuje samostatně, kapacita se mezi termíny nesdílí.
- Návrh nikdy nekončí neřešitelností: kdo se nevejde, je v návrhu **neumístěný** s důvodem (kap. 6) místo neplatného přiřazení.

## 2. Pojmy

- **Uložené umístění** – pokoj, který osobě v termínu přidělil organizátor ručně nebo použitím návrhu (F14-2). Platí pro jednu osobu v jednom termínu a může být **zamčené**.
- **Ručně smíšený pokoj** – pokoj, ve kterém mají **zamčené** umístění osoby s různou efektivní hodnotou tvrdého atributu (organizátor potvrdil výjimku, např. partneři nebo rodina).
- **Efektivní hodnota** – jako ve v4 §1: určující odpověď na tvrdý atribut, nebo hodnota ručně určená organizátorem. Potvrzený účastník ji má vždy.
- **Měkký atribut** – kategorická otázka formuláře, kterou organizátor zařadí do seznamu měkkých preferencí. Tvrdý atribut akce mezi nimi být nemůže.
- **Neutrální hodnota** – odpověď, která se u měkkého atributu nepočítá. Vždy je neutrální nevyplněná odpověď; organizátor může jako neutrální označit další hodnoty. U předvolby pohlaví jsou výchozí neutrální i „Jiná odpověď“ a „Nechci uvést“. Neutrální hodnoty měkkého atributu se nastavují zvlášť od neurčujících hodnot tvrdého atributu.
- **Přání** – jednostranné přání účastníka bydlet s jiným potvrzeným účastníkem ([#319](https://github.com/applifting-vsecourse/team-4/issues/319)). V termínu se uplatní, jen když jsou oba v tomto termínu potvrzení.
- **Volné lůžko** – neobsazené základní lůžko nebo přistýlka.
- **Pořadí pokojů** – podle názvu pokoje porovnaného `Intl.Collator('cs', { numeric: true, sensitivity: 'base' })` („Pokoj 2“ před „Pokoj 10“), při shodě podle id.
- **Pořadí osob** – podle `receivedAt`, při shodě `Registration.id` (v4 §1). Ruční změny pozice z F39-1 se nepoužijí, protože platí jen pro nepotvrzené.

## 3. Vstupy (pro termín)

1. Pokoje dostupné v termínu se základními lůžky a přistýlkami (F11-1). Lůžka rezervovaná pro personál ([#165](https://github.com/applifting-vsecourse/team-4/issues/165)) se po jeho dodání odečtou.
2. Potvrzení účastníci termínu s efektivní hodnotou tvrdého atributu a hodnotami měkkých atributů.
3. Uložená umístění v termínu včetně zámků.
4. Uložená umístění týchž osob v **ostatních termínech** akce, zamčená i nezamčená (ne návrhy jiných termínů).
5. Přání uplatnitelná v termínu.
6. Pravidla ubytování: tvrdý atribut, seřazený seznam měkkých preferencí (kap. 5) a neutrální hodnoty měkkých atributů.

## 4. Tvrdá omezení

Návrh je platný, jen když splní všechna:

| #   | Omezení                                                                                                                                                            | Projev v návrhu                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| O1  | Obsazenost pokoje ≤ základní lůžka + přistýlky v termínu.                                                                                                          | Do plného pokoje nikoho nepřidá.                                      |
| O2  | Každý potvrzený je nejvýše v jednom pokoji, nebo je neumístěný.                                                                                                    | Neumístění mají důvod (kap. 6).                                       |
| O3  | Homogenita tvrdého atributu: v pokoji jsou jen osoby se stejnou efektivní hodnotou. Bez tvrdého atributu neplatí. Výjimku zachová jen zámek (ručně smíšený pokoj). | Pokoj nese hodnotu svých osob. Nezamčený smíšený pokoj návrh rozdělí. |
| O4  | Zamčená umístění zůstávají beze změny.                                                                                                                             | Zamčená osoba se nepřesune ani neodebere.                             |
| O5  | Do ručně smíšeného pokoje návrh nikoho dalšího nepřidá. Do pokoje, kde zamčená umístění překračují kapacitu, také ne.                                              | Pokoj je pro návrh uzavřený, v návrhu je u něj varování.              |
| O6  | Jen pokoje dostupné v termínu.                                                                                                                                     | Zámek do nedostupného pokoje je **konflikt zámku** (kap. 6).          |

Zámek s jedinou hodnotou určuje hodnotu pokoje (O3): do pokoje se zamčenou ženou návrh přidá jen ženy.

## 5. Měkké preference a pořadí cíle

Návrh hledá platné rozdělení, které je nejlepší podle úrovní níže. Úrovně se porovnávají **lexikograficky**: nižší úroveň rozhoduje jen mezi rozděleními, která jsou stejně dobrá ve všech vyšších.

| Úroveň | Cíl                                                                                                                              | Druh                  | Nastavení              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------- |
| U1     | Umístit co nejvíce potvrzených; při stejném počtu přesná priorita podle pořadí osob.                                             | umístění              | pevné                  |
| U2     | Stejný pokoj jako v ostatních termínech osoby.                                                                                   | stabilita             | pevné                  |
| U3     | Seřazený seznam měkkých preferencí: **přání na spolubydlící** a **měkké atributy**. Každá položka má přednost před všemi pod ní. | měkké preference      | organizátor řadí (F12) |
| U4     | Co nejméně přesunů oproti uloženým nezamčeným umístěním v termínu.                                                               | stabilita             | pevné                  |
| U5     | Základní lůžka před přistýlkami.                                                                                                 | úspora lůžek a pokojů | pevné                  |
| U6     | Co nejméně použitých pokojů.                                                                                                     | úspora lůžek a pokojů | pevné                  |
| U7     | Rozhodnutí shody (kap. 5.5).                                                                                                     | jednoznačnost         | pevné                  |

Výchozí seznam měkkých preferencí nové akce je [Přání]. S prázdným seznamem se U3 přeskočí.

### 5.1 Umístění (U1)

Nejdřív maximální počet umístěných osob. Mezi rozděleními se stejným počtem se postupuje od první osoby v pořadí osob: každá se umístí, pokud to maximální počet dovolí, stejně jako priorita ve fázi 1 (v4 §7.3, úroveň 2).

### 5.2 Stejný pokoj napříč termíny (U2)

Platí jen pro osobu, která **v tomto termínu nemá uložené umístění** a má uložené umístění (zamčené či nezamčené) v jiném termínu v pokoji, který je dostupný i v tomto termínu. Taková osoba má být v jednom z těchto pokojů. Počítá se počet umístěných osob, u kterých to neplatí. Osoba s uloženým umístěním v tomto termínu se do U2 nepočítá, takže návrhy dvou termínů se nemohou navzájem přetahovat.

### 5.3 Přání na spolubydlící (U3)

Přání a→b je **splněné**, když jsou obě osoby umístěné ve stejném pokoji. Počítá se počet nesplněných uplatnitelných přání; vzájemná přání jsou dvě přání. Nesplněné je i přání, jehož osoba je neumístěná, v uzavřeném pokoji nebo v konfliktu zámku.

Stavy přání v rozhraní zůstávají podle [#317](https://github.com/applifting-vsecourse/team-4/issues/317) (čeká na umístění, splněno, nesplněno). Návrh navíc u přání osob s různou efektivní hodnotou tvrdého atributu uvede „nelze splnit: různá hodnota <atribut>“ (kap. 10).

### 5.4 Měkké atributy (U3)

Porušení v použitém pokoji = `max(0, počet různých ne-neutrálních hodnot v pokoji − 1)`. Pokoj jen s neutrálními hodnotami má 0. Počítají se různé hodnoty, ne osoby: {Ž, Ž, Ž, M} i {Ž, M} mají porušení 1. Nic se nedoplňuje odhadem.

Dnes je měkkým atributem jen pohlaví u akce, kde není tvrdým atributem. Další otázky přinese příběh organizátorem definovaných kategorických otázek (v4 kap. 11). Soukromé potřeby z F18 ([#25](https://github.com/applifting-vsecourse/team-4/issues/25)) jsou volný text: do výpočtu nevstupují a organizátor je zohlední ručně. Jako měkký atribut je lze použít, jen pokud jsou kategorickou otázkou.

### 5.5 Stabilita, úspora a shoda (U4–U7)

- U4: počet osob s uloženým nezamčeným umístěním v termínu, které návrh dá do jiného pokoje nebo nechá neumístěné.
- U5: počet obsazených přistýlek, tj. součet `max(0, obsazenost − základní lůžka)` přes pokoje.
- U6: počet pokojů s aspoň jednou osobou.
- U7: z rozdělení stejně dobrých v U1–U6 se vybere to, ve kterém má první osoba v pořadí osob pokoj nejdříve v pořadí pokojů, při shodě druhá osoba atd.; neumístěný stojí za všemi pokoji. Pro stejné vstupy a stejnou verzi řešiče je návrh vždy stejný.

## 6. Neumístění a konflikty zámků

U neumístěné osoby návrh uvede jeden důvod, posouzený na výsledném rozdělení:

| Kód | Text                                                                                   | Kdy                                                         |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| N   | Termín nemá dostupný pokoj.                                                            | V termínu není dostupný žádný pokoj.                        |
| K   | Všechna lůžka jsou obsazená.                                                           | V žádném dostupném pokoji nezbylo volné lůžko.              |
| H   | Volné lůžko je jen v pokoji s jinou hodnotou <atribut> nebo v pokoji uzavřeném zámkem. | Volné lůžko zbylo, ale osoba do něj podle O3 nebo O5 nesmí. |

Neumístění vzniká, když potvrzení přestanou odpovídat pokojům (změna dostupnosti nebo lůžek po potvrzení, ve fázi 1 je pak běh `infeasible`) nebo kvůli zámkům.

**Konflikt zámku:** osoba se zámkem do pokoje, který v termínu není dostupný. Návrh ji uvede mezi konflikty zámků s textem „Zámek do nedostupného pokoje <pokoj>“, ne mezi neumístěnými. Nikam se neumísťuje a do U1, U2 a U4–U6 se nepočítá; její přání jsou v U3 nesplněná. Použití návrhu její zámek nemění. Organizátor konflikt řeší ručně.

Bez potvrzených osob návrh ukáže prázdný stav „V termínu nejsou potvrzení účastníci“.

## 7. Spouštění, aktuálnost a použití

- **Nastavení akce** „Automatický návrh pokojů“ (F19, uložené pro každou akci). Výchozí hodnotu určí #26 (doporučení: vypnuto).
- **Zapnuto:** změna, která zvýší verzi vstupů rozdělení (kap. 7.1), naplánuje nový návrh po 10 s bez další změny (stejná debounce jako fáze 1). Tlačítko „Navrhnout pokoje“ spustí návrh hned.
- **Vypnuto:** návrh se nepočítá, ruční přidělování zůstává plně dostupné a uložená umístění se vypnutím nemění.
- **Časový limit** 30 s na termín. Pokud U1 nedoběhne, návrh skončí `timeout` a nepoužije se. Pokud nedoběhne některá z U2–U7, ponechá se nejlepší nalezené platné rozdělení a návrh uvede „Rozdělení nemusí být nejlepší možné“.

### 7.1 Verze vstupů

Termín má pro fázi 2 **vlastní verzi vstupů rozdělení**, oddělenou od verze vstupů vyhodnocení fáze 1 (v4 §5). Návrh pokojů je aktuální, jen pokud se jeho verze shoduje s verzí termínu.

| Změna                                                                             | Verze vyhodnocení (fáze 1) | Verze rozdělení (fáze 2) |
| --------------------------------------------------------------------------------- | -------------------------- | ------------------------ |
| Potvrzení, storno potvrzeného, jiná změna potvrzené účasti v termínu              | ano                        | ano                      |
| Přihláška, storno či přesun nepotvrzeného, zařazení mezi náhradníky, změna pozice | ano                        | ne                       |
| Pokoj, dostupnost, lůžka nebo přistýlky v termínu                                 | ano                        | ano                      |
| Název pokoje (mění pořadí pokojů)                                                 | ne                         | ano                      |
| Odpověď na tvrdý atribut nebo ruční určení u potvrzeného v termínu                | ano                        | ano                      |
| Odpověď na měkký atribut u potvrzeného v termínu                                  | ne                         | ano                      |
| Přání, jehož obě osoby jsou v termínu potvrzené                                   | ne                         | ano                      |
| Seznam měkkých preferencí nebo neutrální hodnoty (všechny termíny akce)           | ne                         | ano                      |
| Uložené umístění nebo zámek v termínu (včetně použití návrhu)                     | ne                         | ano                      |
| Uložené umístění v jiném termínu u osoby potvrzené v tomto termínu                | ne                         | ano                      |

Použití návrhu zvýší verzi rozdělení. Nový návrh ze stejných vstupů vrátí totéž rozdělení s U4 = 0, takže automatický režim po použití nic nepřesune.

### 7.2 Použití návrhu

Organizátor vidí rozdíl proti uloženému umístění (přesuny, nová umístění, odebrání) a návrh použije jedním krokem. V jedné transakci se ověří, že verze návrhu odpovídá aktuální verzi rozdělení termínu, a uloží se umístění všech nezamčených osob podle návrhu, nebo nic. Neumístěné nezamčené osoby přijdou o uložené umístění. Při neshodě verzí: „Návrh pokojů je neaktuální, načtěte nový.“ Použití návrh nezveřejní ([#316](https://github.com/applifting-vsecourse/team-4/issues/316)) a účasti nemění.

### 7.3 Záznam

Každý návrh je neměnný záznam: termín, spouštěč, autor nebo systém, čas, verze vstupů rozdělení, snímek vstupů a pravidel, verze řešiče, rozdělení, hodnoty U2–U6, stavy přání, důvody neumístění, konflikty zámků, varování a stav `solved`, `timeout` nebo `failed`. Stav `infeasible` fáze 2 nemá.

## 8. Ověřovací příklady

Pokud není uvedeno jinak: jeden termín T1, tvrdý atribut pohlaví (Ž, M) s výchozími neurčujícími hodnotami, všichni uvedení jsou v T1 potvrzení, pořadí osob P1, P2, …, žádné uložené umístění ani přání, seznam měkkých preferencí [Přání]. `R1 (2+1)` = 2 základní lůžka + 1 přistýlka.

### Př. 1 – Splněná přání

R1 (2+0), R2 (2+0). P1–P4 Ž. Přání P1→P3, P3→P1, P2→P4.
→ R1 {P1, P3}, R2 {P2, P4}. Všechna 3 přání splněna.

### Př. 2 – Konflikt přání

R1 (2+0), R2 (2+0). P1–P4 Ž. Přání P1→P2, P2→P1, P3→P1.
→ R1 {P1, P2}, R2 {P3, P4}. Splněna 2 přání, P3→P1 nesplněno. Spojením P1 s P3 by se splnilo jen jedno přání.

### Př. 3 – Přání proti tvrdému atributu

R1 (2+0), R2 (2+0). P1 Ž, P2 M, P3 Ž. Přání P1→P2.
→ R1 {P1, P3}, R2 {P2}. Přání P1→P2 nesplněno, návrh uvede „nelze splnit: různá hodnota pohlaví“.

### Př. 4 – Pořadí měkkých preferencí

Bez tvrdého atributu. Měkké preference [Přání, Pohlaví]. R1 (2+0), R2 (2+0). P1 Ž, P2 M, P3 Ž, P4 M. Přání P1→P2.
→ R1 {P1, P2}, R2 {P3, P4}. Přání splněno, pohlaví porušeno ve 2 pokojích.
Organizátor seznam přeřadí na [Pohlaví, Přání] → R1 {P1, P3}, R2 {P2, P4}. Pohlaví bez porušení, přání nesplněno. Návrh vyhodnocení (fáze 1) zůstává aktuální.

### Př. 5 – Neutrální hodnoty

Bez tvrdého atributu. Měkké preference [Pohlaví]. R1 (2+0), R2 (2+0). P1 Ž, P2 „Nechci uvést“, P3 M.
→ R1 {P1, P2}, R2 {P3}. Bez porušení: „Nechci uvést“ se nepočítá a nenahrazuje se odhadem. Stejně dobré je R1 {P1}, R2 {P2, P3}; rozhodne shoda (U7).
R1 {P1, P3}, R2 {P2} má porušení 1: R1 má 1, R2 jen s neutrální hodnotou má 0, ne −1.

### Př. 6 – Neumístitelné osoby

R1 (2+0), R2 (2+0); R3 se po potvrzení stal v T1 nedostupným. P1 Ž, P2 M, P3 Ž, P4 Ž.
→ R1 {P1, P3}, R2 {P2}. Umístit lze nejvýše 3 osoby; P2 stojí v pořadí před P4. P4 neumístěná, důvod H (volné lůžko je jen v pokoji s hodnotou M).
Přibude potvrzený P5 M → R1 {P1, P3}, R2 {P2, P5}. P4 neumístěná, důvod K.
Bez dostupného pokoje v termínu → všichni neumístění, důvod N.

### Př. 7 – Zámky a smíšený pokoj

R1 (3+0), R2 (2+0). P1 Ž a P2 M mají v R1 zamčené umístění (výjimka potvrzená organizátorem). P3 Ž, P4 Ž, P5 M.
→ R1 {P1, P2} beze změny, uzavřený, s varováním „ručně smíšený pokoj“. R2 {P3, P4}. P5 neumístěný, důvod H.
Jiný stav: R1 (2+0) se zamčenou P1 Ž, R2 (1+0), P2 M, P3 M → R1 {P1}, R2 {P2}. P3 neumístěný, důvod H (R1 nese Ž).
Jiný stav: R1 (2+0), R2 (2+0), P1 Ž a P2 M mají v R1 uložené **nezamčené** umístění s výjimkou → R1 {P1}, R2 {P2}. Návrh smíšený pokoj rozdělí, 1 přesun (P2).

### Př. 8 – Více termínů

T1: P1, P2 potvrzení, uložené umístění R1 {P1, P2}. T2: R1 (2+0), R2 (2+0) dostupné i v T1, P1–P4 Ž potvrzení v T2, přání P3→P1.
→ T2: R1 {P1, P2}, R2 {P3, P4}. Stejný pokoj jako v T1 (U2) má přednost, přání P3→P1 nesplněno. Uložená umístění T1 se návrhem T2 nemění.
Jiný stav: v T2 mají P3, P4 uložené nezamčené umístění R1 → T2: R1 {P1, P2}, R2 {P3, P4}, 2 přesuny. U2 (P1, P2 nemají v T2 umístění) je nad U4. Mají-li P3, P4 v R1 zámek → R1 {P3, P4}, R2 {P1, P2}.
Jiný stav: P1 má nezamčené umístění R1 v T1 a R2 v T2 → návrh T1 i T2 ho nechá na místě; U2 se u něj neuplatní, protože má umístění v obou termínech.

### Př. 9 – Stabilita a nové přání

Uložená nezamčená umístění: R1 {P1}, R2 {P2}, R3 {P3}; R1–R3 (2+0), P1–P3 Ž.
→ Nový návrh nic nepřesune (U4 před U6), přestože by stačily 2 pokoje.
P1 zadá přání P1→P2 → R1 {P1, P2}, R2 {}, R3 {P3}: 1 přesun (P2). Přesun P1 do R2 je stejně dobrý v U1–U6; rozhodne shoda (U7), P1 zůstane v R1.

### Př. 10 – Přistýlky a počet pokojů

R1 (2+1), R2 (2+0). P1–P3 Ž.
→ R1 {P1, P2}, R2 {P3}. Bez přistýlky, i když by stačil jeden pokoj (U5 před U6).
S přáními P3→P1 a P3→P2 → R1 {P1, P2, P3} s přistýlkou: přání (U3) má přednost před přistýlkami (U5).

### Př. 11 – Shodné výsledky a pořadí pokojů

Pokoje „Pokoj 10“ (2+0) a „Pokoj 2“ (2+0). P1–P4 Ž.
→ „Pokoj 2“ {P1, P2}, „Pokoj 10“ {P3, P4}. Opakovaný návrh se stejnými vstupy dá stejné rozdělení.

### Př. 12 – Konflikt zámku

R1 (2+0) je v T1 nedostupný a P1 Ž v něm má zámek. R2 (2+0), P2 Ž, P3 Ž.
→ R2 {P2, P3}. P1 je mezi konflikty zámků („Zámek do nedostupného pokoje R1“), ne mezi neumístěnými. Použití návrhu zámek P1 nezmění.

### Př. 13 – Použití a aktuálnost

Návrh z Př. 9 po přidání přání. Organizátor otevře rozdíl: přesun P2 z R2 do R1.

- Použije návrh → uložená umístění R1 {P1, P2}, R3 {P3}. Nic se nezveřejní, účasti se nezmění. Nový návrh (automatický režim) vrátí totéž rozdělení.
- Jiný stav: před použitím se v T1 potvrdí P4 → verze rozdělení +1, použití odmítnuto jako neaktuální, uložená umístění se nezmění.
- Jiný stav: P5 zadá přání, ale P5 není v T1 potvrzená → verze rozdělení T1 se nemění.

## 9. Technické poznámky

- Fáze 2 použije pokojový model `assignment-model.ts` s pevnou množinou osob (jen potvrzení) a s úrovněmi U1–U7. Agregovaný model fáze 1 (`phase-one.ts`) se nemění.
- Položky seznamu U3 se řeší jako samostatné úrovně, ne jako jedna vážená funkce: dnešní váhy `2^k` by dvě porušení nižší položky vyvážily jedno vyšší, což kap. 5 nepřipouští.
- Dnešní úroveň měkkých atributů v `assignment-model.ts` započte použitému pokoji −1 i tehdy, když v něm nejsou žádné ne-neutrální hodnoty. Implementace ji upraví na `max(0, …)` podle kap. 5.4.
- Položka „Přání“ se v `accommodation_rules.softAttributes` uloží jako vyhrazené id (např. `roommate-wishes`), které nekoliduje s id kategorické otázky.
- Návrhy pokojů mají vlastní neměnnou tabulku (ne `accommodation_run`, jehož stavy a snímek patří fázi 1) a verze rozdělení je nový sloupec stavu termínu vedle verze vyhodnocení.
- Spike ve README řešiče ukázal, že úroveň měkkých atributů nedosáhne ve 30 s prokázaného optima. Implementační příběh proto začne benchmarkem s přáními (cca 200 osob, 40 pokojů, 3–5 položek seznamu). Přechod na jiný řešič (např. CP-SAT) je architektonické rozhodnutí a zaznamená se jako ADR podle procesu z [#323](https://github.com/applifting-vsecourse/team-4/issues/323).
- U7 lze dosáhnout postupným fixováním osob v pořadí, jako u priority ve fázi 1. Osoby, jejichž pokoj je už určený, se přeskočí.

## 10. K rozhodnutí PM

PM před implementací schvaluje:

1. **Seznam a vliv preferencí:** úrovně U1–U7 v kap. 5, výchozí seznam [Přání] a pravidla v kap. 5.2–5.5.
2. **Změny oproti v4:**
   - Potvrzený nemusí být v návrhu pokojů umístěný; místo stavu `infeasible` (v4 §7.2 bod 4) je neumístěný s důvodem (kap. 6).
   - Přesuny (U4) se měří proti uloženým umístěním, ne proti předchozímu návrhu (v4 §7.3 bod 7).
   - Pořadí úrovní: přesuny nad úsporou lůžek a pokojů, měkké preference nad přistýlkami (v4 §7.3 body 4–7).
   - Položky měkkého seznamu mají přísné pořadí místo klesajících vah (v4 §7.3 bod 6).
   - Změna měkkých preferencí nepřepočítává fázi 1 (v4 §5 a Př. 10).
3. **Pravidlo zámků:** nezamčené umístění, včetně smíšeného pokoje s výjimkou, se novým návrhem může změnit; zachová ho jen zámek (kap. 1, O3).
4. **Navazující úpravy příběhů**, které vlastní PM:
   - F12 [#17](https://github.com/applifting-vsecourse/team-4/issues/17): seřazený seznam měkkých preferencí s položkou „Přání“ a nastavení neutrálních hodnot.
   - F14-2 [#20](https://github.com/applifting-vsecourse/team-4/issues/20): při potvrzení výjimky smíšeného pokoje nabídnout zámek.
   - F19 [#26](https://github.com/applifting-vsecourse/team-4/issues/26) a [#317](https://github.com/applifting-vsecourse/team-4/issues/317): označení „nelze splnit: různá hodnota <atribut>“ u přání v návrhu a výchozí hodnota nastavení „Automatický návrh pokojů“.
