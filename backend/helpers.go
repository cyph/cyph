package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"math"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/braintree-go/braintree-go"
	"github.com/cbroglie/mustache"
	"github.com/gorilla/mux"
	"github.com/microcosm-cc/bluemonday"
	"github.com/oschwald/geoip2-golang"
	"golang.org/x/net/context"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/log"
	"google.golang.org/appengine/mail"
	"google.golang.org/appengine/urlfetch"
)

// HandlerArgs : Arguments to Handler
type HandlerArgs struct {
	Context context.Context
	Request *http.Request
	Writer  http.ResponseWriter
	Vars    map[string]string
}

// Handler : API route handler
type Handler func(HandlerArgs) (interface{}, int)

// Handlers : Mapping of HTTP methods to Handlers for a particular route
type Handlers map[string]Handler

var methods = struct {
	GET     string
	HEAD    string
	POST    string
	PUT     string
	DELETE  string
	TRACE   string
	OPTIONS string
	CONNECT string
}{
	"GET",
	"HEAD",
	"POST",
	"PUT",
	"DELETE",
	"TRACE",
	"OPTIONS",
	"CONNECT",
}

var namespace = strings.Split(strings.Split(config.RootURL, "/")[2], ":")[0]

var router = mux.NewRouter()
var isRouterActive = false

var sanitizer = bluemonday.StrictPolicy()

var emailTemplate, _ = mustache.ParseString(getFileText("shared/email.html"))

var countrydb, _ = geoip2.Open("GeoIP2-Country.mmdb")
var orgdb, _ = geoip2.Open("GeoIP2-ISP.mmdb")

var isProd = len(os.Getenv("PROD")) > 0

var cyphAdminKey = os.Getenv("CYPH_ADMIN_KEY")

var twilioSID = os.Getenv("TWILIO_SID")
var twilioAuthToken = os.Getenv("TWILIO_AUTH_TOKEN")

var braintreeMerchantID = os.Getenv("BRAINTREE_MERCHANT_ID")
var braintreePublicKey = os.Getenv("BRAINTREE_PUBLIC_KEY")
var braintreePrivateKey = os.Getenv("BRAINTREE_PRIVATE_KEY")

var prefineryKey = os.Getenv("PREFINERY_KEY")

func isValidCyphID(id string) bool {
	return len(id) == config.AllowedCyphIDLength && config.AllowedCyphIDs.MatchString(id)
}

func generateAPIKey(h HandlerArgs, kind string) (string, *datastore.Key, error) {
	bytes := make([]byte, config.APIKeyByteLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", nil, err
	}

	apiKey := hex.EncodeToString(bytes)
	datastoreKey := datastore.NewKey(h.Context, kind, apiKey, 0, nil)

	iterator := datastore.NewQuery(kind).Filter("__key__ =", datastoreKey).Run(h.Context)
	if _, err := iterator.Next(nil); err == nil {
		return generateAPIKey(h, kind)
	}

	return apiKey, datastoreKey, nil
}

func geolocate(h HandlerArgs) (string, string, string, string) {
	if appengine.IsDevAppServer() {
		return config.DefaultContinent,
			config.DefaultContinentCode,
			config.DummyCountry,
			config.DummyCountryCode
	}

	record, err := countrydb.Country(getIP(h))
	if err != nil {
		return config.DefaultContinent, config.DefaultContinentCode, "", ""
	}

	language := config.DefaultLanguageCode
	if val, ok := h.Vars["language"]; ok {
		language = val
	}

	continent := ""
	continentCode := strings.ToLower(record.Continent.Code)
	if val, ok := record.Continent.Names[language]; ok {
		continent = val
	} else if val, ok := record.Continent.Names[config.DefaultLanguageCode]; ok {
		continent = val
	}

	country := ""
	countryCode := strings.ToLower(record.Country.IsoCode)
	if val, ok := record.Country.Names[language]; ok {
		country = val
	} else if val, ok := record.Country.Names[config.DefaultLanguageCode]; ok {
		country = val
	}

	if _, ok := config.Continents[continentCode]; !ok {
		continent = config.DefaultContinent
		continentCode = config.DefaultContinentCode
	}

	return continent, continentCode, country, countryCode
}

func getProFeaturesFromRequest(h HandlerArgs) map[string]bool {
	return map[string]bool{
		"api":            sanitize(h.Request.PostFormValue("proFeatures[api]")) == "true",
		"disableP2P":     sanitize(h.Request.PostFormValue("proFeatures[disableP2P]")) == "true",
		"modestBranding": sanitize(h.Request.PostFormValue("proFeatures[modestBranding]")) == "true",
		"nativeCrypto":   sanitize(h.Request.PostFormValue("proFeatures[nativeCrypto]")) == "true",
		"telehealth":     sanitize(h.Request.PostFormValue("proFeatures[telehealth]")) == "true",
		"video":          sanitize(h.Request.PostFormValue("proFeatures[video]")) == "true",
		"voice":          sanitize(h.Request.PostFormValue("proFeatures[voice]")) == "true",
	}
}

