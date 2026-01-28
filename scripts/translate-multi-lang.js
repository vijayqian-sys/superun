#!/usr/bin/env node

/**
 * 多语言翻译脚本
 * 支持从任意源语言翻译到任意目标语言
 * 
 * 用法:
 *   node translate-multi-lang.js <source-lang> <target-lang> [target-dir]
 * 
 * 示例:
 *   node translate-multi-lang.js en ja ja          # 英文 → 日文
 *   node translate-multi-lang.js zh-TW ko ko       # 繁体中文 → 韩文
 *   node translate-multi-lang.js zh-CN en en        # 简体中文 → 英文
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 语言代码映射
const LANG_CODES = {
  'en': 'en',           // 英文
  'zh-TW': 'zh-TW',     // 繁体中文
  'zh-CN': 'zh-CN',     // 简体中文
  'zh-Hant': 'zh-TW',   // 繁体中文（目录名）
  'zh-Hans': 'zh-CN',   // 简体中文（目录名）
  'ja': 'ja',           // 日文
  'ko': 'ko',           // 韩文
  'es': 'es',           // 西班牙文
  'fr': 'fr',           // 法文
  'de': 'de',           // 德文
  'pt': 'pt',           // 葡萄牙文
  'ru': 'ru',           // 俄文
};

// 语言名称映射（用于显示）
const LANG_NAMES = {
  'en': '英文',
  'zh-TW': '繁体中文',
  'zh-CN': '简体中文',
  'ja': '日文',
  'ko': '韩文',
  'es': '西班牙文',
  'fr': '法文',
  'de': '德文',
  'pt': '葡萄牙文',
  'ru': '俄文',
};

/**
 * 使用免费的 Google Translate 翻译文本
 */
