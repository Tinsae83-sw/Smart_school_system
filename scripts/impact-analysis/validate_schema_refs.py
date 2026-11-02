#!/usr/bin/env python3
"""
Static impact-analysis validator for the Smart School Connect backend (v2).

Answers: "which prisma call sites reference a field/relation that does not
exist on the model they are queried against?"

Improvements over v1:
  * reports exact file:line captured during the walk (no global re-scan)
  * keeps a model-context stack so OR/AND arrays and nested relation
    `include`/`select` blocks resolve against the correct model
  * does not descend into Json-typed columns (their keys are user data,
    not Prisma fields)
  * understands groupBy's `by` / `having` / `orderBy` aggregate args

This is the evidence-gathering step of an impact analysis.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCHEMA = os.path.join(ROOT, "backend", "prisma", "schema.prisma")
SRCDIR = os.path.join(ROOT, "backend", "src")

SCALAR_TYPES = {
    "String", "Int", "Boolean", "DateTime", "Decimal", "Json",
    "Float", "Bytes", "BigInt",
}

# legal keys at the top level of a prisma call, and legal filter/aggregate
# operators anywhere below. none of these are model fields.
QUERY_OPS = {
    # query args
    "where", "orderBy", "cursor", "take", "skip", "distinct", "select",
    "include", "data", "onConflict", "offset", "batchSize", "isolationLevel",
    "relationLoadStrategy", "by", "having", "limit",
    # write ops
    "create", "connect", "connectOrCreate", "set", "disconnect", "update",
    "upsert", "delete", "skipDuplicates", "updateMany", "deleteMany",
    # relation / composite helpers
    "relation", "fields", "references", "mode",
    # scalar filters
    "equals", "not", "in", "nin", "gt", "gte", "lt", "lte", "contains",
    "startsWith", "endsWith", "has", "hasEvery", "hasSome", "isEmpty",
    "some", "every", "none", "isSet",
    # logical
    "AND", "OR", "NOT",
    # aggregates
    "_sum", "_count", "_avg", "_min", "_max",
    # json path / list ops
    "push", "path", "string_contains", "string_starts_with", "string_ends_with",
    "array_contains", "array_starts_with", "array_ends_with", "sort",
    # arithmetic update ops
    "increment", "decrement", "multiply", "divide", "set",
}


def parse_schema(path):
    """Return {model: {field: (target_model_or_None, is_json_bool)}}."""
    text = open(path, encoding="utf-8").read()
    models = {}
    for m in re.finditer(r"^model\s+(\w+)\s*\{", text, re.M):
        name = m.group(1)
        start = m.end()
        depth, i = 1, start
        while i < len(text) and depth > 0:
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
            i += 1
        body = text[start:i - 1]

        fields = {}
        uniques = set()
        for raw in body.splitlines():
            line = raw.strip()
            if not line or line.startswith("//"):
                continue
            # compound unique / id blocks become generated where-keys
            um = re.match(r"@@unique\(\[(.*?)\]\)", line) or \
                 re.match(r"@@id\(\[(.*?)\]\)", line)
            if um:
                cols = [c.strip() for c in um.group(1).split(",") if c.strip()]
                if cols:
                    uniques.add("_".join(cols))
                continue
            if line.startswith("@@"):
                continue
            tok = line.split()
            if len(tok) < 2:
                continue
            fname, ftype = tok[0], tok[1]
            is_list = ftype.endswith("[]")
            base = ftype.replace("[]", "")
            is_json = base == "Json"
            target = None
            if (is_list or base not in SCALAR_TYPES) and base[:1].isupper() and not is_json:
                target = base
            fields[fname] = (target, is_json)
        models[name] = (fields, uniques)
    return models


def line_of(text, idx):
    return text[:idx].count("\n") + 1


def parse_calls(src):
    """Yield (model, method, argtext, arg_start_offset).

    arg_start_offset is the source position of the first character of the
    argument text, so src[arg_start_offset + i] == arg[i] for every index i.
    """
    for m in re.finditer(r"prisma\.(\w+)\.(\w+)\s*\(", src):
        model, method = m.group(1), m.group(2)
        i, depth, buf = m.end(), 1, []
        while i < len(src) and depth > 0:
            ch = src[i]
            if ch in "\"'`":
                # skip string/template literals so brackets and parens inside
                # string data (e.g. '[GRIEVANCE') don't unbalance the depth.
                # the literal's bytes must still be buffered so offsets keep
                # mapping 1:1 onto the source.
                start = i
                q = ch
                i += 1
                while i < len(src) and src[i] != q:
                    if src[i] == "\\":
                        i += 1
                    i += 1
                i += 1
                buf.append(src[start:i])
                continue
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
                if depth == 0:
                    break
            buf.append(ch)
            i += 1
        yield model, method, "".join(buf), m.end()


def split_top_keys(arg):
    """Split an object literal body into [(key, value_text, value_offset)]."""
    out, i, n = [], 0, len(arg)
    depth = 0
    while i < n:
        ch = arg[i]
        if ch in "\"'`":
            q = ch
            i += 1
            while i < n and arg[i] != q:
                if arg[i] == "\\":
                    i += 1
                i += 1
        elif ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif depth == 0:
            m = re.compile(r"([A-Za-z_$][\w$]*)\s*:").match(arg, i)
            if m:
                key, vstart = m.group(1), m.end()
                vd, j = 0, vstart
                while j < n:
                    c = arg[j]
                    if c in "\"'`":
                        q = c
                        j += 1
                        while j < n and arg[j] != q:
                            if arg[j] == "\\":
                                j += 1
                            j += 1
                    elif c in "([{":
                        vd += 1
                    elif c in ")]}":
                        if vd == 0:
                            break
                        vd -= 1
                    elif c == "," and vd == 0:
                        break
                    j += 1
                # account for whitespace between ':' and the value so that
                # reported offsets map to the real source position
                lead = 0
                while vstart + lead < j and arg[vstart + lead] in " \t\r\n":
                    lead += 1
                out.append((key, arg[vstart + lead:j].strip(), vstart + lead))
                i = j
                continue
        i += 1
    return out


def walk(arg, base_off, model, models, findings):
    """Validate keys in an object literal, tracking nested model context."""
    if model not in models:
        return
    fields, uniques = models[model]

    for key, value, voff in split_top_keys(arg):
        abs_off = base_off + voff
        is_field = key in fields
        is_op = key in QUERY_OPS
        is_compound = key in uniques

        if not is_field and not is_op and not is_compound:
            findings.append((model, key, abs_off))
            # still descend: nested keys may reveal more, but stop here to
            # avoid compounding one root cause into many duplicates
            continue

        if not value.startswith("{"):
            # array literal: OR/AND/NOT lists, `by: [...]`, `in: [...]`
            if value.startswith("["):
                inner = value[1:-1]
                vd = 0
                seg_start = 0
                for idx, c in enumerate(inner):
                    if c in "{[":
                        vd += 1
                    elif c in "}]":
                        vd -= 1
                    elif c == "," and vd == 0:
                        seg = inner[seg_start:idx]
                        if seg.strip().startswith("{"):
                            walk(seg.strip()[1:-1], abs_off + 1 + seg_start,
                                 model, models, findings)
                        seg_start = idx + 1
                seg = inner[seg_start:]
                if seg.strip().startswith("{"):
                    walk(seg.strip()[1:-1], abs_off + 1 + seg_start,
                         model, models, findings)
            continue

        inner = value[1:-1]
        if not inner.strip():
            continue

        # decide the model context for the nested object
        next_model = model
        if key in ("include", "select") and is_field:
            tgt, is_json = fields[key]
            if is_json:
                continue          # Json column keys are user data, not fields
            next_model = tgt if tgt else model
        elif is_field:
            tgt, is_json = fields[key]
            if is_json:
                continue
            if tgt:
                next_model = tgt
        elif key in ("where", "orderBy", "data", "onConflict", "having"):
            next_model = model

        walk(inner, abs_off + 1, next_model, models, findings)


def main():
    models = parse_schema(SCHEMA)
    print(f"parsed {len(models)} models, "
          f"{sum(len(v[0]) for v in models.values())} fields\n")

    findings = []
    for dirpath, _, files in os.walk(SRCDIR):
        for fn in sorted(files):
            if not fn.endswith(".js"):
                continue
            fp = os.path.join(dirpath, fn)
            src = open(fp, encoding="utf-8", errors="replace").read()
            for model, method, arg, off in parse_calls(src):
                real = model[0].upper() + model[1:]
                if real not in models:
                    continue
                if not arg.strip().startswith("{"):
                    continue
                loc = len(findings)
                walk(arg[1:-1], off + arg.index("{") + 1, real, models, findings)
                for k in range(loc, len(findings)):
                    m2, key, o2 = findings[k]
                    findings[k] = (m2, key, o2, os.path.relpath(fp, ROOT),
                                   line_of(src, o2), method)

    if not findings:
        print("No schema/field mismatches detected.")
        return 0

    findings.sort(key=lambda r: (r[3], r[4]))
    by_file = {}
    for row in findings:
        by_file.setdefault(row[3], []).append(row)

    total = 0
    for fp in sorted(by_file):
        print(f"=== {fp} ===")
        for model, key, _, _, lineno, method in by_file[fp]:
            print(f"  L{lineno:<5} {model}.{key:<24} in .{method}()")
            total += 1
        print()

    print(f"TOTAL mismatched keys: {total}  across {len(by_file)} files")
    return 1


if __name__ == "__main__":
    sys.exit(main())