func getSignupFromRequest(h HandlerArgs) map[string]interface{} {
	_, _, _, countryCode := geolocate(h)

	signup := map[string]interface{}{}
	profile := map[string]interface{}{}

	profile["country"] = countryCode
	profile["first_name"] = sanitize(h.Request.PostFormValue("name"), config.MaxSignupValueLength)
	profile["http_referrer"] = sanitize(h.Request.Referer(), config.MaxSignupValueLength)
	profile["locale"] = sanitize(h.Request.PostFormValue("language"), config.MaxSignupValueLength)
	profile["custom_var1"] = sanitize(h.Request.PostFormValue("inviteCode"), config.MaxSignupValueLength)
	signup["email"] = sanitize(strings.ToLower(h.Request.PostFormValue("email")), config.MaxSignupValueLength)
	signup["profile"] = profile

	return signup
}

func getOrg(h HandlerArgs) string {
	if appengine.IsDevAppServer() {
		return config.DummyOrg
	}

	record, err := orgdb.ISP(getIP(h))
	if err != nil {
		return ""
	}

	return record.Organization
}

func getIP(h HandlerArgs) []byte {
	return net.ParseIP(h.Request.RemoteAddr)
}

func braintreeDecimalToCents(d *braintree.Decimal) int64 {
	if d.Scale == 2 {
		return d.Unscaled
	}

	return int64(float64(d.Unscaled) / math.Pow10(d.Scale-2))
}

func braintreeInit(h HandlerArgs) *braintree.Braintree {
	env := braintree.Sandbox

	if isProd {
		env = braintree.Production
	}

	bt := braintree.New(
		env,
		braintreeMerchantID,
		braintreePublicKey,
		braintreePrivateKey,
	)

	bt.HttpClient = urlfetch.Client(h.Context)

	return bt
}

func getCustomer(h HandlerArgs) (*Customer, *datastore.Key, error) {
	var apiKey string
	if authHeader, ok := h.Request.Header["Authorization"]; ok && len(authHeader) > 0 {
		apiKey = sanitize(authHeader[0])
	} else {
		return nil, nil, errors.New("must include an API key")
	}

	customer := &Customer{}
	customerKey := datastore.NewKey(h.Context, "Customer", apiKey, 0, nil)

	if err := datastore.Get(h.Context, customerKey, customer); err != nil {
		return nil, nil, errors.New("invalid API key")
	}

	return customer, customerKey, nil
}

func getTwilioToken(h HandlerArgs) map[string]interface{} {
	client := urlfetch.Client(h.Context)

	req, _ := http.NewRequest(
		methods.POST,
		"https://api.twilio.com/2010-04-01/Accounts/"+twilioSID+"/Tokens.json",
		nil,
	)
	req.SetBasicAuth(twilioSID, twilioAuthToken)
	resp, err := client.Do(req)

	if err == nil {
		body, err := ioutil.ReadAll(resp.Body)

		if err == nil {
			var token map[string]interface{}
			err := json.Unmarshal(body, &token)

			if err == nil {
				return token
			}
		}
	}

	return getTwilioToken(h)
}

func trackEvent(h HandlerArgs, category, action, label string, value int) error {
	data := url.Values{}

	data.Set("v", "1")
	data.Set("tid", config.AnalID)
	data.Set("cid", "555")
	data.Set("t", "event")
	data.Set("ec", category)
	data.Set("ea", action)
	data.Set("el", label)
	data.Set("ev", strconv.Itoa(value))

	req, err := http.NewRequest(
		methods.POST,
		"https://www.google-analytics.com/collect",
		bytes.NewBufferString(data.Encode()),
	)

	if err != nil {
		return err
	}

	client := urlfetch.Client(h.Context)
	_, err = client.Do(req)

	return err
}

func handleFunc(pattern string, handler Handler) {
	handleFuncs(pattern, Handlers{methods.GET: handler})
}

