#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface AppDelegate : NSObject <NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, NSWindowDelegate, WKScriptMessageHandler>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) WKWebView *webView;
@property (strong, nonatomic) NSStatusItem *statusItem;
@property (strong, nonatomic) NSTimer *statusTimer;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];

    // 1. 设置主菜单栏
    [self setupMainMenu];

    // 2. 创建现代化 macOS 磨砂质感窗口 (精确拉长高度，完整呈现底部卡片与按钮)
    NSRect frame = NSMakeRect(0, 0, 440, 735);
    NSUInteger styleMask = NSWindowStyleMaskTitled |
                           NSWindowStyleMaskClosable |
                           NSWindowStyleMaskMiniaturizable |
                           NSWindowStyleMaskResizable |
                           NSWindowStyleMaskFullSizeContentView;

    self.window = [[NSWindow alloc] initWithContentRect:frame
                                              styleMask:styleMask
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    [self.window setDelegate:self];
    [self.window setTitle:@"万年历"];
    [self.window setTitlebarAppearsTransparent:YES];
    [self.window setTitleVisibility:NSWindowTitleHidden];
    [self.window setMinSize:NSMakeSize(380, 600)];
    [self.window setMaxSize:NSMakeSize(600, 960)];
    [self.window center];
    [self.window setReleasedWhenClosed:NO];
    
    // 【关键修复】禁用 movableByWindowBackground，否则 AppKit 会全局拦截 mousedown 导致 webview 按钮无法点击！
    [self.window setMovableByWindowBackground:NO];

    // 3. 配置 WebKit 容器
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    config.websiteDataStore = [WKWebsiteDataStore nonPersistentDataStore];
    WKUserContentController *userController = [[WKUserContentController alloc] init];
    
    // 注入 Console 日志转发脚本
    NSString *consoleScript = @"console.log = (function(oldLog){ return function(){ oldLog.apply(console, arguments); window.webkit.messageHandlers.logging.postMessage(Array.from(arguments).join(' ')); }; })(console.log);"
                              @"console.error = (function(oldErr){ return function(){ oldErr.apply(console, arguments); window.webkit.messageHandlers.logging.postMessage('[ERROR] ' + Array.from(arguments).join(' ')); }; })(console.error);"
                              @"window.onerror = function(msg, url, line){ window.webkit.messageHandlers.logging.postMessage('[FATAL] ' + msg + ' at ' + line); return false; };";
    WKUserScript *script = [[WKUserScript alloc] initWithSource:consoleScript injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES];
    [userController addUserScript:script];
    [userController addScriptMessageHandler:self name:@"logging"];

    config.userContentController = userController;
    [config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];
    [config.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
    [config setValue:@YES forKey:@"allowUniversalAccessFromFileURLs"];

    self.webView = [[WKWebView alloc] initWithFrame:self.window.contentView.bounds configuration:config];
    self.webView.navigationDelegate = self;
    self.webView.UIDelegate = self;
    self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    [self.webView setValue:@NO forKey:@"drawsBackground"];

    [self.window.contentView addSubview:self.webView];

    // 4. 加载本地 Web 资源
    NSString *resourcePath = [[NSBundle mainBundle] resourcePath];
    NSString *webPath = [resourcePath stringByAppendingPathComponent:@"web"];
    NSString *indexPath = [webPath stringByAppendingPathComponent:@"index.html"];

    if (![[NSFileManager defaultManager] fileExistsAtPath:indexPath]) {
        indexPath = [[[NSFileManager defaultManager] currentDirectoryPath] stringByAppendingPathComponent:@"index.html"];
        webPath = [[NSFileManager defaultManager] currentDirectoryPath];
    }

    NSURL *fileURL = [NSURL fileURLWithPath:indexPath];
    NSURL *readAccessURL = [NSURL fileURLWithPath:webPath];
    [self.webView loadFileURL:fileURL allowingReadAccessToURL:readAccessURL];

    // 5. 显示并激活窗口
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];

    // 6. 配置 Mac 顶部系统菜单栏快捷挂件 (Status Item)
    [self setupStatusItem];
}

- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    NSLog(@"[WKWebView JS Log] %@", message.body);
}

