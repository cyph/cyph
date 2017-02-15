package main

import (
	"appengine"
	"appengine/urlfetch"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"geoip2"
	"github.com/gorilla/mux"
	"github.com/lionelbarrow/braintree-go"
	"github.com/microcosm-cc/bluemonday"
	"io/ioutil"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type HandlerArgs struct {
	Context appengine.Context
	Request *http.Request
	Writer  http.ResponseWriter
	Vars    map[string]string
}
type Handler func(HandlerArgs) (interface{}, int)
type Handlers map[string]Handler

type Customer struct {
	ApiKey       string
	BraintreeId  string
	LastSession  int64
	SessionCount int64
}

type Plan struct {
	ProFeatures       map[string]bool
	SessionCountLimit int64
}

type PreAuthorizedCyph struct {
	Id          string
	ProFeatures []byte
	Timestamp   int64
}

type none struct{}

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

var empty = struct{}{}

var namespace = strings.Split(strings.Split(config.RootURL, "/")[2], ":")[0]

var router = mux.NewRouter()
var isRouterActive = false

var sanitizer = bluemonday.StrictPolicy()

var countrydb, _ = geoip2.Open("GeoIP2-Country.mmdb")
var orgdb, _ = geoip2.Open("GeoIP2-ISP.mmdb")

var isProd = len(os.Getenv("PROD")) > 0

var twilioSID = os.Getenv("TWILIO_SID")
var twilioAuthToken = os.Getenv("TWILIO_AUTH_TOKEN")

var braintreeMerchantID = os.Getenv("BRAINTREE_MERCHANT_ID")
var braintreePublicKey = os.Getenv("BRAINTREE_PUBLIC_KEY")
var braintreePrivateKey = os.Getenv("BRAINTREE_PRIVATE_KEY")

var prefineryKey = os.Getenv("PREFINERY_KEY")

func isValidCyphId(id string) bool {
	return len(id) == config.AllowedCyphIdLength && config.AllowedCyphIds.MatchString(id)
}

func generateApiKey() (string, error) {
	bytes := make([]byte, config.ApiKeyByteLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func geolocate(h HandlerArgs) (string, string) {
	if appengine.IsDevAppServer() {
		return "", config.DefaultContinent
	}

	record, err := countrydb.Country(getIP(h))
	if err != nil {
		return "", config.DefaultContinent
	}

	country := strings.ToLower(record.Country.IsoCode)
	continent := strings.ToLower(record.Continent.Code)

	if _, ok := config.Continents[continent]; !ok {
		continent = config.DefaultContinent
	}

	return country, continent
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
	country, _ := geolocate(h)

	signup := map[string]interface{}{}
	profile := map[string]interface{}{}

	profile["country"] = country
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
		return ""
	}

	record, err := orgdb.ISP(getIP(h))
	if err != nil {
		return ""
	}

	return record.Organization
}

func getIP(h HandlerArgs) []byte {
	var ip string
	if forwarded, ok := h.Request.Header["X-Forwarded-For"]; ok && len(forwarded) > 0 {
		ip = forwarded[0]
	} else {
		ip = h.Request.RemoteAddr
	}

	return net.ParseIP(ip)
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

	bt.SetHTTPClient(urlfetch.Client(h.Context))

	return bt
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
			} else {
				return getTwilioToken(h)
			}
		} else {
			return getTwilioToken(h)
		}
	} else {
		return getTwilioToken(h)
	}
}

func trackEvent(h HandlerArgs, category, action, label string, value int) error {
	data := url.Values{}

	data.Set("v", "1")
	data.Set("tid", config.AnalId)
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

	if ok || strings.HasSuffix(origin, ".pki.ws") || strings.HasSuffix(origin, ".cyph.ws") || appengine.IsDevAppServer() {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Access-Control-Allow-Credentials", "true")
		w.Header().Add("Access-Control-Allow-Methods", config.AllowedMethods)
		w.Header().Set("Strict-Transport-Security", config.HSTSHeader)
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
	} else {
		return sanitized
	}
}
