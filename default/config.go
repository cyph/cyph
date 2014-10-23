package api

import (
	"time"
)

var config = struct {
	AllowedOrigins            map[string]none
	DefaultMemcacheExpiration time.Duration
	IMConnectTimeout          time.Duration
	MessageSendTimeout        time.Duration
	MessageSendRetries        int
}{
	map[string]none{
		"cyph.com":          empty,
		"beta.cyph.com":     empty,
		"www.cyph.com":      empty,
		"cyph.im":           empty,
		"www.cyph.im":       empty,
		"beta.cyph.im":      empty,
		"cyph.me":           empty,
		"www.cyph.me":       empty,
		"beta.cyph.me":      empty,
		"api.cyph.com":      empty,
		"beta.api.cyph.com": empty,
	},

	10,

	15,

	60, // (config.MessageSendTimeout - 5) * 6
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
