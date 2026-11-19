# Sample bank statements (F23)

Hand-written statements in the format of the Fio Internetbanking CSV export (Pohyby na účtu → CSV), for trying „Import výpisu“ in Správa akce → Platby locally. They follow the documented export; none of them comes from a real account.

| File                    | Import                                       | Expected result                                                                    |
| ----------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `1-vypis.csv`           | Two incoming payments and one outgoing       | „Výpis byl naimportován“: Nové transakce 2, Přeskočené odchozí platby 1            |
| `1-vypis.csv` again     | The same statement once more                 | Nové transakce 0, Již dříve naimportované 2; the table still has two rows          |
| `2-prazdny-vypis.csv`   | A statement without movements                | „Výpis neobsahuje žádné přijaté platby“, Nové transakce 0                          |
| `3-neplatna-castka.csv` | An invalid amount on line 6                  | „Výpis nebyl naimportován“ naming line 6; nothing from the file appears            |
| `4-neni-vypis.csv`      | A CSV that is not a statement                | „Soubor není podporovaný výpis…“; the table is unchanged                           |

In `1-vypis.csv`, Jan Novák paid 3 500 Kč with VS 1001 on 2. 8. 2027 and Petra Svobodová 1 750 Kč with VS 1002 on 4. 8. 2027.
