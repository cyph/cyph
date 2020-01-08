package main

import (
	"regexp"
)

type none struct{}

// BetaSignup : Data of user in waitlist
type BetaSignup struct {
	Comment         string
	Country         string
	Email           string
	Language        string
	Name            string
	PrefineryID     int
	Referer         string
	Time            int64
	UsernameRequest string
}

// BurnerChannel : Burner channel
type BurnerChannel struct {
	ChannelID string
	ID        string
	Timestamp int64
}

// Customer : Customer with API key
type Customer struct {
	APIKey       string
	BraintreeID  string
	Company      string
	Email        string
	LastSession  int64
	Name         string
	Namespace    string
	SessionCount int64
	SignupURL    string
	Timestamp    int64
}

// CustomerEmail : Mapping of email address to API key
type CustomerEmail struct {
	APIKey string
	Email  string
}

// Plan : Braintree plan
type Plan struct {
	AccountsPlan      string
	Price             int64
	ProFeatures       map[string]bool
	SessionCountLimit int64
}

// PreAuthorizedCyph : Representation of an approved usage of the API
type PreAuthorizedCyph struct {
	ID          string
	ProFeatures []byte
	Timestamp   int64
}

// RedoxAuth : Current Redox auth data
type RedoxAuth struct {
	AccessToken  string
	Expires      int64
	RefreshToken string
	RedoxAPIKey  string
}

// RedoxCredentials : Redox credentials
type RedoxCredentials struct {
	APIKey       string
	MasterAPIKey string
	RedoxAPIKey  string
	RedoxSecret  string
	Username     string
}

// RedoxRequestLog : Log of a Redox request
type RedoxRequestLog struct {
	RedoxCommand string
	Response     string
	Timestamp    int64
	Username     string
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
	BitPayToken                string
	BurnerChannelExpiration    int64
	CacheControlHeader         string
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
	NewCyphTimeout             int64
	Plans                      map[string]Plan
	RootURL                    string
}{
	regexp.MustCompile("[A-Za-z0-9]{7}"),

	7,

	"Access-Control-Request-Method,Authorization,X-Forwarded-For",

	"GET,HEAD,POST,PUT,DELETE,OPTIONS",

	map[string]none{
		"cyph.com":                     empty,
		"www.cyph.com":                 empty,
		"cyph.ws":                      empty,
		"www.cyph.ws":                  empty,
		"cyph.app":                     empty,
		"www.cyph.app":                 empty,
		"cyph.im":                      empty,
		"www.cyph.im":                  empty,
		"cyph.me":                      empty,
		"www.cyph.me":                  empty,
		"cyph.video":                   empty,
		"www.cyph.video":               empty,
		"cyph.audio":                   empty,
		"www.cyph.audio":               empty,
		"api.cyph.com":                 empty,
		"cyphdbyhiddenbhs.onion":       empty,
		"www.cyphdbyhiddenbhs.onion":   empty,
		"im.cyphdbyhiddenbhs.onion":    empty,
		"me.cyphdbyhiddenbhs.onion":    empty,
		"video.cyphdbyhiddenbhs.onion": empty,
		"audio.cyphdbyhiddenbhs.onion": empty,
		"api.cyphdbyhiddenbhs.onion":   empty,
		"prod-dot-default-dot-cyphme.appspot.com":       empty,
		"staging-dot-cyph-com-dot-cyphme.appspot.com":   empty,
		"staging-dot-cyph-ws-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-app-dot-cyphme.appspot.com":   empty,
		"staging-dot-cyph-im-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-me-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-video-dot-cyphme.appspot.com": empty,
		"staging-dot-cyph-audio-dot-cyphme.appspot.com": empty,
		"staging-dot-cyphme.appspot.com":                empty,
		"localhost:43000":                               empty,
		"localhost:8080":                                empty,
	},

	"UA-56220601-1",

	16,

	"CsLk78BjUj81tBENkNpZxoPFGJWWss5qsga86xDKFWBR",

	172800000,

	"no-cache",

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

	"max-age=5184000; pin-sha256=\"unPe8YYMLOhkaAWcjfFF1q571QqcrI5NUfP+0eBT/po=\"; pin-sha256=\"Hw4WoLZDs5AprzDc7tUWz8FDbWw/luIQq+FL03zozsw=\"; preload",

	"max-age=31536000; includeSubdomains; preload",

	150,

	/* Max length of a valid email address, but also happened
	to seem like a sane limit for the other values */
	256,

	600000,

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
		"3-1": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     true,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"3-2": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     true,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"4-1": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"4-2": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"4-3": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"4-4": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"5-1": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": true,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"5-2": Plan{
			ProFeatures: map[string]bool{
				"api":            true,
				"disableP2P":     false,
				"modestBranding": true,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"8-0": Plan{
			AccountsPlan: "MonthlyPremium",
			ProFeatures: map[string]bool{
				"api":            false,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"8-1": Plan{
			AccountsPlan: "AnnualPremium",
			ProFeatures: map[string]bool{
				"api":            false,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"8-2": Plan{
			AccountsPlan: "MonthlyTelehealth",
			ProFeatures: map[string]bool{
				"api":            false,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"8-3": Plan{
			AccountsPlan: "AnnualTelehealth",
			ProFeatures: map[string]bool{
				"api":            false,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     true,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"9-0": Plan{
			AccountsPlan: "MonthlyPremium",
			ProFeatures: map[string]bool{
				"api":            false,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"9-1": Plan{
			AccountsPlan: "AnnualPremium",
			ProFeatures: map[string]bool{
				"api":            false,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"9-2": Plan{
			AccountsPlan: "LifetimePlatinum",
			Price:        45000,
			ProFeatures: map[string]bool{
				"api":            false,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
		"10-1": Plan{
			AccountsPlan: "LifetimePlatinum",
			Price:        10000,
			ProFeatures: map[string]bool{
				"api":            false,
				"disableP2P":     false,
				"modestBranding": false,
				"nativeCrypto":   false,
				"telehealth":     false,
				"video":          true,
				"voice":          true,
			},
			SessionCountLimit: -1,
		},
	},

	"http://localhost:42000",
}
