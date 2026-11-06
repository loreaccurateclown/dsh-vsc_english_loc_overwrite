# dsh-vsc English localization overwrite

Overwrites the Chinese UI strings in a locally installed
[`dsh-vsc`](https://github.com/zhibailu/dsh-vsc) VS Code extension with English
text.

dsh-vsc ships a Chinese UI only — there is no English localization to switch
to. This script replaces the strings in the installed build directly.

**Specific to dsh-vsc 0.3.2.** The zh→en tables are keyed to the exact strings
in that build. On a newer version some strings will not match and will stay
Chinese; extend the tables in `maps/` to cover them.

## Requirements

- Node.js 18+ (no dependencies)
- a locally installed `local.dsh-vsc-*` extension

## Usage

```bash
# newest local.dsh-vsc-* under ~/.vscode/extensions
node apply.js

# explicit folder (e.g. a specific version)
node apply.js --dir "C:/Users/you/.vscode/extensions/local.dsh-vsc-0.3.2"

# preview without writing
node apply.js --dry-run
```

Then **Reload Window** in VS Code — some strings are read at extension
activation, so a webview reload is not enough.

Each modified file is backed up to `<file>.bak` on its first write.

## What gets overwritten

| File | Table |
|---|---|
| `dist/media/native/panel.html` | `maps/core.txt` + `maps/extra.txt` |
| `dist/media/native/settings.html` | same |
| `dist/media/shell.html` | same |
| `package.json` | same (one setting description) |
| `dist/extension.js` | `maps/extension.txt` + `maps/extra.txt` |

The two tables are kept separate because `maps/core.txt` contains short
fragments (`文件 → File` and the like) that would corrupt source identifiers if
applied to `extension.js`.

`extension.js` stores Chinese as `\uXXXX` escapes; the script decodes those
before matching.

## Limits

- Only exact whole-string matches are replaced. Strings added or renamed after
  0.3.2 stay Chinese.
- Updating or reinstalling the extension replaces its folder, wiping the
  changes — rerun the script afterwards.
- Only the extension's own files are touched. DSH, its profiles and its
  dictionaries are not modified.

## Tested against

`local.dsh-vsc` 0.3.2 (zhibailu/dsh-vsc v0.3.2).

## License

The strings originate from the MIT-licensed dsh-vsc extension; the tables and
script are provided under the same terms.
