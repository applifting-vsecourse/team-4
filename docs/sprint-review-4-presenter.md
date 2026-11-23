# Sprint Review 4 — scénář pro prezentujícího

Scénář používá obnovitelná data [S4-T08](https://github.com/applifting-vsecourse/team-4/issues/483). Hlavní průchod trvá 8:30; posledních 30 sekund je rezerva. Kurz a tábor mají data odvozená od místního dne obnovení, proto se termíny nemění ručně.

## Příprava stagingu

Prezentace i závěrečná zkouška běží na [kurzovém stagingu](https://team-4.vsepractical.applifting.dev). Před zkouškou ověřte, že nasazená verze odpovídá ovládání v tomto scénáři.

1. Obnovte demo sadu ve stagingové databázi přes Adminer skriptem `demo-create.sql` a nahrajte fotky na staging podle [návodu k demo datům](../apps/backend/prisma/demo/README.md). Obnova smaže přihlášky a další změny vzniklé při předchozím běhu dema.
2. Ověřte, že Adam zatím nemá přihlášku na kurz, lze znovu importovat `fio-vypis-tabor-dve-platby.csv` a oba turnusy tábora jsou nezveřejněné. První má pět potvrzených a tři dostupné pokoje. Druhý má deset potvrzených, pět čekajících a chatky s osmi a dvěma lůžky.
3. Otevřete dvě relace na stagingu. Přihlaste Marka na desktopu a Adama v mobilním náhledu o šířce 360 px. Adamův jednorázový přihlašovací odkaz vyzvedněte v demo schránce před stopkami. V jeho relaci otevřete [veřejný detail kurzu](https://team-4.vsepractical.applifting.dev/e/lipa-kurz).

Před promítáním maximalizujte nebo přepněte obě stránky do prezentačního režimu. Scénář projděte ručně podle časového plánu níže.

## Časovaný průchod

| Čas       | Co řešíme            | Kam kliknout a co ukázat                                                                                                                                                                                                                                                                                       |
| --------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:00 | Nastavení kurzu      | **Spolek Lípa → Otevřít seznam akcí → Kurz první pomoci → Nastavení**. Otevřete **Veřejný přístup** a ukažte stav přihlašování. Ve **Veřejné prezentaci → Podmínky účasti** doplňte pokyn k pohodlnému oblečení a uložte.                                                                                      |
| 1:00–2:15 | Nová přihláška       | **Adam → veřejný detail kurzu → Vyplnit přihlášku**. Ukažte ceny 650 Kč a 850 Kč, vyberte základní kurz a ukažte předvyplněný profil. Rozbalte podmínky, ukažte doplněný pokyn, potvrďte a odešlete přihlášku.                                                                                                 |
| 2:15–3:30 | Párování plateb      | **Marek → Tábor → Platby → Import výpisu**. Použijte `fio-vypis-tabor-dve-platby.csv`. Ukažte Adamův doplatek **0 Kč**, Eliščiných **1 250 Kč** v nespárovaných transakcích a Adamovo **Účet → Oznámení → Přijatá platba**.                                                                                    |
| 3:30–4:15 | Přání účastníka      | **Adam → Moje přihlášky → Tábor → Upravit přihlášku → Ubytování → Vybrat spolubydlící**. Přidejte Filipa Veselého a uložte.                                                                                                                                                                                    |
| 4:15–5:15 | Návrh zohlední přání | **Marek → Nastavení tábora → Pravidla ubytování**. Ukažte pravidlo pohlaví a v části **Návrh pokojů** preferenci přání. Pak **Ubytování → Rozdělení → 1. turnus → Navrhnout pokoje → Zobrazit návrh**. Porovnejte stav přání **Nesplněno → Splněno** a potvrďte **Použít návrh**.                              |
| 5:15–7:25 | Dopad zámku          | **Ubytování → Rozdělení → 2. turnus → Navrhnout pokoje → Zobrazit návrh**. Ukažte **10 z 10**. Zavřete náhled, v uloženém rozdělení umístěte Petra do Buku a klikněte na **⋯ → Zamknout umístění**. Spusťte nový návrh a v náhledu ukažte **4 z 10 s pokojem**, **6 bez pokoje** a **6 volných lůžek v Buku**. |
| 7:25–8:30 | Zveřejnění pokoje    | Ukažte Adamův detail před zveřejněním. **Marek → Ubytování → Rozdělení → 1. turnus → Zveřejnit rozdělení**. Obnovte Adamův detail a zastavte se na **Chatka Buk · Filip Veselý · Splněno**.                                                                                                                    |
| 8:30–9:00 | Rezerva              | Na přepnutí oken nebo pomalejší odezvu.                                                                                                                                                                                                                                                                        |

## Příprava a opakování

1. Na stagingu projděte tabulku nahlas se stopkami. Hlavní část končí v 8:30 a zbývá 30 sekund rezervy.
2. Po zkoušce obnovte stagingovou demo sadu a znovu připravte obě relace podle postupu výše. Lokální zkouška používá `pnpm demo:reset`.

## Když se krok zdrží

- **Přesun a zámek Petra:** ve 2. turnusu přetáhněte Petra z nezařazených do Chatky Buk; pak v nabídce karty vyberte **Zamknout umístění**. Spusťte nový návrh až po potvrzení umístění a zámku. Nechte ho v náhledu, abyste ukázali dopad před použitím.
- **Zveřejnění na mobilu:** na Adamově detailu přihlášky klikněte na tlačítko pro obnovení stránky. Jestli první turnus ještě nebyl zveřejněný, vraťte se do organizátora, zapněte přepínač **Zveřejnit rozdělení** u 1. turnusu a obnovte mobilní detail znovu. Neopouštějte detail, dokud nejsou vidět **Chatka Buk** a **Splněno**.

## Rychlé vstupy pro dotazy

| Téma                               | Přímý vstup                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Katalog a filtry                   | `/events` — vyhledávání, místo, období a kategorie                            |
| Aktuální a proběhlé akce účastníka | `/my-registrations` — rozbalit **Proběhlé akce**                              |
| Přidání termínu                    | Organizátor → **Akce a turnusy** → akce → **Termíny** → **Přidat termín**     |
| Program                            | Tábor → **Program** → výběr turnusu                                           |
| Ruční párování platby              | Tábor → **Platby** → tabulka nespárovaných transakcí → **Přiřadit transakci** |

## Stav dodávky

Aktuální přehled: [Sprintový board Team 4](https://github.com/orgs/applifting-vsecourse/projects/1). Při kontrole 22. 11. 2026 měl Sprint 4 na boardu 53 karet a všechny byly ve stavu **Done**; včetně [S4-T08](https://github.com/applifting-vsecourse/team-4/issues/483). Stav před prezentací zkontrolujte znovu přímo na boardu.
