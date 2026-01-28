const fs = require('fs');
const path = require('path');

const DOCS_ROOT = path.join(__dirname, '..');
const BASE_URL = 'https://docs.superun.com';

// 解析 frontmatter
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, content: content };
  }
  
  const frontmatterText = match[1];
  const body = match[2];
  const frontmatter = {};
  
  // 简单解析 YAML frontmatter
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  });
  
  return { frontmatter, content: body };
}

// 获取所有 MDX 文件
function getAllMdxFiles(dir, basePath = '') {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
    
    if (item.isDirectory()) {
      // 跳过 node_modules 和其他不需要的目录，以及 prompt-to-design 目录
      if (!['node_modules', '.git', 'public', 'images', 'logo', 'scripts', 'prompt-to-design'].includes(item.name)) {
        files.push(...getAllMdxFiles(fullPath, relativePath));
      }
    } else if (item.isFile() && item.name.endsWith('.mdx')) {
      files.push({
        path: fullPath,
        relativePath: relativePath.replace(/\.mdx$/, ''),
        isZhHant: relativePath.startsWith('zh-Hant/'),
        isZhHans: relativePath.startsWith('zh-Hans/')
      });
    }
  }
  
  return files;
}

// 生成 URL
function generateUrl(relativePath, isZhHant, isZhHans) {
  let urlPath = relativePath;
  
  // 处理首页
  if (relativePath === 'index') {
    urlPath = '';
  } else if (relativePath === 'zh-Hant/index') {
    urlPath = 'zh-Hant';
  } else if (relativePath === 'zh-Hans/index') {
    urlPath = 'zh-Hans';
  } else if (isZhHant || isZhHans) {
    // 保持语言前缀
    urlPath = relativePath;
  }
  
  return `${BASE_URL}/${urlPath}`;
}

