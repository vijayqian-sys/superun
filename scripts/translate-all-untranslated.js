#!/usr/bin/env node

/**
 * 翻译所有未翻译的英文内容
 * 智能识别并只翻译真正的文本内容，跳过JSX属性、代码等
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.join(__dirname, '..', 'zh-Hant');

/**
 * 使用免费的 Google Translate 翻译文本
 */
async function translateText(text, targetLang = 'zh-TW') {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodedText}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result && result[0] && result[0][0]) {
            const translated = result[0].map(item => item[0]).join('');
            resolve(translated);
          } else {
            reject(new Error('翻译失败'));
          }
        } catch (error) {
          reject(new Error('解析响应失败: ' + error.message));
        }
      });
    }).on('error', (error) => {
      reject(new Error('请求失败: ' + error.message));
    });
  });
}

/**
 * 保护产品名称
 */
function protectProductNames(text) {
  const productNames = [
    'superun Cloud', 'superun AI', 'superun.ai', 'superun',
    'Prompt.to.design', 'prompt.to.design', 'Supabase', 'Stripe', 'Resend',
    'OpenAI', 'Anthropic', 'Claude', 'GPT-4', 'GPT-5', 'Gemini',
    'Figma', 'Vercel', 'Netlify', 'GitHub', 'GitLab'
  ];
  const placeholders = [];
  productNames.forEach((name, index) => {
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    text = text.replace(regex, (match) => {
      const placeholder = `__PRODUCT_${index}__`;
      placeholders.push({ placeholder, original: match });
      return placeholder;
    });
  });
  return { text, placeholders };
}

/**
 * 恢复产品名称
 */
function restoreProductNames(text, placeholders) {
  placeholders.forEach((item) => {
    text = text.replace(new RegExp(item.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), item.original);
  });
  return text;
}

/**
 * 检查是否应该跳过这一行
 */
