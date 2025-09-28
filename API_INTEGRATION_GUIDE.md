# API Integration Guide - Total Job Tracker

## 概述 (Overview)

本指南详细说明Chrome插件如何与 https://total-job-tracker.vercel.app/dashboard 进行数据集成。

## 集成方案 (Integration Options)

### 方案1：API接口集成 (推荐)
**URL**: `https://total-job-tracker.vercel.app/api/import`
**方法**: POST
**内容类型**: application/json

### 方案2：文件导入集成 
**格式**: JSON/CSV文件下载
**用户操作**: 手动上传到目标平台

## 数据格式规范 (Data Format Specification)

### 标准导出格式
```json
{
  "metadata": {
    "exportedAt": "2024-12-28T14:41:59.000Z",
    "source": "Chrome Extension - Job Application Tracker", 
    "version": "1.0.0",
    "totalRecords": 5
  },
  "applications": [
    {
      "id": "linkedin-1735394519000-abc123def",
      "company": "Google",
      "position": "Software Engineer",
      "status": "applied",
      "applicationDate": "2024-12-28T14:41:59.000Z",
      "platform": "linkedin",
      "source": "gmail",
      "emailId": "18c5f2e4d8b9a6e3",
      "emailSubject": "Application Confirmation - Software Engineer at Google",
      "emailDate": "2024-12-28T14:41:59.000Z",
      "emailFrom": "LinkedIn <noreply@linkedin.com>",
      "snippet": "Thank you for applying to Google for the Software Engineer position...",
      "statusHistory": [
        {
          "status": "applied",
          "at": "2024-12-28T14:41:59.000Z", 
          "note": "Imported from Gmail via Chrome Extension"
        }
      ],
      "gmailLink": "https://mail.google.com/mail/u/0/#inbox/18c5f2e4d8b9a6e3",
      "importedAt": "2024-12-28T14:41:59.000Z",
      "importSource": "chrome-extension"
    }
  ]
}
```

### 字段说明 (Field Descriptions)

#### 元数据 (Metadata)
- `exportedAt`: 导出时间戳 (ISO 8601)
- `source`: 数据来源描述
- `version`: 插件版本
- `totalRecords`: 记录总数

#### 申请记录 (Application Record)
- `id`: 唯一标识符
- `company`: 公司名称  
- `position`: 职位名称
- `status`: 申请状态 (applied, reviewed, interview, offer, rejected, ghosted)
- `applicationDate`: 申请日期
- `platform`: 来源平台 (linkedin, indeed, company-website, other)
- `source`: 数据源 (gmail)
- `emailId`: Gmail邮件ID
- `emailSubject`: 邮件标题
- `emailDate`: 邮件日期
- `emailFrom`: 发件人
- `snippet`: 邮件片段
- `statusHistory`: 状态历史记录
- `gmailLink`: Gmail链接
- `importedAt`: 导入时间
- `importSource`: 导入来源标识

## API端点规范 (API Endpoint Specification)

### 导入端点
```http
POST /api/import
Content-Type: application/json
X-Source: chrome-extension
```

#### 请求体
```json
{
  "metadata": { ... },
  "applications": [ ... ]
}
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "Data imported successfully",
  "imported": 5,
  "skipped": 0,
  "errors": []
}
```

#### 错误响应 (400/500)
```json
{
  "success": false, 
  "message": "Import failed",
  "error": "Invalid data format",
  "details": { ... }
}
```

### 认证方案 (Authentication)

#### 选项1：无认证 (公开端点)
适合演示和简单集成

#### 选项2：API Key认证
```http
X-API-Key: your-api-key
```

#### 选项3：用户认证
需要用户登录total-job-tracker平台

## Chrome插件集成实现

