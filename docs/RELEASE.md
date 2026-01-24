# Dev Janitor v2 - 发布指南

## 🚀 发布流程

### 1. 准备发布

1. **确保所有更改已提交**
   ```bash
   git status
   git add .
   git commit -m "chore: prepare for release vX.X.X"
   ```

2. **更新版本号**
   - `src-tauri/Cargo.toml` 中的 `version`
   - `src-tauri/tauri.conf.json` 中的 `version`
   - `package.json` 中的 `version`

3. **生成 Updater 密钥对**（首次发布时）
   ```bash
   pnpm tauri signer generate -w ~/.tauri/myapp.key
   ```
   保存生成的公钥和私钥！

4. **配置 GitHub Secrets**
   在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加：
   - `TAURI_PRIVATE_KEY`: 你的私钥
   - `TAURI_KEY_PASSWORD`: 私钥密码（如果有）

### 2. 创建发布

```bash
# 创建版本标签
git tag -a v2.0.0 -m "Release v2.0.0"

# 推送标签触发 GitHub Actions
git push origin v2.0.0
```

GitHub Actions 将自动：
- 构建 Windows (.msi, .exe)
- 构建 Linux (.AppImage, .deb, .rpm)
- 创建 GitHub Release
- 上传所有安装包

### 3. macOS 签名（可选，需要 Apple Developer）

如果你有 Apple Developer 账号（$99/年）：

1. **生成证书**
   - 在 Apple Developer 网站创建 Developer ID Application 证书
   - 导出为 .p12 文件

2. **添加 GitHub Secrets**
   - `APPLE_CERTIFICATE`: Base64 编码的 .p12 证书
   - `APPLE_CERTIFICATE_PASSWORD`: 证书密码
   - `APPLE_SIGNING_IDENTITY`: 签名身份
   - `APPLE_ID`: Apple ID
   - `APPLE_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: 团队 ID

3. **取消 release.yml 中 macOS 部分的注释**

## 📦 构建产物

| 平台 | 格式 | 预计大小 |
|------|------|---------|
| Windows | .msi, .exe (NSIS) | < 15MB |
| Linux | .AppImage, .deb, .rpm | < 20MB |
| macOS | .dmg, .app | < 20MB |

## 🔄 自动更新

用户安装后，应用会自动检查更新。更新流程：

1. 应用启动时检查 `endpoints` 中的 URL
2. 比较版本号
3. 如果有新版本，显示更新对话框
4. 用户确认后自动下载并安装

### Updater 配置

在 `tauri.conf.json` 中配置：

```json
"plugins": {
  "updater": {
    "active": true,
    "pubkey": "你的公钥",
    "endpoints": [
      "https://github.com/用户名/dev-janitor/releases/latest/download/latest.json"
    ]
  }
}
```

## 🔧 本地构建

### Windows
```bash
cd dev-janitor-v2
pnpm install
pnpm tauri build
```

### Linux
```bash
# 安装依赖
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

cd dev-janitor-v2
pnpm install
pnpm tauri build
```

### macOS
```bash
cd dev-janitor-v2
pnpm install
pnpm tauri build
```

## 📋 发布检查清单

- [ ] 版本号已更新
- [ ] CHANGELOG 已更新
- [ ] 所有测试通过
- [ ] 本地构建测试成功
- [ ] GitHub Secrets 已配置
- [ ] 标签已创建并推送
- [ ] GitHub Actions 构建成功
- [ ] Release 已发布（非 Draft）
- [ ] 下载并测试安装包
