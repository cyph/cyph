package api

import (
	"appengine"
	"appengine/urlfetch"
	"encoding/json"
	"fmt"
	"geoip2"
	"github.com/gorilla/mux"
	"github.com/justinas/nosurf"
	"github.com/lionelbarrow/braintree-go"
	"github.com/microcosm-cc/bluemonday"
	"gopkg.in/authboss.v0"
	"gopkg.in/authboss.v0/auth"
	"gopkg.in/authboss.v0/confirm"
	"gopkg.in/authboss.v0/lock"
	"gopkg.in/authboss.v0/recover"
	"gopkg.in/authboss.v0/register"
	"gopkg.in/authboss.v0/remember"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

type HandlerArgs struct {
	Context appengine.Context
	Request *http.Request
	Writer  http.ResponseWriter
	Vars    map[string]string
}
type Handler func(HandlerArgs) (interface{}, int)
type Handlers map[string]Handler

type BetaSignup struct {
	Comment  string
	Country  string
	Email    string
	Language string
	Name     string
	Referer  string
	Time     int64
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

var router = mux.NewRouter()
var isRouterActive = false

var ab = authboss.New()

var sanitizer = bluemonday.StrictPolicy()

var geoipdb, _ = geoip2.Open("GeoIP2-Country.mmdb")

var twilioSID = os.Getenv("TWILIO_SID")
var twilioAuthToken = os.Getenv("TWILIO_AUTH_TOKEN")

var braintreeMerchantID = os.Getenv("BRAINTREE_MERCHANT_ID")
var braintreePublicKey = os.Getenv("BRAINTREE_PUBLIC_KEY")
var braintreePrivateKey = os.Getenv("BRAINTREE_PRIVATE_KEY")

func geolocate(h HandlerArgs) (string, string) {
	return geolocateIp(h.Request.RemoteAddr)
}

func geolocateIp(ip string) (string, string) {
	record, err := geoipdb.Country(net.ParseIP(ip))
	if err != nil {
		return "", ""
	}

	country := strings.ToLower(record.Country.IsoCode)
	continent := strings.ToLower(record.Continent.Code)

	if _, ok := config.Continents[continent]; !ok {
		continent = config.DefaultContinent
	}

	return country, continent
}

func getBetaSignupFromRequest(h HandlerArgs) BetaSignup {
	country, _ := geolocate(h)

	return BetaSignup{
		Comment:  sanitize(h.Request.PostFormValue("Comment"), config.MaxSignupValueLength),
		Country:  country,
		Email:    sanitize(strings.ToLower(h.Request.PostFormValue("Email")), config.MaxSignupValueLength),
		Language: sanitize(strings.ToLower(h.Request.PostFormValue("Language")), config.MaxSignupValueLength),
		Name:     sanitize(h.Request.PostFormValue("Name"), config.MaxSignupValueLength),
		Referer:  sanitize(h.Request.Referer(), config.MaxSignupValueLength),
		Time:     time.Now().Unix(),
	}
}

func braintreeInit(h HandlerArgs) *braintree.Braintree {
	bt := braintree.New(
		braintree.Sandbox,
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

func handleFunc(pattern string, handler Handler) {
	handleFuncs(pattern, Handlers{methods.GET: handler})
}

func handleFuncs(pattern string, handlers Handlers) {
	if !isRouterActive {
		http.Handle("/", router)
		setUpAuthboss()
		router.PathPrefix("/auth").Handler(ab.NewRouter())

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

			responseBody, responseCode := handler(HandlerArgs{appengine.NewContext(r), r, w, mux.Vars(r)})

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
	if _, ok := config.AllowedOrigins[r.Host]; ok || appengine.IsDevAppServer() {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Access-Control-Allow-Methods", config.AllowedMethods)
		w.Header().Set("Public-Key-Pins", config.HPKPHeader)
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

func setUpAuthboss() {
	ab.StoreMaker = NewGAEStorer
	ab.MailMaker = NewGAEMailer
	ab.CookieStoreMaker = NewCookieStorer
	ab.SessionStoreMaker = NewCookieStorer

	ab.LogWriter = os.Stderr
	ab.LogWriteMaker = NewGAELogger

	ab.XSRFName = "csrf_token"
	ab.XSRFMaker = func(_ http.ResponseWriter, r *http.Request) string {
		return nosurf.Token(r)
	}

	ab.RootURL = config.RootURL
	ab.MountPath = "/auth"
	ab.DisableGoroutines = true

	ab.Policies = []authboss.Validator{
		authboss.Rules{
			FieldName:       "email",
			Required:        true,
			AllowWhitespace: false,
		},
		authboss.Rules{
			FieldName:       "password",
			Required:        true,
			MinLength:       8,
			AllowWhitespace: true,
		},
	}

	if err := ab.Init(
		auth.ModuleName,
		confirm.ModuleName,
		lock.ModuleName,
		recover.ModuleName,
		register.ModuleName,
		remember.ModuleName,
	); err != nil {
		panic(err)
	}
}
