# 性能和体积优化建议

## 当前问题分析

### 1. 体积问题

**主要原因：**
- **Electron 本身体积大**：Electron 包含完整的 Chromium 和 Node.js，基础体积约 150-200MB
- **Ant Design 组件库**：完整的 UI 组件库体积较大（~2MB）
- **node_modules 打包**：所有依赖都被打包进 asar 文件
- **未优化的图片资源**：docs 文件夹中的 hero 图片（16MB+）

**当前依赖分析：**
```
核心依赖：
- antd (5.29.3) - UI 组件库 ~2MB
- react + react-dom - ~500KB
- electron-updater - 自动更新
- react-markdown + rehype-sanitize - Markdown 渲染
- i18next + react-i18next - 国际化
```

### 2. 性能问题

**可能的原因：**
- 启动时同时检测 39+ 工具
- 没有使用懒加载
- 大量同步操作
- 未优化的组件渲染

## 优化方案

### 短期优化（立即可做）

#### 1. 排除不必要的文件
```json5
// electron-builder.json5
"files": [
  "dist",
  "dist-electron",
  "package.json",
  "!**/*.map",
  "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
  "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
  "!**/node_modules/*.d.ts",
  "!**/node_modules/.bin",
  "!docs/**",  // 添加：排除文档文件夹
  "!**/*.md",  // 添加：排除所有 markdown 文件
  "!.github/**",
  "!.kiro/**",
  "!scripts/**"
]
```

#### 2. 优化图片资源
- 将 docs/hero-1.png (8MB) 和 hero-2.png (8MB) 压缩或移到外部
- 使用 WebP 格式替代 PNG
- 或者将这些图片放到 GitHub 而不是打包进应用

#### 3. 按需导入 Ant Design
```typescript
// 当前：import { Button, Card } from 'antd'
// 优化后：使用 babel-plugin-import 或手动按需导入
import Button from 'antd/es/button'
import Card from 'antd/es/card'
```

#### 4. 代码分割和懒加载
```typescript
// App.tsx
const AICLIView = lazy(() => import('./components/AICli/AICLIView'))
const CacheCleanerView = lazy(() => import('./components/CacheCleaner/CacheCleanerView'))
const ToolsView = lazy(() => import('./components/Tools/ToolsView'))
```

#### 5. 优化启动性能
```typescript
// 延迟非关键检测
- 启动时只检测常用工具（Node.js, Python, Git 等）
- 其他工具在用户访问相应页面时再检测
- 使用 Web Worker 进行后台检测
```

### 中期优化（需要重构）

#### 1. 替换 Ant Design
考虑使用更轻量的 UI 库：
- **Mantine** (~300KB) - 现代化，功能完整
- **Chakra UI** (~400KB) - 轻量，可定制
- **Headless UI + Tailwind** (~100KB) - 最轻量

#### 2. 虚拟化长列表
```typescript
// 对于包列表、工具列表使用虚拟滚动
import { FixedSizeList } from 'react-window'
```

#### 3. 优化检测引擎
```typescript
// 使用 Worker 线程进行检测
// 实现增量检测和智能缓存
// 只检测变化的工具
```

#### 4. 减少依赖
```typescript
// 考虑移除或替换：
- react-markdown → 自己实现简单的 markdown 渲染
- zustand → 使用 React Context（如果状态不复杂）
```

### 长期优化（架构级）

#### 1. 使用 Tauri 替代 Electron
- Tauri 使用系统 WebView，体积可减少 90%
- 安装包从 150MB 降到 5-10MB
- 内存占用减少 50%+

#### 2. 渐进式 Web App (PWA)
- 考虑提供 Web 版本
- 使用 Service Worker 缓存
- 离线可用

#### 3. 微前端架构
- 将不同功能模块独立打包
- 按需加载模块

## 立即可执行的优化清单

### 1. 排除文档文件（预计减少 16MB+）
```bash
# 修改 electron-builder.json5
# 添加 "!docs/**" 到 files 配置
```

### 2. 启用 Tree Shaking
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'i18n-vendor': ['i18next', 'react-i18next'],
        },
      },
    },
  },
})
```

### 3. 压缩配置优化
```json5
// electron-builder.json5
{
  "compression": "maximum",
  "asar": true,
  "asarUnpack": ["**/*.node"], // 只解包 native 模块
}
```

### 4. 启动优化
```typescript
// src/main/index.ts
// 延迟加载非关键模块
app.whenReady().then(async () => {
  createWindow()
  
  // 延迟初始化
  setTimeout(() => {
    // 初始化自动更新
    // 初始化后台任务
  }, 2000)
})
```

### 5. 组件优化
```typescript
// 使用 React.memo 避免不必要的重渲染
export const ToolCard = React.memo(({ tool }) => {
  // ...
})

// 使用 useMemo 缓存计算结果
const filteredTools = useMemo(() => {
  return tools.filter(t => t.isInstalled)
}, [tools])
```

## 预期效果

### 短期优化后：
- **安装包体积**：减少 20-30% (排除文档、优化打包)
- **启动时间**：减少 30-40% (延迟加载、优化检测)
- **内存占用**：减少 15-20% (代码分割、组件优化)

### 中期优化后：
- **安装包体积**：减少 40-50% (替换 UI 库、减少依赖)
- **启动时间**：减少 50-60% (Worker 线程、智能缓存)
- **运行性能**：提升 40-50% (虚拟化、优化渲染)

### 长期优化后（Tauri）：
- **安装包体积**：减少 85-90% (5-15MB)
- **启动时间**：减少 70-80%
- **内存占用**：减少 60-70%

## 建议优先级

1. **高优先级**（立即执行）：
   - 排除 docs 文件夹
   - 启用代码分割
   - 优化启动流程

2. **中优先级**（1-2周）：
   - 实现懒加载
   - 优化组件渲染
   - 添加性能监控

3. **低优先级**（长期规划）：
   - 考虑 Tauri 迁移
   - UI 库替换
   - 架构重构

## 性能监控

添加性能监控代码：
```typescript
// 启动时间监控
const startTime = Date.now()
app.on('ready', () => {
  console.log(`App ready in ${Date.now() - startTime}ms`)
})

// 内存监控
setInterval(() => {
  const usage = process.memoryUsage()
  console.log(`Memory: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`)
}, 60000)
```
