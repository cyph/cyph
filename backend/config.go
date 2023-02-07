package main

import (
	"regexp"
	"time"
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

// BillingStatus : Customer billing status
type BillingStatus struct {
	Admin        bool
	GoodStanding bool
	Stripe       bool
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
	StripeData      StripeData
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

// IPFSGatewayData : Data on an IPFS gateway
type IPFSGatewayData struct {
	ContinentCode string
	SupportsIPv6  bool
	UptimeCheck   IPFSGatewayUptimeCheckData
	URL           string
}

// IPFSGatewayUptimeCheckData : Data on whether a gateway is working
type IPFSGatewayUptimeCheckData struct {
	Result bool
}

// IPFSGatewayUptimeData : Data used to check whether a gateway is working
type IPFSGatewayUptimeData struct {
	ExpectedResponseSize int
	IPFSHash             string
	Timeout              time.Duration
}

// PackageData : Data for an application package
type PackageData struct {
	PackageV1 PackageV1               `json:"packageV1" msgpack:"packageV1"`
	PackageV2 []byte                  `json:"packageV2" msgpack:"packageV2"`
	Timestamp int64                   `json:"timestamp" msgpack:"timestamp"`
	Uptime    []IPFSGatewayUptimeData `json:"uptime" msgpack:"uptime"`
}

// PackageV1 : Legacy package format
type PackageV1 struct {
	Root                string            `json:"root" msgpack:"root"`
	Subresources        map[string]string `json:"subresources" msgpack:"subresources"`
	SubresourceTimeouts map[string]uint32 `json:"subresourceTimeouts" msgpack:"subresourceTimeouts"`
}

// Plan : Subscription plan
type Plan struct {
	AccountsPlan     string
	GiftPack         bool
	MaxUsers         int64
	MinUsers         int64
	Price            int64
	Name             string
	SubscriptionType string
}

// PreAuthorizedCyph : Representation of an approved usage of the API
type PreAuthorizedCyph struct {
	ID        string
	Timestamp int64
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

// StripeData : Stripe subscription data
type StripeData struct {
	CustomerID         string
	SubscriptionID     string
	SubscriptionItemID string
}

// WebSignPackageItem : WebSign package
type WebSignPackageItem struct {
	Data                []byte
	Subresources        []byte
	SubresourceTimeouts []byte
	Timestamp           float64
}

// WebSignPackageTimestamp : Timestamp of a WebSign package
type WebSignPackageTimestamp struct {
	Timestamp int64
}

var empty = struct{}{}

var config = struct {
	AllowedCyphIDs             *regexp.Regexp
	AllowedCyphIDLength        int
	AllowedHeaders             string
	AllowedMethods             string
	AllowedHosts               map[string]none
	AllowIPV6OnlyResponses     bool
	AnalID                     string
	APIKeyByteLength           int
	BitPayToken                string
	BlobStorageBucket          string
	BurnerChannelExpiration    int64
	CacheControlHeader         string
	ContinentFirebaseRegions   map[string]string
	Continents                 map[string]none
	DefaultContinent           string
	DefaultContinentCode       string
	DefaultContinentCodeBackup string
	DefaultFirebaseNamespace   string
	DefaultFirebaseRegion      string
	DefaultLanguageCode        string
	DefaultPackage             string
	DummyAnalID                string
	DummyCity                  string
	DummyContinent             string
	DummyContinentCode         string
	DummyCountry               string
	DummyCountryCode           string
	DummyPostalCode            string
	DummyOrg                   string
	EmailAddress               string
	FirebaseProjects           []string
	FirebaseRegions            []string
	HSTSHeader                 string
	IPFSGatewayUptimeCheckTTL  time.Duration
	LocalProjectID             string
	MaxChannelDescriptorLength int
	MaxSignupValueLength       int
	NewCyphTimeout             int64
	PartnerConversionURL       string
	PartnerDiscountRate        int64
	PlanAppleIDs               map[string]string
	TaskQueuePath              string
}{
	AllowedCyphIDs: regexp.MustCompile("[A-Za-z0-9_-]+$"),

	AllowedCyphIDLength: 7,

	AllowedHeaders: "Access-Control-Request-Method,Access-Control-Request-Headers,Authorization,Content-Type,X-Forwarded-For",

	AllowedMethods: "GET,HEAD,POST,PUT,DELETE,OPTIONS",

	AllowedHosts: map[string]none{
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

	AllowIPV6OnlyResponses: false,

	AnalID: "UA-56220601-1",

	APIKeyByteLength: 16,

	BitPayToken: "CsLk78BjUj81tBENkNpZxoPFGJWWss5qsga86xDKFWBR",

	BlobStorageBucket: "cyph-blobs",

	BurnerChannelExpiration: 172800000,

	CacheControlHeader: "no-cache",

	ContinentFirebaseRegions: map[string]string{
		"af": "europe-west1",
		/* "an": "us-central1", */
		"as": "asia-northeast1",
		"eu": "europe-west1",
		"na": "us-central1",
		"oc": "australia-southeast1",
		"sa": "southamerica-east1",
	},

	Continents: map[string]none{
		"af": empty,
		/* "an": empty, */
		"as": empty,
		"eu": empty,
		"na": empty,
		"oc": empty,
		"sa": empty,
	},

	DefaultContinent: "Europe",

	DefaultContinentCode: "eu",

	DefaultContinentCodeBackup: "na",

	DefaultFirebaseNamespace: "cyph.ws",

	DefaultFirebaseRegion: "us-central1",

	DefaultLanguageCode: "en",

	DefaultPackage: "cyph.app",

	DummyAnalID: "1027213",

	DummyCity: "McLean",

	DummyContinent: "North America",

	DummyContinentCode: "na",

	DummyCountry: "United States",

	DummyCountryCode: "us",

	DummyPostalCode: "22103",

	DummyOrg: "Legion of Doom",

	EmailAddress: "Cyph <hello@cyph.com>",

	FirebaseProjects: []string{
		"cyphme",
		"cyph-test-beta",
		"cyph-test-e2e",
		"cyph-test-local",
		"cyph-test-master",
		"cyph-test-staging",
		"cyph-test",
		"cyph-test2",
	},

	FirebaseRegions: []string{
		"asia-northeast1",
		"australia-southeast1",
		"europe-west1",
		"southamerica-east1",
		"us-central1",
	},

	HSTSHeader: "max-age=31536000; includeSubdomains; preload",

	IPFSGatewayUptimeCheckTTL: time.Millisecond * time.Duration(1800),

	LocalProjectID: "test",

	MaxChannelDescriptorLength: 150,

	/* Max length of a valid email address, but also happened
	to seem like a sane limit for the other values */
	MaxSignupValueLength: 256,

	/* Reasonable threshold beyond which Alice is unlikely to
	still be waiting for Bob */
	NewCyphTimeout: 2629800000,

	PartnerConversionURL: "https://partner-api.cyph.com",

	PartnerDiscountRate: 20,

	PlanAppleIDs: map[string]string{
		"MonthlyPlatinum": "8-4",
	},

	TaskQueuePath: "projects/cyphme/locations/us-central1/queues/default",
}
