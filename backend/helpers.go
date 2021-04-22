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
	nonSecureRandom "math/rand"
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

/*
var appURL = func() string {
	if appengine.IsDevAppServer() {
		return "http://localhost:42002"
	}
	return os.Getenv("APP_URL")
}()
*/
var backendURL = func() string {
	if appengine.IsDevAppServer() {
		return "http://localhost:42000"
	}
	return os.Getenv("BACKEND_URL")
}()
var websiteURL = func() string {
	if appengine.IsDevAppServer() {
		return "http://localhost:43000"
	}
	return os.Getenv("WEBSITE_URL")
}()

var apiNamespace = strings.Split(strings.Split(backendURL, "/")[2], ":")[0]

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
var firebaseFunctionURL = "https://" +
	config.DefaultFirebaseRegion +
	"-" +
	firebaseProject +
	".cloudfunctions.net/"

var twilioSID = os.Getenv("TWILIO_SID")
var twilioAuthToken = os.Getenv("TWILIO_AUTH_TOKEN")

var stripeSecretKey = os.Getenv("STRIPE_SECRET_KEY")

var braintreeMerchantID = os.Getenv("BRAINTREE_MERCHANT_ID")
var braintreePublicKey = os.Getenv("BRAINTREE_PUBLIC_KEY")
var braintreePrivateKey = os.Getenv("BRAINTREE_PRIVATE_KEY")

var appStoreSecret = os.Getenv("APP_STORE_SECRET")

var recaptchaSecret = os.Getenv("RECAPTCHA_SECRET")

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

var ipfsGatewayUptimeChecks = map[string]IPFSGatewayUptimeCheckData{}

var ipfsGatewayURLs = func() []IPFSGatewayData {
	if appengine.IsDevAppServer() {
		return []IPFSGatewayData{}
	}

	b, err := ioutil.ReadFile("ipfs-gateways.json")
	if err != nil {
		panic(err)
	}

	var gatewayURLs []IPFSGatewayData
	err = json.Unmarshal(b, &gatewayURLs)
	if err != nil {
		panic(err)
	}

	return gatewayURLs
}()

var ipfsGateways = func() map[string][]string {
	gateways := map[string][]string{
		"af": {},
		"an": {},
		"as": {},
		"eu": {},
		"na": {},
		"oc": {},
		"sa": {},
	}

	if appengine.IsDevAppServer() {
		return gateways
	}

	for i := range ipfsGatewayURLs {
		continentCode := ipfsGatewayURLs[i].ContinentCode
		url := ipfsGatewayURLs[i].URL

		gateways[continentCode] = append(gateways[continentCode], url)
	}

	for k := range gateways {
		if len(gateways[k]) < 1 {
			gateways[k] = gateways[config.DefaultContinentCode]
		}
	}

	return gateways
}()

var packages = func() map[string]PackageData {
	if appengine.IsDevAppServer() {
		return map[string]PackageData{}
	}

	b, err := ioutil.ReadFile("packages.json")
	if err != nil {
		panic(err)
	}

	var o map[string]PackageData
	err = json.Unmarshal(b, &o)
	if err != nil {
		panic(err)
	}

	return o
}()

