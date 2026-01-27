#!/bin/bash

# 在 push 前自动生成 llms.txt
# 使用方法：
# 1. 手动执行：./scripts/pre-push.sh
# 2. 或者在 push 前执行：npm run generate-llms (在 scripts 目录下)

echo "🔄 正在生成 llms.txt..."
cd "$(dirname "$0")/.."
node scripts/generate-llms-txt.js

if [ $? -eq 0 ]; then
  echo "✅ llms.txt 生成成功"
  
  # 检查是否有变更
  if git diff --quiet llms.txt; then
    echo "ℹ️  llms.txt 没有变更，可以直接 push"
  else
    echo "⚠️  llms.txt 有变更，请先提交："
    echo "   git add llms.txt"
    echo "   git commit -m 'Update llms.txt'"
    echo "   然后再 push"
  fi
else
  echo "❌ llms.txt 生成失败"
  exit 1
fi

