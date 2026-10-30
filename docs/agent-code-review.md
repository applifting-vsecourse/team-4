# Nezávislé agentické code review

Technické zadání: [#78](https://github.com/applifting-vsecourse/team-4/issues/78). Workflow: [`agent-code-review.yml`](../.github/workflows/agent-code-review.yml), kód: [`scripts/agent-review/`](../scripts/agent-review).

## Jak to funguje

1. Vývojář nechá issue v **In Progress**, otevře propojený PR a požádá o kontrolu požadavků. Teprve schválení rozsahu issue přesune issue automaticky do **Ready for Code Review**.
2. Workflow reaguje na změny PR a odeslaná či zrušená review. Board navíc kontroluje plánovaně každých 5 minut; GitHub může plánované běhy zpozdit. Spouští se důvěryhodný kód z main, nikoli kód z PR.
3. Pro každou issue v tomto sloupci najde všechny **otevřené PR propojené přes `Closes #N` nebo `Refs #N`** a každý z nich zrevidují agentem **GitHub Copilot CLI**. Agent dostane diff, název a popis PR, text issue a pravidla z `CLAUDE.md` a `DESIGN.md` z větve `main`. Nemá žádné nástroje a nespouští kód z PR.
4. Výsledek se zapíše jako komentář **u PR** (revidovaný commit, blokující nálezy a poznámky) a odkaz na něj jako komentář **u issue**.
5. Pokud **všechny** propojené PR prošly bez **blokujících** nálezů pro svůj aktuální commit nebo pro něj mají platnou ruční výjimku od Davida, karta se přesune do **Ready for Testing**. Bot zveřejní předání do QA a odešle GitHub žádost o review uživateli `MatejKrones`; u Matějových PR uživateli `darebakdavca`. Jinak karta zůstává v Ready for Code Review a komentář u issue uvádí důvod.

Review nenahrazuje testování ani lidského reviewera.

## Rozsah review

Název a sekce `What`/`Why` v popisu PR určují konkrétní změnu, kterou autor předkládá. Issue poskytuje produktový kontext a kritéria; automatické review ale nesmí zaměnit rozsah issue za rozsah každého jednotlivého PR.

- `Refs #N` označuje částečnou práci. Kritérium širšího příběhu není blocker jen proto, že ho tento PR nedokončuje; review ho použije jen tehdy, pokud PR tvrdí, že dané chování dodává, nebo ho svými změnami konkrétně rozbíjí.
- `Closes #N` tvrdí, že PR dokončuje issue, proto se kontroluje celý rozsah issue.
- Výslovně prezentační či návrhový PR může mít nefunkční ukládací tlačítko, lokální fixture data nebo chybějící napojení na API, pokud to odpovídá deklarovanému návrhovému rozsahu. Review přesto kontroluje, že samotný předložený návrh splňuje svůj deklarovaný účel a nezavádí konkrétní regresi.
- Pokud deklarovaný rozsah odporuje issue nebo není dostatečně jasný, uveďte poznámku či požádejte o upřesnění. Nerozšiřujte potichu rozsah PR na kompletní implementaci celé issue.

## Co se považuje za úspěch

Agent každý nález zařadí jako **`blocker`** nebo **`note`**:

- **`blocker`** je kód, který by aplikaci skutečně rozbil: pád nebo neošetřená chyba za běhu, selhání buildu, type-checku nebo testů, chybné chování či ztráta dat v implementovaném toku, bezpečnostní díra, selhávající migrace nebo přímý rozpor s kritériem issue, takže funkce nefunguje. Agent musí umět popsat konkrétní scénář selhání.
- **`note`** je vše ostatní: přístupnost (sémantika), porušení pravidel designu a stylu, pojmenování, struktura, údržba, chybějící testy a dokumentace, poznámky k výkonu, hypotetická nebo nejistá rizika. Při pochybnosti agent volí `note`.

Poznámky se zapíšou do komentáře u PR, ale **review neblokují**. Úspěch je platný verdikt bez `blocker` nálezu pro **aktuální commit** PR (`pass`, případně se seznamem poznámek). Rozhoduje přítomnost `blocker`, ne verdikt, který agent napsal: nález bez výslovného `note` se bere jako `blocker`, a `pass` s uvedeným `blocker` tedy blokuje. Za neúspěch (karta zůstává) se považuje:

- blokující nález (`blocker`),
- chyba agenta: neplatný nebo nesoudržný výstup, vypršený čas, chyba kvóty nebo přihlášení, neúplný diff nebo překročený limit dávkového review,
- chybějící propojený PR,
- commit, který se změnil během review (zastaralý výsledek, review proběhne znovu).

Samotné dokončení běhu ani absence komentářů úspěch neznamená.

## Opakování a bezpečnost proti chybnému posunu

- Výsledek se ukládá do komentáře s markerem pro konkrétní PR a **commit SHA**; uznává se jen komentář od `github-actions[bot]`. Opakovaný běh pro stejný commit review neopakuje (nevyčerpává kredity).
- Nový commit vyžaduje nové code review a QA, ale schválení rozsahu issue zůstává platné. Při změně rozsahu požádejte komentářem `/requirements-rereview` o nové schválení. Úprava názvu nebo těla issue zneplatní původní schválení rozsahu. Ruční přesun karty podmínky neobejde.
- Chyba agenta se pro stejný commit zopakuje nejvýše 3×. Pak pomůže nový commit nebo ruční spuštění s volbou **force**.
- Těsně před přesunem se znovu načte stav karty i commity PR. Pokud mezitím někdo kartu přesunul, automatizace ji nepřepíše. Pokud se změnil commit, výsledek je zastaralý a karta se nepřesune.
- Čekající žádosti o QA review se neduplikují a platné schválení aktuálního commitu po předání se znovu nevyžaduje. Chyba API při odeslání žádosti je viditelná jako neúspěšný běh; další běh žádost zopakuje i po existujícím předání do Ready for Testing.
- Workflow běží s `concurrency`, takže se dva běhy nepřekrývají.

## Ruční výjimka z Copilot review

Pouze `darebakdavca` může přímo na PR napsat samostatný komentář
`/copilot-waive <celé aktuální SHA> <zdůvodnění>`. Platí pro tento commit daného
PR; ostatní propojené PR musí splnit vlastní review podmínku. Výjimka se zapíše
jako ruční rozhodnutí s odkazem na příkaz, nikoli jako Copilot `pass`; původní
nálezy se nemažou. Schválení požadavků, CI a lidské QA po předání zůstávají
povinné. Nový commit vyžaduje novou výjimku nebo úspěšné review. Úprava či smazání
příkazu se znovu ověří; starý bot komentář výjimku neudržuje v platnosti.
Podrobnosti a pravidla QA jsou v [delivery workflow](delivery-workflow.md#manual-copilot-waiver).

## Ruční spuštění

Actions → **Agent code review** → Run workflow:

- **dry_run** (výchozí zapnuto): projde board a spustí review, ale nic nekomentuje, nepřesouvá ani neposílá žádosti o review. Výsledek je v logu.
- **issue**: zpracuje jen zadané číslo issue.
- **force**: ignoruje dřívější výsledek pro stejný commit a review provede znovu.

Plánované běhy jsou vždy ostré. Pokud v repozitáři 60 dní nebude žádná aktivita, GitHub plánované workflow vypne; stačí je znovu zapnout v záložce Actions.

## Nastavení (jednorázově)

Repo **Settings → Secrets and variables → Actions → New repository secret**:

| Secret                     | Obsah                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PROJECT_AUTOMATION_TOKEN` | Classic PAT se scopy `project` a `repo`. `GITHUB_TOKEN` nemůže číst ani měnit Projects v2.                                                                                     |
| `COPILOT_GITHUB_TOKEN`     | Fine-grained PAT vlastněný osobním účtem (jako _Resource owner_ zvolte osobní účet, ne organizaci) s oprávněním **Copilot Requests**. Review se účtuje na Copilot tohoto účtu. |

Nikdy tokeny nevkládejte do issue, PR ani chatu. Workflow komentáře píše jako `github-actions[bot]`; přesuny karet se připisují vlastníkovi `PROJECT_AUTOMATION_TOKEN`.

## Omezení

- Nativní tlačítko _Copilot → Reviewers_ se nepoužívá: vrací pouze komentářové review bez verdiktu a u osobní licence selhalo na kvótě. CLI vrací strukturovaný verdikt, který workflow vyhodnocuje.
- Review spotřebovává kredity Copilotu vlastníka `COPILOT_GITHUB_TOKEN`. Když dojdou, agent vrací chybu a karty zůstávají na místě s uvedeným důvodem.
- Diff, text issue i pravidla jsou pro agenta nedůvěryhodná data. Agent nemá nástroje ani přístup k tokenům, ale i tak je možné, že obsah PR ovlivní verdikt. Proto je následující krok Ready for Testing a lidská kontrola.
- Pokud jsou k issue propojeny více než 20 PR, automatizace odmítne částečné review.

## Lokální kontrola

```bash
pnpm agent-review:test   # jednotkové testy rozhodovací logiky (běží i v CI)
```

## Persistent requirements approval

Requirements approval is recorded on the issue and survives implementation commits
and native stale-review dismissal. Only scope edits or an explicit trusted
`/requirements-rereview` request invalidate that record. David can approve through
a new PR review or `/requirements-approve` on the issue or a linked open High PR targeting main. His own PRs remain
exempt. Code review, testing handoffs and QA still apply to the exact current
commit. See [the delivery workflow](delivery-workflow.md) for commands, reviewer
roles and merge configuration.

## Larger diffs and complete coverage

The 100,000-byte limit applies to each complete prompt, not to the whole PR.
Small PRs still get one full-diff review. Larger diffs are grouped into bounded
batches, preserving whole files where possible and splitting oversized files at
line boundaries. No text changes are silently truncated or excluded, including
lockfiles and generated component code. Binary files are skipped without separate
approval and listed in a collapsed coverage section. Binary-only PRs satisfy the
text review gate without a Copilot call; CI, requirements and QA still apply. Before any Copilot call, the runner
compares file and added/deleted-line counts against GitHub's PR metadata. A
mismatch, oversized individual line or excessive context blocks
review before it starts.

Every batch receives the PR title and description, issue, main-branch repository rules and a complete file
manifest. It returns findings and a bounded summary of public contracts and
cross-file interactions. A final review checks these summaries against the declared
PR scope, issue, rules and manifest for integration defects. This last pass uses summaries rather
than all source at once; it supplements the complete line-by-line batch coverage.
Any batch finding remains a finding regardless of the final verdict. Every batch
and the final integration review must complete with valid output before a pass
can be recorded. Missing/malformed/oversized summaries, model errors and timeouts
block the PR. Comments record the completed review coverage.

The limit is six diff batches plus one integration pass, with a maximum 2,000-byte
summary per batch and three minutes per model call. The planner reserves room
for the integration prompt before spending credits. PRs exceeding these bounds
still need splitting into coherent review units. More batches increase Copilot
usage and run time. Batch results are not cached separately: a retry reruns the
whole PR review so incomplete evidence cannot be mistaken for a pass.

An input-planning failure is reported as **Review not started** and does not
pretend that Copilot ran three times. Normal error attempts still stop automatic
retries after three recorded failed review attempts. Earlier cached input errors
(such as #104's original attempt=3 result) can be replaced after installation:
run Agent code review for issue `79` with `force=true` and `dry_run=false`.
Keep the issue in Ready for Code Review; a new implementation commit is not
required solely to retry review.

## CI evidence and local QA

Before a fresh text review, the runner waits for CI for the exact PR head SHA.
CI completion triggers scoped review; scheduled reconciliation remains the fallback.
Waiting does not consume a model attempt. The reviewer receives only matching
CI workflow/run/attempt and recognised step summaries, plus the trusted main CI
configuration. Pending, missing or stale CI is never described as passed.
Logs and arbitrary job output are not injected into the prompt. A successful
clean-database migration does not establish populated-data upgrade correctness.
Green CI is evidence, not an automatic waiver of concrete runtime defects.

Existing cached verdicts remain intact. To reconsider an old false positive or
binary input error, use a current-SHA waiver or rerun review with `force=true`.
No implementation commit is needed just to retry.

QA remains local. See [local QA](local-qa.md) for exact-commit preparation and
older PR branches. GitHub handoffs stay short; nonblocking review notes and skipped
binary paths are collapsed. `pnpm check-all` regenerates Prisma and includes
review/merge and local QA helper tests; CI additionally runs clean migrations and
the real PostgreSQL constraint suite.
