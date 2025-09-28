# Chrome Web Store 发布清单

## 插件信息 (Extension Information)

### 基本信息 (Basic Information)
- **插件名称 (Name)**: Job Application Tracker
- **简短描述 (Short Description)**: Track and manage your job applications from Gmail with intelligent parsing and dashboard visualization
- **详细描述 (Detailed Description)**: 
  A powerful Chrome extension that automatically tracks your job applications from Gmail. Features intelligent email parsing for LinkedIn, Indeed, and other platforms, visual kanban dashboard, status management, and seamless integration with external job tracking platforms.

### 功能特性 (Key Features)
- ✅ 自动从Gmail解析工作申请邮件 (Automatic Gmail job application parsing)
- ✅ 支持LinkedIn、Indeed等主流平台 (Supports LinkedIn, Indeed, and more)  
- ✅ 可视化看板仪表板 (Visual kanban dashboard)
- ✅ 智能状态检测 (Intelligent status detection)
- ✅ 数据导出功能 (Data export capabilities)
- ✅ 与外部平台集成 (External platform integration)
- ✅ 安全的OAuth认证 (Secure OAuth authentication)

### 权限说明 (Permissions Explanation)
- **identity**: 用于Google账户登录和Gmail API访问
- **storage**: 本地存储应用数据
- **Gmail API**: 读取邮件以解析工作申请信息
- **External sites**: 与job tracking平台集成

### 隐私政策要点 (Privacy Policy Points)
- 仅读取Gmail中的工作申请相关邮件
- 所有数据本地存储，不上传到第三方服务器
- 用户完全控制数据导出和共享
- 遵循Google API服务条款

## 发布资源 (Publishing Assets)

### 图标 (Icons)
需要创建以下尺寸的图标：
- 16x16 px (manifest)
- 48x48 px (管理页面)
- 128x128 px (Chrome Web Store)

### 截图 (Screenshots) 
需要准备：
- 仪表板主界面截图 (Dashboard main view)
- Gmail集成演示 (Gmail integration demo)
- 数据导出功能 (Export functionality)
- 状态管理界面 (Status management)

### 宣传图片 (Promotional Images)
- 小瓦片: 440x280 px
- 大瓦片: 920x680 px  
- 跑马灯: 1400x560 px

## 技术要求 (Technical Requirements)

### Manifest V3 合规性
- ✅ 使用service worker而非background页面
- ✅ 声明所需的host permissions
- ✅ 使用chrome.identity API进行OAuth

### 安全要求
- ✅ 内容安全政策 (CSP) 合规
- ✅ 最小权限原则
- ✅ 安全的API调用

## 发布清单 (Publishing Checklist)

### 开发完成
- ✅ 核心功能完成
- ✅ 导出集成功能完成
- ⏳ 生产环境OAuth配置
- ⏳ 错误处理优化
- ⏳ 用户体验优化

### 测试
- ⏳ 功能测试
- ⏳ 跨平台兼容性测试  
- ⏳ 性能测试
- ⏳ 安全测试

### 发布准备
- ⏳ Chrome Web Store开发者账户
- ⏳ 生产环境OAuth Client ID
- ⏳ 插件图标和截图
- ⏳ 隐私政策页面
- ⏳ 发布描述文本

### 发布后
- ⏳ 用户反馈收集
- ⏳ 使用analytics监控
- ⏳ 定期更新和维护

## OAuth 生产配置步骤

1. **Google Cloud Console 设置**:
   - 创建新的OAuth Client ID (类型: Chrome Extension)
   - 设置正确的Chrome Extension ID
   - 更新redirect URI

2. **Chrome Web Store 准备**:
   - 创建开发者账户 ($5一次性费用)
   - 上传插件并获取Extension ID
   - 配置OAuth Client ID

3. **部署流程**:
   - 更新 `env.prod.json` 中的 client_id
   - 运行 `npm run build:prod`
   - 打包chrome-extension文件夹
   - 上传到Chrome Web Store

## 集成测试指南

### 测试total-job-tracker.vercel.app集成
1. 同步Gmail数据
2. 点击"导出到Total Job Tracker"
3. 验证数据格式正确性
4. 测试API调用或文件下载
5. 在目标平台验证导入结果

### CSV导出测试
1. 生成测试数据
2. 导出CSV文件
3. 验证格式和内容
4. 测试在Excel/Google Sheets中打开

## 后续优化计划

### 功能增强
- 添加更多job board支持
- 增强状态检测算法
- 添加通知功能
- 支持批量操作

### 用户体验
- 改进UI/UX设计
- 添加数据可视化图表
- 提供使用教程
- 多语言支持

### 平台集成
- 支持更多job tracking平台
- 实现双向同步
- API密钥管理
- 高级筛选功能