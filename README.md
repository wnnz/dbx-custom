# dbx-custom

`dbx-custom` 是基于 [DBX](https://github.com/t8y2/dbx) fork 的个人定制版本。DBX 是一个轻量、跨平台的数据库管理工具，支持桌面端、Web/Docker 部署、AI SQL 助手、MCP 集成以及多种数据库连接。

本仓库在保留 DBX 原有能力的基础上，针对日常 SQL Server 使用、编辑器体验、打包方式和代码生成流程做了一些本地化优化。

## 与原 DBX 的关系

- 上游项目：[t8y2/dbx](https://github.com/t8y2/dbx)
- 当前仓库：基于 DBX fork 后维护的定制分支
- 开源协议：继承 DBX 的 [Apache-2.0](LICENSE)

感谢 DBX 项目作者和社区贡献者提供了优秀的基础项目。本仓库的大部分架构、功能、界面和跨平台能力都来自 DBX 原项目；这里的改动主要是围绕个人工作流和特定数据库使用场景进行补充。

## 当前优化内容

### SQL Server Windows 身份验证

- SQL Server 连接支持 Windows 身份验证。
- 选择 Windows 登录后，连接窗口不再展示用户名和密码。
- 提交连接配置和测试连接时会清空用户名、密码，直接使用当前 Windows 用户身份。

### SQL 编辑器选择阴影修复

- 修复从下向上选择 SQL 文本时，未实际选中的行尾文本也出现阴影的问题。
- 选中效果只渲染实际选中的文本区域，避免整行阴影误导。
- 添加了相关单元测试。

### 执行结果历史

- 多次执行 SQL 时，结果区默认只展示最后一批执行结果。
- 结果集页签左侧新增“执行历史”入口。
- 执行历史下拉展示最近 5 批执行结果，支持切换查看历史结果。
- 每批内部仍保留多个结果集的“结果 1 / 结果 2 ...”页签。

### SQL Server 影响行统计修复

- 修复 SQL Server 执行 INSERT、UPDATE、DELETE 等 SQL 后，影响行数一直显示为 0 的问题。
- 执行结果中的返回行数和影响行数会按实际执行结果更新。
- 适用于执行多语句或写入语句后需要确认影响行数的场景。

### 表和视图生成实体代码

- 表和视图右键菜单新增“生成实体代码”。
- 支持在弹框中选择语言和 ORM。
- 支持复制和保存生成结果。
- 当前支持：
  - C#：EF Core、SqlSugar
  - Java：JPA / Hibernate、MyBatis Plus
  - TypeScript：TypeORM
  - Go：GORM
  - Python：SQLAlchemy
- 生成代码会尽量包含表名、Schema、字段类型、主键、nullable、字段映射和注释信息。

### 更新历史

本仓库的定制更新记录保存在：

- [docs/update-history/Feature-20260616.md](docs/update-history/Feature-20260616.md)

## 原 DBX 核心能力

本 fork 仍然继承 DBX 的主要能力：

- 支持 MySQL、PostgreSQL、SQLite、Redis、MongoDB、DuckDB、ClickHouse、SQL Server、Oracle、Elasticsearch 等多种数据库。
- 支持查询编辑器、SQL 高亮、自动补全、格式化、查询历史和多标签页。
- 支持表数据浏览、过滤、排序、编辑、导出。
- 支持 Schema 浏览、对象浏览、表结构编辑、ER 图、执行计划、Schema 对比。
- 支持 AI SQL 助手和 MCP Server。
- 支持 Tauri 桌面端、Web 版本和 Docker 自托管。

更完整的功能说明请参考上游项目：[DBX](https://github.com/t8y2/dbx)。

## 环境要求

- Node.js >= 22.13.0
- pnpm 10.x
- Rust 工具链
- Windows 构建桌面端时需要具备 Tauri 2 所需环境

如果需要安装依赖但网络受限，可以配置代理，例如：

```powershell
$env:HTTP_PROXY="http://192.168.125.112:10808"
$env:HTTPS_PROXY="http://192.168.125.112:10808"
```

## 常用命令

### 安装依赖

```bash
corepack pnpm install
```

### 启动桌面端开发模式

```bash
corepack pnpm dev:tauri
```

### 启动 Web 前端

```bash
corepack pnpm dev:web
```

### 启动 Web 后端

```bash
corepack pnpm dev:backend
```

### 类型检查

```bash
corepack pnpm typecheck
```

### 运行前端测试

```bash
corepack pnpm test
```

运行指定测试：

```bash
corepack pnpm vitest run apps/desktop/src/lib/__tests__/entityCodeGenerator.spec.ts
```

### 格式化前端代码

```bash
corepack pnpm fmt
```

格式化指定文件：

```bash
corepack pnpm exec oxfmt apps/desktop/src/components/objects/EntityCodeDialog.vue
```

### Rust 检查

```bash
cargo check
```

跳过 DuckDB，加快本地检查：

```bash
cargo check --no-default-features
```

### 构建安装包

```bash
corepack pnpm tauri build
```

安装包输出目录：

```text
src-tauri/target/release/bundle/
```

### 构建单文件免安装 exe

```bash
corepack pnpm tauri build --no-bundle
```

Windows 输出文件：

```text
src-tauri/target/release/dbx.exe
```

如果你在仓库根目录看到的输出路径是 `target/release/dbx.exe`，以实际构建日志为准。

### 构建前完整检查

```bash
corepack pnpm typecheck
corepack pnpm test
cargo check
```

## 技术栈

- Tauri 2
- Vue 3 + TypeScript
- shadcn-vue + Tailwind CSS
- CodeMirror 6
- Rust
- sqlx / tiberius / redis-rs / mongodb 等数据库驱动

## 致谢

感谢 [DBX](https://github.com/t8y2/dbx) 项目及其贡献者。这个 fork 的价值建立在 DBX 已经完成的大量工程工作之上，包括跨平台桌面框架、数据库连接能力、查询编辑器、数据表格、Schema 工具、AI/MCP 集成和整体产品体验。

如果这个定制版本对你有帮助，也建议关注和支持原 DBX 项目。

## 许可证

[Apache-2.0](LICENSE)
