# Sprint Review 4 — scénář pro prezentujícího

Scénář používá obnovitelná data [S4-T08](https://github.com/applifting-vsecourse/team-4/issues/483). Hlavní průchod trvá 8:30; posledních 30 sekund je rezerva. Kurz a tábor mají data odvozená od místního dne obnovení, proto se termíny nemění ručně.

## Spuštění

V kořeni repozitáře nastartujte lokální služby a obnovte data:

```bash
pnpm backend docker:up:wait
pnpm dev:servers
pnpm demo:reset
```

Otevřete dvě okna: organizátora Marka a mobilní šířku 360 px pro Adama. Marek se přihlásí účtem `team4vse@seznam.cz` / `akcio-demo-2026`. Adam začne na veřejné stránce `/e/lipa-kurz`; magic link pro účastnický portál otevřete z výstupu backendu v terminálu. Pokud je prostředí už spuštěné, stačí znovu `pnpm demo:reset`.

Před promítáním maximalizujte nebo přepněte obě stránky do prezentačního režimu. Scénář projděte ručně podle časového plánu níže.

## Časovaný průchod

| Čas       | Obraz a akce                                                                                                                                                                                                                                                                                                       | Krátká věta k přednesu                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:45 | Marek otevře nastavení **Kurzu první pomoci** a rozbalí **Veřejný přístup**. Ukažte zveřejnění, otevřené přihlašování a text podmínek včetně storna.                                                                                                                                                               | „Kurz je veřejně dostupný, přihlášky jsou otevřené a podmínky včetně storna jsou vidět před odesláním.“                                    |
| 0:45–1:35 | Přepněte na mobilní náhled. Adam na veřejném odkazu vybere první termín, ukažte **650 Kč** a předvyplněné jméno, telefon i ověřený e-mail. Rozbalte podmínky.                                                                                                                                                      | „Adamovy údaje se doplnily z profilu. Před odesláním zná cenu a potvrzuje podmínky.“                                                       |
| 1:35–2:15 | Adam potvrdí podmínky, odešle přihlášku. Na potvrzení chvíli zůstaňte.                                                                                                                                                                                                                                             | „Přihláška je odeslaná. Výsledek zůstává na mobilu.“                                                                                       |
| 2:15–2:55 | Marek otevře **Tábor v Jizerkách → Platby**, vybere Fio výpis `fio-vypis-tabor-dve-platby.csv` a spustí import. Ukažte automaticky přiřazenou Adamovu platbu i Elišku v nespárovaných transakcích.                                                                                                                 | „Jednu platbu jsme podle variabilního symbolu přiřadili Adamovi. Druhá přišla bez něj, takže ji Marek vidí ve frontě k ručnímu přiřazení.“ |
| 2:55–3:30 | Ukažte Adamův řádek **2 500 Kč** a saldo **0 Kč**, Eliščinou nezařazenou platbu **1 250 Kč** a na Adamově mobilu oznámení **Přijatá platba**.                                                                                                                                                                      | „Doplatek je nulový a Adam vidí oznámení o přijaté platbě.“                                                                                |
| 3:30–4:05 | Adam v detailu táborové přihlášky zvolí Filipa v **Upravit přihlášku → Spolubydlící** a uloží přání. Marek ukáže pravidlo pohlaví a měkké přání.                                                                                                                                                                   | „Přání je podkladem návrhu; oddělení podle pohlaví zůstává pevným pravidlem.“                                                              |
| 4:05–5:00 | Marek otevře **Ubytování → Rozdělení**, 1. turnus. Ukažte Adama + Davida v Buku, Filipa sám v podkroví, Elišku + Terezu v Javoru. Spusťte návrh a v náhledu ukažte Adama s Filipem spolu v Buku. Vraťte se na uložené rozdělení a ukažte tabulku přání: uložený stav **Nesplněno**, stav podle návrhu **Splněno**. | „Návrh mění umístění tak, aby vyhověl Adamovu přání.“                                                                                      |
| 5:00–5:35 | Návrh použijte a zveřejněte 1. turnus. Na Adamově mobilu obnovte detail přihlášky a ukažte pokoj a **Splněno** u Filipa.                                                                                                                                                                                           | „Adam po zveřejnění vidí pokoj i výsledek svého přání.“                                                                                    |
| 5:35–6:10 | V organizátoru vyberte 2. turnus. Ukažte 15 přihlášených: 10 potvrzených (Petr, Lukáš, osm žen) a pět žen čeká na vyhodnocení; ukažte chatky 8 + 2 a pravidlo pohlaví.                                                                                                                                             | „Čekající přihlášky zatím lůžka nezabírají.“                                                                                               |
| 6:10–6:50 | Spusťte návrh a nechte ho v náhledu. Ukažte **10 z 10** potvrzených s pokojem: osm žen v Buku, dva muži v Javoru. Návrh nepoužívejte.                                                                                                                                                                              | „Bez ručního zásahu se všichni potvrzení vejdou.“                                                                                          |
| 6:50–7:20 | Zavřete náhled. V **Uloženém rozdělení** přesuňte Petra do velké Chatky Buk a v nabídce karty zvolte **Zamknout umístění**.                                                                                                                                                                                        | „Petr potřebuje být kvůli večerní službě ve velké chatce.“                                                                                 |
| 7:20–8:30 | Spusťte nový návrh a nechte ho v náhledu. Ukažte **4 z 10** s pokojem: Petr + Lukáš v Buku, dvě ženy v Javoru a šest žen bez pokoje. Ukažte šest volných lůžek v Buku a důvod **Pohlaví** u žen bez pokoje. Návrh nepoužívejte.                                                                                    | „Šest lůžek zůstává volných, protože ženy podle pravidla nemohou sdílet chatku s muži. Důsledek je vidět před použitím návrhu.“            |
| 8:30–9:00 | Rezerva pro přepnutí oken, pomalý solver nebo dotaz.                                                                                                                                                                                                                                                               | „Tohle je celý průchod od přihlášky přes platbu až po pokoj.“                                                                              |

## Příprava a opakování

1. Spusťte lokální databázi a aplikaci. Pokud služby ještě neběží:

   ```bash
   pnpm backend docker:up:wait
   pnpm dev:servers
   ```

2. V dalším terminálu spusťte `pnpm demo:reset`. Obnoví scénář a nahraje fotky přes místní API. `pnpm dev` spusťte jen tehdy, když záměrně chcete i obecný vývojový seed. Produkční data obnovujte jen v Admineru podle README.

3. Otevřete organizátora i mobil účastníka a ověřte, že funguje přihlášení Marka i veřejná stránka `/e/lipa-kurz`.
4. Po průchodu spusťte `pnpm demo:reset` znovu. Odstraní novou přihlášku na kurz a import a vrátí oba turnusy do výchozího stavu. Před během ověřte dvě nové transakce a jedno automatické spárování.
5. Časovaný scénář počítá s mluveným komentářem a ručním tempem při přepínání oken; hlavní část končí v 8:30 a zůstává 30 sekund rezervy. Pro devítiminutový průchod projděte tabulku nahlas se stopkami.

## Ruční pokračování ze stejné obrazovky

- **Přesun a zámek Petra:** ve 2. turnusu přetáhněte Petra z nezařazených do Chatky Buk; pak v nabídce karty vyberte **Zamknout umístění**. Spusťte nový návrh až po potvrzení umístění a zámku. Nechte ho v náhledu, abyste ukázali dopad před použitím.
- **Zveřejnění na mobilu:** pokud se automatické obnovení neprojeví, zůstaňte na Adamově detailu přihlášky a klikněte na tlačítko pro obnovení stránky. Jestli první turnus ještě nebyl zveřejněný, vraťte se do organizátora, zapněte přepínač **Zveřejnit rozdělení** u 1. turnusu a obnovte mobilní detail znovu. Neopouštějte detail, dokud nejsou vidět **Chatka Buk** a **Splněno**.

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
