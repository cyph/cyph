package api

var config = struct {
	AllowedOrigins     map[string]none
	Continents         map[string]none
	DefaultContinent   string
	AwsRegion          string
	AwsAccessKeyId     string
	AwsSecretAccessKey string
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
		"localhost:8080":                              empty,
		"localhost:8081":                              empty,
		"localhost:8082":                              empty,
		"localhost:8083":                              empty,
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

	"us-east-1",

	"AKIAIN2DSULSB77U4S2A",

	"0CIKxPmA5bLCKU+J31cnU22a8gPkCeY7fdxt/2av",
}
