System.config({
  baseURL: "/js/",
  defaultJSExtensions: true,
  transpiler: "typescript",
  paths: {
    "github:*": "../lib/js/github/*",
    "npm:*": "../lib/js/npm/*"
  },

  map: {
    "angular": "github:angular/bower-angular@1.5.5",
    "angular-animate": "github:angular/bower-angular-animate@1.5.5",
    "angular-aria": "github:angular/bower-angular-aria@1.5.5",
    "angular-material": "github:angular/bower-material@1.0.7",
    "angular2": "npm:angular2@2.0.0-beta.16",
    "animate.css": "npm:animate.css@3.5.1",
    "aws/aws-sdk-js": "github:aws/aws-sdk-js@2.3.5",
    "braintree": "github:braintree/braintree-web@2.23.0",
    "crypto/cryptojs": "github:sytelus/cryptojs@3.1.2",
    "crypto/isaac": "github:rubycon/isaac.js@master",
    "crypto/libsodium": "github:jedisct1/libsodium.js@0.3.0",
    "crypto/ntru": "github:cyph/ntru.js@master",
    "crypto/supersphincs": "github:cyph/supersphincs.js@master",
    "davidchambers/base64.js": "github:davidchambers/base64.js@0.3.0",
    "dompurify": "npm:dompurify@0.7.4",
    "es5-shim": "github:es-shims/es5-shim@4.5.8",
    "es6-shim": "github:es-shims/es6-shim@0.35.0",
    "isagalaev/highlight.js": "github:isagalaev/highlight.js@9.3.0",
    "jquery": "npm:jquery@2.2.3",
    "jquery-legacy": "github:jquery/jquery@1.12.3",
    "julianlam/tabIndent.js": "github:julianlam/tabIndent.js@master",
    "magnific-popup": "npm:magnific-popup@1.1.0",
    "markdown-it/markdown-it": "github:markdown-it/markdown-it@6.0.1",
    "markdown-it/markdown-it-emoji": "github:markdown-it/markdown-it-emoji@1.1.1",
    "markdown-it/markdown-it-sup": "github:markdown-it/markdown-it-sup@1.0.0",
    "matthieua/wow": "github:matthieua/wow@1.1.2",
    "morr/jquery.appear": "github:morr/jquery.appear@0.3.6",
    "nanoscroller": "npm:nanoscroller@0.8.7",
    "rxjs": "npm:rxjs@5.0.0-beta.6",
    "siddii/angular-timer": "github:siddii/angular-timer@1.2.1",
    "twitter/twemoji": "github:twitter/twemoji@1.3.2",
    "typescript": "npm:typescript@1.8.10",
    "unsemantic": "npm:unsemantic@1.0.1",
    "github:angular/bower-angular-animate@1.5.5": {
      "angular": "github:angular/bower-angular@1.5.5"
    },
    "github:angular/bower-angular-aria@1.5.5": {
      "angular": "github:angular/bower-angular@1.5.5"
    },
    "github:angular/bower-material@1.0.7": {
      "angular": "github:angular/bower-angular@1.5.5",
      "angular-animate": "github:angular/bower-angular-animate@1.5.5",
      "angular-aria": "github:angular/bower-angular-aria@1.5.5",
      "css": "github:systemjs/plugin-css@0.1.21"
    },
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.3.0"
    },
    "github:jspm/nodelibs-buffer@0.1.0": {
      "buffer": "npm:buffer@3.6.0"
    },
    "github:jspm/nodelibs-domain@0.1.0": {
      "domain-browser": "npm:domain-browser@1.1.7"
    },
    "github:jspm/nodelibs-events@0.1.1": {
      "events": "npm:events@1.0.2"
    },
    "github:jspm/nodelibs-http@1.7.1": {
      "Base64": "npm:Base64@0.2.1",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "url": "github:jspm/nodelibs-url@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "github:jspm/nodelibs-os@0.1.0": {
      "os-browserify": "npm:os-browserify@0.1.2"
    },
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.2": {
      "process": "npm:process@0.11.2"
    },
    "github:jspm/nodelibs-stream@0.1.0": {
      "stream-browserify": "npm:stream-browserify@1.0.0"
    },
    "github:jspm/nodelibs-url@0.1.0": {
      "url": "npm:url@0.10.3"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "npm:amdefine@1.0.0": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "module": "github:jspm/nodelibs-module@0.1.0",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:angular2@2.0.0-beta.16": {
      "reflect-metadata": "npm:reflect-metadata@0.1.2",
      "rxjs": "npm:rxjs@5.0.0-beta.6",
      "zone.js": "npm:zone.js@0.6.12"
    },
    "npm:assert@1.3.0": {
      "util": "npm:util@0.10.3"
    },
    "npm:atob@1.1.3": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:buffer@3.6.0": {
      "base64-js": "npm:base64-js@0.0.8",
      "child_process": "github:jspm/nodelibs-child_process@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "ieee754": "npm:ieee754@1.1.6",
      "isarray": "npm:isarray@1.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:core-util-is@1.0.2": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:css@2.2.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "inherits": "npm:inherits@2.0.1",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "source-map": "npm:source-map@0.1.43",
      "source-map-resolve": "npm:source-map-resolve@0.3.1",
      "urix": "npm:urix@0.1.0"
    },
    "npm:domain-browser@1.1.7": {
      "events": "github:jspm/nodelibs-events@0.1.1"
    },
    "npm:dompurify@0.7.4": {
      "domain": "github:jspm/nodelibs-domain@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "http": "github:jspm/nodelibs-http@1.7.1",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "url": "github:jspm/nodelibs-url@0.1.0"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:magnific-popup@1.1.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:nanoscroller@0.8.7": {
      "css": "npm:css@2.2.1",
      "jquery": "npm:jquery@2.2.3"
    },
    "npm:os-browserify@0.1.2": {
      "os": "github:jspm/nodelibs-os@0.1.0"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:process@0.11.2": {
      "assert": "github:jspm/nodelibs-assert@0.1.0"
    },
    "npm:punycode@1.3.2": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:readable-stream@1.1.14": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "core-util-is": "npm:core-util-is@1.0.2",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "isarray": "npm:isarray@0.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream-browserify": "npm:stream-browserify@1.0.0",
      "string_decoder": "npm:string_decoder@0.10.31"
    },
    "npm:reflect-metadata@0.1.2": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:rxjs@5.0.0-beta.6": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:source-map-resolve@0.3.1": {
      "atob": "npm:atob@1.1.3",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "resolve-url": "npm:resolve-url@0.2.1",
      "source-map-url": "npm:source-map-url@0.3.0",
      "urix": "npm:urix@0.1.0",
      "url": "github:jspm/nodelibs-url@0.1.0"
    },
    "npm:source-map@0.1.43": {
      "amdefine": "npm:amdefine@1.0.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:stream-browserify@1.0.0": {
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "readable-stream": "npm:readable-stream@1.1.14"
    },
    "npm:string_decoder@0.10.31": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:typescript@1.8.10": {
      "os": "github:jspm/nodelibs-os@0.1.0"
    },
    "npm:unsemantic@1.0.1": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:urix@0.1.0": {
      "path": "github:jspm/nodelibs-path@0.1.0"
    },
    "npm:url@0.10.3": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "punycode": "npm:punycode@1.3.2",
      "querystring": "npm:querystring@0.2.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:zone.js@0.6.12": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    }
  }
});
