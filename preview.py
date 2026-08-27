#!/usr/bin/env python3
"""
万年历本地极速预览与 iPhone 联调服务脚本
运行后会自动打印 Mac 本地和 iPhone 局域网访问地址
"""

import http.server
import socket
import socketserver
import os
import sys
import webbrowser

PORT = 8080

def get_local_ip():
    import subprocess
    try:
        ip = subprocess.check_output("ipconfig getifaddr en0 || ipconfig getifaddr en1", shell=True, text=True).strip()
        if ip: return ip
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.0.101"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 允许 Service Worker 离线缓存与跨域，移除 no-store 以允许 iPhone 本地持久化存储
        if self.path.endswith('.html') or self.path == '/' or 'sw.js' in self.path:
            self.send_header('Cache-Control', 'no-cache')
        else:
            self.send_header('Cache-Control', 'public, max-age=31536000')
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()
    
    port = PORT
    for p in range(PORT, PORT + 20):
        try:
            httpd = socketserver.TCPServer(("", p), CustomHandler)
            port = p
            break
        except OSError:
            continue

    print("=" * 60)
    print("  极简无广告万年历 (WanNianLi PWA) 服务已启动！")
    print("=" * 60)
    print(f"  💻 Mac 本地浏览器访问:  http://localhost:{port}")
    print(f"  📱 iPhone 手机同Wi-Fi访问: http://{local_ip}:{port}")
    print("=" * 60)
    print("  💡 iPhone 使用指南:")
    print("     1. 确保 iPhone 和这台 Mac 连接在同一个 Wi-Fi 网络下。")
    print(f"     2. 在 iPhone Safari 浏览器中输入: http://{local_ip}:{port}")
    print("     3. 点击 Safari 底部的「分享」图标 -> 选择「添加到主屏幕」。")
    print("     4. 即可在 iPhone 桌面上获得一个完全无广告、全屏沉浸的原生万年历 App！")
    print("=" * 60)
    print("  按 Ctrl + C 可停止服务。\n")

    # 尝试自动打开电脑端浏览器预览
    if "--no-open" not in sys.argv:
        try:
            webbrowser.open(f"http://localhost:{port}")
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已安全退出。")
        httpd.server_close()

if __name__ == '__main__':
    main()
