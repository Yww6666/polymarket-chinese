# Polymarket 中文可视化网站

一个清新简洁的 Polymarket 预测市场数据可视化网站，使用纯 HTML/CSS/JavaScript 实现，无需任何框架。

## 功能特点

- 📊 实时市场数据展示
- 📰 突发新闻横向滚动展示
- 🔥 热门话题排行
- 📈 ECharts 价格走势图
- 🔍 市场搜索和筛选
- 🔄 自动刷新功能
- 📱 响应式设计，支持移动端

## 技术栈

- **前端**: 纯 HTML/CSS/JavaScript
- **图表库**: ECharts 5.4.3
- **数据源**: Polymarket 公开 API

## 项目结构

```
polymarket/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── api.js          # API 调用封装
│   ├── data.js         # 数据处理逻辑
│   ├── charts.js       # 图表渲染
│   └── app.js          # 主应用逻辑
└── README.md           # 项目说明
```

## 本地运行

1. 克隆或下载项目到本地
2. 启动本地服务器：
   ```bash
   python -m http.server 8080
   ```
3. 访问 `http://localhost:8080`

**注意**：本地运行会遇到 CORS 跨域限制，需要：
- 安装浏览器 CORS 插件（如 CORS Unblock）
- 或部署到线上服务器

## 部署到 Vercel

1. 将项目推送到 GitHub 仓库
2. 访问 [Vercel](https://vercel.com) 并登录
3. 点击 "New Project"，选择你的 GitHub 仓库
4. 点击 "Deploy"，等待部署完成
5. 部署完成后，你会获得一个 `.vercel.app` 域名

## 使用说明

### 搜索市场

在顶部搜索框输入关键词，实时过滤市场列表。

### 筛选标签

点击标签按钮筛选不同类型的市场（政治、体育、加密货币等）。

### 查看详情

点击任意市场卡片，打开详情模态框查看：
- Yes/No 概率
- 价格走势图
- 交易量和流动性
- 开始和结束时间

### 自动刷新

勾选右上角的"自动刷新"选项，每30秒自动更新一次数据。

### 手动刷新

点击"刷新"按钮手动更新所有数据。

## API 端点

项目使用以下 Polymarket 公开 API：

- `https://gamma-api.polymarket.com/markets` - 获取市场列表
- `https://clob.polymarket.com/prices` - 获取价格数据
- `https://data-api.polymarket.com/trades` - 获取交易历史

## 注意事项

1. **CORS 跨域问题**: 由于浏览器安全限制，直接从本地文件或 localhost 访问 Polymarket API 会遇到 CORS 错误。解决方法：
   - **部署到线上服务器**（推荐）：使用 Vercel/Netlify 等平台部署
   - **使用浏览器插件**：安装 CORS Unblock 等插件临时绕过（仅开发测试）
   - **使用代理服务器**：设置反向代理转发 API 请求

2. **国内访问速度**: Vercel 在国内访问速度一般
3. **API 速率限制**: 注意控制 API 调用频率
4. **数据仅供参考**: 不构成任何投资建议

## 后续扩展

- 添加更多图表类型
- 支持用户收藏市场
- 添加深色模式
- 集成 WebSocket 实时推送

## 许可证

MIT License

## 免责声明

本站仅提供数据展示服务，所有数据来自 Polymarket，仅供参考，不构成任何投资建议。投资有风险，决策需谨慎。
