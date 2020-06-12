package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"net"
	"net/http"
	"net/smtp"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/buu700/braintree-go-tmp"
	"github.com/buu700/mustache-tmp"
	"github.com/gorilla/mux"
	"github.com/microcosm-cc/bluemonday"
	"github.com/oschwald/geoip2-golang"
	"google.golang.org/appengine"
)

// HandlerArgs : Arguments to Handler
type HandlerArgs struct {
	Context   context.Context
	Datastore *datastore.Client
	Request   *http.Request
	Writer    http.ResponseWriter
	Vars      map[string]string
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

var apiNamespace = strings.Split(strings.Split(config.RootURL, "/")[2], ":")[0]

var router = mux.NewRouter()
var isRouterActive = false

var sanitizer = bluemonday.StrictPolicy()

var emailFrom = os.Getenv("EMAIL_FROM")
var emailFromFull = "Cyph <" + emailFrom + ">"

var emailAuth = smtp.PlainAuth(
	"",
	os.Getenv("EMAIL_USER"),
	os.Getenv("EMAIL_PASSWORD"),
	os.Getenv("EMAIL_SERVER"),
)
var emailSmtpServer = os.Getenv("EMAIL_SERVER") + ":" + os.Getenv("EMAIL_PORT")
var emailBackupAuth = smtp.PlainAuth(
	"",
	os.Getenv("EMAIL_BACKUP_USER"),
	os.Getenv("EMAIL_BACKUP_PASSWORD"),
	os.Getenv("EMAIL_BACKUP_SERVER"),
)
var emailBackupSmtpServer = os.Getenv("EMAIL_BACKUP_SERVER") + ":" + os.Getenv("EMAIL_BACKUP_PORT")

var emailTemplate, _ = mustache.ParseString(getFileText("shared/email.html"))

var geodb, _ = geoip2.Open("GeoIP2-City.mmdb")
var orgdb, _ = geoip2.Open("GeoIP2-ISP.mmdb")

var isProd = len(os.Getenv("PROD")) > 0

var cyphAdminKey = os.Getenv("CYPH_ADMIN_KEY")
var cyphFirebaseAdminKey = os.Getenv("CYPH_FIREBASE_ADMIN_KEY")

var firebaseProject = os.Getenv("FIREBASE_PROJECT")

var twilioSID = os.Getenv("TWILIO_SID")
var twilioAuthToken = os.Getenv("TWILIO_AUTH_TOKEN")

var braintreeMerchantID = os.Getenv("BRAINTREE_MERCHANT_ID")
var braintreePublicKey = os.Getenv("BRAINTREE_PUBLIC_KEY")
var braintreePrivateKey = os.Getenv("BRAINTREE_PRIVATE_KEY")

var appStoreSecret = os.Getenv("APP_STORE_SECRET")

var everflowID = os.Getenv("EVERFLOW_ID")
var everflowToken = os.Getenv("EVERFLOW_TOKEN")

var analIDs = func() map[string]string {
	o := map[string]string{}

	if appengine.IsDevAppServer() {
		return o
	}

	analGeoTargetsString := getFileText("anal-geotargets.txt")
	analGeoTargets := strings.Split(analGeoTargetsString, "\n")

	for i := range analGeoTargets {
		analGeoTarget := strings.Split(analGeoTargets[i], ":")
		o[analGeoTarget[0]] = analGeoTarget[1]
	}

	return o
}()

func datastoreKey(kind string, name string) *datastore.Key {
	key := datastore.NameKey(kind, name, nil)
	key.Namespace = apiNamespace
	return key
}

func datastoreQuery(kind string) *datastore.Query {
	return datastore.NewQuery(kind).Namespace(apiNamespace)
}

func isValidCyphID(id string) bool {
	return len(id) == config.AllowedCyphIDLength && config.AllowedCyphIDs.MatchString(id)
}

func generateRandomID() string {
	bytes := make([]byte, config.APIKeyByteLength)
	if _, err := rand.Read(bytes); err != nil {
		return ""
	}

	return hex.EncodeToString(bytes)
}

func generateAPIKey(h HandlerArgs, kind string) (string, *datastore.Key, error) {
	apiKey := generateRandomID()
	datastoreKey := datastoreKey(kind, apiKey)

	it := h.Datastore.Run(
		h.Context,
		datastoreQuery(kind).Filter("__key__ =", datastoreKey),
	)

	if _, err := it.Next(nil); err == nil {
		return generateAPIKey(h, kind)
	}

	return apiKey, datastoreKey, nil
}

func geolocate(h HandlerArgs) (string, string, string, string, string, string, string) {
	if appengine.IsDevAppServer() {
		return config.DummyContinent,
			config.DummyContinentCode,
			config.DummyCountry,
			config.DummyCountryCode,
			config.DummyCity,
			config.DummyPostalCode,
			config.DummyAnalID
	}

	record, err := geodb.City(getIP(h))
	if err != nil {
		return config.DefaultContinent, config.DefaultContinentCode, "", "", "", "", ""
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

	if _, ok := config.Continents[continentCode]; !ok {
		continent = config.DefaultContinent
		continentCode = config.DefaultContinentCode
	}

	country := ""
	countryCode := strings.ToLower(record.Country.IsoCode)
	if val, ok := record.Country.Names[language]; ok {
		country = val
	} else if val, ok := record.Country.Names[config.DefaultLanguageCode]; ok {
		country = val
	}

	city := ""
	if val, ok := record.City.Names[language]; ok {
		city = val
	} else if val, ok := record.City.Names[config.DefaultLanguageCode]; ok {
		city = val
	}

	postalCode := record.Postal.Code

	analID := analIDs[city]
	if analID == "" {
		analID = countryCode
	}

	return continent, continentCode, country, countryCode, city, postalCode, analID
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

func getSignupFromRequest(h HandlerArgs) (BetaSignup, map[string]interface{}) {
	_, _, country, countryCode, _, _, _ := geolocate(h)

	signup := map[string]interface{}{}
	profile := map[string]interface{}{}

	usernameRequest := sanitize(h.Request.PostFormValue("usernameRequest"), config.MaxSignupValueLength)

	betaSignup := BetaSignup{
		Comment:         sanitize(h.Request.PostFormValue("comment"), config.MaxSignupValueLength),
		Country:         country,
		Email:           sanitize(strings.ToLower(h.Request.PostFormValue("email")), config.MaxSignupValueLength),
		Invited:         false,
		Language:        sanitize(h.Request.PostFormValue("language"), config.MaxSignupValueLength),
		Name:            sanitize(h.Request.PostFormValue("name"), config.MaxSignupValueLength),
		Referer:         sanitize(h.Request.Referer(), config.MaxSignupValueLength),
		Time:            time.Now().Unix(),
		UsernameRequest: usernameRequest,
	}

	profile["country"] = countryCode
	profile["first_name"] = betaSignup.Name
	profile["http_referrer"] = betaSignup.Referer
	profile["locale"] = betaSignup.Language
	profile["custom_var1"] = sanitize(h.Request.PostFormValue("inviteCode"), config.MaxSignupValueLength)
	profile["custom_var2"] = sanitize(h.Request.PostFormValue("featureInterest"), config.MaxSignupValueLength)
	profile["custom_var3"] = usernameRequest
	signup["email"] = betaSignup.Email
	signup["profile"] = profile

	return betaSignup, signup
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
	return net.ParseIP(getIPString(h))
}

func getIPString(h HandlerArgs) string {
	xff := h.Request.Header.Get("X-Forwarded-For")
	if xff != "" {
		return strings.Split(xff, ",")[0]
	}

	ip, _, _ := net.SplitHostPort(h.Request.RemoteAddr)
	return ip
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

	bt.HttpClient = &http.Client{}

	return bt
}

func downgradeAccountHelper(userToken string, removeAppStoreReceiptRef bool) (string, string, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"namespace":                "cyph.ws",
		"removeAppStoreReceiptRef": removeAppStoreReceiptRef,
		"userToken":                userToken,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		"https://us-central1-"+firebaseProject+".cloudfunctions.net/downgradeAccount",
		bytes.NewBuffer(body),
	)

	req.Header.Add("Authorization", cyphFirebaseAdminKey)
	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return "", "", err
	}

	appStoreReceipt := ""
	if data, ok := responseBody["appStoreReceipt"]; ok {
		switch v := data.(type) {
		case string:
			appStoreReceipt = v
		}
	}

	braintreeSubscriptionID := ""
	if data, ok := responseBody["braintreeSubscriptionID"]; ok {
		switch v := data.(type) {
		case string:
			braintreeSubscriptionID = v
		}
	}

	return appStoreReceipt, braintreeSubscriptionID, nil
}

func generateInvite(email, name, plan, appStoreReceipt string, braintreeIDs, braintreeSubscriptionIDs []string, inviteCode, username string, purchased bool) (string, string, string, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"appStoreReceipt":          appStoreReceipt,
		"braintreeIDs":             strings.Join(braintreeIDs, "\n"),
		"braintreeSubscriptionIDs": strings.Join(braintreeSubscriptionIDs, "\n"),
		"email":                    email,
		"inviteCode":               inviteCode,
		"name":                     name,
		"namespace":                "cyph.ws",
		"plan":                     plan,
		"purchased":                purchased,
		"username":                 username,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		"https://us-central1-"+firebaseProject+".cloudfunctions.net/generateInvite",
		bytes.NewBuffer(body),
	)

	req.Header.Add("Authorization", cyphFirebaseAdminKey)
	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", "", err
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", "", "", err
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return "", "", "", err
	}

	if data, ok := responseBody["inviteCode"]; ok {
		switch v := data.(type) {
		case string:
			inviteCode = v
		}
	}

	oldBraintreeSubscriptionID := ""
	if data, ok := responseBody["oldBraintreeSubscriptionID"]; ok {
		switch v := data.(type) {
		case string:
			oldBraintreeSubscriptionID = v
		}
	}

	welcomeLetter := ""
	if data, ok := responseBody["welcomeLetter"]; ok {
		switch v := data.(type) {
		case string:
			welcomeLetter = v
		}
	}

	return inviteCode, oldBraintreeSubscriptionID, welcomeLetter, nil
}