// 主函数
function generateLlmsTxt() {
  console.log('🔍 扫描 MDX 文件...');
  const allFiles = getAllMdxFiles(DOCS_ROOT);
  
  console.log(`📄 找到 ${allFiles.length} 个文件`);
  
  const enPages = [];
  const zhHantPages = [];
  const zhHansPages = [];
  
  // 处理每个文件
  for (const file of allFiles) {
    // 只处理 superun 相关的文件，排除 prompt-to-design
    const isSuperun = file.relativePath.startsWith('superun/') || 
                      file.relativePath.startsWith('zh-Hant/superun/') ||
                      file.relativePath.startsWith('zh-Hans/superun/');
    
    if (!isSuperun) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(file.path, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      
      const title = frontmatter.title || file.relativePath;
      const description = frontmatter.description || '';
      const url = generateUrl(file.relativePath, file.isZhHant, file.isZhHans);
      
      const pageInfo = {
        title,
        description,
        url,
        path: file.relativePath
      };
      
      if (file.isZhHant) {
        zhHantPages.push(pageInfo);
      } else if (file.isZhHans) {
        zhHansPages.push(pageInfo);
      } else {
        enPages.push(pageInfo);
      }
    } catch (error) {
      console.error(`❌ 读取文件失败: ${file.path}`, error.message);
    }
  }
  
  // 按路径排序
  enPages.sort((a, b) => a.path.localeCompare(b.path));
  zhHantPages.sort((a, b) => a.path.localeCompare(b.path));
  zhHansPages.sort((a, b) => a.path.localeCompare(b.path));
  
  // 按照 llms.txt 规范生成内容
  // 格式：H1 + blockquote + 详细信息 + H2 分隔的文件列表
  // 区分语言：根目录为英文版，zh-Hant目录为繁体中文版，zh-Hans目录为简体中文版
  
  // 生成英文文档内容（根目录）
  let enContent = `# superun Documentation\n\n`;
  enContent += `> superun is an AI-powered builder for apps and web, from prompt to publish with code and visual editing. Complete documentation for superun features, integrations, tips & tricks, and use cases.\n\n`;
  enContent += `## Documentation\n\n`;
  for (const page of enPages) {
    if (page.description) {
      enContent += `- [${page.title}](${page.url}): ${page.description}\n`;
    } else {
      enContent += `- [${page.title}](${page.url})\n`;
    }
  }
  
  // 生成繁体中文文档内容（zh-Hant目录）
  let zhHantContent = `# superun 文檔\n\n`;
  zhHantContent += `> superun 是一款由 AI 驅動的應用與網站建置平台，透過自然語言即可建立並發佈應用，結合代碼模式與可視化編輯。完整的 superun 功能、整合、技巧與使用案例文檔。\n\n`;
  zhHantContent += `## 文檔\n\n`;
  for (const page of zhHantPages) {
    if (page.description) {
      zhHantContent += `- [${page.title}](${page.url}): ${page.description}\n`;
    } else {
      zhHantContent += `- [${page.title}](${page.url})\n`;
    }
  }
  
  // 生成简体中文文档内容（zh-Hans目录）
  let zhHansContent = `# superun 文档\n\n`;
  zhHansContent += `> superun 是一款由 AI 驱动的应用与网站建置平台，通过自然语言即可建立并发布应用，结合代码模式与可视化编辑。完整的 superun 功能、整合、技巧与使用案例文档。\n\n`;
  zhHansContent += `## 文档\n\n`;
  for (const page of zhHansPages) {
    if (page.description) {
      zhHansContent += `- [${page.title}](${page.url}): ${page.description}\n`;
    } else {
      zhHansContent += `- [${page.title}](${page.url})\n`;
    }
  }
  
  // 写入文件
  // 根目录的 llms.txt - 英文版（符合 llms.txt 规范）
  const llmsOutputPath = path.join(DOCS_ROOT, 'llms.txt');
  
  // zh-Hant 目录下的 llms.txt - 繁体中文版
  const zhHantDir = path.join(DOCS_ROOT, 'zh-Hant');
  const zhHantLlmsPath = path.join(zhHantDir, 'llms.txt');
  
  // zh-Hans 目录下的 llms.txt - 简体中文版
  const zhHansDir = path.join(DOCS_ROOT, 'zh-Hans');
  const zhHansLlmsPath = path.join(zhHansDir, 'llms.txt');
  
  // 确保目录存在
  if (!fs.existsSync(zhHantDir)) {
    fs.mkdirSync(zhHantDir, { recursive: true });
  }
  if (!fs.existsSync(zhHansDir)) {
    fs.mkdirSync(zhHansDir, { recursive: true });
  }
  
  // 根目录的 llms.txt（英文版）
  fs.writeFileSync(llmsOutputPath, enContent, 'utf-8');
  
  // zh-Hant 目录下的 llms.txt（繁体中文版，添加 UTF-8 BOM 以确保编码正确）
  const BOM = '\uFEFF';
  fs.writeFileSync(zhHantLlmsPath, BOM + zhHantContent, 'utf-8');
  
  // zh-Hans 目录下的 llms.txt（简体中文版，添加 UTF-8 BOM 以确保编码正确）
  fs.writeFileSync(zhHansLlmsPath, BOM + zhHansContent, 'utf-8');
  
  console.log(`\n✅ 已生成区分语言的文档文件（符合 llms.txt 规范）`);
  console.log(`   📍 llms.txt (根目录，简体中文版): ${llmsOutputPath}`);
  console.log(`      访问地址: https://docs.superun.com/llms.txt`);
  console.log(`   📍 llms.txt (zh-Hant目录，繁体中文版): ${zhHantLlmsPath}`);
  console.log(`      访问地址: https://docs.superun.com/zh-Hant/llms.txt`);
  console.log(`   📍 llms.txt (en目录，英文版): ${zhHansLlmsPath}`);
  console.log(`      访问地址: https://docs.superun.com/en/llms.txt`);
  console.log(`      注意: 访问中文版时可能出现 CSP 警告，但文件内容应能正常显示`);
  console.log(`   📊 英文页面: ${enPages.length} 个`);
  console.log(`   📊 繁体中文页面: ${zhHantPages.length} 个`);
  console.log(`   📊 简体中文页面: ${zhHansPages.length} 个`);
  console.log(`   📊 总计: ${enPages.length + zhHantPages.length + zhHansPages.length} 个页面`);
}

// 运行
generateLlmsTxt();

