---
title: "自建统计服务部署指南"
description: "面向个人站点的自建访问统计服务完整部署指南：从 Supabase 建库与前端接入的快速开始步骤，到按访问量分级的扩展方案选择、数据库分区索引与 Redis 缓存性能优化、CDN 反向代理配置，再到监控告警、自动报表导出、从 Google Analytics 渐进式迁移与各规模成本估算的完整参考资料。"
pubDate: "2026-07-23T11:58:47+08:00"
updatedDate: "2026-09-04T13:00:00+08:00"
category: "extras"
tags: ["部署指南", "Supabase", "自建统计", "性能优化"]
draft: false
order: 1
reviewNotes:
  - "本文未经历其余 14 篇文章在 2026-09-03 完成的官方资料逐项核验，仅本次任务修正了「2. 扩展方案」与「7. 成本估算」两处 Supabase 报价（已按官方定价页 2026-09-04 核验并注明来源）；正文其余部分（Redis 缓存示例、CDN Workers 示例、监控告警、报表导出等代码片段）仍是通用示例代码，未逐条核实是否为当前各产品推荐写法，建议维护者按本文体量做一次完整复核。"
  - "「8. 迁移策略 → 从 Google Analytics 迁移」一节的示例代码假设可以通过 API 批量读取「GA」历史数据；但 Universal Analytics（旧版 GA）已于 2024-07-01 被 Google 官方彻底下线，界面、API 与历史数据均已不可访问。若这里的「Google Analytics」指当前的 GA4，代码逻辑仍需要按 GA4 Data API 的实际字段与鉴权方式重写，不能直接照搬本文伪代码；具体应参考 Google Analytics 官方文档确认。"
  - "本文缺少其余文章统一的「官方来源与声明」页脚与「最后核验」日期展示，建议维护者复核后补齐，与全站其他文章的可信度标注保持一致。"
---

# 自建统计服务部署指南

## 1. 快速开始

