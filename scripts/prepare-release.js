#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Prepare Chrome Extension for Release

async function prepareRelease() {
  console.log('🚀 准备Chrome插件发布...');
  
  try {
    // Step 1: Check production environment configuration
    console.log('\n📋 1. 检查生产环境配置...');
    await checkProdConfig();
    
    // Step 2: Build production manifest
    console.log('\n🔨 2. 构建生产版manifest...');
    await buildProdManifest();
    
    // Step 3: Validate files
    console.log('\n✅ 3. 验证文件完整性...');
    await validateFiles();
    
    // Step 4: Create release package
    console.log('\n📦 4. 创建发布包...');
    await createReleasePackage();
    
    // Step 5: Generate release notes
    console.log('\n📝 5. 生成发布说明...');
    await generateReleaseNotes();
    
    console.log('\n🎉 发布准备完成！');
    console.log('\n下一步：');
    console.log('1. 上传 job-tracker-extension-release.zip 到Chrome Web Store');
    console.log('2. 在Google Cloud Console中配置生产OAuth Client ID');
    console.log('3. 更新 env.prod.json 中的 client_id');
    console.log('4. 重新构建并上传最终版本');
    
  } catch (error) {
    console.error('❌ 发布准备失败:', error.message);
    process.exit(1);
  }
}

async function checkProdConfig() {
  const envProdPath = path.join(__dirname, '..', 'env.prod.json');
  
  if (!fs.existsSync(envProdPath)) {
    throw new Error('env.prod.json 文件不存在');
  }
  
  const envProd = JSON.parse(fs.readFileSync(envProdPath, 'utf8'));
  
  if (!envProd.client_id || envProd.client_id.includes('YOUR_PROD')) {
    console.warn('⚠️ 警告: env.prod.json 中的 client_id 需要更新为生产环境的值');
    console.log('📌 当前值:', envProd.client_id);
    console.log('📌 请在Chrome Web Store获取Extension ID后更新此值');
  } else {
    console.log('✅ 生产环境配置检查通过');
  }
}

async function buildProdManifest() {
  try {
    await execAsync('node scripts/build-manifest.js prod');
    console.log('✅ 生产版manifest构建成功');
  } catch (error) {
    if (error.message.includes('Invalid client_id')) {
      console.log('ℹ️ 生产版client_id待配置，使用开发版继续...');
      await execAsync('node scripts/build-manifest.js dev');
    } else {
      throw error;
    }
  }
}