func getBraintreeSubscriptionID(userToken string) (string, string, int64, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"namespace": "cyph.ws",
		"userToken": userToken,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		"https://us-central1-"+firebaseProject+".cloudfunctions.net/getBraintreeSubscriptionID",
		bytes.NewBuffer(body),
	)

	req.Header.Add("Authorization", cyphFirebaseAdminKey)
	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", 0, err
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", "", 0, err
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return "", "", 0, err
	}

	appStoreReceipt := ""
	if data, ok := responseBody["appStoreReceipt"]; ok {
		switch v := data.(type) {
		case string:
			appStoreReceipt = v
		}
	}

	braintreeSubscriptionID := ""
	if data, ok := responseBody["braintreeSubscriptionID"]; ok {
		switch v := data.(type) {
		case string:
			braintreeSubscriptionID = v
		}
	}

	planTrialEnd := int64(0)
	if data, ok := responseBody["planTrialEnd"]; ok {
		switch v := data.(type) {
		case float64:
			planTrialEnd = int64(v)
		}
	}

	return appStoreReceipt, braintreeSubscriptionID, planTrialEnd, nil
}

func getUsername(userToken string) (string, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"namespace": "cyph.ws",
		"userToken": userToken,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		"https://us-central1-"+firebaseProject+".cloudfunctions.net/openUserToken",
		bytes.NewBuffer(body),
	)

	req.Header.Add("Authorization", cyphFirebaseAdminKey)
	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return "", err
	}

	username := ""
	if data, ok := responseBody["username"]; ok {
		switch v := data.(type) {
		case string:
			username = v
		}
	}

	return username, nil
}

