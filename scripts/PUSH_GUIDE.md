# Push 前更新 llms.txt 指南

## 為什麼需要更新 llms.txt？

`llms.txt` 檔案用於協助 LLM 工具索引文件內容。當你：
- 新增頁面
- 修改頁面的 `title` 或 `description`（frontmatter）
- 刪除頁面

都需要重新生成 `llms.txt`，以確保線上版本是最新的。

## 使用方式

### 方式 1：使用腳本（推薦）

在專案根目錄執行：

```bash
node scripts/generate-llms-txt.js
```

或者在 `scripts` 目錄下執行：

```bash
cd scripts
npm run generate-llms
```

### 方式 2：使用 pre-push 腳本

在 push 前執行：

```bash
./scripts/pre-push.sh
```

這個腳本會：
1. 自動生成 `llms.txt`
2. 檢查是否有變更
3. 如果有變更，提醒你先提交

### 方式 3：手動流程

1. 生成 llms.txt：
   ```bash
   node scripts/generate-llms-txt.js
   ```

2. 檢查變更：
   ```bash
   git status llms.txt
   ```

3. 如果有變更，提交並 push：
   ```bash
   git add llms.txt
   git commit -m "Update llms.txt"
git push
   ```

## 自動化建議

### ✅ 已啟用：Git Pre-push Hook（自動生成）

專案已配置 Git pre-push hook，**每次 `git push` 前會自動生成 `llms.txt`**。

**工作流程：**
1. 執行 `git push` 時，hook 會自動運行
2. 自動生成最新的 `llms.txt`
3. 如果 `llms.txt` 有變更，會自動新增到暫存區
4. 繼續推送流程

**注意事項：**
- Hook 會自動將 `llms.txt` 的變更新增到暫存區
- 如果暫存區還有其他檔案，可以一起提交
- 如果只有 `llms.txt` 的變更，推送後記得提交：
  ```bash
  git commit -m "Update llms.txt"
  ```

**手動執行（如果需要）：**
```bash
# 手動執行 pre-push 腳本
./scripts/pre-push.sh
```

**停用 Hook（如果需要）：**
```bash
# 臨時略過 hook
git push --no-verify

# 或刪除 hook
rm .git/hooks/pre-push
```

### 其他自動化選項

1. **在 CI/CD 中自動生成**：
   在部署流程中新增生成步驟

## 其他說明

- `llms.txt` 應該被 git 追蹤（已在倉庫中）
- 如果忘記更新，Mintlify 會使用自動生成的版本，但可能不包含自訂的說明文字
- 建議在每次新增或修改頁面後都重新生成一次

