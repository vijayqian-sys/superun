#!/usr/bin/env node

/**
 * 统一的翻译管理脚本
 * 整合了所有繁体中文到简体中文的翻译功能
 * 
 * 用法:
 *   node translate.js semantic          # 使用 Google Translate API 进行语义翻译
 *   node translate.js fix               # 修复剩余的繁体字（直接字符替换）
 *   node translate.js all               # 执行完整流程（先语义翻译，再修复剩余）
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.join(__dirname, '..', 'zh-Hans');

// ==================== 共享工具函数 ====================

/**
 * 使用免费的 Google Translate 翻译文本（繁体 -> 简体）
 */
async function translateText(text, sourceLang = 'zh-TW', targetLang = 'zh-CN') {
  return new Promise((resolve, reject) => {
    if (!text || text.trim().length === 0) {
      resolve(text);
      return;
    }

    const maxLength = 1000;
    if (text.length > maxLength) {
      const chunks = [];
      let currentChunk = '';
      
      const sentences = text.split(/([。！？\n])/);
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      Promise.all(chunks.map(chunk => translateText(chunk, sourceLang, targetLang)))
        .then(results => resolve(results.join('')))
        .catch(reject);
      return;
    }

    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodedText}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (data.trim().startsWith('<')) {
            console.warn(`API返回HTML，可能是请求过快，稍后重试...`);
            resolve(text);
            return;
          }
          
          const result = JSON.parse(data);
          if (result && result[0] && result[0][0]) {
            const translated = result[0].map(item => item[0]).join('');
            resolve(translated);
          } else {
            resolve(text);
          }
        } catch (error) {
          if (!data.trim().startsWith('<')) {
            console.error(`翻译错误: ${error.message}`);
          }
          resolve(text);
        }
      });
    }).on('error', (error) => {
      console.error(`请求错误: ${error.message}`);
      resolve(text);
    });
  });
}

/**
 * 保护产品名称和特殊内容
 */
function protectProductNames(text) {
  const productNames = [
    'superun Cloud', 'superun AI', 'superun.com', 'superun',
    'Prompt.to.design', 'Supabase', 'Stripe', 'Resend',
    'OpenAI', 'Anthropic', 'Claude', 'GPT-4', 'GPT-5', 'Gemini',
    'Figma', 'Vercel', 'Netlify', 'GitHub', 'GitLab', 'Credits',
    'API', 'URL', 'HTTP', 'HTTPS', 'JSON', 'JSX', 'CSS', 'HTML',
    'Edge Function', 'Edge Functions',
  ];

  const placeholders = {};
  let placeholderIndex = 0;
  let protectedText = text;

  productNames.forEach(name => {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    protectedText = protectedText.replace(regex, (match) => {
      const placeholder = `__PRODUCT_${placeholderIndex}__`;
      placeholders[placeholder] = match;
      placeholderIndex++;
      return placeholder;
    });
  });

  return { text: protectedText, placeholders };
}

/**
 * 恢复产品名称
 */
function restoreProductNames(text, placeholders) {
  let restored = text;
  Object.keys(placeholders).forEach(placeholder => {
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    restored = restored.replace(regex, placeholders[placeholder]);
  });
  return restored;
}

/**
 * 递归获取所有文件
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.mdx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// ==================== 语义翻译功能 ====================

/**
 * 常用繁体字列表（扩展版）
 */
const TRADITIONAL_CHARS = /[優化代碼訊飛編碼檢預階段幫修復專案常見問題點擊掃描識別結構設定背景進行提供使用完全不會消耗官方網站瀏覽官網了解功能與使用範例資訊資料庫用戶系統文件圖片視頻存儲訪問權限驗證檢查錯誤日誌密鑰環境變數連接測試頁面模塊組件歷史回滾步驟示例建議優化調整創建獲取上傳下載刪除選擇確認載入預覽壓縮類型樣式顏色字體字號間距佈局響應適配螢幕互動觸控體驗效能保護隱私信息個人敏感掃描軟體線上編輯自動手動即時與範總覽示範實際操作流程外掛驅動視覺編輯篩選搜尋消費明細會話詳情分析模式支出現有從開始搜索引擎優化產生過程中右側面板會顯示結構分析元件對應設計說明下線支援媒體擴展項目控制升級多語言同單據訂單運營倉庫統計監控機器學習數據挖掘網絡請求接口調用參數配置觸發條件執行結果輸出輸入處理邏輯業務規則異常報告導出導入備份恢復遷移部署發布更新維護管理權限角色菜單按鈕圖標標籤分類搜索篩選排序分頁詳細概覽狀態啟用禁用鏈接跳轉返回確定取消保存提交重置清空刷新導航]/;

