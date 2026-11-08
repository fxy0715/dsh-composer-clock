# dsh-composer-clock

<img src="./icon.svg" width="64" alt="输入框时钟图标">

为 **DeepSeek Harness（DSH）** 的消息输入框添加一条轻量时钟：显示本地时间与简短日期，悬停可查看完整时间和时区。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 包名 | `@local/dsh-composer-clock` |
| 当前版本 | `1.2.0` |
| 插件形态 | Harness 本地 Bundle，界面运行在 Client 端 |
| 技术栈 | TypeScript、React（由 Harness 提供）、Cordis |
| 显示位置 | `conversation.composer.dock`，消息输入框下方 |
| 界面语言 | 内置中文、英文文案，日期随 Harness 语言格式化 |
| 发布方式 | 本地目录安装；`private: true`，不发布到 npm |

## 功能

- **每秒刷新**：以 `HH:mm:ss` 显示设备本地时间，同时展示简短日期和星期；完整年份保留在悬停提示中。
- **时区信息**：悬停可查看完整时间与时区标识，例如 `Asia/Shanghai`；时区每分钟重新读取，跟随系统设置变化。
- **紧凑排版**：与休息提醒同时启用时按内容宽度并排显示，空间不足时自然换行，不挤压原生上下文指示器。
- **主题适配**：使用 Harness 主题变量，跟随浅色与深色主题。
- **资源清理**：组件卸载时停止计时器与语言订阅，插件卸载时移除注册项和样式。

悬停提示示例：

```text
2026-11-07 15:30:08 · Asia/Shanghai
```

时钟读取设备本地时间，不进行网络校时。

## 环境要求

- 已安装可运行 Web/Client 界面的 DeepSeek Harness。
- 安装与源码构建需要 Git、Node.js 和 pnpm；Node.js 版本遵循所用 Harness 的要求。
- Harness 需提供 `slots`、`locale`、`timer` 服务及 `conversation.composer.dock` 插槽。

本插件自身不需要 API Key，也不发起模型或网络请求。Harness 的模型配置与插件功能独立。

## 安装与启用

以下命令在 **PowerShell** 中执行，使用 Harness 官方 CLI 的 profile 插件管理入口。

```powershell
git clone https://github.com/fxy0715/dsh-composer-clock.git
cd dsh-composer-clock
pnpm install --frozen-lockfile
pnpm check
pnpm build

$pluginPath = (Get-Location).Path
dsh plugin --profile web add "$pluginPath"
dsh web
```

`dsh` 表示你已安装的 Harness CLI；如果从 Harness 源码运行，应在 Harness 仓库中使用 `pnpm dsh` 替代 `dsh`，并为插件传入绝对路径。若使用其他 profile，将 `web` 替换成实际名称，并确保该 profile 加载了会话界面。

安装会修改目标 profile 的插件依赖和 Bundle 列表。已有 Harness 进程运行时，请先停止该 profile，安装后重新启动，再打开会话查看输入框下方。

本仓库已经包含 `index.js` 和 `client.js`，只使用已提交产物时可跳过依赖安装与构建；修改 TypeScript 后需要重新构建。由于包名为本地作用域且未发布到 npm，请从目录安装。

### 从旧名称迁移

旧包名为 `@local/composer-clock`。已安装旧版时，先停止相应 profile，再移除旧包并按上面的步骤安装新目录：

```powershell
dsh plugin --profile web remove @local/composer-clock
```

避免同时保留旧、新两个 Bundle，否则可能出现两条时钟。插件目录安装后应保持路径稳定；移动或重命名目录后，需重新安装该目录。

## 使用与配置

1. 打开 Harness 会话，在消息输入框下方查看时钟条。
2. 将鼠标悬停在时钟上，查看完整日期时间和时区。
3. 切换 Harness 界面语言或系统主题，日期和样式随之更新。

当前没有用户配置项，`cordis.patch.yml` 使用空配置 `config: {}`。时间与时区取自系统，暂不提供自定义时区、格式或刷新频率。

## 本地开发

在工程根目录执行：

```powershell
pnpm install --frozen-lockfile
pnpm check   # TypeScript 类型检查，不生成文件
pnpm build   # 生成根目录的 index.js 和 client.js
```

修改 `src/` 后运行构建，再重新加载插件或重启对应 Harness profile。React 来自 Harness 的模块加载器，不需要为本工程额外安装 React。

| 文件 | 用途 |
| --- | --- |
| `src/client.ts` | 时钟组件、语言注册、插槽与样式管理 |
| `src/index.ts` | Host 入口，界面逻辑由 Client 入口负责 |
| `src/dsh-client.d.ts` | 本插件使用的 Harness Client 服务类型声明 |
| `client.js` / `index.js` | 已提交的运行产物 |
| `cordis.patch.yml` | 将插件加入 Harness 配置树的 Bundle patch |
| `locale/` | 插件元信息的中英文文案 |
| `icon.svg` | 插件图标 |

## 常见问题

**时钟没有出现？**

确认插件已加入正在使用的 profile，包名与 Bundle 中的名称均为 `@local/dsh-composer-clock`，且修改源码后已重新构建。该插件依赖会话界面，纯 Headless 环境不会显示时钟。

**时间或时区不正确？**

检查操作系统的日期、时间与时区设置。时区标识最多缓存一分钟；修改系统时区后可稍候或重新加载界面。

## 相关项目与反馈

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [Harness CLI 与 profile 插件管理](https://github.com/fxy0715/deepseek-harness/blob/master/apps/cli/README.zh.md)
- [dsh-pet-desktop：Windows 桌面鲸鱼](https://github.com/fxy0715/dsh-pet-desktop)
- [提交问题或建议](https://github.com/fxy0715/dsh-composer-clock/issues)；请附上 Harness 版本、操作系统、安装方式和相关日志。
