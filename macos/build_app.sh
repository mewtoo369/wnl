#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( dirname "$DIR" )"
APP_NAME="万年历"
APP_BUNDLE="$PROJECT_DIR/$APP_NAME.app"

echo "🔨 开始构建 macOS 原生应用: $APP_NAME.app ..."

# 1. 创建 App Bundle 目录结构
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources/web"

# 2. 编译 Objective-C Cocoa / WebKit 源码
clang -O2 -fobjc-arc \
    -framework Cocoa \
    -framework WebKit \
    "$DIR/main.m" \
    -o "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

# 3. 拷贝 Info.plist 与应用图标
cp "$DIR/Info.plist" "$APP_BUNDLE/Contents/Info.plist"
if [ -f "$DIR/AppIcon.icns" ]; then
    cp "$DIR/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/AppIcon.icns"
fi

# 4. 拷贝 Web 核心静态资源
cp "$PROJECT_DIR/index.html" "$APP_BUNDLE/Contents/Resources/web/"
cp "$PROJECT_DIR/manifest.json" "$APP_BUNDLE/Contents/Resources/web/"
cp "$PROJECT_DIR/sw.js" "$APP_BUNDLE/Contents/Resources/web/"
cp -R "$PROJECT_DIR/css" "$APP_BUNDLE/Contents/Resources/web/"
cp -R "$PROJECT_DIR/js" "$APP_BUNDLE/Contents/Resources/web/"
cp -R "$PROJECT_DIR/icons" "$APP_BUNDLE/Contents/Resources/web/"

# 5. 代码签名（本地 ad-hoc 签名，避免 macOS Gatekeeper 拦截）
if command -v codesign &> /dev/null; then
    codesign --force --deep -s - "$APP_BUNDLE" 2>/dev/null || true
fi

echo "✅ 构建成功！生成路径: $APP_BUNDLE"
echo "🚀 可以通过 'open \"$APP_BUNDLE\"' 直接启动！"