/**
 * 检查文本是否包含繁体字
 */
function hasTraditionalChars(text) {
  return TRADITIONAL_CHARS.test(text);
}

/**
 * 判断是否应该跳过该行
 */
function shouldSkipLine(line, inCodeBlock, inFrontmatter, inStyleObject = false) {
  const trimmed = line.trim();

  if (trimmed === '') return true;
  if (inCodeBlock) return true;
  if (inFrontmatter && !trimmed.startsWith('title:') && !trimmed.startsWith('description:')) return true;
  if (inStyleObject) return true;
  if (hasTraditionalChars(trimmed)) return false;
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    const textContent = trimmed.replace(/<[^>]*>/g, '').trim();
    if (textContent === '' || !/[\u4e00-\u9fa5]/.test(textContent)) return true;
  }
  if (trimmed.includes('<img') && trimmed.endsWith('/>')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('```') || trimmed.startsWith('---')) return true;
  if (/^[#\-\*\[\](){}:;,\s]+$/.test(trimmed)) return true;

  return false;
}

/**
 * 提取并翻译 JSX 行中的文本内容
 */
async function translateJsxLine(line) {
  const trimmed = line.trim();
  const indent = line.match(/^(\s*)/)[1];
  
  const tagPattern = /<[^>]+>/g;
  const tags = trimmed.match(tagPattern) || [];
  const textParts = trimmed.split(tagPattern);
  
  let result = '';
  let tagIndex = 0;
  
  for (let i = 0; i < textParts.length; i++) {
    const text = textParts[i];
    if (text && text.trim()) {
      const translated = await translateText(text);
      result += translated;
    } else {
      result += text;
    }
    
    if (tagIndex < tags.length) {
      result += tags[tagIndex];
      tagIndex++;
    }
  }
  
  return indent + result;
}

/**
 * 语义翻译文件（使用 Google Translate API）
 */
async function translateFileSemantic(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    const { text: protectedContent, placeholders } = protectProductNames(content);
    content = protectedContent;
    
    const lines = content.split('\n');
    const translatedLines = [];
    let inCodeBlock = false;
    let inFrontmatter = false;
    let inStyleObject = false;
    let modified = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        translatedLines.push(line);
        continue;
      }
      
      if (trimmed === '---') {
        inFrontmatter = !inFrontmatter;
        translatedLines.push(line);
        continue;
      }
      
      if (trimmed.includes('style={{')) {
        inStyleObject = true;
        translatedLines.push(line);
        continue;
      }
      if (inStyleObject && trimmed.includes('}}')) {
        inStyleObject = false;
        translatedLines.push(line);
        continue;
      }
      if (inStyleObject) {
        translatedLines.push(line);
        continue;
      }
      
      if (inFrontmatter && (trimmed.startsWith('title:') || trimmed.startsWith('description:'))) {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex !== -1) {
          const key = trimmed.substring(0, colonIndex + 1);
          let value = trimmed.substring(colonIndex + 1).trim();
          
          const hasQuotes = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
          if (hasQuotes) {
            value = value.slice(1, -1);
          }
          
          if (value && value.length > 0) {
            try {
              const translated = await translateText(value);
              const quote = hasQuotes ? (trimmed.includes('"') ? '"' : "'") : '';
              translatedLines.push(`${key} ${quote}${translated}${quote}`);
              modified = true;
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
              console.error(`翻译错误 (${filePath}:${i + 1}): ${error.message}`);
              translatedLines.push(line);
            }
          } else {
            translatedLines.push(line);
          }
        } else {
          translatedLines.push(line);
        }
        continue;
      }
      
      if (shouldSkipLine(line, inCodeBlock, inFrontmatter, inStyleObject)) {
        translatedLines.push(line);
        continue;
      }
      
      const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
      const needsTranslation = hasTraditionalChars(trimmed) || (hasChinese && trimmed.length > 2);
      
      if (!needsTranslation) {
        translatedLines.push(line);
        continue;
      }
      
      const indent = line.match(/^(\s*)/)[1];
      
      try {
        if (trimmed.includes('<') && trimmed.includes('>')) {
          const translatedLine = await translateJsxLine(line);
          translatedLines.push(translatedLine);
          modified = true;
          await new Promise(resolve => setTimeout(resolve, 200));
        } else if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#+\s*)(.+)$/);
          if (match) {
            const translated = await translateText(match[2]);
            translatedLines.push(indent + match[1] + translated);
            modified = true;
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            translatedLines.push(line);
          }
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const match = trimmed.match(/^([\-\*]\s*)(.+)$/);
          if (match) {
            const translated = await translateText(match[2]);
            translatedLines.push(indent + match[1] + translated);
            modified = true;
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            translatedLines.push(line);
          }
        } else {
          const translated = await translateText(trimmed);
          if (translated !== trimmed) {
            translatedLines.push(indent + translated);
            modified = true;
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            translatedLines.push(line);
          }
        }
      } catch (error) {
        console.error(`翻译错误 (${filePath}:${i + 1}): ${error.message}`);
        translatedLines.push(line);
      }
    }
    
    let finalContent = restoreProductNames(translatedLines.join('\n'), placeholders);
    finalContent = finalContent.replace(/zh-Hant/g, 'zh-Hans');
    
    if (modified) {
      fs.writeFileSync(filePath, finalContent, 'utf-8');
      const relativePath = path.relative(TARGET_DIR, filePath);
      console.log(`✅ 已翻译: ${relativePath}`);
      return true;
    } else {
      const relativePath = path.relative(TARGET_DIR, filePath);
      console.log(`⏭️  跳过: ${relativePath} (无需翻译)`);
      return false;
    }
  } catch (error) {
    console.error(`处理文件错误 ${filePath}: ${error.message}`);
    return false;
  }
}