func handleFuncs(pattern string, handlers Handlers) {
	if !isRouterActive {
		http.Handle("/", router)

		isRouterActive = true
	}

	router.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
		var method string
		if m, ok := r.Header["Access-Control-Request-Method"]; ok && len(m) > 0 {
			method = m[0]
		} else {
			method = r.Method
		}

		if handler, ok := handlers[method]; ok {
			initHandler(w, r)

			var responseBody interface{}
			var responseCode int

			if r.Method == "OPTIONS" {
				responseBody = config.AllowedMethods
				responseCode = http.StatusOK
			} else {
				context, err := appengine.Namespace(appengine.NewContext(r), namespace)
				if err != nil {
					responseBody = "Failed to create context."
					responseCode = http.StatusInternalServerError
				} else {
					responseBody, responseCode = handler(HandlerArgs{context, r, w, mux.Vars(r)})
				}
			}

			w.WriteHeader(responseCode)

			if responseBody != nil {
				output := ""

				if s, ok := responseBody.(string); ok {
					output = s
				} else if b, err := json.Marshal(responseBody); err == nil {
					output = string(b)
					w.Header().Set("Content-Type", "application/json")
				}

				fmt.Fprint(w, output)
			}
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
}

func initHandler(w http.ResponseWriter, r *http.Request) {
	_, ok := config.AllowedHosts[r.Host]
	origin := r.Header.Get("Origin")

	w.Header().Set("Cache-Control", config.CacheControlHeader)
	w.Header().Set("Public-Key-Pins", config.HPKPHeader)
	w.Header().Set("Strict-Transport-Security", config.HSTSHeader)

	if ok || strings.HasSuffix(origin, ".pki.ws") || strings.HasSuffix(origin, ".cyph.ws") || appengine.IsDevAppServer() {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Access-Control-Allow-Credentials", "true")
		w.Header().Add("Access-Control-Allow-Headers", config.AllowedHeaders)
		w.Header().Add("Access-Control-Allow-Methods", config.AllowedMethods)
	}
}

func nullHandler(h HandlerArgs) (interface{}, int) {
	return nil, http.StatusOK
}

func sanitize(s string, params ...int) string {
	sanitized := sanitizer.Sanitize(s)

	maxLength := -1
	if len(params) > 0 {
		maxLength = params[0]
	}

	if maxLength > -1 && len(sanitized) > maxLength {
		return sanitized[:maxLength]
	}

	return sanitized
}

func getEmail(email string) (string, error) {
	if !emailRegex.MatchString(email) {
		return "", errors.New("invalid email address: " + email)
	}
	return email, nil
}

func getNamespace(namespace string) (string, error) {
	if namespace == "" {
		return "cyph.ws", nil
	}

	namespace = sanitize(namespace)

	if !hostnameRegex.MatchString(namespace) {
		return "", errors.New("invalid namespace: " + namespace)
	}

	return namespace, nil
}

func getURL(maybeURL string) (string, error) {
	o, err := url.ParseRequestURI(maybeURL)

	if err != nil {
		return "", err
	}

	return o.Scheme + "://" + o.Host, nil
}

func getTimestamp() int64 {
	return time.Now().UnixNano() / 1e6
}

func getFileText(path string) string {
	b, err := ioutil.ReadFile(path)
	if err != nil {
		panic(err)
	}
	return string(b)
}

func sendMail(h HandlerArgs, to string, subject string, text string, html string) {
	lines := []string{}
	htmlLines := []string{}

	if text != "" {
		lines = strings.Split(text, "\n")
	}
	if html != "" {
		htmlLines = strings.Split(html, "\n")
	}

	body, err := emailTemplate.Render(map[string]interface{}{"htmlLines": htmlLines, "lines": lines})

	if err != nil {
		log.Errorf(h.Context, "Failed to render email body: %v", err)
	}

	err = mail.Send(h.Context, &mail.Message{
		Sender:   "Cyph <noreply@cyph.com>",
		Subject:  subject,
		To:       []string{to},
		HTMLBody: body,
	})

	if err != nil {
		log.Errorf(h.Context, "Failed to send email: %v", err)
	}
}

func getPlanData(h HandlerArgs, customer *Customer) (map[string]bool, int64, error) {
	proFeatures := map[string]bool{}
	sessionCountLimit := int64(0)
	plans := []Plan{}

	if customer.BraintreeID != "" {
		bt := braintreeInit(h)
		braintreeCustomer, err := bt.Customer().Find(h.Context, customer.BraintreeID)

		if err != nil {
			return proFeatures, sessionCountLimit, err
		}
		subscriptions := []*braintree.Subscription{}

		if braintreeCustomer.CreditCards != nil {
			for i := range braintreeCustomer.CreditCards.CreditCard {
				creditCard := braintreeCustomer.CreditCards.CreditCard[i]
				for j := range creditCard.Subscriptions.Subscription {
					subscriptions = append(subscriptions, creditCard.Subscriptions.Subscription[j])
				}
			}
		}

		if braintreeCustomer.PayPalAccounts != nil {
			for i := range braintreeCustomer.PayPalAccounts.PayPalAccount {
				payPalAccount := braintreeCustomer.PayPalAccounts.PayPalAccount[i]
				for j := range payPalAccount.Subscriptions.Subscription {
					subscriptions = append(subscriptions, payPalAccount.Subscriptions.Subscription[j])
				}
			}
		}

		for i := range subscriptions {
			subscription := subscriptions[i]

			if subscription.Status != braintree.SubscriptionStatusActive {
				continue
			}

			plan, ok := config.Plans[subscription.PlanId]
			if !ok {
				continue
			}

			plans = append(plans, plan)
		}
	}

	for i := range plans {
		plan := plans[i]

		for feature, isAvailable := range plan.ProFeatures {
			if isAvailable {
				proFeatures[feature] = true
			}
		}

		if plan.SessionCountLimit > sessionCountLimit || plan.SessionCountLimit == -1 {
			sessionCountLimit = plan.SessionCountLimit
		}
	}

	return proFeatures, sessionCountLimit, nil
}
