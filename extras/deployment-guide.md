---
title: "自建统计服务部署指南"
description: "面向个人站点的自建访问统计服务完整部署指南：从 Supabase 建库与前端接入的快速开始步骤，到按访问量分级的扩展方案选择、数据库分区索引与 Redis 缓存性能优化、CDN 反向代理配置，再到监控告警、自动报表导出、从 Google Analytics 渐进式迁移与各规模成本估算的完整参考资料。"
pubDate: "2026-07-23T11:58:47+08:00"
updatedDate: "2026-07-23T11:58:47+08:00"
category: "extras"
tags: ["部署指南", "Supabase", "自建统计", "性能优化"]
draft: false
order: 1
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

### 小规模（< 10万访问/月）
- **成本**: 免费
- **方案**: Supabase免费版
- **特点**: 简单易用，自动扩展

### 中等规模（10万-100万访问/月）
- **成本**: $25-100/月
- **方案**: Supabase Pro + CDN
- **特点**: 高性能，实时数据

### 大规模（> 100万访问/月）
- **成本**: $200-1000/月
- **方案**: 自建服务器 + Redis + PostgreSQL
- **特点**: 完全控制，高度定制

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

### Supabase方案
- **免费版**: 0-50,000请求/月
- **Pro版**: $25/月，500,000请求/月
- **Team版**: $599/月，无限制

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
