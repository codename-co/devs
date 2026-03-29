#!/usr/bin/env python3
"""Fix TS7006 and TS6133 errors in the codebase."""
import subprocess, re, os, sys

sys.stdout.reconfigure(line_buffering=True)
ROOT = '/Users/arnaud/repos/codename/devs'

def read_file(rel):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        return None






















































































































































print(f'\nDone. Fixed {fixed} files.')        print(f'  TS6133: {filepath}')        fixed += 1        write_file(filepath, '\n'.join(lines))    if changed:                changed = True                lines[idx] = new_line            if new_line != line:            )                line, count=1                lambda m: m.group(1) + ' _' + name,                r'\b(const|let|var)\s+' + re.escape(name) + r'\b',            new_line = re.sub(            # Prefix unused local var with _        else:                continue                changed = True                lines[idx] = ''            if dm and dm.group(1) == name:            dm = re.match(r'^import\s+(\w+)\s+from\s+', line)            # Default import                continue                    changed = True                    lines[idx] = re.sub(r'\{[^}]+\}', '{ ' + new_imports + ' }', line)                    new_imports = ', '.join(filtered)                elif len(filtered) < len(names):                    changed = True                    lines[idx] = ''                if len(filtered) == 0:                           and n.strip() != name]                           if n.split(' as ')[-1].strip() != name                filtered = [n for n in names                names = [n.strip() for n in named.group(1).split(',')]            if named:            named = re.search(r'import\s+(?:type\s+)?\{([^}]+)\}\s+from', line)            # Named import        if 'import ' in line:        name = nm.group(1)            continue        if not nm:        nm = re.search(r"'(\w+)'", err['msg'])        line = lines[idx]            continue        if idx >= len(lines):        idx = err['line'] - 1    for err in sorted(unused, key=lambda e: -e['line']):    changed = False    lines = content.split('\n')        continue    if not content:    content = read_file(filepath)        continue    if not unused:    unused = [e for e in file_errors if e['code'] in ('TS6133', 'TS6196')]for filepath, file_errors in errors.items():# Fix TS6133 / TS6196: remove unused imports        print(f'  TS7006: {filepath}')        fixed += 1        write_file(filepath, '\n'.join(lines))    if changed:            changed = True            lines[idx] = new_line        if new_line != line:        )            line, count=1            param + ': any',            r'(?<=[(\s,])' + re.escape(param) + r'(?=\s*[,)=>])',        new_line = re.sub(        # Broader search            continue            changed = True            lines[idx] = before + param + ': any' + rest[len(param):]        if pm2:        pm2 = re.match(re.escape(param) + r'(?=[\s,)\]=])', rest)        rest = line[col:]        before = line[:col]        # Direct replacement at column position                continue                changed = True                lines[idx] = new_line            if new_line != line:            )                line                lambda m: '{' + m.group(1) + '}: any' + m.group(2),                r'\{([^}]*\b' + re.escape(param) + r'\b[^}]*)\}(\s*(?:\)|=>))',            new_line = re.sub(            # {param} needs to become {param}: any        if 'Binding element' in err['msg']:        # Handle binding element in destructuring            continue        if re.match(re.escape(param) + r'\s*:', after):        after = line[col:]        # Skip if already typed        col = err['col'] - 1        param = pm.group(1)            continue        if not pm:        pm = re.search(r"(?:Parameter|Binding element) '(\w+)'", err['msg'])        # Extract param name        line = lines[idx]            continue        if idx >= len(lines):        idx = err['line'] - 1    for err in sorted(ts_errs, key=lambda e: (-e['line'], -e['col'])):    changed = False    lines = content.split('\n')        continue    if not content:    content = read_file(filepath)        continue    if not ts_errs:    ts_errs = [e for e in file_errors if e['code'] in ('TS7006', 'TS7031')]for filepath, file_errors in errors.items():# Fix TS7006 / TS7031: add `: any` to implicit any paramsfixed = 0print(f'Total errors: {total}')total = sum(len(v) for v in errors.values())        })            'line': int(ln), 'col': int(col), 'code': code, 'msg': msg        errors.setdefault(f, []).append({        f, ln, col, code, msg = m.groups()    if m:    m = re.match(r'^(src/.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$', line)for line in (result.stdout + result.stderr).split('\n'):errors = {}result = subprocess.run(['npx', 'tsc', '--noEmit'], capture_output=True, text=True, cwd=ROOT)# Run tsc and parse errors        f.write(content)    with open(os.path.join(ROOT, rel), 'w') as f:def write_file(rel, content):        return f.read()    with open(p, 'r') as f:        ['npx', 'tsc', '--noEmit'],
        capture_output=True, text=True, cwd=ROOT
    )
    errors = {}
    for line in (result.stdout + result.stderr).split('\n'):
        m = re.match(r'^(src/.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$', line)
        if m:
            f, ln, col, code, msg = m.groups()
            errors.setdefault(f, []).append({
                'line': int(ln), 'col': int(col), 'code': code, 'msg': msg
            })
    return errors

def read(rel):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        return None
    with open(p, 'r') as f:
        return f.read()

def write(rel, content):
    with open(os.path.join(ROOT, rel), 'w') as f:
        f.write(content)

