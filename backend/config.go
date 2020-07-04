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
	Invited         bool
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
	APIKey          string
	AppStoreReceipt string `datastore:",noindex"`
	BraintreeID     string
	Company         string
	Email           string
	LastSession     int64
	Name            string
	Namespace       string
	SessionCount    int64
	SignupURL       string
	Timestamp       int64
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
	CloudFunctionRoutes        []string
	Continents                 map[string]none
	DefaultContinent           string
	DefaultContinentCode       string
	DefaultLanguageCode        string
	DummyAnalID                string
	DummyCity                  string
	DummyContinent             string
	DummyContinentCode         string
	DummyCountry               string
	DummyCountryCode           string
	DummyPostalCode            string
	DummyOrg                   string
	EmailAddress               string
	HPKPHeader                 string
	HSTSHeader                 string
	MaxChannelDescriptorLength int
	MaxSignupValueLength       int
	NewCyphTimeout             int64
	PartnerConversionURL       string
	PlanAppleIDs               map[string]string
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

	[]string{
		"acceptPseudoRelationship",
		"appointmentInvite",
		"channelDisconnect",
		"checkInviteCode",
		"downgradeAccount",
		"generateInvite",
		"getBraintreeSubscriptionID",
		"getCastleSessionID",
		"getReactions",
		"getUserToken",
		"itemHashChange",
		"itemRemoved",
		"openUserToken",
		"register",
		"rejectPseudoRelationship",
		"requestPseudoRelationship",
		"resetCastleSessionID",
		"sendAppLink",
		"sendInvite",
		"setContact",
		"userDisconnect",
		"userEmailSet",
		"usernameBlacklisted",
		"userNotify",
		"userPublicProfileSet",
		"userRegisterConfirmed",
	},

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

	"1027213",

	"McLean",

	"North America",

	"na",

	"United States",

	"us",

	"22103",

	"Legion of Doom",

	"Cyph <hello@cyph.com>",

	"max-age=5184000; pin-sha256=\"unPe8YYMLOhkaAWcjfFF1q571QqcrI5NUfP+0eBT/po=\"; pin-sha256=\"Hw4WoLZDs5AprzDc7tUWz8FDbWw/luIQq+FL03zozsw=\"; preload",

	"max-age=31536000; includeSubdomains; preload",

	150,

	/* Max length of a valid email address, but also happened
	to seem like a sane limit for the other values */
	256,

	600000,

	"https://partner-api.cyph.com",

	map[string]string{
		"MonthlyPlatinum": "8-4",
	},

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
		"3-3": Plan{
			AccountsPlan: "MonthlyTelehealth",
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
		"3-4": Plan{
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
		"3-5": Plan{
			AccountsPlan: "MonthlyTelehealth",
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
		"3-6": Plan{
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
		"3-7": Plan{
			AccountsPlan: "MonthlyTelehealth",
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
		"3-8": Plan{
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
		"3-9": Plan{
			AccountsPlan: "MonthlyTelehealth",
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
		"3-10": Plan{
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
				"telehealth":     true,
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
		"8-4": Plan{
			AccountsPlan: "MonthlyPlatinum",
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
		"8-5": Plan{
			AccountsPlan: "AnnualPlatinum",
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
		"8-6": Plan{
			AccountsPlan: "MonthlySupporter",
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
		"8-7": Plan{
			AccountsPlan: "AnnualSupporter",
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
		"8-8": Plan{
			AccountsPlan: "MonthlyBusiness",
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
		"8-9": Plan{
			AccountsPlan: "AnnualBusiness",
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
		"11-1": Plan{
			AccountsPlan: "MonthlyBusiness",
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
		"11-2": Plan{
			AccountsPlan: "AnnualBusiness",
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
		"11-3": Plan{
			AccountsPlan: "MonthlyBusiness",
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
		"11-4": Plan{
			AccountsPlan: "AnnualBusiness",
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
		"11-5": Plan{
			AccountsPlan: "MonthlyBusiness",
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
		"11-6": Plan{
			AccountsPlan: "AnnualBusiness",
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
		"11-7": Plan{
			AccountsPlan: "MonthlyBusiness",
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
		"11-8": Plan{
			AccountsPlan: "AnnualBusiness",
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
		"12-0": Plan{
			AccountsPlan: "MonthlySupporter",
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
		"12-1": Plan{
			AccountsPlan: "AnnualSupporter",
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
		"12-2": Plan{
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
		"12-3": Plan{
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
		"12-4": Plan{
			AccountsPlan: "MonthlyPlatinum",
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
		"12-5": Plan{
			AccountsPlan: "AnnualPlatinum",
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