### 核心集成类
```javascript
class ExportIntegration {
  async exportToTotalJobTracker() {
    // 1. 获取所有申请数据
    const applications = await this.getAllApplications();
    
    // 2. 格式化为标准格式
    const exportData = this.formatForTotalJobTracker(applications);
    
    // 3. 发送到API或下载文件
    const success = await this.sendToTotalJobTracker(exportData);
    
    // 4. 处理结果
    if (success) {
      this.showSuccessMessage(applications.length);
    } else {
      this.downloadAsFile(exportData, 'total-job-tracker-import.json');
    }
  }
}
```

### 状态映射
```javascript
const statusMap = {
  'applied': 'applied',      // 已申请
  'viewed': 'reviewed',      // 已查看
  'interview': 'interview',  // 面试中
  'offer': 'offer',          // 收到offer
  'rejected': 'rejected',    // 被拒绝
  'ghost': 'ghosted'         // 无音信
};
```

## 用户界面集成

### 导出按钮
- **位置**: 仪表板控制区域
- **样式**: 渐变背景，现代设计
- **功能**: 一键导出到Total Job Tracker

### 状态指示
- **导出中**: 显示进度和状态消息
- **成功**: 显示导出统计和跳转链接
- **失败**: 提供文件下载备选方案

### 用户体验流程
1. 用户点击"导出到Total Job Tracker"
2. 显示导出进度 ("正在准备数据...")
3. 尝试API调用 ("正在发送数据...")
4. 成功：显示成功消息和平台链接
5. 失败：自动下载JSON文件供手动导入

## CSV导出格式

### CSV字段顺序
```csv
Company,Position,Status,Application Date,Platform,Email Subject,Gmail Link,Last Updated
Google,Software Engineer,applied,2024-12-28,linkedin,Application Confirmation,https://mail.google.com/...,2024-12-28
Microsoft,Product Manager,interview,2024-12-27,indeed,Interview Invitation,https://mail.google.com/...,2024-12-27
```

## 错误处理 (Error Handling)

### 网络错误
- 超时处理 (30秒)
- 重试机制 (3次)
- 降级到文件下载

### 数据验证错误  
- 必填字段检查
- 格式验证
- 数据清理

### 用户友好错误消息
```javascript
const errorMessages = {
  'network': '网络连接失败，已保存文件供手动导入',
  'validation': '数据格式有误，请重试',
  'authentication': '认证失败，请检查设置',
  'quota': '导入配额已满，请稍后重试'
};
```

## 测试方案 (Testing Strategy)

### 单元测试
- 数据格式化测试
- 状态映射测试
- CSV生成测试

### 集成测试 
- API调用测试
- 错误处理测试
- 文件下载测试

### 用户接受测试
- 端到端导出流程
- 数据完整性验证
- 用户体验测试

## 部署和配置

### 开发环境
```javascript
const config = {
  totalJobTrackerUrl: 'http://localhost:3000',
  apiTimeout: 10000,
  retryAttempts: 1
};
```

### 生产环境
```javascript  
const config = {
  totalJobTrackerUrl: 'https://total-job-tracker.vercel.app',
  apiTimeout: 30000,
  retryAttempts: 3
};
```

## 监控和分析

### 导出统计
- 成功导出次数
- 失败原因分析
- 用户使用模式

### 性能指标
- 导出响应时间
- 数据传输大小
- 错误率统计

## 安全考虑

### 数据隐私
- 仅导出用户明确授权的数据
- 不存储敏感信息
- 遵循GDPR和隐私法规

### API安全
- HTTPS加密传输
- 输入验证和清理
- 防止XSS和注入攻击

## 维护和更新

### API版本管理
- 向后兼容保证
- 版本号标识
- 迁移指南

### 错误监控
- 实时错误报告
- 用户反馈收集
- 性能监控

## 相关文档

- [Chrome Extension开发指南](./README.md)
- [发布清单](./CHROME_STORE_LISTING.md)  
- [发布说明](./RELEASE_NOTES.md)
- [故障排除指南](./TROUBLESHOOTING.md)

---

更新日期：2024-12-28
版本：1.0.0