def fix_ts7006(file, file_errors):
    """Fix TS7006: add `: any` to implicit any parameters."""
    ts7006 = [e for e in file_errors if e['code'] == 'TS7006' or e['code'] == 'TS7031']
    if not ts7006:
        return False

    content = read(file)
    if not content:
        return False

    lines = content.split('\n')
    changed = False

    # Process from bottom to top
    for err in sorted(ts7006, key=lambda e: (-e['line'], -e['col'])):
        idx = err['line'] - 1
        if idx >= len(lines):
            continue
        line = lines[idx]

        # Extract param name
        m = re.search(r"(?:Parameter|Binding element) '(\w+)'", err['msg'])
        if not m:
            continue
        param = m.group(1)

        col = err['col'] - 1

        # Check if it's a destructured binding element like {isSelected}
        # which needs ({isSelected}: any) or {isSelected}: any
        if 'Binding element' in err['msg']:
            # Look for the destructuring pattern that contains this param
            # Pattern: ({param}) => or ({param, ...}) =>
            # We need to add type after the closing brace
            # Find the destructuring pattern
            new_line = line
            # Try: ({param}) => → ({param}: any) =>
            new_line = re.sub(
                r'\{([^}]*\b' + re.escape(param) + r'\b[^}]*)\}\s*(?=\)?\s*=>)',
                lambda m: '{' + m.group(1) + '}: any',
                line
            )
            if new_line != line:
                lines[idx] = new_line
                changed = True
                continue

        # Check the character at the column position
        # Simple param: find param name at or near the column
        before = line[:col]
        after = line[col:]

        # Check if param is at this position already followed by `: `
        if re.match(re.escape(param) + r'\s*:', after):
            continue  # Already typed

        # Try to add `: any` after the param name at this position
        param_match = re.match(re.escape(param) + r'(?=[\s,)\]=])', after)
        if param_match:
            lines[idx] = before + param + ': any' + after[len(param):]
            changed = True
            continue

        # Broader search: find the param anywhere in the line that's untyped
        # Look for (param) or (param, or ,param) patterns
        new_line = re.sub(
            r'(?<=[(\s,])' + re.escape(param) + r'(?=\s*[,)=>])',
            param + ': any',
            line,
            count=1
        )
        if new_line != line:
            lines[idx] = new_line
            changed = True

    if changed:
        write(file, '\n'.join(lines))
    return changed


def fix_ts6133(file, file_errors):
    """Fix TS6133/TS6196: remove unused imports or prefix with underscore."""
    unused = [e for e in file_errors if e['code'] in ('TS6133', 'TS6196')]
    if not unused:
        return False

    content = read(file)
    if not content:
        return False

    lines = content.split('\n')
    changed = False

    for err in sorted(unused, key=lambda e: -e['line']):
        idx = err['line'] - 1
        if idx >= len(lines):
            continue
        line = lines[idx]

        m = re.search(r"'(\w+)'", err['msg'])
        if not m:
            continue
        name = m.group(1)

        # If it starts with underscore already, skip
        if name.startswith('_'):
            # Remove the entire line if it's an import line
            if 'import ' in line:
                lines[idx] = ''
                changed = True
            continue

        # Handle import lines
        if 'import ' in line:
            # Named import: import { A, B, C } from '...'
            named_match = re.search(r'import\s+\{([^}]+)\}\s+from', line)
            if named_match:
                names = [n.strip() for n in named_match.group(1).split(',')]
                filtered = [n for n in names if n.split(' as ')[-1].strip() != name and n.strip() != name]
                if len(filtered) == 0:
                    # Check if there's also a default or type import
                    if re.match(r"import\s+type\s+\{", line) or re.match(r"import\s+\{", line):
                        lines[idx] = ''
                        changed = True
                elif len(filtered) < len(names):
                    new_imports = ', '.join(filtered)
                    lines[idx] = re.sub(r'\{[^}]+\}', '{ ' + new_imports + ' }', line)
                    changed = True
                continue

            # Default import: import Name from '...'
            default_match = re.match(r"^import\s+(\w+)\s+from\s+", line)
            if default_match and default_match.group(1) == name:
                lines[idx] = ''
                changed = True
                continue

        # For variables, try prefixing with underscore (but only for destructured vars)
        # Don't modify non-import declarations - they'd need more context
        var_match = re.search(r'\b(const|let|var)\s+' + re.escape(name) + r'\b', line)
        if var_match:
            lines[idx] = line.replace(name, '_' + name, 1)
            changed = True

    if changed:
        write(file, '\n'.join(lines))
    return changed


def main():
    errors = run_tsc()
    total = sum(len(v) for v in errors.values())
    print(f'Total errors: {total}')

    fixed_files = set()

    # Fix TS7006 first
    for file, file_errors in errors.items():
        if fix_ts7006(file, file_errors):
            fixed_files.add(file)
            print(f'  TS7006 fixed: {file}')

    # Fix TS6133/TS6196
    for file, file_errors in errors.items():
        if fix_ts6133(file, file_errors):
            fixed_files.add(file)
            print(f'  TS6133 fixed: {file}')

    print(f'\nFixed {len(fixed_files)} files')

if __name__ == '__main__':
    main()
