#!/usr/bin/env python3
"""Rewrite live HRMS SQL connection settings to one environment."""

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

DATABASE_KEYS = (
    r"Database\s*=\s*",
    r"Initial\s+Catalog\s*=\s*",
)
SERVER_KEYS = (
    r"Server\s*=\s*",
    r"Data\s+Source\s*=\s*",
)
USER_KEYS = (
    r"User\s+ID\s*=\s*",
    r"Uid\s*=\s*",
)
PASSWORD_KEYS = (
    r"Password\s*=\s*",
    r"Pwd\s*=\s*",
)

ADD_TAG = re.compile(r"<add\b(?:[^>\"']|\"[^\"]*\"|'[^']*')*>", re.I | re.S)
COMMENT = re.compile(r"<!--.*?-->", re.S)
ATTR = r"(\b{name}\s*=\s*\")([^\"]*)(\")"


class RewriteError(Exception):
    pass


def load_json(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def replace_one_of(text, patterns, new_value, label):
    for pattern in patterns:
        regex = re.compile("(" + pattern + r")[^;]*", re.I)
        if regex.search(text):
            return regex.sub(lambda match: match.group(1) + new_value, text, count=1)
    raise RewriteError(f"connection string has no {label}: {text}")


def update_connection_string(value, login, database):
    updated = replace_one_of(value, DATABASE_KEYS, database, "database")
    updated = replace_one_of(updated, SERVER_KEYS, login["server"], "server")
    updated = replace_one_of(updated, USER_KEYS, login["user"], "user")
    updated = replace_one_of(updated, PASSWORD_KEYS, login["password"], "password")
    return updated


def json_string_field(name):
    return re.compile(
        rf'("{re.escape(name)}"\s*:\s*")((?:\\.|[^"\\])*)(")'
    )


def replace_json_string(text, key, new_value):
    regex = json_string_field(key)

    def replacer(match):
        return match.group(1) + new_value.replace("\\", "\\\\").replace('"', '\\"') + match.group(3)

    updated, count = regex.subn(replacer, text, count=1)
    if count != 1:
        raise RewriteError(f'missing JSON string "{key}"')
    return updated


def object_span(text, key):
    match = re.search(rf'"{re.escape(key)}"\s*:', text)
    if not match:
        raise RewriteError(f'missing JSON object "{key}"')
    index = match.end()
    while index < len(text) and text[index].isspace():
        index += 1
    if index >= len(text) or text[index] != "{":
        raise RewriteError(f'"{key}" is not a JSON object')
    start = index
    depth = 0
    in_string = False
    escaped = False
    for cursor in range(index, len(text)):
        char = text[cursor]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return start, cursor + 1
    raise RewriteError(f'unclosed JSON object "{key}"')


def update_db_object(text, key, login, database):
    start, end = object_span(text, key)
    body = text[start:end]
    body = replace_json_string(body, "user", login["user"])
    body = replace_json_string(body, "password", login["password"])
    body = replace_json_string(body, "server", login["server"])
    body = replace_json_string(body, "database", database)
    return text[:start] + body + text[end:]


def update_db_settings(text, entry, login):
    for key, database in entry.get("connectionStrings", {}).items():
        regex = json_string_field(key)

        def replacer(match, database=database):
            updated = update_connection_string(match.group(2), login, database)
            return match.group(1) + updated + match.group(3)

        text, count = regex.subn(replacer, text, count=1)
        if count != 1:
            raise RewriteError(f'missing connection string "{key}"')
    for key, database in entry.get("objects", {}).items():
        text = update_db_object(text, key, login, database)
    return text


def comment_spans(text):
    return [(match.start(), match.end()) for match in COMMENT.finditer(text)]


def inside_comment(span, spans):
    start, end = span
    return any(start < comment_end and end > comment_start for comment_start, comment_end in spans)


def attr_pattern(name):
    return re.compile(ATTR.format(name=re.escape(name)), re.I)


def update_xml(text, names, login):
    spans = comment_spans(text)
    found = {name: 0 for name in names}
    pieces = []
    cursor = 0
    for match in ADD_TAG.finditer(text):
        if inside_comment(match.span(), spans):
            continue
        tag = match.group(0)
        name_match = attr_pattern("name").search(tag)
        value_match = attr_pattern("connectionString").search(tag)
        if not name_match or not value_match:
            continue
        name = name_match.group(2)
        if name not in names:
            continue
        updated_value = update_connection_string(value_match.group(2), login, names[name])
        updated_tag = tag[: value_match.start(2)] + updated_value + tag[value_match.end(2) :]
        pieces.append(text[cursor:match.start()])
        pieces.append(updated_tag)
        cursor = match.end()
        found[name] += 1
    pieces.append(text[cursor:])
    missing = [name for name, count in found.items() if count == 0]
    if missing:
        raise RewriteError("missing uncommented connection string(s): " + ", ".join(missing))
    return "".join(pieces)


def pool_span(text, function_name):
    function_at = text.find(f"function {function_name}")
    if function_at < 0:
        raise RewriteError(f"missing function {function_name}")
    pool_at = text.find("new mssql.ConnectionPool(", function_at)
    if pool_at < 0:
        raise RewriteError(f"missing ConnectionPool in {function_name}")
    brace = text.find("{", pool_at)
    if brace < 0:
        raise RewriteError(f"missing ConnectionPool object in {function_name}")
    return object_from_brace(text, brace)


def object_from_brace(text, start):
    depth = 0
    in_string = False
    escaped = False
    quote = ""
    for cursor in range(start, len(text)):
        char = text[cursor]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                in_string = False
            continue
        if char in ("'", '"'):
            in_string = True
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return start, cursor + 1
    raise RewriteError("unclosed ConnectionPool object")


def replace_js_string(text, field, value):
    regex = re.compile(
        rf'({re.escape(field)}\s*:\s*")((?:\\.|[^"\\])*)(")'
    )
    updated, count = regex.subn(
        lambda match: match.group(1) + value.replace("\\", "\\\\").replace('"', '\\"') + match.group(3),
        text,
        count=1,
    )
    if count != 1:
        raise RewriteError(f"missing JavaScript field {field}")
    return updated


def update_js_pool(text, entry, login):
    start, end = pool_span(text, entry["function"])
    body = text[start:end]
    body = replace_js_string(body, "user", login["user"])
    body = replace_js_string(body, "password", login["password"])
    body = replace_js_string(body, "server", login["server"])
    body = replace_js_string(body, "database", entry["database"])
    return text[:start] + body + text[end:]


def read_source(path):
    raw = path.read_bytes()
    newline = "\r\n" if b"\r\n" in raw else "\n"
    return raw.decode("utf-8").replace("\r\n", "\n"), newline


def write_source(path, text, newline):
    payload = text.replace("\n", newline)
    path.write_bytes(payload.encode("utf-8"))


def apply_file(path, original, updated, newline):
    if updated == original:
        print(f"unchanged  {path}")
        return False
    write_source(path, updated, newline)
    print(f"updated    {path}")
    return True


def rewrite_tree(root, environment_name, environments, manifest):
    try:
        login = environments[environment_name]
    except KeyError as error:
        raise RewriteError(
            "environment must be one of: " + ", ".join(environments)
        ) from error
    for field in ("server", "user", "password"):
        if not str(login.get(field, "")).strip():
            raise RewriteError(f"{environment_name} is missing {field}")

    print(
        f"{environment_name}: {login['user']} @ {login['server']}"
    )
    if login.get("readOnly"):
        print(f"Warning: the {environment_name} login is read-only. Writes will fail.")

    updated_count = 0
    for entry in manifest["dbSettings"]:
        path = root / entry["path"]
        original, newline = read_source(path)
        updated = update_db_settings(original, entry, login)
        if apply_file(path, original, updated, newline):
            updated_count += 1
            for key, database in entry.get("connectionStrings", {}).items():
                print(f"           {key} -> {database}")
            for key, database in entry.get("objects", {}).items():
                print(f"           {key} -> {database}")
    for entry in manifest["xml"]:
        path = root / entry["path"]
        original, newline = read_source(path)
        updated = update_xml(original, entry["names"], login)
        if apply_file(path, original, updated, newline):
            updated_count += 1
            for key, database in entry["names"].items():
                print(f"           {key} -> {database}")
    for entry in manifest["jsPools"]:
        path = root / entry["path"]
        original, newline = read_source(path)
        updated = update_js_pool(original, entry, login)
        if apply_file(path, original, updated, newline):
            updated_count += 1
            print(f"           {entry['function']} -> {entry['database']}")
    print(f"{updated_count} file(s) updated")
    return updated_count


def main(argv):
    if len(argv) != 3:
        print("Usage: rewrite.py <dev|qa|staging|replica> <source-root>", file=sys.stderr)
        return 2
    environment_name = argv[1]
    root = Path(argv[2]).resolve()
    try:
        rewrite_tree(
            root,
            environment_name,
            load_json(SCRIPT_DIR / "environments.json"),
            load_json(SCRIPT_DIR / "manifest.json"),
        )
    except (OSError, json.JSONDecodeError, RewriteError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
