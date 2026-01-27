#!/usr/bin/env node

/**
 * 翻译管理脚本
 * 用于自动化管理多语言文档的翻译工作流
 * 
 * 功能：
 * 1. 检测新的英文页面
 * 2. 自动创建对应的繁体中文目录结构
 * 3. 复制文件并标记需要翻译的内容
 * 4. 更新内部链接
 * 5. 生成翻译状态报告
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..');
const TARGET_DIR = path.join(SOURCE_DIR, 'zh-Hant');
const EXCLUDE_DIRS = ['node_modules', '.git', 'zh-Hant', 'scripts', 'public', 'images', 'logo', '.DS_Store'];

// 产品名称列表（用于文档说明，实际保护在翻译脚本中实现）
const PRODUCT_NAMES = [
  'superun Cloud',
  'superun AI',
  'superun.ai',
  'superun',
  'Prompt.to.design',
  'Supabase',
  'Stripe',
  'Resend',
  'OpenAI',
  'Anthropic',
  'Claude',
  'GPT-4',
  'GPT-5',
  'Gemini',
  'Figma',
  'Vercel',
  'Netlify',
  'GitHub',
  'GitLab'
];

// 翻译状态文件
const STATUS_FILE = path.join(SOURCE_DIR, '.translation-status.json');

/**
 * 获取所有 .mdx 文件
 */
function getAllMdxFiles(dir, basePath = '') {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !EXCLUDE_DIRS.includes(item)) {
      files.push(...getAllMdxFiles(fullPath, relativePath));
    } else if (item.endsWith('.mdx')) {
      files.push({
        fullPath,
        relativePath: relativePath.replace(/\\/g, '/'),
        name: item
      });
    }
  }

  return files;
}

/**
 * 更新文件中的链接
 * 注意：只更新链接路径，不修改其他内容（保护产品名称和 JSX 标签属性）
 */
function updateLinks(content, sourcePath) {
  let updatedContent = content;
  
  // 保护 JSX 标签属性（除了 href 之外的所有属性）
  // 先保护所有 JSX 标签，避免在更新链接时误修改其他属性
  const jsxTags = [];
  const jsxTagPattern = /<[A-Z][a-zA-Z]*[^>]*>/g;
  updatedContent = updatedContent.replace(jsxTagPattern, (match) => {
    // 只处理包含 href 的标签，其他标签保持不变
    if (match.includes('href=')) {
      const placeholder = `__JSX_TAG_${jsxTags.length}__`;
      jsxTags.push(match);
      return placeholder;
    }
    return match; // 不包含 href 的标签保持不变
  });
  
  // 更新 Markdown 链接: [text](/path)
  updatedContent = updatedContent.replace(/\[([^\]]+)\]\((\/[^)]+)\)/g, (match, text, path) => {
    if (!path || typeof path !== 'string') return match;
    // 跳过外部链接和已经包含 /zh-Hant/ 的链接
    if (path.startsWith('http') || path.startsWith('mailto:') || path.includes('/zh-Hant/')) {
      return match;
    }
    // 跳过图片和资源文件
    if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i)) {
      return match;
    }
    // 添加 /zh-Hant/ 前缀
    return `[${text}](/zh-Hant${path})`;
  });
  
  // 恢复 JSX 标签并更新其中的 href
  jsxTags.forEach((tag, index) => {
    const placeholder = `__JSX_TAG_${index}__`;
    let updatedTag = tag;
    
    // 更新 href 属性
    updatedTag = updatedTag.replace(/href="(\/[^"]+)"/g, (match, path) => {
      if (!path || typeof path !== 'string') return match;
      // 跳过外部链接和已经包含 /zh-Hant/ 的链接
      if (path.startsWith('http') || path.startsWith('mailto:') || path.includes('/zh-Hant/')) {
        return match;
      }
      // 跳过图片和资源文件
      if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i)) {
        return match;
      }
      // 添加 /zh-Hant/ 前缀
      return `href="/zh-Hant${path}"`;
    });
    
    updatedContent = updatedContent.replace(placeholder, updatedTag);
  });
  
  // 更新普通 a 标签中的 href（不在 JSX 组件中的）
  updatedContent = updatedContent.replace(/<a[^>]+href="(\/[^"]+)"[^>]*>/g, (match, path) => {
    if (!path || typeof path !== 'string') return match;
    // 跳过外部链接和已经包含 /zh-Hant/ 的链接
    if (path.startsWith('http') || path.startsWith('mailto:') || path.includes('/zh-Hant/')) {
      return match;
    }
    // 跳过图片和资源文件
    if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i)) {
      return match;
    }
    // 添加 /zh-Hant/ 前缀
    return match.replace(`href="${path}"`, `href="/zh-Hant${path}"`);
  });

  return updatedContent;
}