function shouldSkipLine(line, inCodeBlock, inFrontmatter, inStyleObject = false) {
  const trimmed = line.trim();
  
  // 跳过代码块
  if (inCodeBlock) {
    return true;
  }
  
  // 跳过 frontmatter（单独处理）
  if (inFrontmatter) {
    return false; // 需要检查 frontmatter 中的 title/description
  }
  
  // 跳过空行
  if (trimmed.length === 0) {
    return true;
  }
  
  // 跳过 import/export
  if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
    return true;
  }
  
  // 跳过所有 JSX 标签（开始、结束、自闭合）
  if (trimmed.match(/^<\/?[A-Za-z][A-Za-z0-9]*(\s+[^>]*)?\/?>$/)) {
    return true; // JSX 标签，跳过
  }
  
  // 跳过包含 JSX 标签的行（即使有其他内容）
  if (trimmed.match(/<\/?[A-Za-z][A-Za-z0-9]*(\s+[^>]*)?\/?>/)) {
    return true; // 包含 JSX 标签的行，跳过
  }
  
  // 跳过 JSX 属性行（包括所有可能的属性名）
  if (trimmed.match(/^\s*(src|href|alt|width|height|style|className|id|onMouse|onClick|onChange|onSubmit|aria-label|target|rel|frameborder|allow|allowfullscreen|display|justifyContent|marginTop|marginBottom|marginLeft|marginRight|color|padding|borderRadius|fontSize|fontWeight|textDecoration|boxShadow|transition|backgroundColor|maxWidth|minWidth|maxHeight|minHeight|flexDirection|alignItems|textAlign|position|left|right|top|bottom|opacity|border|borderColor|borderWidth|borderStyle|background|backgroundImage|backgroundSize|backgroundPosition|backgroundRepeat|maskImage|maskRepeat|maskPosition|zIndex|transform|translateX|translateY|scale|rotate|gap|gridTemplateColumns|overflow|cursor|pointerEvents|userSelect|whiteSpace|wordBreak|lineHeight|letterSpacing|textTransform|textShadow|boxSizing|outline|outlineColor|outlineWidth|outlineStyle|outlineOffset|visibility|clip|clipPath|filter|backdropFilter|willChange|contain|isolation|mixBlendMode|objectFit|objectPosition|resize|scrollBehavior|overscrollBehavior|touchAction|webkitAppearance|webkitTapHighlightColor)\s*[:=]/)) {
    return true;
  }
  
  // 跳过包含 JSX 属性的行
  if (trimmed.includes('style={{') || 
      trimmed.includes('href=') || 
      trimmed.includes('src=') ||
      trimmed.includes('width=') ||
      trimmed.includes('height=') ||
      trimmed.includes('alt=') ||
      trimmed.includes('id=') ||
      trimmed.includes('className=') ||
      trimmed.includes('onMouse') ||
      trimmed.includes('onClick') ||
      trimmed.includes('onChange') ||
      trimmed.includes('onSubmit') ||
      trimmed.includes('aria-label=') ||
      trimmed.includes('target=') ||
      trimmed.includes('rel=')) {
    return true;
  }
  
  // 跳过 style 对象内部的所有行（检测 style={{ 开始到 }} 结束）
  if (trimmed.includes('style={{') || trimmed.match(/^\s*[a-zA-Z]+:\s*['"]?[^'"]+['"]?,?\s*$/) || trimmed.includes('}}')) {
    return true;
  }
  
  // 跳过 CSS 属性名和值（在 style 对象中）
  if (trimmed.match(/^\s*(maxWidth|minWidth|maxHeight|minHeight|margin|padding|display|flexDirection|justifyContent|alignItems|textAlign|position|fontSize|fontWeight|color|backgroundColor|borderRadius|boxShadow|transition|opacity|left|right|top|bottom|width|height|gap|gridTemplateColumns|overflow|cursor|transform|translateX|translateY|scale|rotate|zIndex|background|backgroundImage|backgroundSize|backgroundPosition|backgroundRepeat|maskImage|maskRepeat|maskPosition|border|borderColor|borderWidth|borderStyle|outline|outlineColor|outlineWidth|outlineStyle|outlineOffset|textDecoration|lineHeight|letterSpacing|textTransform|textShadow|boxSizing|visibility|clip|clipPath|filter|backdropFilter|willChange|contain|isolation|mixBlendMode|objectFit|objectPosition|resize|scrollBehavior|overscrollBehavior|touchAction|whiteSpace|wordBreak|pointerEvents|userSelect|webkitAppearance|webkitTapHighlightColor)\s*:/)) {
    return true;
  }
  
  // 跳过 CSS 属性值（如 'center', 'flex', 'column', 'relative' 等）
  if (trimmed.match(/^\s*['"](center|flex|column|row|relative|absolute|fixed|static|sticky|none|auto|inherit|initial|unset|block|inline|inline-block|grid|table|table-cell|table-row|table-header-group|table-footer-group|table-row-group|table-column|table-column-group|table-caption|hidden|visible|scroll|clip|ellipsis|wrap|nowrap|wrap-reverse|flex-start|flex-end|space-between|space-around|space-evenly|stretch|baseline|start|end|left|right|top|bottom|middle|justify|justify-self|align-self|normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900|italic|oblique|normal|underline|overline|line-through|blink|solid|dashed|dotted|double|groove|ridge|inset|outset|transparent|currentColor|rgba?\(|hsla?\(|#[0-9a-fA-F]{3,6}|calc\(|var\(|url\(|linear-gradient|radial-gradient|repeating-linear-gradient|repeating-radial-gradient|conic-gradient)['"]?\s*,?\s*$/)) {
    return true;
  }
  
  // 跳过 className 的值（Tailwind 类名）
  if (trimmed.match(/className\s*=\s*["'][^"']*["']/) || trimmed.match(/^\s*["'][a-z0-9\s\-_:\[\]\/\.]+["']\s*$/) && trimmed.includes('className')) {
    return true;
  }
  
  // 跳过 id 的值（如果包含常见英文 id）
  if (trimmed.match(/id\s*=\s*["'][a-zA-Z0-9\-_]+["']/)) {
    return true;
  }
  
  // 跳过 URL
  if (trimmed.match(/^https?:\/\//) || trimmed.match(/^mailto:/)) {
    return true;
  }
  
  // 跳过图片路径
  if (trimmed.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
    return true;
  }
  
  // 跳过代码块标记
  if (trimmed.startsWith('```')) {
    return true;
  }
  
  // 跳过分隔线
  if (trimmed === '---') {
    return true;
  }
  
  // 跳过只有符号的行
  if (/^[#\s\-*]+$/.test(trimmed)) {
    return true;
  }
  
  // 注意：不跳过包含占位符的行，因为占位符会在翻译后恢复
  // 占位符（如 __PRODUCT_3__）应该在翻译时保留，然后在恢复产品名称时替换回去
  
  return false;
}

/**
 * 翻译文件
 */
async function translateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // 保护产品名称
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
      
      // 检测代码块
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        translatedLines.push(line);
        continue;
      }
      
      // 检测 frontmatter
      if (trimmed === '---') {
        inFrontmatter = !inFrontmatter;
        translatedLines.push(line);
        continue;
      }
      
      // 检测 style 对象
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
      
      // 处理 frontmatter 中的 title 和 description
      if (inFrontmatter) {
        // 处理 title
        const titleMatch = trimmed.match(/^title:\s*(.+)$/);
        if (titleMatch) {
          let title = titleMatch[1].trim();
          // 移除引号
          title = title.replace(/^["']|["']$/g, '');
          if (/[A-Za-z]{3,}/.test(title) && !/[\u4e00-\u9fff]/.test(title)) {
            try {
              const translated = await translateText(title, 'zh-TW');
              translatedLines.push(`title: ${translated}`);
              modified = true;
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
              translatedLines.push(line);
            }
            continue;
          }
        }
        
        // 处理 description
        const descMatch = trimmed.match(/^description:\s*(.+)$/);
        if (descMatch) {
          let desc = descMatch[1].trim();
          // 移除引号
          desc = desc.replace(/^["']|["']$/g, '');
          if (/[A-Za-z]{3,}/.test(desc) && !/[\u4e00-\u9fff]/.test(desc)) {
            try {
              const translated = await translateText(desc, 'zh-TW');
              translatedLines.push(`description: ${translated}`);
              modified = true;
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
              translatedLines.push(line);
            }
            continue;
          }
        }
        
        translatedLines.push(line);
        continue;
      }
      
      // 跳过不应该翻译的行
      if (shouldSkipLine(line, inCodeBlock, inFrontmatter, inStyleObject)) {
        translatedLines.push(line);
        continue;
      }
      
      // 检查是否包含英文且不包含中文
      const hasEnglish = /[A-Za-z]{3,}/.test(trimmed);
      const hasChinese = /[\u4e00-\u9fff]/.test(trimmed);
      
      // 只翻译明显的英文文本（至少5个字符）
      if (hasEnglish && !hasChinese && trimmed.length >= 5) {
        // 处理标题行（以 # 开头）- 现在也翻译标题
        if (trimmed.startsWith('#')) {
          try {
            // 提取标题文本（去掉 # 和空格）
            const titleText = trimmed.replace(/^#+\s*/, '').trim();
            if (titleText.length > 0) {
              const translated = await translateText(titleText, 'zh-TW');
              // 保持原始的 # 数量和缩进
              const indent = line.match(/^(\s*)/)[1];
              const hashMatch = trimmed.match(/^#+/);
              const hashCount = hashMatch ? hashMatch[0].length : 1;
              translatedLines.push(indent + '#'.repeat(hashCount) + ' ' + translated);
              modified = true;
              await new Promise(resolve => setTimeout(resolve, 300));
              continue;
            }
          } catch (error) {
            console.error(`  翻译标题失败 (行 ${i + 1}): ${error.message}`);
            translatedLines.push(line);
            continue;
          }
        }
        
        // 跳过列表项中的短文本（可能是产品名称）
        if (trimmed.match(/^[-*]\s*[A-Z][a-z]+(\.[a-z]+)*$/)) {
          translatedLines.push(line);
          continue;
        }
        
        try {
          const translated = await translateText(trimmed, 'zh-TW');
          // 保持原始缩进
          const indent = line.match(/^(\s*)/)[1];
          translatedLines.push(indent + translated);
          modified = true;
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`  翻译失败 (行 ${i + 1}): ${error.message}`);
          translatedLines.push(line);
        }
      } else {
        translatedLines.push(line);
      }
    }
    
    content = translatedLines.join('\n');
    
    // 恢复产品名称
    content = restoreProductNames(content, placeholders);
    
    // 修复占位符
    content = content.replace(/__PRODUCT_\d+__/g, (match) => {
      const index = parseInt(match.match(/\d+/)[0]);
      const productMap = {
        0: 'superun Cloud', 1: 'superun AI', 2: 'superun.ai', 3: 'superun',
        4: 'Prompt.to.design', 5: 'prompt.to.design', 6: 'Supabase', 7: 'Stripe', 8: 'Resend',
        9: 'OpenAI', 10: 'Anthropic', 11: 'Claude', 12: 'GPT-4', 13: 'GPT-5',
        14: 'Gemini', 15: 'Figma', 16: 'Vercel', 17: 'Netlify', 18: 'GitHub', 19: 'GitLab'
      };
      return productMap[index] || match;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ❌ 错误: ${error.message}`);
    return false;
  }
}

/**
 * 处理目录
 */
async function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  let count = 0;

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      count += await processDirectory(fullPath);
    } else if (item.endsWith('.mdx')) {
      console.log(`\n📝 处理: ${fullPath.replace(TARGET_DIR + '/', '')}`);
      if (await translateFile(fullPath)) {
        console.log(`  ✅ 完成`);
        count++;
      } else {
        console.log(`  ✓ 无变化`);
      }
    }
  }

  return count;
}

/**
 * 主函数
 */
async function main() {
  console.log('🔧 翻译所有未翻译的英文内容...\n');
  console.log(`📁 目标目录: ${TARGET_DIR}\n`);

  const count = await processDirectory(TARGET_DIR);

  console.log(`\n✅ 完成！共处理 ${count} 个文件`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { translateFile };

