#import <Cordova/CDVPlugin.h>
#import <WebKit/WebKit.h>

@interface UserAgent : CDVPlugin

@property (nonatomic, strong) IBOutlet WKWebView* webView;

- (void)get:(CDVInvokedUrlCommand*)command;

- (void)set:(CDVInvokedUrlCommand*)command;

- (void)reset:(CDVInvokedUrlCommand*)command;

@end