- (void)setupMainMenu {
    NSMenu *mainMenu = [[NSMenu alloc] init];

    // 应用主菜单
    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:appMenuItem];
    NSMenu *appMenu = [[NSMenu alloc] init];
    [appMenu addItemWithTitle:@"关于 万年历" action:@selector(showAbout) keyEquivalent:@""];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"隐藏 万年历" action:@selector(hide:) keyEquivalent:@"h"];
    [appMenu addItemWithTitle:@"隐藏其他" action:@selector(hideOtherApplications:) keyEquivalent:@"h"];
    [[appMenu.itemArray lastObject] setKeyEquivalentModifierMask:NSEventModifierFlagCommand | NSEventModifierFlagOption];
    [appMenu addItemWithTitle:@"显示全部" action:@selector(unhideAllApplications:) keyEquivalent:@""];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"退出 万年历" action:@selector(terminate:) keyEquivalent:@"q"];
    [appMenuItem setSubmenu:appMenu];

    // 视图/操作菜单
    NSMenuItem *viewMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:viewMenuItem];
    NSMenu *viewMenu = [[NSMenu alloc] initWithTitle:@"操作"];
    
    NSMenuItem *todayItem = [[NSMenuItem alloc] initWithTitle:@"回到今天" action:@selector(jumpToToday) keyEquivalent:@"t"];
    [viewMenu addItem:todayItem];

    NSMenuItem *reloadItem = [[NSMenuItem alloc] initWithTitle:@"刷新" action:@selector(reloadPage) keyEquivalent:@"r"];
    [viewMenu addItem:reloadItem];

    [viewMenuItem setSubmenu:viewMenu];

    // 编辑菜单 (支持 MacBook 原生 ⌘+C, ⌘+V, ⌘+X, ⌘+A, ⌘+Z)
    NSMenuItem *editMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:editMenuItem];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"编辑"];
    [editMenu addItemWithTitle:@"撤销" action:NSSelectorFromString(@"undo:") keyEquivalent:@"z"];
    [editMenu addItemWithTitle:@"重做" action:NSSelectorFromString(@"redo:") keyEquivalent:@"Z"];
    [editMenu addItem:[NSMenuItem separatorItem]];
    [editMenu addItemWithTitle:@"剪切" action:NSSelectorFromString(@"cut:") keyEquivalent:@"x"];
    [editMenu addItemWithTitle:@"拷贝" action:NSSelectorFromString(@"copy:") keyEquivalent:@"c"];
    [editMenu addItemWithTitle:@"粘贴" action:NSSelectorFromString(@"paste:") keyEquivalent:@"v"];
    [editMenu addItemWithTitle:@"全选" action:NSSelectorFromString(@"selectAll:") keyEquivalent:@"a"];
    [editMenuItem setSubmenu:editMenu];

    // 窗口菜单
    NSMenuItem *windowMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:windowMenuItem];
    NSMenu *windowMenu = [[NSMenu alloc] initWithTitle:@"窗口"];
    [windowMenu addItemWithTitle:@"最小化" action:@selector(performMiniaturize:) keyEquivalent:@"m"];
    [windowMenu addItemWithTitle:@"缩放" action:@selector(performZoom:) keyEquivalent:@""];
    [windowMenu addItem:[NSMenuItem separatorItem]];
    [windowMenu addItemWithTitle:@"关闭窗口" action:@selector(performClose:) keyEquivalent:@"w"];
    [windowMenu addItemWithTitle:@"前置全部窗口" action:@selector(arrangeInFront:) keyEquivalent:@""];
    [windowMenuItem setSubmenu:windowMenu];

    [NSApp setMainMenu:mainMenu];
}

- (void)setupStatusItem {
    self.statusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSVariableStatusItemLength];
    self.statusItem.button.target = self;
    self.statusItem.button.action = @selector(statusItemClicked:);
    [self.statusItem.button sendActionOn:(NSEventMaskLeftMouseUp | NSEventMaskRightMouseUp)];

    [self updateStatusItemTitle];

    self.statusTimer = [NSTimer scheduledTimerWithTimeInterval:600.0
                                                        target:self
                                                      selector:@selector(updateStatusItemTitle)
                                                      userInfo:nil
                                                       repeats:YES];
}

- (void)updateStatusItemTitle {
    NSDateFormatter *df = [[NSDateFormatter alloc] init];
    [df setDateFormat:@"M月d日"];
    NSString *dateStr = [df stringFromDate:[NSDate date]];

    NSString *title = [NSString stringWithFormat:@"📅 %@", dateStr];
    self.statusItem.button.title = title;
}

- (void)statusItemClicked:(id)sender {
    NSEvent *event = [NSApp currentEvent];
    if (event.type == NSEventTypeRightMouseUp) {
        NSMenu *menu = [[NSMenu alloc] init];
        [menu addItemWithTitle:@"打开主窗口" action:@selector(toggleWindow) keyEquivalent:@""];
        [menu addItemWithTitle:@"回到今天" action:@selector(jumpToToday) keyEquivalent:@""];
        [menu addItem:[NSMenuItem separatorItem]];
        [menu addItemWithTitle:@"退出" action:@selector(terminate:) keyEquivalent:@""];
        
        self.statusItem.menu = menu;
        [self.statusItem.button performClick:nil];
        self.statusItem.menu = nil;
    } else {
        [self toggleWindow];
    }
}

- (void)toggleWindow {
    if (self.window.isVisible && [self.window isKeyWindow]) {
        [self.window orderOut:nil];
    } else {
        [self.window makeKeyAndOrderFront:nil];
        [NSApp activateIgnoringOtherApps:YES];
    }
}

- (void)jumpToToday {
    [self.webView evaluateJavaScript:@"document.getElementById('btnToday') && document.getElementById('btnToday').click();" completionHandler:nil];
    if (!self.window.isVisible) {
        [self.window makeKeyAndOrderFront:nil];
        [NSApp activateIgnoringOtherApps:YES];
    }
}

- (void)reloadPage {
    [self.webView reload];
}

- (void)showAbout {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"万年历 v1.0.0";
    alert.informativeText = @"极简纯粹·零广告的 macOS 原生万年历应用。\n基于紫金山天文台高精度历法标准。";
    [alert addButtonWithTitle:@"确定"];
    [alert runModal];
}

- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)flag {
    if (!flag) {
        [self.window makeKeyAndOrderFront:nil];
    }
    return YES;
}

- (BOOL)windowShouldClose:(NSWindow *)sender {
    [self.window orderOut:nil];
    return NO;
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        app.delegate = delegate;
        [app run];
    }
    return 0;
}
