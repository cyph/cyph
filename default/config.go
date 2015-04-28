package api

import (
	"time"
)

var config = struct {
	AllowedOrigins     map[string]none
	Continents         map[string]none
	DefaultContinent   string
	MemcacheExpiration time.Duration
}{
	map[string]none{
		"cyph.com":                                    empty,
		"www.cyph.com":                                empty,
		"beta.cyph.com":                               empty,
		"staging.cyph.com":                            empty,
		"cyph.im":                                     empty,
		"www.cyph.im":                                 empty,
		"beta.cyph.im":                                empty,
		"staging.cyph.im":                             empty,
		"cyph.me":                                     empty,
		"www.cyph.me":                                 empty,
		"beta.cyph.me":                                empty,
		"staging.cyph.me":                             empty,
		"api.cyph.com":                                empty,
		"beta.api.cyph.com":                           empty,
		"staging.api.cyph.com":                        empty,
		"staging-dot-cyph-com-dot-cyphme.appspot.com": empty,
		"staging-dot-cyph-im-dot-cyphme.appspot.com":  empty,
		"staging-dot-cyph-me-dot-cyphme.appspot.com":  empty,
		"staging-dot-cyphme.appspot.com":              empty,
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

	(48 * time.Hour),
}