var plans = func() map[string]Plan {
	b, err := ioutil.ReadFile("plans.json")
	if err != nil {
		panic(err)
	}

	var o map[string]Plan
	err = json.Unmarshal(b, &o)
	if err != nil {
		panic(err)
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
	return len(id) >= config.AllowedCyphIDLength && config.AllowedCyphIDs.MatchString(id)
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

func geolocate(h HandlerArgs) (string, string, string, string, string, string, string, string) {
	if appengine.IsDevAppServer() {
		return config.DummyContinent,
			config.DummyContinentCode,
			config.DummyCountry,
			config.DummyCountryCode,
			config.DummyCity,
			config.DummyPostalCode,
			config.DummyAnalID,
			config.DefaultFirebaseRegion
	}

	record, err := geodb.City(getIP(h))
	if err != nil {
		return config.DefaultContinent,
			config.DefaultContinentCode,
			"",
			"",
			"",
			"",
			"",
			config.DefaultFirebaseRegion
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

	firebaseRegion := config.DefaultFirebaseRegion
	if val, ok := config.ContinentFirebaseRegions[continentCode]; ok {
		firebaseRegion = val
	}

	return continent, continentCode, country, countryCode, city, postalCode, analID, firebaseRegion
}

func getSignupFromRequest(h HandlerArgs) (BetaSignup, map[string]interface{}) {
	_, _, country, countryCode, _, _, _, _ := geolocate(h)

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

func getIPFSGateways(continentCode string) []string {
	backupContinentCode := config.DefaultContinentCode
	if backupContinentCode == continentCode {
		backupContinentCode = config.DefaultContinentCodeBackup
	}

	checkAllIPFSGateways(false)

	gateways := append(
		getIPFSGatewaysInternal(continentCode),
		getIPFSGatewaysInternal(backupContinentCode)...,
	)

	if len(gateways) < 1 {
		checkAllIPFSGateways(true)
		return getIPFSGateways(continentCode)
	}

	return gateways
}

func getIPFSGatewaysInternal(continentCode string) []string {
	now := time.Now().Unix()

	allGateways := ipfsGateways[continentCode]
	gateways := []string{}

	for i := range allGateways {
		gateway := allGateways[i]

		if uptimeCheck, ok := ipfsGatewayUptimeChecks[gateway]; ok && uptimeCheck.Result && config.IPFSGatewayUptimeCheckTTL > (now-uptimeCheck.Timestamp) {
			gateways = append(gateways, gateway)
		}
	}

	if len(gateways) < 1 {
		return gateways
	}

	index := nonSecureRandom.Intn(len(gateways))

	return append(
		append([]string{gateways[index]}, gateways[:index]...),
		gateways[index+1:]...,
	)
}

func checkAllIPFSGateways(forceRetry bool) {
	uptimeResults := make(chan bool, len(ipfsGatewayURLs))

	for i := range ipfsGatewayURLs {
		gateway := ipfsGatewayURLs[i].URL

		go func() {
			uptimeResults <- checkIPFSGateway(gateway, forceRetry)
		}()
	}

	for range ipfsGatewayURLs {
		<-uptimeResults
	}
}

func checkIPFSGateway(gateway string, forceRetry bool) bool {
	packageData := packages[config.DefaultPackage]

	if packageData.Uptime.IPFSHash == "" {
		return true
	}

	if !forceRetry {
		uptimeCheck, ok := ipfsGatewayUptimeChecks[gateway]
		if ok && config.IPFSGatewayUptimeCheckTTL > (time.Now().Unix()-uptimeCheck.Timestamp) {
			return uptimeCheck.Result
		}
	}

	result := true

	client := &http.Client{
		Timeout: config.IPFSGatewayUptimeCheckTimeout,
	}

	for i := 0; result && i < 3; i++ {
		req, err := http.NewRequest(
			methods.GET,
			strings.Replace(gateway, ":hash", packageData.Uptime.IPFSHash, 1),
			nil,
		)

		if err == nil {
			resp, err := client.Do(req)
			if err == nil && resp.Header.Get("Access-Control-Allow-Origin") == "*" {
				responseBodyBytes, err := ioutil.ReadAll(resp.Body)
				if err == nil {
					response := hex.EncodeToString(responseBodyBytes)
					if response == packageData.Uptime.IntegrityHash {
						continue
					}
				}
			}
		}

		result = false
	}

	ipfsGatewayUptimeChecks[gateway] = IPFSGatewayUptimeCheckData{
		Result:    result,
		Timestamp: time.Now().Unix(),
	}

	return result
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

func getStripeData(responseBody map[string]interface{}) *StripeData {
	stripeData := &StripeData{}

	if responseBodyStripe, ok := responseBody["stripe"]; ok {
		switch responseBodyStripeData := responseBodyStripe.(type) {
		case map[string]interface{}:
			if data, ok := responseBodyStripeData["admin"]; ok {
				switch v := data.(type) {
				case bool:
					stripeData.Admin = v
				}
			}

			if data, ok := responseBodyStripeData["customerID"]; ok {
				switch v := data.(type) {
				case string:
					stripeData.CustomerID = v
				}
			}

			if data, ok := responseBodyStripeData["subscriptionID"]; ok {
				switch v := data.(type) {
				case string:
					stripeData.SubscriptionID = v
				}
			}

			if data, ok := responseBodyStripeData["subscriptionItemID"]; ok {
				switch v := data.(type) {
				case string:
					stripeData.SubscriptionItemID = v
				}
			}
		}
	}

	if stripeData.CustomerID == "" || stripeData.SubscriptionID == "" || stripeData.SubscriptionItemID == "" {
		return nil
	}

	return stripeData
}

func downgradeAccountHelper(userToken string, removeAppStoreReceiptRef bool) (string, string, *StripeData, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"namespace":                "cyph.ws",
		"removeAppStoreReceiptRef": removeAppStoreReceiptRef,
		"userToken":                userToken,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		firebaseFunctionURL+"downgradeAccount",
		bytes.NewBuffer(body),
	)

	req.Header.Add("Authorization", cyphFirebaseAdminKey)
	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", nil, err
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", "", nil, err
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return "", "", nil, err
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

	stripeData := getStripeData(responseBody)

	return appStoreReceipt, braintreeSubscriptionID, stripeData, nil
}

func generateInvite(email, name, plan, appStoreReceipt string, customerIDs, subscriptionIDs, subscriptionItemIDs []string, inviteCode, username string, giftPack, purchased, useStripe bool) (string, string, string, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"appStoreReceipt":     appStoreReceipt,
		"customerIDs":         strings.Join(customerIDs, "\n"),
		"email":               email,
		"giftPack":            giftPack,
		"inviteCode":          inviteCode,
		"name":                name,
		"namespace":           "cyph.ws",
		"plan":                plan,
		"purchased":           purchased,
		"subscriptionIDs":     strings.Join(subscriptionIDs, "\n"),
		"subscriptionItemIDs": strings.Join(subscriptionItemIDs, "\n"),
		"username":            username,
		"useStripe":           useStripe,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		firebaseFunctionURL+"generateInvite",
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

	oldSubscriptionID := ""
	if data, ok := responseBody["oldSubscriptionID"]; ok {
		switch v := data.(type) {
		case string:
			oldSubscriptionID = v
		}
	}

	welcomeLetter := ""
	if data, ok := responseBody["welcomeLetter"]; ok {
		switch v := data.(type) {
		case string:
			welcomeLetter = v
		}
	}

	return inviteCode, oldSubscriptionID, welcomeLetter, nil
}

func getSubscriptionData(userToken string) (string, string, int64, *StripeData, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"namespace": "cyph.ws",
		"userToken": userToken,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		firebaseFunctionURL+"getSubscriptionData",
		bytes.NewBuffer(body),
	)

	req.Header.Add("Authorization", cyphFirebaseAdminKey)
	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", 0, nil, err
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", "", 0, nil, err
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return "", "", 0, nil, err
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

	stripeData := getStripeData(responseBody)

	return appStoreReceipt, braintreeSubscriptionID, planTrialEnd, stripeData, nil
}

func getUsername(userToken string) (string, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"namespace": "cyph.ws",
		"userToken": userToken,
	})

	client := &http.Client{}

	req, _ := http.NewRequest(
		methods.POST,
		firebaseFunctionURL+"openUserToken",
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

func getAppStoreTransactionDataInternal(appStoreReceipt string, sandbox bool) (string, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"password":     appStoreSecret,
		"receipt-data": appStoreReceipt,
	})

	client := &http.Client{}

	url := "https://buy.itunes.apple.com/verifyReceipt"
	if sandbox {
		url = "https://sandbox.itunes.apple.com/verifyReceipt"
	}

	req, _ := http.NewRequest(
		methods.POST,
		url,
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

	if !sandbox && status == 21007 {
		return getAppStoreTransactionDataInternal(appStoreReceipt, true)
	}

	if status != 0 {
		return "", errors.New("Error status: " + fmt.Sprint(status))
	}

	receiptData := map[string]interface{}{}
	if data, ok := responseBody["receipt"]; ok {
		switch v := data.(type) {
		case map[string]interface{}:
			receiptData = v
		}
	}

	inAppData := map[string]interface{}{}
	if data, ok := receiptData["in_app"]; ok {
		switch v := data.(type) {
		case []interface{}:
			if len(v) > 0 {
				o := v[len(v)-1]
				switch value := o.(type) {
				case map[string]interface{}:
					inAppData = value
				}
			}
		}
	}

	productID := ""
	if data, ok := inAppData["product_id"]; ok {
		switch v := data.(type) {
		case string:
			productID = v
		}
	}

	planID, ok := config.PlanAppleIDs[productID]
	if !ok {
		return "", errors.New("Invalid data from App Store receipt: " + string(responseBodyBytes))
	}

	return planID, nil
}

func getAppStoreTransactionData(appStoreReceipt string) (string, error) {
	return getAppStoreTransactionDataInternal(appStoreReceipt, false)
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

func verifyRecaptchaResponse(recaptchaResponse string) bool {
	resp, err := http.PostForm(
		"https://www.google.com/recaptcha/api/siteverify",
		url.Values{"response": {recaptchaResponse}, "secret": {recaptchaSecret}},
	)

	if err != nil {
		return false
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return false
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return false
	}

	success := false
	if data, ok := responseBody["success"]; ok {
		switch v := data.(type) {
		case bool:
			success = v
		}
	}

	return success
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

/*
func nullHandler(h HandlerArgs) (interface{}, int) {
	return nil, http.StatusOK
}
*/

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

/*
func parseURL(maybeURL string) (*url.URL, error) {
	parsedURL, err := url.Parse(maybeURL)

	if err != nil {
		return nil, err
	}

	return parsedURL, nil
}
*/

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
		log.Println(fmt.Errorf("failed to render email body: %v", err))
	}

	emailLog := map[string]string{
		"HTMLBody": body,
		"Sender":   emailFromFull,
		"Subject":  subject,
		"To":       to,
	}

	if b, err := json.Marshal(emailLog); err == nil {
		log.Printf("sending email: %v", string(b))
	} else {
		log.Println(fmt.Errorf("failed to log outgoing email"))
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
		log.Println(fmt.Errorf("failed to send email: %v", err))
	}
}