### 步骤1：创建Supabase项目
1. 访问 [Supabase](https://supabase.com/)
2. 创建新项目
3. 获取项目URL和API密钥

### 步骤2：设置数据库
```sql
-- 在Supabase SQL编辑器中执行
-- 复制 statistics-schema.sql 中的内容
```

### 步骤3：配置前端
```javascript
// 在HTML文件中更新配置
const STATS_CONFIG = {
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
  enableRealTime: true,
  enableDetailedTracking: true
};
```

## 2. 扩展方案

> 以下 Supabase 报价按官方定价页 2026-09-04 核验：Supabase 目前按组织订阅计费（Free / Pro / Team / Enterprise），
> **所有档位均不限制 API 请求次数**，用量上限改为按月活用户（MAU）、数据库大小、出口流量等具体指标计算，
> 计算资源（Compute）按项目单独计费。下面的"免费/中等/大规模"仍是本文用于类比说明的分档，不是 Supabase 的官方分级名称。

### 小规模（约 5 万月活用户以内）
- **成本**: 免费（Free 档）
- **方案**: Supabase Free：500MB 数据库 / 5GB 出口流量 / 5 万月活用户，任意请求次数不限量
- **特点**: 简单易用，适合验证想法或个人项目；超过 7 天无活动会自动暂停项目

### 中等规模（约 5 万–10 万月活用户，或需要更高数据库容量）
- **成本**: $25/月起（Pro 档基础费，含 $10 计算额度；额外用量按量计费）
- **方案**: Supabase Pro + CDN
- **特点**: 10 万月活用户含在基础费内，8GB 数据库、250GB 出口流量额度，超出部分按官方定价页单价计费

### 大规模（超出 Pro 额度较多，或需要合规/SSO）
- **成本**: $599/月起（Team 档基础费）+ 按量计费部分
- **方案**: Supabase Team（SOC2/ISO 27001、仪表盘 SSO、更长日志与备份保留）或自建服务器 + Redis + PostgreSQL
- **特点**: Team 面向合规与团队协作需求；自建方案完全可控但运维成本更高，需按实际负载单独测算

## 3. 性能优化

### 数据库优化
```sql
-- 创建分区表（按月分区）
CREATE TABLE page_views_y2024m01 PARTITION OF page_views
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 创建索引
CREATE INDEX CONCURRENTLY idx_page_views_created_at 
ON page_views USING btree (created_at);

-- 设置数据保留策略
DELETE FROM page_views 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### 缓存策略
```javascript
// Redis缓存实现
const redis = require('redis');
const client = redis.createClient();

// 缓存热门数据
async function getCachedStats(key, fetchFunction, ttl = 300) {
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFunction();
  await client.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

### CDN配置
```yaml
# Cloudflare Workers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 统计API代理
  if (request.url.includes('/api/stats')) {
    return fetch('https://your-supabase-url.supabase.co/rest/v1/', {
      ...request,
      headers: {
        ...request.headers,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    })
  }
}
```

## 4. 监控和告警

### 系统监控
```javascript
// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    await supabase.from('page_views').select('count').limit(1);
    res.json({ status: 'healthy', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

### 告警配置
```javascript
// 异常检测
const alertThresholds = {
  errorRate: 0.05,      // 5%错误率
  responseTime: 2000,   // 2秒响应时间
  memoryUsage: 0.8      // 80%内存使用率
};

// 发送告警
async function checkAlerts() {
  const metrics = await getSystemMetrics();
  
  if (metrics.errorRate > alertThresholds.errorRate) {
    await sendAlert('高错误率告警', metrics);
  }
}
```

## 5. 数据分析和报表

### 自动报表生成
```javascript
// 每日报表
async function generateDailyReport() {
  const stats = await getDailyStats();
  const report = {
    date: new Date().toISOString().split('T')[0],
    totalViews: stats.totalViews,
    uniqueVisitors: stats.uniqueVisitors,
    topPages: stats.topPages,
    trafficSources: stats.trafficSources
  };
  
  // 发送邮件或保存到文件
  await sendEmailReport(report);
}
```

### 数据导出
```javascript
// CSV导出
async function exportData(startDate, endDate) {
  const data = await supabase
    .from('page_views')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
    
  return convertToCSV(data);
}
```

## 6. 安全考虑

### API安全
```javascript
// 速率限制
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 100次请求
});

app.use('/api/stats', limiter);
```

### 数据隐私
```javascript
// 数据脱敏
function anonymizeData(data) {
  return {
    ...data,
    ip_address: hashIP(data.ip_address),
    user_agent: hashUserAgent(data.user_agent)
  };
}
```

## 7. 成本估算

### Supabase方案（2026-09-04 按官方定价页核验，所有档位请求次数均不限量）
- **免费版**: $0/月，500MB 数据库、5GB 出口流量、5 万月活用户
- **Pro版**: $25/月起（含 $10 计算额度），10 万月活用户、8GB 数据库、250GB 出口流量含在基础费内，超出部分按量计费
- **Team版**: $599/月起，在 Pro 额度基础上增加 SOC2/ISO 27001、仪表盘 SSO、更长日志与备份保留等合规能力

### 自建方案
- **服务器**: $50-200/月
- **数据库**: $30-100/月
- **CDN**: $10-50/月
- **监控**: $20-100/月

## 8. 迁移策略

### 从Google Analytics迁移
```javascript
// 数据迁移脚本
async function migrateFromGA() {
  const gaData = await fetchGAData();
  const transformedData = transformData(gaData);
  await supabase.from('page_views').insert(transformedData);
}
```

### 渐进式部署
1. 并行运行新旧系统
2. 数据对比验证
3. 逐步切换流量
4. 完全迁移

## 9. 最佳实践

### 数据收集
- 最小化收集数据
- 尊重用户隐私
- 遵循GDPR等法规

### 性能优化
- 异步数据收集
- 批量处理
- 缓存策略

### 可扩展性
- 微服务架构
- 水平扩展
- 负载均衡

这个方案可以支持从小规模到大规模的各种需求，并且具有良好的扩展性。
