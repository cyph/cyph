package api

import (
	"time"
)

var config = struct {
	AllowedOrigins            map[string]none
	BannedCountries           map[string]none
	CryptoCodesPath           string
	DefaultMemcacheExpiration time.Duration
	IMConnectTimeout          time.Duration
	MessageSendRetries        time.Duration
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
		"cyph.steveho.lt":                             empty,
		"localhost":                                   empty,
	},

	map[string]none{
		"cu": empty,
		"ir": empty,
		"kp": empty,
		"sd": empty,
		"sy": empty,
	},

	"cryptolib/bower_components/otr4-em/build/otr-web.js",

	30,

	10,

	20,
}

var imIdAddressSpace = []string{
	"0",
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"a",
	"b",
	"c",
	"d",
	"e",
	"f",
	"g",
	"h",
	"i",
	"j",
	"k",
	"m",
	"n",
	"o",
	"p",
	"q",
	"r",
	"s",
	"t",
	"u",
	"v",
	"w",
	"x",
	"y",
	"z",
	"A",
	"B",
	"C",
	"D",
	"E",
	"F",
	"G",
	"H",
	"J",
	"K",
	"L",
	"M",
	"N",
	"O",
	"P",
	"Q",
	"R",
	"S",
	"T",
	"U",
	"V",
	"W",
	"X",
	"Y",
	"Z",
}
