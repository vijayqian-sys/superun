#!/usr/bin/env node

/**
 * 多语言配置检查脚本
 * 检查 docs.json 中的多语言配置是否正确
 */

const fs = require('fs');
const path = require('path');

const DOCS_JSON = path.join(__dirname, '..', 'docs.json');

console.log('🔍 检查多语言配置...\n');

try {
  const config = JSON.parse(fs.readFileSync(DOCS_JSON, 'utf-8'));
  
  // 检查 navigation.languages 配置（根据 Mintlify 官方文档）
  const languages = config.navigation?.languages;
  
  if (!languages || !Array.isArray(languages)) {
    console.log('❌ 未找到 navigation.languages 配置');
    console.log('💡 提示: 根据 Mintlify 文档，多语言配置应该在 navigation.languages 中');
    process.exit(1);
  }
  
  console.log(`✅ 找到 ${languages.length} 种语言配置:\n`);
  
  languages.forEach((lang, index) => {
    console.log(`  语言 ${index + 1}:`);
    console.log(`    代码: ${lang.language || '未设置'}`);
    console.log(`    标签: ${lang.label || '未设置'}`);
    console.log(`    导航结构: ${lang.tabs ? `${lang.tabs.length} 个 tabs` : lang.groups ? `${lang.groups.length} 个 groups` : '未设置'}`);
    console.log('');
  });
  
  // 检查目录是否存在
  console.log('📁 检查语言目录:\n');
  languages.forEach(lang => {
    const langCode = lang.language;
    let langDir = '';
    
    // 根据语言代码推断目录路径
    if (langCode === 'en') {
      langDir = path.join(__dirname, '..');
    } else if (langCode === 'zh-Hant' || langCode === 'zh-Hant') {
      langDir = path.join(__dirname, '..', 'zh-Hant');
    } else {
      // 其他语言可能使用语言代码作为目录名
      langDir = path.join(__dirname, '..', langCode);
    }
    
    if (fs.existsSync(langDir)) {
      const files = fs.readdirSync(langDir, { recursive: true })
        .filter(f => f.endsWith('.mdx'))
        .length;
      const dirName = langCode === 'en' ? '根目录' : path.basename(langDir);
      console.log(`  ✅ ${langCode} (${dirName}): ${files} 个 .mdx 文件`);
    } else {
      console.log(`  ⚠️  ${langCode}: 目录不存在 (${langDir})`);
    }
  });
  
  console.log('\n✅ 配置检查完成！');
  console.log('\n💡 提示:');
  console.log('  1. 确保 Mintlify CLI 是最新版本: mint --version');
  console.log('  2. 启动开发服务器: mint dev');
  console.log('  3. 在浏览器中查看语言切换器（通常在搜索框附近）');
  console.log('  4. 如果看不到，检查浏览器控制台是否有错误');
  
} catch (error) {
  console.error('❌ 检查失败:', error.message);
  process.exit(1);
}

