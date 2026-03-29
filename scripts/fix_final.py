#!/usr/bin/env python3
import subprocess, re, os, sys

sys.stdout.reconfigure(line_buffering=True)
ROOT = '/Users/arnaud/repos/codename/devs'

def rf(rel):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p): return None
    with open(p, 'r') as f: return f.read()

def wf(rel, content):
    with open(os.path.join(ROOT, rel), 'w') as f: f.write(content)

result = subprocess.run(['npx', 'tsc', '--noEmit'], capture_output=True, text=True, cwd=ROOT)
errors = {}
for line in (result.stdout + result.stderr).split('\n'):
    m = re.match(r'^(src/.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$', line)
    if m:
        f, ln, col, code, msg = m.groups()
        errors.setdefault(f, []).append({'line': int(ln), 'col': int(col), 'code': code, 'msg': msg})

total = sum(len(v) for v in errors.values())
print(f'Total errors: {total}')
fixed = 0

for fp, fe in errors.items():
    ts = [e for e in fe if e['code'] in ('TS7006', 'TS7031')]
    if not ts: continue
    content = rf(fp)
    if not content: continue
    lines = content.split('\n')
    changed = False
    for err in sorted(ts, key=lambda e: (-e['line'], -e['col'])):
        idx = err['line'] - 1
        if idx >= len(lines): continue
        line = lines[idx]
        pm = re.search(r"(?:Parameter|Binding element) '(\w+)'", err['msg'])
        if not pm: continue
        param = pm.group(1)
        col = err['col'] - 1
        after = line[col:]
        if re.match(re.escape(param) + r'\s*:', after): continue
        if 'Binding element' in err['msg']:
            new_line = re.sub(r'\{([^}]*\b' + re.escape(param) + r'\b[^}]*)\}(\s*(?:\)|=>))', lambda m: '{' + m.group(1) + '}: any' + m.group(2), line)
            if new_line != line:
                lines[idx] = new_line
                changed = True
                continue
        before = line[:col]
        rest = line[col:]
        pm2 = re.match(re.escape(param) + r'(?=[\s,)\]=])', rest)
        if pm2:
            lines[idx] = before + param + ': any' + rest[len(param):]
            changed = True
            continue
        new_line = re.sub(r'(?<=[(\s,])' + re.escape(param) + r'(?=\s*[,)=>])', param + ': any', line, count=1)
        if new_line != line:
            lines[idx] = new_line
            changed = True
    if changed:
        wf(fp, '\n'.join(lines))
        fixed += 1
        print(f'  TS7006: {fp}')

for fp, fe in errors.items():
    unused = [e for e in fe if e['code'] in ('TS6133', 'TS6196')]
    if not unused: continue
    content = rf(fp)
    if not content: continue
    lines = content.split('\n')
    changed = False
    for err in sorted(unused, key=lambda e: -e['line']):
        idx = err['line'] - 1
        if idx >= len(lines): continue
        line = lines[idx]
        nm = re.search(r"'(\w+)'", err['msg'])
        if not nm: continue
        name = nm.group(1)
        if 'import ' in line:
            named = re.search(r'import\s+(?:type\s+)?\{([^}]+)\}\s+from', line)
            if named:
                names = [n.strip() for n in named.group(1).split(',')]
                filtered = [n for n in names if n.split(' as ')[-1].strip() != name and n.strip() != name]
                if len(filtered) == 0:
                    lines[idx] = ''
                    changed = True
                elif len(filtered) < len(names):
                    new_imports = ', '.join(filtered)
                    lines[idx] = re.sub(r'\{[^}]+\}', '{ ' + new_imports + ' }', line)
                    changed = True
                continue
            dm = re.match(r'^import\s+(\w+)\s+from\s+', line)
            if dm and dm.group(1) == name:
                lines[idx] = ''
                changed = True
                continue
        else:
            new_line = re.sub(r'\b(const|let|var)\s+' + re.escape(name) + r'\b', lambda m: m.group(1) + ' _' + name, line, count=1)
            if new_line != line:
                lines[idx] = new_line
                changed = True
    if changed:
        wf(fp, '\n'.join(lines))
        fixed += 1
        print(f'  TS6133: {fp}')

print(f'\nDone. Fixed {fixed} files.')
