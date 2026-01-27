# 多语言翻译指南

本指南包含所有关于多语言文档翻译的设置、使用和故障排除信息。

## 目录

- [快速开始](#快速开始)
- [翻译工作流](#翻译工作流)
- [自动翻译](#自动翻译)
- [故障排除](#故障排除)
- [脚本说明](#脚本说明)

## 快速开始

### 1. 验证语言切换器

运行配置检查脚本：

```bash
node scripts/check-i18n.js
```

### 2. 启动开发服务器

```bash
mint dev
```

### 3. 查看语言切换器

在浏览器中访问 `http://localhost:3000`，语言切换器应该显示在页面顶部导航栏。

### 4. 测试语言切换

1. 点击语言切换器
2. 选择"繁體中文"
3. 页面应该切换到 `/zh-Hant/` 路径
4. 内容应该显示为繁体中文

## 翻译工作流

### 添加新页面

1. 在英文版本中添加新页面（如 `superun/features/new-feature.mdx`）
2. 运行同步脚本：
   ```bash
   node scripts/translate-manager.js
   ```
3. 脚本会自动创建 `zh-Hant/superun/features/new-feature.mdx`
4. 翻译内容（手动或使用自动翻译）
5. 保存文件

### 更新现有页面

1. 修改英文版本
2. 运行同步脚本
3. 如果繁体中文版本包含翻译标记，会更新模板
4. 如果已翻译，只更新链接

### 检查翻译状态

```bash
node scripts/check-untranslated.js
```

这会显示所有未翻译的英文内容。

## 自动翻译

### 使用免费翻译服务（推荐）

无需 API Key，直接使用：

```bash
node scripts/translate-all-untranslated.js
```

这个脚本使用免费的 Google Translate 服务，会自动：
- 识别需要翻译的内容
- 跳过 JSX 属性、代码块等不应该翻译的内容
- 保护产品名称不被翻译
- 翻译标题、段落等文本内容

## 故障排除

### 语言切换器不显示

1. **检查配置**
   ```bash
   node scripts/check-i18n.js
   ```

2. **检查 Mintlify 版本**
   ```bash
   mint --version
   ```
   确保版本 >= 4.0

3. **重启开发服务器**
   ```bash
   # 停止当前服务器 (Ctrl+C)
   mint dev
   ```

4. **清除浏览器缓存**
   - 硬刷新: Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)
   - 或使用无痕模式

5. **检查浏览器控制台**
   - 打开开发者工具 (F12)
   - 查看 Console 标签
   - 检查是否有错误信息

### 切换语言后页面 404

- 确保对应的繁体中文文件存在
- 运行 `node scripts/translate-manager.js` 创建缺失的文件

### 链接没有更新

- 运行翻译管理脚本会自动更新链接
- 或手动在文件中添加 `/zh-Hant/` 前缀

### 翻译后页面解析错误

如果翻译后出现解析错误，运行修复脚本：

```bash
node scripts/fix-translation-errors.js
```

这个综合脚本会修复：
- JSX 标签被错误翻译
- JSX 属性被翻译
- 产品名称占位符未还原
- 路径大小写问题
- 引号格式问题
- 其他翻译错误（如 `none需` → `無需`）

## 脚本说明

### 主要脚本

- **`translate-all-untranslated.js`** - 翻译所有未翻译的英文内容（推荐使用）
- **`translate-manager.js`** - 管理翻译文件结构，创建缺失的文件并更新链接
- **`check-untranslated.js`** - 检查未翻译的英文内容
- **`check-i18n.js`** - 检查多语言配置

### 修复脚本

- **`fix-translation-errors.js`** - 综合修复脚本，包含所有修复功能：
  - 修复被错误翻译的 JSX 标签
  - 修复被翻译的 JSX 属性
  - 修复产品名称占位符
  - 修复路径大小写
  - 修复引号问题
  - 修复其他翻译错误

## 文件结构

```
documentation/
├── docs.json                    # 包含 languages 配置
├── index.mdx                    # 英文首页
├── superun/                      # 英文内容
│   └── ...
├── zh-Hant/                       # 繁体中文内容
│   ├── index.mdx               # 繁体中文首页
│   └── superun/
│       └── ...
└── scripts/
    ├── translate-all-untranslated.js  # 主要翻译脚本
    ├── translate-manager.js           # 翻译管理脚本
    ├── check-untranslated.js          # 检查未翻译内容
    ├── check-i18n.js                  # 检查配置
    └── fix-translation-errors.js      # 综合修复脚本
```

## 常见问题

**Q: 语言切换器还是不显示？**
A: 
- 检查 Mintlify 版本是否支持多语言（需要较新版本）
- 尝试重新安装: `npm install -g mint@latest`
- 查看 Mintlify 官方文档了解最新配置方式

**Q: 翻译后页面报错？**
A: 
- 运行修复脚本：`node scripts/fix-translation-errors.js`
- 检查是否有 JSX 标签或属性被错误翻译
- 检查产品名称占位符是否正确还原

**Q: 如何批量翻译？**
A: 
- 使用 `node scripts/translate-all-untranslated.js`
- 脚本会自动识别并翻译所有未翻译的内容
- 会跳过不应该翻译的内容（JSX 属性、代码块等）

**Q: 修复脚本会修复哪些问题？**
A: 
- JSX 标签被错误翻译（如 `<手風琴>` → `<Accordion>`）
- JSX 属性被翻译（如 `風格` → `style`）
- 产品名称占位符（如 `__產品_1__` → `superun`）
- 路径大小写问题
- 引号格式问题
- 翻译错误（如 `none需` → `無需`）

## 获取帮助

- Mintlify 文档: https://mintlify.com/docs
- Mintlify 多语言文档: https://www.mintlify.com/docs/organize/navigation#languages
