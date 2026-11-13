# 自动回归测试

每次 main 更新、拉取请求和手动运行都会执行：

1. 现有游戏与存档测试、语法检查、静态构建。
2. CI 结果解析器的负向测试：失败或不完整结果必须失败。
3. 在 Chromium 新建隔离浏览器上下文，打开已有 tests/browser.html，运行 8 项真实 IndexedDB 事务测试。

浏览器页中的断言会被页面捕获并显示 FAIL，因此驱动器不仅等待页面结束，还检查所有 8 条 PASS 与最终完成标记；出现 FAIL、脚本错误、超时或缺少结果时，进程返回失败。测试使用随机数据库，不访问线上站点或真实玩家存档。

安全与费用边界：
- 公开仓库的 GitHub 标准 ubuntu-24.04 runner，10 分钟超时，不用收费 larger runner。
- GITHUB_TOKEN 仅 contents: read；checkout 不保留凭据。
- 仅 push / pull_request / 手动触发，不用 pull_request_target，不注入秘密。
- Actions 固定完整 commit SHA；Playwright 版本及依赖 integrity 锁定于独立 ci/package-lock.json。
- 无缓存或上传 artifact，不引入持久化服务。游戏仍不需要安装依赖。
- 依赖安装禁用 npm lifecycle scripts；浏览器由已锁定 Playwright 的官方安装程序安装。
- 不设置分支保护，也不改变 Pages 配置；此测试流程本身不会部署。

本地基础验证：npm test && npm run check && npm run build。
交互式浏览器验证：用受支持的预览打开 tests/browser.html。
ci/browser.mjs 是 GitHub-hosted CI 驱动，不用于连接已有浏览器或真实账户。
