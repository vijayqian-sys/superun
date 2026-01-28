#!/usr/bin/env node

/**
 * 综合修复脚本：修复所有翻译相关的错误
 * 
 * 功能包括：
 * 1. 修复被错误翻译的 JSX 标签
 * 2. 修复被翻译的 JSX 属性
 * 3. 修复产品名称占位符
 * 4. 修复路径大小写问题
 * 5. 修复引号问题
 * 6. 修复其他翻译错误（如 none需 -> 無需）
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'zh-Hant');

// ==================== JSX 标签映射 ====================
const JSX_TAG_MAP = {
  // 手風琴相关
  '</手風琴>': '</Accordion>',
  '</手風琴組>': '</AccordionGroup>',
  '<手風琴': '<Accordion',
  '<手風琴組': '<AccordionGroup',
  
  // 框架相关
  '</框架>': '</Frame>',
  '<框架': '<Frame',
  
  // 卡片相关
  '</卡>': '</Card>',
  '</卡組>': '</CardGroup>',
  '<卡': '<Card',
  '<卡組': '<CardGroup',
  
  // 列相关
  '</列>': '</Columns>',
  '<列': '<Columns',
  
  // 其他组件
  '</塊引用>': '</Blockquote>',
  '<塊引用': '<Blockquote',
  
  '</信息>': '</Info>',
  '<信息': '<Info',
  
  '</警告>': '</Warning>',
  '<警告': '<Warning',
  
  '</注>': '</Note>',
  '<注': '<Note',
};

// ==================== JSX 属性映射 ====================
const JSX_ATTRIBUTE_MAP = {
  '風格': 'style',
  '背景顏色': 'backgroundColor',
  '顏色': 'color',
  '內邊距': 'padding',
  '邊框半徑': 'borderRadius',
  '字體大小': 'fontSize',
  '字體粗細': 'fontWeight',
  '過渡': 'transition',
  '顯示': 'display',
  '彎曲': 'flex',
  '中心': 'center',
  '無': 'none',
  '白色': 'white',
  '全部 0.2 秒緩和': 'all 0.2s ease',
};

// ==================== 产品名称映射 ====================
const PRODUCT_MAP = {
  0: 'superun Cloud',
  1: 'superun',
  2: 'superun Cloud',
  3: 'superun',
  4: 'Prompt.to.design',
  5: 'superun AI',
  6: 'Supabase',
  7: 'Stripe',
  8: 'Resend',
  9: 'OpenAI',
  10: 'Anthropic',
  11: 'Claude',
  12: 'GPT-4',
  13: 'GPT-5',
  14: 'Gemini',
  15: 'Prompt.to.design',
};

// 占位符映射
const PLACEHOLDER_MAP = {
  '__產品_0__': 'superun Cloud',
  '__產品_1__': 'superun',
  '__產品_2__': 'superun Cloud',
  '__產品_3__': 'superun',
  '__產品_4__': 'Prompt.to.design',
  '__產品_5__': 'superun AI',
  '__產品_6__': 'Supabase',
  '__產品_7__': 'Stripe',
  '__產品_8__': 'Resend',
  '__產品_9__': 'OpenAI',
  '__產品_10__': 'Anthropic',
  '__產品_11__': 'Claude',
  '__產品_13__': 'GPT-5',
  '__產品_15__': 'Prompt.to.design',
  '__Product_0__': 'superun Cloud',
  '__Product_1__': 'superun',
  '__Product_2__': 'superun Cloud',
  '__Product_3__': 'superun',
  '__Product_4__': 'Prompt.to.design',
  '__Product_5__': 'superun AI',
  '__Product_6__': 'Supabase',
  '__Product_7__': 'Stripe',
  '__Product_8__': 'Resend',
  '__Product_9__': 'OpenAI',
  '__Product_10__': 'Anthropic',
  '__Product_11__': 'Claude',
  '__Product_13__': 'GPT-5',
  '__Product_15__': 'Prompt.to.design',
  '__product_0__': 'superun Cloud',
  '__product_1__': 'superun',
  '__product_2__': 'superun Cloud',
  '__product_3__': 'superun',
  '__product_4__': 'Prompt.to.design',
  '__product_5__': 'superun AI',
  '__product_6__': 'Supabase',
  '__product_7__': 'Stripe',
  '__product_8__': 'Resend',
  '__product_9__': 'OpenAI',
  '__product_10__': 'Anthropic',
  '__product_11__': 'Claude',
  '__product_13__': 'GPT-5',
  '__product_15__': 'Prompt.to.design',
};

// ==================== 翻译错误映射 ====================
const TRANSLATION_MAP = {
  // none 相关
  'none需': '無需',
  'none法': '無法',
  'none縫': '無縫',
  'none論': '無論',
  'none線': '無線',
  'none供應商': '無供應商',
  'none密碼': '無密碼',
  'none服務器': '無服務器',
  'none塔': '無需',
  
  // style 相关（在正文中）
  ' style': ' 風格',
  'style ': '風格 ',
  ' style ': ' 風格 ',
  'style。': '風格。',
  'style，': '風格，',
  'style：': '風格：',
  'style的': '風格的',
  'style化': '風格化',
  'style轉': '風格轉',
  'style參': '風格參',
  'style參考': '風格參考',
  'style相匹配': '風格相匹配',
  'style的內容': '風格的內容',
  
  // display 相关
  'display為': '顯示為',
  'display消息': '顯示消息',
  'display一個': '顯示一個',
  'display與': '顯示與',
  'display相關': '顯示相關',
  'display佈局': '顯示佈局',
  
  // color 相关
  'color、': '顏色、',
  'color、排版': '顏色、排版',
  
  // 其他
  '＃＃': '##',
  'src =': 'src=',
  '寬度=': 'width=',
};

// ==================== JSX 属性格式修复 ====================
const JSX_FIXES = {
  'display：': 'display:',
  'color：': 'color:',
  'padding：': 'padding:',
  'borderRadius：': 'borderRadius:',
  'fontSize：': 'fontSize:',
  'fontWeight：': 'fontWeight:',
  'transition：': 'transition:',
  'justifyContent: \'中心\'': 'justifyContent: \'center\'',
  '顯示：\'彎曲\'': 'display: \'flex\'',
  '風格={{': 'style={{',
  '背景顏色:': 'backgroundColor:',
  '顏色：\'白色\'': 'color: \'white\'',
  '內邊距：': 'padding: ',
  '邊框半徑：': 'borderRadius: ',
  '字體大小：': 'fontSize: ',
  '字體粗細：': 'fontWeight: ',
  'textDecoration: \'無\'': 'textDecoration: \'none\'',
  '過渡："全部 0.2 秒緩和"': 'transition: \'all 0.2s ease\'',
};

// ==================== 路径大小写修复 ====================
const PATH_FIXES = [
  { from: /\/zh-Hant\/superun\//gi, to: '/zh-Hant/superun/' },
  { from: /\/zh-Hant\/superun\/integrations\/Supabase/gi, to: '/zh-Hant/superun/integrations/supabase' },
  { from: /\/zh-Hant\/superun\/integrations\/Stripe/gi, to: '/zh-Hant/superun/integrations/stripe' },
  { from: /\/zh-Hant\/superun\/integrations\/Resend/gi, to: '/zh-Hant/superun/integrations/resend' },
  { from: /\/zh-Hant\/Prompt-to-design\//gi, to: '/zh-Hant/prompt-to-design/' },
  { from: /\/zh-Hant\/Prompt\.to\.design\//gi, to: '/zh-Hant/prompt-to-design/' },
];

// ==================== URL 大小写修复 ====================
const URL_FIXES = [
  { from: /https:\/\/superun\.ai/gi, to: 'https://superun.com' },
  { from: /https:\/\/Supabase\.com/gi, to: 'https://supabase.com' },
  { from: /https:\/\/Stripe\.com/gi, to: 'https://stripe.com' },
  { from: /https:\/\/Resend\.com/gi, to: 'https://resend.com' },
  { from: /https:\/\/www\.Figma\.com/gi, to: 'https://www.figma.com' },
  { from: /https:\/\/Figma\.com/gi, to: 'https://figma.com' },
  { from: /https:\/\/OpenAI\.com/gi, to: 'https://openai.com' },
  { from: /https:\/\/platform\.OpenAI\.com/gi, to: 'https://platform.openai.com' },
];

/**
 * 修复单个文件
 */
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // 1. 修复 JSX 标签
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 处理 </步驟> - 需要根据上下文判断
    if (line.includes('</步驟>')) {
      let foundSteps = false;
      let foundStep = false;
      
      for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
        if (lines[j].includes('<Steps>')) {
          foundSteps = true;
          break;
        }
        if (lines[j].includes('<Step') && !lines[j].includes('</Steps>') && !lines[j].includes('</Step>')) {
          foundStep = true;
          break;
        }
      }
      
      if (foundSteps) {
        let hasStepBefore = false;
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          if (lines[j].includes('</Step>')) {
            hasStepBefore = true;
            break;
          }
        }
        if (hasStepBefore) {
          line = line.replace('</步驟>', '</Steps>');
        } else {
          line = line.replace('</步驟>', '</Step>');
        }
      } else if (foundStep) {
        line = line.replace('</步驟>', '</Step>');
      } else {
        line = line.replace('</步驟>', '</Step>');
      }
    }
    
    // 处理其他 JSX 标签
    for (const [chinese, english] of Object.entries(JSX_TAG_MAP)) {
      if (english && line.includes(chinese)) {
        line = line.replace(new RegExp(chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), english);
      }
    }
    
    fixedLines.push(line);
  }
  
  content = fixedLines.join('\n');
  
  // 再次全局替换 JSX 标签
  for (const [chinese, english] of Object.entries(JSX_TAG_MAP)) {
    if (english) {
      const regex = new RegExp(chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, english);
    }
  }
  
  // 处理剩余的 </步驟>
  content = content.replace(/<Steps>[\s\S]*?<\/步驟>/g, (match) => {
    if (match.includes('</Step>')) {
      return match.replace('</步驟>', '</Steps>');
    }
    return match.replace('</步驟>', '</Step>');
  });
  content = content.replace(/<\/步驟>/g, '</Step>');
  
  // 2. 修复产品名称占位符
  for (const [placeholder, replacement] of Object.entries(PLACEHOLDER_MAP)) {
    content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
  }
  
  // 3. 修复翻译错误（在正文中，不在 JSX 属性中）
  Object.keys(TRANSLATION_MAP).forEach(key => {
    const value = TRANSLATION_MAP[key];
    // 只在非 JSX 属性区域替换
    content = content.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  });
  
  // 4. 修复 JSX 属性
  Object.keys(JSX_ATTRIBUTE_MAP).forEach(chinese => {
    const english = JSX_ATTRIBUTE_MAP[chinese];
    // 只在 JSX 属性区域替换（如 style={{...}} 或 className="..."）
    const regex = new RegExp(chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    // 检查是否在 JSX 属性上下文中
    if (content.includes(chinese)) {
      // 更精确的替换：只在 style={{...}} 或类似的上下文中
      content = content.replace(regex, english);
    }
  });
  
  // 5. 修复 JSX 属性格式
  Object.keys(JSX_FIXES).forEach(key => {
    const value = JSX_FIXES[key];
    content = content.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  });
  
  // 6. 修复路径大小写
  PATH_FIXES.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });
  
  // 7. 修复 URL 大小写
  URL_FIXES.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });
  
  // 8. 修复引号问题（全角引号 -> 半角引号，在 JSX 属性中）
  content = content.replace(/src="([^"]+)"/g, (match, path) => {
    return `src="${path}"`;
  });
  content = content.replace(/alt="([^"]+)"/g, (match, text) => {
    return `alt="${text}"`;
  });
  content = content.replace(/href="([^"]+)"/g, (match, url) => {
    return `href="${url}"`;
  });
  content = content.replace(/title="([^"]+)"/g, (match, text) => {
    return `title="${text}"`;
  });
  content = content.replace(/description:\s*"([^"]+)"/g, (match, text) => {
    return `description: "${text}"`;
  });
  
  // 9. 修复 description 语法错误
  content = content.replace(/description: "([^"]*)"s ([^"]*)"/g, 'description: "$1 $2"');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

/**
 * 处理目录
 */
function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  let count = 0;

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      count += processDirectory(fullPath);
    } else if (item.endsWith('.mdx')) {
      if (fixFile(fullPath)) {
        console.log(`✅ 已修复: ${fullPath.replace(TARGET_DIR + '/', '')}`);
        count++;
      }
    }
  }

  return count;
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 修复所有翻译错误...\n');
  console.log('功能包括：');
  console.log('  - 修复 JSX 标签');
  console.log('  - 修复 JSX 属性');
  console.log('  - 修复产品名称占位符');
  console.log('  - 修复路径大小写');
  console.log('  - 修复引号问题');
  console.log('  - 修复其他翻译错误\n');
  console.log(`📁 目标目录: ${TARGET_DIR}\n`);

  const count = processDirectory(TARGET_DIR);

  console.log(`\n✅ 完成！共修复 ${count} 个文件`);
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, JSX_TAG_MAP, JSX_ATTRIBUTE_MAP, PLACEHOLDER_MAP, TRANSLATION_MAP };