func getCustomer(h HandlerArgs) (*Customer, *datastore.Key, error) {
	var apiKey string
	if authHeader, ok := h.Request.Header["Authorization"]; ok && len(authHeader) > 0 {
		apiKey = authHeader[0]
	} else {
		return nil, nil, errors.New("must include an API key")
	}

	customer := &Customer{}
	customerKey := datastoreKey("Customer", apiKey)

	if err := h.Datastore.Get(h.Context, customerKey, customer); err != nil {
		return nil, nil, errors.New("invalid API key")
	}

	return customer, customerKey, nil
}

func getAppStoreTransactionData(appStoreReceipt string) (string, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"password":     appStoreSecret,
		"receipt-data": appStoreReceipt,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		"https://buy.itunes.apple.com/verifyReceipt",
		bytes.NewBuffer(body),
	)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return "", err
	}

	status := int64(-1)
	if data, ok := responseBody["status"]; ok {
		switch v := data.(type) {
		case float64:
			status = int64(v)
		}
	}

	if status != 0 {
		return "", errors.New("Error status: " + string(status))
	}

	receiptData := map[string]interface{}{}
	if data, ok := responseBody["receipt"]; ok {
		switch v := data.(type) {
		case map[string]interface{}:
			receiptData = v
		}
	}

	appleID := int64(-1)
	if data, ok := receiptData["app_item_id"]; ok {
		switch v := data.(type) {
		case float64:
			appleID = int64(v)
		}
	}

	planID, ok := config.PlanAppleIDs[appleID]
	if !ok {
		return "", errors.New("Invalid App Store receipt: " + appStoreReceipt)
	}

	return planID, nil
}

func getBitPayInvoice(id string) (map[string]interface{}, error) {
	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.GET,
		"https://bitpay.com/invoices/"+id+"?token="+config.BitPayToken,
		nil,
	)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	jsonBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var body map[string]interface{}
	err = json.Unmarshal(jsonBody, &body)
	if err != nil {
		return nil, err
	}

	if data, ok := body["data"]; ok {
		switch v := data.(type) {
		case map[string]interface{}:
			return v, nil
		}
	}

	return nil, errors.New("invalid invoice ID: " + id)
}