async function validateFiles() {
  const requiredFiles = [
    'chrome-extension/manifest.json',
    'chrome-extension/popup.html',
    'chrome-extension/popup.js',
    'chrome-extension/dashboard.html', 
    'chrome-extension/dashboard.js',
    'chrome-extension/service-worker.js',
    'chrome-extension/parsers.js',
    'chrome-extension/export-integration.js'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    throw new Error(`缺少必要文件: ${missingFiles.join(', ')}`);
  }
  
  console.log('✅ 所有必要文件都存在');
  
  // Validate manifest
  const manifestPath = path.join(__dirname, '..', 'chrome-extension', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  if (manifest.manifest_version !== 3) {
    throw new Error('Manifest版本必须为3');
  }
  
  console.log('✅ Manifest文件验证通过');
}

async function createReleasePackage() {
  const releaseDir = path.join(__dirname, '..', 'release');
  const chromeExtDir = path.join(__dirname, '..', 'chrome-extension');
  const releaseZip = path.join(__dirname, '..', 'job-tracker-extension-release.zip');
  
  // Create release directory
  if (fs.existsSync(releaseDir)) {
    await execAsync(`rm -rf "${releaseDir}"`);
  }
  fs.mkdirSync(releaseDir);
  
  // Copy chrome-extension files
  await execAsync(`cp -r "${chromeExtDir}" "${releaseDir}/"`);
  
  // Create zip file
  try {
    await execAsync(`cd "${releaseDir}" && zip -r "../job-tracker-extension-release.zip" chrome-extension/`);
    console.log('✅ 发布包创建成功: job-tracker-extension-release.zip');
  } catch (error) {
    console.log('ℹ️ 请手动压缩chrome-extension文件夹用于上传');
  }
  
  // Cleanup
  await execAsync(`rm -rf "${releaseDir}"`);
}

async function generateReleaseNotes() {
  const releaseNotes = `# Job Application Tracker Chrome Extension

## 版本信息 (Version Information)
- **版本**: 1.0.0
- **发布日期**: ${new Date().toISOString().split('T')[0]}
- **Manifest版本**: 3

## 新功能 (New Features)
### ✨ 核心功能
- 🔍 **智能邮件解析**: 自动从Gmail中识别和解析工作申请邮件
- 📧 **多平台支持**: 支持LinkedIn、Indeed等主流招聘平台
- 📊 **可视化仪表板**: 看板样式的工作申请管理界面
- 🎯 **智能状态检测**: 自动识别申请状态 (applied, viewed, interview, offer, rejected, ghost)

### 🚀 集成功能
- 📤 **数据导出**: 支持导出到Total Job Tracker平台
- 📋 **CSV导出**: 导出数据为CSV格式便于分析
- 🔄 **实时同步**: 与Gmail实时同步获取最新数据
- 📈 **数据可视化**: 内置图表显示申请趋势和统计

### 🔒 安全特性
- 🛡️ **OAuth 2.0认证**: 安全的Google账户登录
- 🔐 **本地存储**: 数据完全本地存储，保护隐私
- 📝 **最小权限**: 仅请求必要的Gmail读取权限

## 技术规格 (Technical Specifications)
- **Manifest**: Version 3 (最新标准)
- **API**: Gmail API v1, Google Identity API
- **存储**: Chrome Extension Storage API
- **架构**: Service Worker + Content Scripts
- **兼容性**: Chrome 88+ (支持Manifest V3的版本)

## 安装要求 (Installation Requirements)
1. Google Chrome 浏览器 88+ 版本
2. Gmail账户
3. 开启Chrome开发者模式 (仅限开发版本)

## 权限说明 (Permissions Explanation)
- **identity**: Google账户登录和OAuth认证
- **storage**: 本地存储应用数据和设置
- **Gmail API**: 读取邮件内容以解析工作申请
- **host_permissions**: 访问Google API和外部集成平台

## 隐私保护 (Privacy Protection)
- ✅ 仅读取工作申请相关的邮件
- ✅ 数据完全本地存储，不上传到第三方
- ✅ 用户完全控制数据导出和分享
- ✅ 遵循Google API服务条款和隐私政策

## 使用说明 (Usage Instructions)
1. 安装插件后点击浏览器工具栏中的图标
2. 点击"Sign in with Google"登录Gmail账户
3. 点击"Sync Gmail"同步邮件数据
4. 在仪表板中查看和管理工作申请
5. 使用拖拽功能更新申请状态
6. 导出数据到外部平台或CSV文件

## 支持的邮件类型 (Supported Email Types)
### LinkedIn
- Easy Apply确认邮件
- 申请状态更新
- 面试邀请
- 申请被查看通知

### Indeed
- 申请确认邮件
- 状态更新通知

### 通用平台
- 公司直接发送的邮件
- 招聘平台通知
- HR系统自动邮件

## 故障排除 (Troubleshooting)
### 常见问题
1. **登录失败**: 检查是否已启用Gmail API
2. **无法同步**: 确认网络连接和Gmail访问权限
3. **数据丢失**: 检查Chrome存储空间
4. **解析错误**: 某些邮件格式可能需要手动分类

### 技术支持
如遇到问题，请提供以下信息：
- Chrome版本
- 插件版本  
- 错误信息
- 复现步骤

## 更新日志 (Changelog)
### v1.0.0 (初始版本)
- 首次发布
- 支持Gmail邮件解析
- 看板仪表板
- 数据导出功能
- LinkedIn/Indeed/通用解析器

## 路线图 (Roadmap)
### 计划功能
- 📧 更多邮件平台支持
- 🔔 桌面通知
- 📊 高级数据分析
- 🎨 自定义主题
- 🌍 多语言支持
- 🔄 双向数据同步

## 反馈和建议 (Feedback)
欢迎通过以下方式提供反馈：
- Chrome Web Store评论
- GitHub Issues (如有开源)
- 邮件联系

---
© 2024 Job Application Tracker. 遵循MIT许可证。`;

  const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
  fs.writeFileSync(releaseNotesPath, releaseNotes);
  
  console.log('✅ 发布说明已生成: RELEASE_NOTES.md');
}

// Run the preparation
if (require.main === module) {
  prepareRelease();
}

module.exports = { prepareRelease };