/**
 * 创建翻译模板
 */
function createTranslationTemplate(sourceContent, sourcePath) {
  // 添加翻译标记注释（使用 MDX 格式）
  const header = `{/* 
  翻译状态: 待翻译
  源文件: ${sourcePath}
  最后更新: ${new Date().toISOString()}
  请将以下内容翻译成繁体中文
*/}\n\n`;
  
  // 更新链接
  const updatedContent = updateLinks(sourceContent, sourcePath);
  
  return header + updatedContent;
}

/**
 * 检查文件是否真的已翻译（包含中文字符）
 */
function isActuallyTranslated(content) {
  // 检查是否包含中文字符（包括繁体中文）
  const chinesePattern = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
  return chinesePattern.test(content);
}

/**
 * 检查文件是否需要翻译
 */
function needsTranslation(sourceFile, targetFile) {
  if (!fs.existsSync(targetFile)) {
    return true;
  }

  const sourceStat = fs.statSync(sourceFile);
  const targetStat = fs.statSync(targetFile);
  const targetContent = fs.readFileSync(targetFile, 'utf-8');

  // 如果源文件更新，需要重新翻译
  if (sourceStat.mtime > targetStat.mtime) {
    return true;
  }

  // 如果目标文件不包含中文字符，说明还没有翻译
  if (!isActuallyTranslated(targetContent)) {
    return true;
  }

  return false;
}

/**
 * 同步文件
 */
function syncFile(sourceFile) {
  const targetPath = path.join(TARGET_DIR, sourceFile.relativePath);
  const targetDir = path.dirname(targetPath);

  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 检查是否需要更新
  if (needsTranslation(sourceFile.fullPath, targetPath)) {
    const sourceContent = fs.readFileSync(sourceFile.fullPath, 'utf-8');
    
    // 检查是否已经翻译过（不包含翻译标记）
    let targetContent = '';
    if (fs.existsSync(targetPath)) {
      targetContent = fs.readFileSync(targetPath, 'utf-8');
    }

    // 检查是否真的已翻译（包含中文字符）
    const isTranslated = targetContent && isActuallyTranslated(targetContent);
    
    if (!isTranslated) {
      // 文件未翻译，创建/更新模板
      const template = createTranslationTemplate(sourceContent, sourceFile.relativePath);
      fs.writeFileSync(targetPath, template, 'utf-8');
      return { status: 'needs-translation', file: sourceFile.relativePath };
    } else {
      // 文件已翻译，但可能需要更新链接
      const updatedContent = updateLinks(targetContent, sourceFile.relativePath);
      if (updatedContent !== targetContent) {
        fs.writeFileSync(targetPath, updatedContent, 'utf-8');
        return { status: 'updated-links', file: sourceFile.relativePath };
      }
      return { status: 'translated', file: sourceFile.relativePath };
    }
  }

  return { status: 'up-to-date', file: sourceFile.relativePath };
}

/**
 * 生成翻译状态报告
 */
function generateStatusReport(results) {
  const status = {
    total: results.length,
    needsTranslation: results.filter(r => r.status === 'needs-translation').length,
    translated: results.filter(r => r.status === 'translated').length,
    updatedLinks: results.filter(r => r.status === 'updated-links').length,
    upToDate: results.filter(r => r.status === 'up-to-date').length,
    files: results
  };

  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
  return status;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 扫描文档文件...\n');
  
  const sourceFiles = getAllMdxFiles(SOURCE_DIR);
  console.log(`找到 ${sourceFiles.length} 个 .mdx 文件\n`);

  console.log('📝 同步文件...\n');
  const results = sourceFiles.map(file => {
    const result = syncFile(file);
    const icon = {
      'needs-translation': '⏳',
      'translated': '✅',
      'updated-links': '🔗',
      'up-to-date': '✓'
    }[result.status] || '❓';
    
    console.log(`${icon} ${result.file} (${result.status})`);
    return result;
  });

  console.log('\n📊 生成状态报告...\n');
  const status = generateStatusReport(results);

  console.log('翻译状态摘要:');
  console.log(`  总计: ${status.total}`);
  console.log(`  ⏳ 待翻译: ${status.needsTranslation}`);
  console.log(`  ✅ 已翻译: ${status.translated}`);
  console.log(`  🔗 已更新链接: ${status.updatedLinks}`);
  console.log(`  ✓ 最新: ${status.upToDate}`);
  console.log(`\n详细状态已保存到: ${STATUS_FILE}`);
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { getAllMdxFiles, syncFile, updateLinks };