// ==================== 字符替换功能 ====================

/**
 * 修复剩余的繁体字（直接字符替换）
 * 注意：这里简化实现，实际调用 fix-remaining-traditional.js
 */
function fixRemainingTraditional() {
  const { execSync } = require('child_process');
  try {
    console.log('🔧 调用 fix-remaining-traditional.js 修复剩余的繁体字...\n');
    execSync(`node ${path.join(__dirname, 'fix-remaining-traditional.js')}`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    return true;
  } catch (error) {
    console.error(`修复过程出错: ${error.message}`);
    return false;
  }
}

// ==================== 主函数 ====================

async function main() {
  const command = process.argv[2] || 'all';
  
  console.log('🚀 开始翻译流程...\n');
  console.log(`📁 目标目录: ${TARGET_DIR}\n`);
  
  const files = getAllFiles(TARGET_DIR);
  console.log(`📄 找到 ${files.length} 个文件\n`);
  
  if (command === 'semantic') {
    console.log('📝 执行语义翻译（使用 Google Translate API）...\n');
    let translatedCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = path.relative(TARGET_DIR, file);
      console.log(`[${i + 1}/${files.length}] 处理: ${relativePath}`);
      
      if (await translateFileSemantic(file)) {
        translatedCount++;
      }
      
      if ((i + 1) % 10 === 0) {
        console.log(`\n⏸️  已处理 ${i + 1}/${files.length} 个文件，休息2秒...\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✅ 语义翻译完成！`);
    console.log(`   - 已翻译: ${translatedCount} 个文件`);
    console.log(`   - 已跳过: ${files.length - translatedCount} 个文件`);
    
  } else if (command === 'fix') {
    console.log('🔧 修复剩余的繁体字（直接字符替换）...\n');
    let fixedCount = 0;
    
    for (const file of files) {
      if (fixFileRemaining(file)) {
        fixedCount++;
      }
    }
    
    console.log(`\n✅ 修复完成！修复了 ${fixedCount} 个文件`);
    
  } else if (command === 'all') {
    console.log('🔄 执行完整流程：先语义翻译，再修复剩余...\n');
    
    // 第一步：语义翻译
    console.log('=== 第一步：语义翻译 ===\n');
    let translatedCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = path.relative(TARGET_DIR, file);
      console.log(`[${i + 1}/${files.length}] 处理: ${relativePath}`);
      
      if (await translateFileSemantic(file)) {
        translatedCount++;
      }
      
      if ((i + 1) % 10 === 0) {
        console.log(`\n⏸️  已处理 ${i + 1}/${files.length} 个文件，休息2秒...\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✅ 语义翻译完成！已翻译 ${translatedCount} 个文件\n`);
    
    // 第二步：修复剩余
    console.log('=== 第二步：修复剩余的繁体字 ===\n');
    fixRemainingTraditional();
    console.log(`\n🎉 完整流程完成！`);
    console.log(`   - 语义翻译: ${translatedCount} 个文件`);
    console.log(`   - 字符修复: ${fixedCount} 个文件`);
    console.log(`   - 总计: ${files.length} 个文件`);
    
  } else {
    console.error(`❌ 未知命令: ${command}`);
    console.log('\n用法:');
    console.log('  node translate.js semantic    # 使用 Google Translate API 进行语义翻译');
    console.log('  node translate.js fix         # 修复剩余的繁体字（直接字符替换）');
    console.log('  node translate.js all         # 执行完整流程（先语义翻译，再修复剩余）');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
