# dbx-custom

`dbx-custom` is a personal custom fork of [DBX](https://github.com/t8y2/dbx). DBX is a lightweight cross-platform database manager with desktop, Web/Docker, AI SQL assistant, MCP integration, and broad database support.

This repository keeps DBX's original capabilities and adds workflow-focused improvements for SQL Server usage, SQL editor behavior, packaging, and entity code generation.

简体中文: [README.zh-CN.md](README.zh-CN.md)

## Relationship With DBX

- Upstream project: [t8y2/dbx](https://github.com/t8y2/dbx)
- This repository: a custom fork maintained on top of DBX
- License: inherited from DBX, [Apache-2.0](LICENSE)

Thanks to the DBX author and community contributors for building the foundation. Most of the architecture, product experience, UI, and cross-platform database tooling come from the upstream DBX project. Changes in this fork are mainly additions for personal workflow and specific database scenarios.

## Custom Improvements

### SQL Server Windows Authentication

- SQL Server connections support Windows authentication.
- When Windows authentication is selected, the connection dialog hides username and password inputs.
- Submitted and tested connection configs clear username and password, using the current Windows identity instead.

### SQL Editor Selection Rendering Fix

- Fixed incorrect selection shadow rendering when selecting SQL text upward from lower lines.
- Only actually selected text ranges are rendered with selection shadow.
- Added unit tests for the trimmed CodeMirror selection layer.

### Entity Code Generation for Tables and Views

- Table and view context menus now include `Generate Entity Code`.
- A dialog lets users select language and ORM.
- Generated code can be copied or saved.
- Currently supported:
  - C#: EF Core, SqlSugar
  - Java: JPA / Hibernate, MyBatis Plus
  - TypeScript: TypeORM
  - Go: GORM
  - Python: SQLAlchemy
- Generated code uses table name, schema, column types, primary keys, nullable flags, field mapping, and comments where metadata is available.

### Single Portable exe Build Notes

- README now includes the Windows single-file portable exe build command.
- This is useful when copying `dbx.exe` directly to another machine.

### Update History

Custom update notes are stored in:

- [docs/update-history/Feature-20260616.md](docs/update-history/Feature-20260616.md)

## Original DBX Capabilities

This fork still inherits DBX's core features:

- Supports MySQL, PostgreSQL, SQLite, Redis, MongoDB, DuckDB, ClickHouse, SQL Server, Oracle, Elasticsearch, and many other databases.
- Query editor with SQL highlighting, autocomplete, formatting, query history, and tabs.
- Data grid browsing, filtering, sorting, editing, and export.
- Schema browser, object browser, table structure editor, ER diagram, explain plan, and schema diff.
- AI SQL assistant and MCP Server.
- Tauri desktop app, Web version, and Docker self-hosting.

For the full upstream feature list, see [DBX](https://github.com/t8y2/dbx).

## Requirements

- Node.js >= 22.13.0
- pnpm 10.x
- Rust toolchain
- Tauri 2 prerequisites for desktop builds

If dependency installation needs a proxy, configure one first, for example:

```powershell
$env:HTTP_PROXY="http://192.168.125.112:10808"
$env:HTTPS_PROXY="http://192.168.125.112:10808"
```

## Common Commands

### Install Dependencies

```bash
corepack pnpm install
```

### Start Desktop Development

```bash
corepack pnpm dev:tauri
```

### Start Web Frontend

```bash
corepack pnpm dev:web
```

### Start Web Backend

```bash
corepack pnpm dev:backend
```

### Type Check

```bash
corepack pnpm typecheck
```

### Run Frontend Tests

```bash
corepack pnpm test
```

Run a specific test:

```bash
corepack pnpm vitest run apps/desktop/src/lib/__tests__/entityCodeGenerator.spec.ts
```

### Format Frontend Code

```bash
corepack pnpm fmt
```

Format a specific file:

```bash
corepack pnpm exec oxfmt apps/desktop/src/components/objects/EntityCodeDialog.vue
```

### Rust Check

```bash
cargo check
```

Skip DuckDB to speed up local checks:

```bash
cargo check --no-default-features
```

### Build Installer

```bash
corepack pnpm tauri build
```

Installer output directory:

```text
src-tauri/target/release/bundle/
```

### Build Single Portable exe

```bash
corepack pnpm tauri build --no-bundle
```

Windows output file:

```text
src-tauri/target/release/dbx.exe
```

If your build log reports `target/release/dbx.exe` from the repository root, follow the actual build output.

### Pre-build Checks

```bash
corepack pnpm typecheck
corepack pnpm test
cargo check
```

## Tech Stack

- Tauri 2
- Vue 3 + TypeScript
- shadcn-vue + Tailwind CSS
- CodeMirror 6
- Rust
- sqlx / tiberius / redis-rs / mongodb and other database drivers

## Acknowledgements

Thanks to the [DBX](https://github.com/t8y2/dbx) project and its contributors. This fork depends on DBX's substantial engineering work, including the cross-platform desktop app, database connectivity, query editor, data grid, schema tools, AI/MCP integration, and overall product experience.

If this custom version is useful, consider following and supporting the upstream DBX project as well.

## License

[Apache-2.0](LICENSE)
