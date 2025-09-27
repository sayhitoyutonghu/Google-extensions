# Chrome扩展程序OAuth登录问题修复指南

## 问题描述
遇到 "Access blocked: job-hunting's request is invalid" 和 "Error 400: redirect_uri_mismatch" 错误。

## 解决步骤

### 1. 获取Chrome扩展程序ID
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 确保开启"开发者模式"
4. 找到您的扩展程序，复制其ID（类似：`abcdefghijklmnopqrstuvwxyz123456`）

### 2. 在Google Cloud Console中配置OAuth

#### 2.1 创建或选择项目
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目

#### 2.2 启用必要的API
1. 转到 **APIs & Services** → **Library**
2. 搜索并启用：
   - **Gmail API**
   - **Google+ API** (可选，用于获取用户信息)

#### 2.3 配置OAuth同意屏幕
1. 转到 **APIs & Services** → **OAuth consent screen**
2. 选择 **External** 用户类型
3. 填写应用信息：
   - 应用名称：Job Application Tracker
   - 用户支持电子邮件：您的邮箱
   - 开发者联系信息：您的邮箱
4. 在 **Test users** 部分添加您的Gmail地址

#### 2.4 创建OAuth客户端ID
1. 转到 **APIs & Services** → **Credentials**
2. 点击 **+ CREATE CREDENTIALS** → **OAuth client ID**
3. 选择应用类型：**Chrome extension**
4. 在 **Application ID** 字段中输入步骤1中获取的扩展程序ID
5. 点击 **Create**
6. 复制生成的客户端ID

### 3. 更新扩展程序配置

#### 3.1 更新manifest.json
将 `manifest.json` 文件中的 `client_id` 替换为步骤2.4中获取的新客户端ID：

```json
"oauth2": {
  "client_id": "您的新客户端ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "email",
    "profile"
  ]
}
```

#### 3.2 重新加载扩展程序
1. 访问 `chrome://extensions/`
2. 找到您的扩展程序
3. 点击刷新按钮重新加载扩展程序

### 4. 清除缓存的认证信息

#### 4.1 清除Chrome身份缓存
1. 访问 `chrome://identity-internals/`
2. 找到相关的token条目
3. 点击 **Remove** 删除缓存的token

#### 4.2 或者在扩展程序中登出
1. 打开扩展程序popup
2. 如果有登出按钮，点击登出
3. 重新尝试登录

### 5. 测试登录

1. 点击扩展程序图标
2. 点击 "Sign in with Google"
3. 应该能够成功完成OAuth流程

## 常见问题排查

### 问题1：access_not_configured
**解决方案**：确保在Google Cloud Console中启用了Gmail API

### 问题2：invalid_client
**解决方案**：检查client_id是否正确，确保是为Chrome扩展程序类型创建的

### 问题3：unauthorized_client
**解决方案**：确保OAuth同意屏幕已正确配置，并且您的邮箱在测试用户列表中

## 注意事项

1. **扩展程序ID**：每次重新打包扩展程序时，ID可能会改变，需要重新配置OAuth客户端
2. **发布状态**：如果要发布到Chrome Web Store，需要将OAuth同意屏幕状态改为"In production"
3. **权限范围**：确保请求的权限范围与您的应用实际需要的权限匹配

## 联系支持

如果问题仍然存在，请检查：
1. Chrome扩展程序ID是否正确
2. Google Cloud项目中的API是否已启用
3. OAuth客户端类型是否为Chrome extension
4. 测试用户是否已添加
