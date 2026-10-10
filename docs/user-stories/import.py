#!/usr/bin/env python3
"""Preview by default; publish explicitly through gh without shell interpolation."""
import argparse
import json
import pathlib
import re
import subprocess
import sys
import tempfile
from urllib.parse import quote

HERE = pathlib.Path(__file__).resolve().parent


def gh(*args):
    result = subprocess.run(['gh', *args], text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def body(path):
    text = path.read_text()
    match = re.match(r'\A---\n.*?\n---\n\n', text, re.S)
    if not match:
        raise ValueError(f'Chybí metadata šablony: {path.name}')
    return text[match.end():]


def save_state(path, state):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', help='Vytvořit/aktualizovat issues; bez přepínače pouze náhled.')
    parser.add_argument('--include-deferred', action='store_true', help='Zahrnout také F22/F31 mimo MVP.')
    parser.add_argument('--project', help='Přesný název GitHub Project; ověřuje gh, vyžaduje přístup k projektu.')
    parser.add_argument('--ref', default='main', help='Git ref pro odkazy na podklady; soubory je nutné předem nahrát do tohoto refu.')
    parser.add_argument('--state', type=pathlib.Path, default=HERE / '.import-state.json', help='Lokální mapa vytvořených URL pro bezpečné pokračování.')
    args = parser.parse_args()
    manifest = json.loads((HERE / 'manifest.json').read_text())
    selected = [s for s in manifest['stories'] if s['default_import'] or args.include_deferred]
    all_stories = {s['file']: s for s in manifest['stories']}
    stored_labels = {x['name'] for x in json.loads((HERE / 'labels.json').read_text())}
    headings = ['User story', 'Kontext', 'Akceptační kritéria', 'Mimo rozsah', 'Podklady', 'Zdroj']
    bodies = {}
    for story in selected:
        text = body(HERE / story['file'])
        if re.findall(r'^## (.+)$', text, re.M) != headings:
            raise ValueError(f"Neplatná struktura šablony: {story['file']}")
        if not set(story['labels']) <= stored_labels:
            raise ValueError(f"Neznámý label: {story['id']}")
        bodies[story['id']] = text
    repo = manifest['repository']
    state = json.loads(args.state.read_text()) if args.state.exists() else {'repository': repo, 'issues': {}}
    if state['repository'] != repo:
        raise ValueError('Stav importu patří jinému repozitáři.')
    for story in selected:
        action = 'aktualizovat' if story['id'] in state['issues'] else 'vytvořit'
        print(f"{action}: {story['title']} | {', '.join(story['labels'])} | {story['story_status']}")
    print(f"\nCelkem {len(selected)} stories; projekt: {args.project or 'neuveden (pouze repo issues)' }.")
    if not args.execute:
        print('Pouze náhled. Pro publikování přidejte --execute; nezamítnuté stories jsou odsouhlasené, položky mimo MVP se běžně vynechají.')
        return

    # Validate live labels and every known URL before the first write.
    live_labels = {x['name'] for x in json.loads(gh('label', 'list', '--repo', repo, '--limit', '200', '--json', 'name'))}
    required_labels = {label for story in selected for label in story['labels']}
    if not required_labels <= live_labels:
        raise ValueError('Na GitHubu chybí labels: ' + ', '.join(required_labels - live_labels))
    gh('auth', 'status')
    # Reconcile an interruption after create but before saving its URL. Do not
    # silently accept truncated inventories or ambiguous matching issues.
    existing = json.loads(gh('issue', 'list', '--repo', repo, '--state', 'all', '--limit', '1000', '--json', 'title,url,body'))
    if len(existing) >= 1000:
        raise ValueError('Inventář issues dosáhl limitu 1000; před importem je nutná stránkovaná kontrola duplicit.')
    for story in selected:
        marker = f"<!-- akc-io-story:{story['id']} -->"
        matches = [issue for issue in existing if marker in issue['body'] or issue['title'] == story['title']]
        if len(matches) > 1:
            raise ValueError(f"Více existujících issues pro {story['id']}; vyřešte duplicitu před importem.")
        known = state['issues'].get(story['id'])
        if known and not any(issue['url'] == known for issue in matches):
            raise ValueError(f"URL ve stavu pro {story['id']} neodpovídá existujícímu issue.")
        if matches:
            state['issues'][story['id']] = matches[0]['url']

    project = None
    if args.project:
        projects = json.loads(gh('project', 'list', '--owner', repo.split('/')[0], '--limit', '100', '--format', 'json'))['projects']
        if len(projects) >= 100:
            raise ValueError('Inventář projektů dosáhl limitu 100; je nutná stránkovaná kontrola.')
        matching = [p for p in projects if p['title'] == args.project and not p.get('closed')]
        if len(matching) != 1:
            raise ValueError('Název projektu musí odpovídat právě jednomu otevřenému projektu vlastníka repo.')
        project = matching[0]

    def rendered(story, issue_links):
        def replace(match):
            caption, target = match.groups()
            related = all_stories.get(target)
            if related:
                url = state['issues'].get(related['id']) if issue_links else None
                if url:
                    return f'[{caption}]({url})'
                # An excluded deferred story is not falsely linked to an issue.
                if not related['default_import'] and not args.include_deferred:
                    return f'{caption} (odloženo mimo MVP; issue nevytvořeno)'
                return f'{caption} (související issue bude propojeno po dokončení importu)'
            if target.startswith('../../'):
                url = f'https://github.com/{repo}/blob/{quote(args.ref, safe="")}/{quote(target[6:], safe="/")}'
                return f'[{caption}]({url})'
            if target == 'coverage.md':
                url = f'https://github.com/{repo}/blob/{quote(args.ref, safe="")}/docs/user-stories/coverage.md'
                return f'[{caption}]({url})'
            return match.group(0)
        return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', replace, bodies[story['id']]) + f"\n<!-- akc-io-story:{story['id']} -->\n"

    save_state(args.state, state)
    with tempfile.TemporaryDirectory(prefix='akc-io-stories-') as temp:
        for story in selected:
            if story['id'] in state['issues']:
                continue
            payload = pathlib.Path(temp) / 'body.md'
            payload.write_text(rendered(story, False))
            command = ['issue', 'create', '--repo', repo, '--title', story['title'], '--body-file', str(payload)]
            for label in story['labels']:
                command += ['--label', label]
            url = gh(*command)
            if not re.fullmatch(r'https://github\.com/' + re.escape(repo) + r'/issues/\d+', url):
                raise ValueError(f'Neočekávaný výstup vytvoření issue: {url}; před pokračováním ověřte GitHub.')
            state['issues'][story['id']] = url
            save_state(args.state, state)
            print(f"Vytvořeno: {url}")
        # Repository automation may already have added every issue. Read first
        # so an already-complete import does not require the project write scope.
        project_urls = set()
        if project:
            inventory = json.loads(gh('project', 'item-list', str(project['number']), '--owner', repo.split('/')[0], '--limit', '1000', '--format', 'json'))
            if inventory.get('totalCount', 0) > len(inventory['items']):
                raise ValueError('Neúplný inventář projektu; je nutná stránkovaná kontrola.')
            project_urls = {item.get('content', {}).get('url') for item in inventory['items']}
        # Second pass resolves cross-issue links after all URLs are available.
        for story in selected:
            payload = pathlib.Path(temp) / 'body.md'
            payload.write_text(rendered(story, True))
            command = ['issue', 'edit', state['issues'][story['id']], '--repo', repo, '--title', story['title'], '--body-file', str(payload)]
            for label in story['labels']:
                command += ['--add-label', label]
            gh(*command)
            if project and state['issues'][story['id']] not in project_urls:
                # Auto-add may finish after the first project snapshot.
                refreshed = json.loads(gh('project', 'item-list', str(project['number']), '--owner', repo.split('/')[0], '--limit', '1000', '--format', 'json'))
                if refreshed.get('totalCount', 0) > len(refreshed['items']):
                    raise ValueError('Neúplný inventář projektu; je nutná stránkovaná kontrola.')
                project_urls = {item.get('content', {}).get('url') for item in refreshed['items']}
                if state['issues'][story['id']] not in project_urls:
                    gh('project', 'item-add', str(project['number']), '--owner', repo.split('/')[0], '--url', state['issues'][story['id']])
            print(f"Aktualizováno: {state['issues'][story['id']]}", flush=True)
        print('Import a propojení dokončeno. Lokální mapa URL: ' + str(args.state))


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ValueError, OSError, KeyError) as error:
        print(f'Import zastaven: {error}', file=sys.stderr)
        sys.exit(1)
