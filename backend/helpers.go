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
	"sync"
	"time"

	"cloud.google.com/go/compute/metadata"
	"cloud.google.com/go/datastore"
	"cloud.google.com/go/storage"
	"github.com/buu700/braintree-go-tmp"
	"github.com/buu700/mustache-tmp"
	"github.com/fsouza/fake-gcs-server/fakestorage"
	gorillaHandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/microcosm-cc/bluemonday"
	"github.com/oschwald/geoip2-golang"
	"github.com/stripe/stripe-go/v72"
	stripeCustomerAPI "github.com/stripe/stripe-go/v72/customer"
	stripeProductAPI "github.com/stripe/stripe-go/v72/product"
	stripeSubscriptionAPI "github.com/stripe/stripe-go/v72/sub"
	stripeSubscriptionItemAPI "github.com/stripe/stripe-go/v72/subitem"
	"github.com/vmihailenco/msgpack/v5"
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

var isLocalEnv = os.Getenv("LOCAL_ENV") == "true"

var appURL = func() string {
	if isLocalEnv {
		return "http://localhost:42002"
	}
	return os.Getenv("APP_URL")
}()
var backendURL = func() string {
	if isLocalEnv {
		return "http://localhost:42000"
	}
	return os.Getenv("BACKEND_URL")
}()
var syncfusionURL = func() string {
	if isLocalEnv {
		return "http://localhost:42004"
	}
	return os.Getenv("SYNCFUSION_URL")
}()
var websiteURL = func() string {
	if isLocalEnv {
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
var stripeWebhookSecret = os.Getenv("STRIPE_WEBHOOK_SECRET")

var braintreeMerchantID = os.Getenv("BRAINTREE_MERCHANT_ID")
var braintreePublicKey = os.Getenv("BRAINTREE_PUBLIC_KEY")
var braintreePrivateKey = os.Getenv("BRAINTREE_PRIVATE_KEY")

var appStoreSecret = os.Getenv("APP_STORE_SECRET")

var recaptchaSecret = os.Getenv("RECAPTCHA_SECRET")

var everflowID = os.Getenv("EVERFLOW_ID")
var everflowToken = os.Getenv("EVERFLOW_TOKEN")

var analIDs = func() map[string]string {
	o := map[string]string{}

	if isLocalEnv {
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

var cloudFunctionRoutes = strings.Split(getFileText("assets/cloudfunctions.list"), "\n")

var ipfsGatewayURLs = func() []IPFSGatewayData {
	if isLocalEnv {
		return []IPFSGatewayData{}
	}

	b, err := ioutil.ReadFile("assets/ipfs-gateways.json")
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

var ipfsGatewaysIPv6Support = map[string]bool{}
var ipfsGatewayUptimeChecks = map[string]IPFSGatewayUptimeCheckData{}
var ipfsGatewayUptimeChecksLock = sync.Mutex{}

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

	if isLocalEnv {
		return gateways
	}

	for i := range ipfsGatewayURLs {
		continentCode := ipfsGatewayURLs[i].ContinentCode
		uptimeCheck := ipfsGatewayURLs[i].UptimeCheck
		url := ipfsGatewayURLs[i].URL

		gateways[continentCode] = append(gateways[continentCode], url)
		ipfsGatewaysIPv6Support[url] = ipfsGatewayURLs[i].SupportsIPv6
		ipfsGatewayUptimeChecks[url] = uptimeCheck
	}

	return gateways
}()

var ipfsGatewayUptimeCheckLocks = func() map[string]*sync.Mutex {
	locks := map[string]*sync.Mutex{}
	for i := range ipfsGatewayURLs {
		gateway := ipfsGatewayURLs[i].URL
		locks[gateway] = &sync.Mutex{}
	}
	return locks
}()

var packages = func() map[string]PackageData {
	if isLocalEnv {
		return map[string]PackageData{}
	}

	b, err := ioutil.ReadFile("assets/packages")
	if err != nil {
		panic(err)
	}

	var o map[string]PackageData
	err = msgpack.Unmarshal(b, &o)
	if err != nil {
		panic(err)
	}

	return o
}()

var plans = func() map[string]Plan {
	b, err := ioutil.ReadFile("assets/plans.json")
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

var storageEmulatorServer = func() *fakestorage.Server {
	if !isLocalEnv {
		return nil
	}

	return fakestorage.NewServer([]fakestorage.Object{})
}()

func datastoreKey(kind string, name string) *datastore.Key {
	key := datastore.NameKey(kind, name, nil)
	key.Namespace = apiNamespace
	return key
}

func datastoreQuery(kind string) *datastore.Query {
	return datastore.NewQuery(kind).Namespace(apiNamespace)
}

func getStorageObject(h HandlerArgs, id string) (*storage.ObjectHandle, error) {
	var err error
	var storageClient *storage.Client

	if isLocalEnv {
		storageClient = storageEmulatorServer.Client()
	} else {
		storageClient, err = storage.NewClient(h.Context)
	}

	if err != nil {
		return nil, err
	}

	bucket := storageClient.Bucket(config.BlobStorageBucket)

	if _, err := bucket.Attrs(h.Context); err != nil {
		projectID := config.LocalProjectID
		if !isLocalEnv {
			projectID, err = metadata.ProjectID()
			if err != nil {
				return nil, err
			}
		}

		if err := bucket.Create(h.Context, projectID, nil); err != nil {
			return nil, err
		}
	}

	o := bucket.Object(id)

	if o == nil {
		err = errors.New("failed get storage object")
	}

	return o, err
}

func isValidCyphID(id string) bool {
	return len(id) >= config.AllowedCyphIDLength && config.AllowedCyphIDs.MatchString(id)
}

func generateCustomRandomID(byteLength int) string {
	bytes := make([]byte, byteLength)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}

	return hex.EncodeToString(bytes)
}

func generateRandomID() string {
	return generateCustomRandomID(config.APIKeyByteLength)
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
	if isLocalEnv {
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
	if isLocalEnv {
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

func isIPv6Request(h HandlerArgs) bool {
	ip := net.ParseIP(getIPString(h))
	return ip.To4() == nil
}

func getIPFSGateways(continentCode string, ipv6Only bool) []string {
	backupContinentCode := config.DefaultContinentCode
	if backupContinentCode == continentCode {
		backupContinentCode = config.DefaultContinentCodeBackup
	}

	return append(
		getIPFSGatewaysInternal(continentCode, ipv6Only),
		getIPFSGatewaysInternal(backupContinentCode, ipv6Only)...,
	)
}

func getIPFSGatewaysInternal(continentCode string, ipv6Only bool) []string {
	allGateways := ipfsGateways[continentCode]
	gateways := []string{}

	ipfsGatewayUptimeChecksLock.Lock()
	for i := range allGateways {
		gateway := allGateways[i]

		if ipv6Only && !ipfsGatewaysIPv6Support[gateway] {
			continue
		}

		if uptimeCheck, ok := ipfsGatewayUptimeChecks[gateway]; ok && uptimeCheck.Result {
			gateways = append(gateways, gateway)
		}
	}
	ipfsGatewayUptimeChecksLock.Unlock()

	if len(gateways) < 1 {
		/* If applicable, try relaxing IPv6 restriction */
		if ipv6Only {
			if continentCode == config.DefaultContinentCode {
				return getIPFSGatewaysInternal(config.DefaultContinentCode, false)
			}

			return append(
				getIPFSGatewaysInternal(continentCode, false),
				getIPFSGatewaysInternal(config.DefaultContinentCode, true)...,
			)
		}

		/* If no gateways for current continent, fall back to default continent */
		if continentCode != config.DefaultContinentCode {
			return getIPFSGatewaysInternal(config.DefaultContinentCode, false)
		}

		/*
			In edge case scenario where all gateways fail uptime check,
			just return the full list as a fallback Hail Mary
		*/
		return allGateways
	}

	index := nonSecureRandom.Intn(len(gateways))

	return append(
		append([]string{gateways[index]}, gateways[:index]...),
		gateways[index+1:]...,
	)
}

func checkAllIPFSGateways() {
	for i := range ipfsGatewayURLs {
		gateway := ipfsGatewayURLs[i].URL
		checkIPFSGateway(gateway)
	}
}

func checkIPFSGateway(gateway string) bool {
	ipfsGatewayUptimeCheckLocks[gateway].Lock()
	defer ipfsGatewayUptimeCheckLocks[gateway].Unlock()

	packageData := packages[config.DefaultPackage]

	if len(packageData.Uptime) < 1 {
		return true
	}

	result := true

	for i := range packageData.Uptime {
		uptime := packageData.Uptime[i]

		client := &http.Client{
			Timeout: time.Millisecond * uptime.Timeout,
		}

		innerResult := false

		for j := 0; !innerResult && j < 3; j++ {
			req, err := http.NewRequest(
				methods.GET,
				strings.Replace(gateway, ":hash", uptime.IPFSHash, 1),
				nil,
			)

			if err == nil {
				resp, err := client.Do(req)

				if err == nil &&
					resp.StatusCode == http.StatusOK &&
					resp.Header.Get("Access-Control-Allow-Origin") == "*" {
					responseBodyBytes, err := ioutil.ReadAll(resp.Body)

					if err == nil && len(responseBodyBytes) == uptime.ExpectedResponseSize {
						innerResult = true
						continue
					}
				}
			}

			time.Sleep(time.Millisecond * time.Duration(1000))
		}

		if !innerResult {
			result = false
			break
		}
	}

	ipfsGatewayUptimeChecksLock.Lock()
	defer ipfsGatewayUptimeChecksLock.Unlock()
	ipfsGatewayUptimeChecks[gateway] = IPFSGatewayUptimeCheckData{
		Result: result,
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

func getStripeProduct(planID string) string {
	plan, hasPlan := plans[planID]
	if !hasPlan {
		return ""
	}

	name := "Cyph " + plan.Name

	product, err := stripeProductAPI.Get(planID, nil)

	if err != nil {
		stripeProductAPI.New(&stripe.ProductParams{
			ID:   stripe.String(planID),
			Name: stripe.String(name),
		})
	} else if product.Name != name {
		stripeProductAPI.Update(planID, &stripe.ProductParams{
			Name: stripe.String(name),
		})
	}

	return planID
}

func isStripeBillingAdmin(userToken string, namespace string) (bool, *StripeData, error) {
	_, _, userEmail, _, stripeData, username, err := getSubscriptionData(userToken, namespace)
	if err != nil {
		return false, stripeData, err
	}

	billingAdmin, err := isStripeBillingAdminInternal(userEmail, stripeData, username)

	return billingAdmin, stripeData, err
}

func isStripeBillingAdminInternal(userEmail string, stripeData *StripeData, username string) (bool, error) {
	if stripeData == nil {
		return true, nil
	}
	if username == "" {
		return false, errors.New("invalid or expired token")
	}
	if userEmail == "" {
		return false, errors.New("no email address for user")
	}

	customer, err := stripeCustomerAPI.Get(stripeData.CustomerID, nil)
	if err != nil {
		return false, err
	}

	if !compareEmails(customer.Email, userEmail) {
		return false, errors.New("user is not the billing admin")
	}

	return true, nil
}

func downgradeAccountHelper(userToken string, removeAppStoreReceiptRef bool, namespace string) (string, string, *StripeData, error) {
	if namespace == "" {
		namespace = config.DefaultFirebaseNamespace
	}

	isBillingAdmin, _, err := isStripeBillingAdmin(userToken, namespace)

	if !isBillingAdmin {
		return "", "", nil, err
	}

	body, _ := json.Marshal(map[string]interface{}{
		"namespace":                namespace,
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

func generateInvite(email, name, plan, appStoreReceipt string, customerIDs, subscriptionIDs, subscriptionItemIDs []string, inviteCode, username string, giftPack, purchased, useStripe bool, namespace string) (string, string, string, error) {
	if namespace == "" {
		namespace = config.DefaultFirebaseNamespace
	}

	body, _ := json.Marshal(map[string]interface{}{
		"appStoreReceipt":     appStoreReceipt,
		"customerIDs":         strings.Join(customerIDs, "\n"),
		"email":               email,
		"giftPack":            giftPack,
		"inviteCode":          inviteCode,
		"name":                name,
		"namespace":           namespace,
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

func getSubscriptionData(userToken string, namespace string) (string, string, string, int64, *StripeData, string, error) {
	if namespace == "" {
		namespace = config.DefaultFirebaseNamespace
	}

	body, _ := json.Marshal(map[string]interface{}{
		"namespace": namespace,
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
		return "", "", "", 0, nil, "", err
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", "", "", 0, nil, "", err
	}

	var responseBody map[string]interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return "", "", "", 0, nil, "", err
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

	email := ""
	if data, ok := responseBody["email"]; ok {
		switch v := data.(type) {
		case string:
			email = v
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

	username := ""
	if data, ok := responseBody["username"]; ok {
		switch v := data.(type) {
		case string:
			username = v
		}
	}

	return appStoreReceipt, braintreeSubscriptionID, email, planTrialEnd, stripeData, username, nil
}

func getUsername(userToken string, namespace string) (string, error) {
	if namespace == "" {
		namespace = config.DefaultFirebaseNamespace
	}

	body, _ := json.Marshal(map[string]interface{}{
		"namespace": namespace,
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

func isAccountInGoodStanding(h HandlerArgs, appStoreReceipt, braintreeSubscriptionID string, planTrialEnd int64, stripeData *StripeData) bool {
	/* Check trial against current timestamp if applicable */

	if planTrialEnd != 0 {
		return planTrialEnd > getTimestamp()
	}

	/* Check App Store receipt, if applicable */

	if appStoreReceipt != "" {
		_, err := getAppStoreTransactionData(appStoreReceipt)
		return err == nil
	}

	/* Check Stripe, if applicable */

	if stripeData != nil {
		stripeSubItem, err := stripeSubscriptionItemAPI.Get(stripeData.SubscriptionItemID, nil)
		if err != nil {
			return true
		}

		if stripeSubItem.Deleted || stripeSubItem.Subscription != stripeData.SubscriptionID {
			return false
		}

		stripeSub, err := stripeSubscriptionAPI.Get(stripeData.SubscriptionID, nil)
		if err != nil {
			return true
		}

		return stripeSub.Status == "active"
	}

	/*
		If no subscription ID, assume free or lifetime plan.

		In error cases, err on the side of false negatives
		rather than false positives.
	*/

	if braintreeSubscriptionID == "" {
		return true
	}

	bt := braintreeInit(h)

	btSub, err := bt.Subscription().Find(h.Context, braintreeSubscriptionID)
	if err != nil {
		return true
	}

	return btSub.Status == braintree.SubscriptionStatusActive || btSub.Status == braintree.SubscriptionStatusPending
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
	resp, err := client.Do(req)

	if err != nil {
		return err
	}

	_, err = ioutil.ReadAll(resp.Body)

	return err
}

func trackPartnerConversion(h HandlerArgs, orderID, transactionID string, totalAmount int64) error {
	req, err := http.NewRequest(
		methods.GET,
		config.PartnerConversionURL+"/?nid="+everflowID+"&verification_token="+everflowToken+"&amount="+strconv.FormatInt(totalAmount/100, 10)+"&order_id="+orderID+"&transaction_id="+transactionID,
		nil,
	)

	if err != nil {
		return err
	}

	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		return err
	}

	_, err = ioutil.ReadAll(resp.Body)

	return err
}

func handleFunc(pattern string, cron bool, handler Handler) {
	handleFuncs(pattern, cron, Handlers{methods.GET: handler})
}

func handleFuncs(pattern string, cron bool, handlers Handlers) {
	if !isRouterActive {
		http.Handle("/", gorillaHandlers.RecoveryHandler()(router))

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
				if isLocalEnv {
					projectID = config.LocalProjectID
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

			if responseBodyBytes, ok := responseBody.([]byte); ok {
				w.Write(responseBodyBytes)
			} else if responseBody != nil {
				output := ""

				if s, ok := responseBody.(string); ok {
					output = s
				} else if b, err := json.Marshal(responseBody); err == nil {
					output = string(b)
					w.Header().Set("Content-Type", "application/json")
				}

				if responseBodyErr, ok := responseBody.(error); ok {
					log.Println(fmt.Errorf("error: %v", responseBodyErr))
				} else {
					log.Printf("response: %s", output)
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

	if ok || strings.HasSuffix(origin, ".pki.ws") || strings.HasSuffix(origin, ".cyph.ws") || strings.HasSuffix(origin, ".cyph.app") || isLocalEnv {
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
		return config.DefaultFirebaseNamespace, nil
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

func compareEmails(a, b string) bool {
	a = strings.TrimSpace(strings.ToLower(a))
	b = strings.TrimSpace(strings.ToLower(b))

	return a != "" && a == b
}

func sendEmail(to string, subject string, text string, html string) {
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
