package main

import (
	"regexp"
	"time"
)

type none struct{}

// Customer : Braintree customer
type Customer struct {
	APIKey       string
	BraintreeID  string
	LastSession  int64
	SessionCount int64
}

// Plan : Braintree plan
type Plan struct {
	ProFeatures       map[string]bool
	SessionCountLimit int64
}

// PreAuthorizedCyph : Representation of an approved usage of the API
type PreAuthorizedCyph struct {
	ID          string
	ProFeatures []byte
	Timestamp   int64
}

var empty = struct{}{}

var config = struct {
	AllowedCyphIDs             *regexp.Regexp
	AllowedCyphIDLength        int
	AllowedHeaders             string
	AllowedMethods             string
	AllowedHosts               map[string]none
	AnalID                     string
	APIKeyByteLength           int
	Continents                 map[string]none
	DefaultContinent           string
	DefaultContinentCode       string
	DefaultLanguageCode        string
	DummyCountry               string
	DummyCountryCode           string
	DummyOrg                   string
	EmailAddress               string
	HPKPHeader                 string
	HSTSHeader                 string
	MaxChannelDescriptorLength int
	MaxSignupValueLength       int
	MemcacheExpiration         time.Duration
	NewCyphTimeout             int64
	Plans                      map[string]Plan
	RootURL                    string
}{
	regexp.MustCompile("[A-Za-z0-9]{7}"),

	7,

	"Access-Control-Request-Method,Authorization,X-Forwarded-For",

	"GET,HEAD,POST,PUT,DELETE,OPTIONS",

	map[string]none{
		"cyph.com":                                      empty,
		"www.cyph.com":                                  empty,
		"cyph.ws":                                       empty,
		"www.cyph.ws":                                   empty,
		"cyph.im":                                       empty,
		"www.cyph.im":                                   empty,
		"cyph.me":                                       empty,
		"www.cyph.me":                                   empty,
		"cyph.video":                                    empty,
		"www.cyph.video":                                empty,
		"cyph.audio":                                    empty,
		"www.cyph.audio":                                empty,
		"api.cyph.com":                                  empty,
		"cyphdbyhiddenbhs.onion":                        empty,
		"www.cyphdbyhiddenbhs.onion":                    empty,
		"im.cyphdbyhiddenbhs.onion":                     empty,
		"me.cyphdbyhiddenbhs.onion":                     empty,
		"video.cyphdbyhiddenbhs.onion":                  empty,
		"audio.cyphdbyhiddenbhs.onion":                  empty,
		"api.cyphdbyhiddenbhs.onion":                    empty,
		"prod-dot-default-dot-cyphme.appspot.com":       empty,
		"staging-dot-cyph-com-dot-cyphme.appspot.com":   empty,
		"staging-dot-cyph-ws-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-im-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-me-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-video-dot-cyphme.appspot.com": empty,
		"staging-dot-cyph-audio-dot-cyphme.appspot.com": empty,
		"staging-dot-cyphme.appspot.com":                empty,
	},

	"UA-56220601-1",

	16,

	map[string]none{
		"af": empty,
		/* "an": empty, */
		"as": empty,
		"eu": empty,
		"na": empty,
		"oc": empty,
		"sa": empty,
	},

	"Europe",

	"eu",

	"en",

	"Principality of Sealand",

	"psl",

	"Legion of Doom",

	"Cyph <hello@cyph.com>",

	"max-age=5184000; pin-sha256=\"8jdS3zcG5kUApHWDrLH5Q8wEygqGbGEhYApjSDtufBU=\"; pin-sha256=\"unPe8YYMLOhkaAWcjfFF1q571QqcrI5NUfP+0eBT/po=\"; preload",

	"max-age=31536000; includeSubdomains; preload",

	90,

	/* Max length of a valid email address, but also happened
	to seem like a sane limit for the other values */
	256,

	(48 * time.Hour),

	600,

	map[string]Plan{
		"0-0": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     true,
				"modestBranding": true,
				"nativeCrypto":   true,
				"telehealth":     true,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"2-0": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     true,
				"modestBranding": true,
				"nativeCrypto":   true,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"2-1": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          false,
				"voice":          false,
			},
			SessionCountLimit: 100,
		},
		"3-0": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": true,
				"nativeCrypto":   false,
				"telehealth":     true,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: 100,
		},
		"3-1": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": true,
				"nativeCrypto":   false,
				"telehealth":     true,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: 1000,
		},
	},

	"http://localhost:42000",
}
