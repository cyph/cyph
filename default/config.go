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
	MaxChannelDescriptorLength int
	MaxSignupValueLength       int
	MemcacheExpiration         time.Duration
	NewCyphTimeout             int64
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
		"api.cyph.com":                                  empty,
		"staging-dot-cyph-com-dot-cyphme.appspot.com":   empty,
		"staging-dot-cyph-im-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-me-dot-cyphme.appspot.com":    empty,
		"staging-dot-cyph-video-dot-cyphme.appspot.com": empty,
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

	/* With the current list of AWS regions,
	no descriptor will exceed this length */
	90,

	/* Max length of a valid email address, but also happened
	to seem like a sane limit for the other values */
	256,

	(48 * time.Hour),

	600,
}