async function translateText(text, sourceLang, targetLang) {
  return new Promise((resolve, reject) => {
    if (!text || text.trim().length === 0) {
      resolve(text);
      return;
    }

    const maxLength = 1000;
    if (text.length > maxLength) {
      const chunks = [];
      let currentChunk = '';
      
      const sentences = text.split(/([。！？\n.!?])/);
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

    // 转换语言代码
    const sourceCode = LANG_CODES[sourceLang] || sourceLang;
    const targetCode = LANG_CODES[targetLang] || targetLang;

    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodedText}`;

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
 * 保护产品名称
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

/**
 * 判断是否应该跳过该行
 */
function shouldSkipLine(line, inCodeBlock, inFrontmatter, inStyleObject = false) {
  const trimmed = line.trim();

  if (trimmed === '') return true;
  if (inCodeBlock) return true;
  if (inFrontmatter && !trimmed.startsWith('title:') && !trimmed.startsWith('description:')) return true;
  if (inStyleObject) return true;
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    const textContent = trimmed.replace(/<[^>]*>/g, '').trim();
    if (textContent === '' || !/[\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(textContent)) return true;
  }
  if (trimmed.includes('<img') && trimmed.endsWith('/>')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('```') || trimmed.startsWith('---')) return true;
  if (/^[#\-\*\[\](){}:;,\s]+$/.test(trimmed)) return true;

  return false;
}

/**
 * 翻译文件
 */
async function translateFile(filePath, sourceLang, targetLang, targetDir) {
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
              const translated = await translateText(value, sourceLang, targetLang);
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
      
      // 检查是否包含需要翻译的文本
      const hasText = trimmed.length > 0 && /[a-zA-Z\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(trimmed);
      
      if (!hasText) {
        translatedLines.push(line);
        continue;
      }
      
      const indent = line.match(/^(\s*)/)[1];
      
      try {
        if (trimmed.includes('<') && trimmed.includes('>')) {
          // JSX 标签内的文本
          const tagPattern = /<[^>]+>/g;
          const tags = trimmed.match(tagPattern) || [];
          const textParts = trimmed.split(tagPattern);
          
          let result = '';
          let tagIndex = 0;
          
          for (let i = 0; i < textParts.length; i++) {
            const text = textParts[i];
            if (text && text.trim()) {
              const translated = await translateText(text, sourceLang, targetLang);
              result += translated;
            } else {
              result += text;
            }
            
            if (tagIndex < tags.length) {
              result += tags[tagIndex];
              tagIndex++;
            }
          }
          
          translatedLines.push(indent + result);
          modified = true;
          await new Promise(resolve => setTimeout(resolve, 200));
        } else if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#+\s*)(.+)$/);
          if (match) {
            const translated = await translateText(match[2], sourceLang, targetLang);
            translatedLines.push(indent + match[1] + translated);
            modified = true;
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            translatedLines.push(line);
          }
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const match = trimmed.match(/^([\-\*]\s*)(.+)$/);
          if (match) {
            const translated = await translateText(match[2], sourceLang, targetLang);
            translatedLines.push(indent + match[1] + translated);
            modified = true;
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            translatedLines.push(line);
          }
        } else {
          const translated = await translateText(trimmed, sourceLang, targetLang);
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
    
    // 更新路径引用
    if (sourceLang === 'zh-Hant' || sourceLang === 'zh-TW') {
      finalContent = finalContent.replace(/zh-Hant/g, targetDir);
    } else if (sourceLang === 'zh-Hans' || sourceLang === 'zh-CN') {
      finalContent = finalContent.replace(/zh-Hans/g, targetDir);
    }
    
    // 计算目标文件路径
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    const targetFilePath = path.join(__dirname, '..', targetDir, relativePath);
    
    // 确保目标目录存在
    const targetDirPath = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
    }
    
    if (modified) {
      fs.writeFileSync(targetFilePath, finalContent, 'utf-8');
      console.log(`✅ 已翻译: ${relativePath} → ${targetDir}/${relativePath}`);
      return true;
    } else {
      console.log(`⏭️  跳过: ${relativePath} (无需翻译)`);
      return false;
    }
  } catch (error) {
    console.error(`处理文件错误 ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  const sourceLang = process.argv[2];
  const targetLang = process.argv[3];
  const targetDir = process.argv[4] || targetLang;
  
  if (!sourceLang || !targetLang) {
    console.error('❌ 缺少参数');
    console.log('\n用法:');
    console.log('  node translate-multi-lang.js <source-lang> <target-lang> [target-dir]');
    console.log('\n示例:');
    console.log('  node translate-multi-lang.js en ja ja          # 英文 → 日文');
    console.log('  node translate-multi-lang.js zh-TW ko ko       # 繁体中文 → 韩文');
    console.log('  node translate-multi-lang.js zh-CN en en        # 简体中文 → 英文');
    console.log('\n支持的语言:');
    Object.entries(LANG_NAMES).forEach(([code, name]) => {
      console.log(`  ${code.padEnd(10)} - ${name}`);
    });
    process.exit(1);
  }
  
  const sourceName = LANG_NAMES[sourceLang] || sourceLang;
  const targetName = LANG_NAMES[targetLang] || targetLang;
  
  console.log(`🚀 开始翻译: ${sourceName} → ${targetName}`);
  console.log(`📁 源目录: ${sourceLang === 'en' ? '根目录' : sourceLang}`);
  console.log(`📁 目标目录: ${targetDir}\n`);
  
  // 确定源目录
  let sourceDir = path.join(__dirname, '..');
  if (sourceLang === 'zh-Hant' || sourceLang === 'zh-TW') {
    sourceDir = path.join(__dirname, '..', 'zh-Hant');
  } else if (sourceLang === 'zh-Hans' || sourceLang === 'zh-CN') {
    sourceDir = path.join(__dirname, '..', 'zh-Hans');
  }
  
  const files = getAllFiles(sourceDir);
  console.log(`📄 找到 ${files.length} 个文件\n`);
  
  let translatedCount = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = path.relative(sourceDir, file);
    console.log(`[${i + 1}/${files.length}] 处理: ${relativePath}`);
    
    if (await translateFile(file, sourceLang, targetLang, targetDir)) {
      translatedCount++;
    }
    
    if ((i + 1) % 10 === 0) {
      console.log(`\n⏸️  已处理 ${i + 1}/${files.length} 个文件，休息2秒...\n`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n✅ 翻译完成！`);
  console.log(`   - 已翻译: ${translatedCount} 个文件`);
  console.log(`   - 已跳过: ${files.length - translatedCount} 个文件`);
  console.log(`   - 总计: ${files.length} 个文件`);
}

main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
