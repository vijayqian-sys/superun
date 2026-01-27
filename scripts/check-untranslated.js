#!/usr/bin/env node

/**
 * 检查未翻译的英文内容
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'zh-Hant');

/**
 * 检查是否包含英文
 */
function hasEnglish(text) {
  // 检查是否包含至少3个连续的英文字母
  return /[A-Za-z]{3,}/.test(text);
}

/**
 * 检查是否包含中文
 */
function hasChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * 检查是否应该跳过（代码块、链接、产品名称等）
 */
function shouldSkip(line) {
  const trimmed = line.trim();
  
  // 跳过代码块
  if (trimmed.startsWith('```') || trimmed.startsWith('---')) {
    return true;
  }
  
  // 跳过 import/export
  if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
    return true;
  }
  
  // 跳过 JSX 标签
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return true;
  }
  
  // 跳过链接
  if (trimmed.startsWith('http') || trimmed.startsWith('mailto:')) {
    return true;
  }
  
  // 跳过图片路径
  if (trimmed.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
    return true;
  }
  
  // 跳过空行或只有符号的行
  if (trimmed.length < 3 || /^[#\s\-*]+$/.test(trimmed)) {
    return true;
  }
  
  // 跳过 frontmatter 中的 title/description（单独处理）
  if (trimmed.match(/^(title|description|image):/)) {
    return false; // 需要检查
  }
  
  return false;
}

/**
 * 检查文件
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];
  
  let inCodeBlock = false;
  let inFrontmatter = false;
  let frontmatterLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 检测代码块
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    // 检测 frontmatter
    if (trimmed === '---') {
      inFrontmatter = !inFrontmatter;
      if (inFrontmatter) {
        frontmatterLine = i;
      }
      continue;
    }
    
    // 跳过代码块
    if (inCodeBlock) {
      continue;
    }
    
    // 检查 frontmatter
    if (inFrontmatter) {
      const titleMatch = trimmed.match(/^title:\s*["']([^"']+)["']/);
      const descMatch = trimmed.match(/^description:\s*["']([^"']+)["']/);
      
      if (titleMatch) {
        const title = titleMatch[1];
        if (hasEnglish(title) && !hasChinese(title)) {
          issues.push({
            line: i + 1,
            type: 'frontmatter-title',
            content: title,
            original: line
          });
        }
      }
      
      if (descMatch) {
        const desc = descMatch[1];
        if (hasEnglish(desc) && !hasChinese(desc)) {
          issues.push({
            line: i + 1,
            type: 'frontmatter-description',
            content: desc,
            original: line
          });
        }
      }
      continue;
    }
    
    // 跳过不应该检查的行
    if (shouldSkip(line)) {
      continue;
    }
    
    // 检查正文内容
    if (hasEnglish(trimmed) && !hasChinese(trimmed) && trimmed.length > 5) {
      issues.push({
        line: i + 1,
        type: 'content',
        content: trimmed,
        original: line
      });
    }
  }
  
  return issues;
}

/**
 * 处理目录
 */
function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  const results = [];
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(...processDirectory(fullPath));
    } else if (item.endsWith('.mdx')) {
      const issues = checkFile(fullPath);
      if (issues.length > 0) {
        results.push({
          file: fullPath.replace(TARGET_DIR + '/', ''),
          issues
        });
      }
    }
  }
  
  return results;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 检查未翻译的英文内容...\n');
  console.log(`📁 目标目录: ${TARGET_DIR}\n`);
  
  const results = processDirectory(TARGET_DIR);
  
  if (results.length === 0) {
    console.log('✅ 所有文件都已翻译完成！');
    return;
  }
  
  console.log(`📊 发现 ${results.length} 个文件包含未翻译内容：\n`);
  
  results.forEach(({ file, issues }) => {
    console.log(`📄 ${file} (${issues.length} 处未翻译)`);
    issues.forEach(issue => {
      console.log(`   [${issue.line}] ${issue.type}: ${issue.content.substring(0, 60)}${issue.content.length > 60 ? '...' : ''}`);
    });
    console.log('');
  });
  
  console.log(`\n总计: ${results.reduce((sum, r) => sum + r.issues.length, 0)} 处未翻译内容`);
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, processDirectory };