func getTwilioToken(h HandlerArgs) map[string]interface{} {
	client := &http.Client{}

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

	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

func trackPartnerConversion(h HandlerArgs, transactionID string, orderID string, totalAmount int64) error {
	req, err := http.NewRequest(
		methods.GET,
		config.PartnerConversionURL+"/?nid="+everflowID+"&verification_token="+everflowToken+"&amount="+strconv.FormatInt(totalAmount/100, 10)+"&order_id="+orderID+"&transaction_id="+transactionID,
		nil,
	)

	if err != nil {
		return err
	}

	client := &http.Client{}
	_, err = client.Do(req)

	return err
}

func handleFunc(pattern string, cron bool, handler Handler) {
	handleFuncs(pattern, cron, Handlers{methods.GET: handler})
}

func handleFuncs(pattern string, cron bool, handlers Handlers) {
	if !isRouterActive {
		http.Handle("/", router)

		isRouterActive = true
	}

	handlerWrapper := func(w http.ResponseWriter, r *http.Request) {
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

			cronAuthFail := false
			if cron {
				_, hasCronHeader := r.Header["X-Appengine-Cron"]
				cronAuthFail = !hasCronHeader
			}

			if cronAuthFail {
				responseBody = "Cron auth failure."
				responseCode = http.StatusInternalServerError
			} else if r.Method == "OPTIONS" {
				responseBody = config.AllowedMethods
				responseCode = http.StatusOK
			} else {
				projectID := datastore.DetectProjectID
				if appengine.IsDevAppServer() {
					projectID = "test"
				}

				context := r.Context()
				datastoreClient, err := datastore.NewClient(context, projectID)

				if err != nil {
					responseBody = "Failed to create context."
					responseCode = http.StatusInternalServerError
				} else {
					responseBody, responseCode = handler(HandlerArgs{
						context,
						datastoreClient,
						r,
						w,
						mux.Vars(r),
					})
				}
			}

			/* Handler can send a negative status code to indicate non-response */
			if responseCode < 0 {
				return
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
	}

	if strings.HasSuffix(pattern, "/*") {
		router.PathPrefix(pattern[0 : len(pattern)-1]).Handler(http.HandlerFunc(handlerWrapper))
	} else {
		router.HandleFunc(pattern, handlerWrapper)
	}
}

func initHandler(w http.ResponseWriter, r *http.Request) {
	_, ok := config.AllowedHosts[r.Host]
	origin := r.Header.Get("Origin")

	w.Header().Set("Cache-Control", config.CacheControlHeader)
	w.Header().Set("Public-Key-Pins", config.HPKPHeader)
	w.Header().Set("Strict-Transport-Security", config.HSTSHeader)

	if ok || strings.HasSuffix(origin, ".pki.ws") || strings.HasSuffix(origin, ".cyph.ws") || strings.HasSuffix(origin, ".cyph.app") || appengine.IsDevAppServer() {
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
	return strings.ToLower(email), nil
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

func parseURL(maybeURL string) (*url.URL, error) {
	parsedURL, err := url.Parse(maybeURL)

	if err != nil {
		return nil, err
	}

	return parsedURL, nil
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

func sendMail(to string, subject string, text string, html string) {
	lines := []string{}

	if text != "" {
		html = ""
		lines = strings.Split(text, "\n")
	}

	body, err := emailTemplate.Render(map[string]interface{}{"html": html, "lines": lines})

	if err != nil {
		log.Println(fmt.Errorf("Failed to render email body: %v", err))
	}

	emailLog := map[string]string{
		"HTMLBody": body,
		"Sender":   emailFromFull,
		"Subject":  subject,
		"To":       to,
	}

	if b, err := json.Marshal(emailLog); err == nil {
		log.Println("Sending email: %v", string(b))
	} else {
		log.Println(fmt.Errorf("Failed to log outgoing email."))
	}

	mailTo := []string{to, emailFrom}
	mailBody := []byte(
		"From: " + emailFromFull + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: multipart/alternative; boundary=\"- CYPH EMAIL -\"\r\n\r\n" +
			"--- CYPH EMAIL -\r\n" +
			"Content-Type: text/plain; charset=\"utf-8\"\r\n\r\n" +
			text + "\r\n\r\n" +
			"--- CYPH EMAIL -\r\n" +
			"Content-Type: text/html; charset=\"utf-8\"\r\n\r\n" +
			body + "\r\n\r\n" +
			"--- CYPH EMAIL ---",
	)

	err = smtp.SendMail(
		emailSmtpServer,
		emailAuth,
		emailFrom,
		mailTo,
		mailBody,
	)

	if err != nil {
		err = smtp.SendMail(
			emailBackupSmtpServer,
			emailBackupAuth,
			emailFrom,
			mailTo,
			mailBody,
		)
	}

	if err != nil {
		log.Println(fmt.Errorf("Failed to send email: %v", err))
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
