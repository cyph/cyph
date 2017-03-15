#import "UserAgent.h"
#import <Cordova/CDVPluginResult.h>

@implementation UserAgent

- (void)get: (CDVInvokedUrlCommand*)command
{
    [self.webView evaluateJavaScript:@"navigator.userAgent" completionHandler:^(id result, NSError* error) {
        NSString* userAgent = result;
        NSString* callbackId = command.callbackId;
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:userAgent];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:callbackId];
    }];
}

- (void)set: (CDVInvokedUrlCommand*)command
{
    id newUserAgent = [command argumentAtIndex:0];
    self.webView.customUserAgent = newUserAgent;
    
    NSString* callbackId = command.callbackId;
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:newUserAgent];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:callbackId];
}

- (void)reset: (CDVInvokedUrlCommand*)command
{
    self.webView.customUserAgent = nil;
    [self get:command];
}

@end
