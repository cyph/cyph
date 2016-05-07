package api

import (
	"regexp"
	"time"
)

var config = struct {
	AllowedCyphIds             *regexp.Regexp
	AllowedCyphIdLength        int
	AllowedMethods             string
	AllowedOrigins             map[string]none
	Continents                 map[string]none
	DefaultContinent           string
	EmailAddress               string
	HPKPHeader                 string
	HSTSHeader                 string
	MaxChannelDescriptorLength int
	MaxSignupValueLength       int
	MemcacheExpiration         time.Duration
	NewCyphTimeout             int64
	RootURL                    string
}{
	regexp.MustCompile("[A-Za-z0-9]{7}"),

	7,

	"GET,HEAD,POST,PUT,DELETE,OPTIONS",

	map[string]none{
		"cyph.com":                                      empty,
		"www.cyph.com":                                  empty,
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
		"staging-dot-cyph-im-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-me-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-video-dot-cyphme.appspot.com": empty,
		"staging-dot-cyph-audio-dot-cyphme.appspot.com": empty,
		"staging-dot-cyphme.appspot.com":                empty,
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

	"eu",

	"Cyph <hello@cyph.com>",

	"max-age=31536000; includeSubdomains; pin-sha256=\"8jdS3zcG5kUApHWDrLH5Q8wEygqGbGEhYApjSDtufBU=\"; pin-sha256=\"AMRT67hN1KPI+u7Aw9JpZlzyRaKeO+6u2H+jtOmWVy8=\"",

	"max-age=31536000; includeSubdomains; preload",

	/* With the current list of AWS regions,
	no descriptor will exceed this length */
	90,

	/* Max length of a valid email address, but also happened
	to seem like a sane limit for the other values */
	256,

	(48 * time.Hour),

	600,

	"http://localhost:42000",
}
