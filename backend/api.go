package main

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/lionelbarrow/braintree-go"
	"google.golang.org/appengine"
	"google.golang.org/appengine/datastore"
	"google.golang.org/appengine/mail"
	"google.golang.org/appengine/memcache"
	"google.golang.org/appengine/urlfetch"
)

func init() {
	handleFuncs("/braintree", Handlers{methods.GET: braintreeToken, methods.POST: braintreeCheckout})
	handleFuncs("/channels/{id}", Handlers{methods.POST: channelSetup})
	handleFuncs("/continent", Handlers{methods.GET: getContinent})
	handleFuncs("/geolocation/{language}", Handlers{methods.GET: getGeolocation})
	handleFuncs("/iceservers", Handlers{methods.GET: getIceServers})
	handleFuncs("/preauth/{id}", Handlers{methods.POST: preAuth})
	handleFuncs("/signups", Handlers{methods.PUT: signup})
	handleFuncs("/timestamp", Handlers{methods.GET: getTimestamp})

	handleFunc("/", func(h HandlerArgs) (interface{}, int) {
		return "Welcome to Cyph, lad", http.StatusOK
	})
}

func main() {
	appengine.Main()
}

func braintreeCheckout(h HandlerArgs) (interface{}, int) {
	company := sanitize(h.Request.PostFormValue("company"))
	email := sanitize(h.Request.PostFormValue("email"))
	name := sanitize(h.Request.PostFormValue("name"))
	nonce := sanitize(h.Request.PostFormValue("nonce"))

	names := strings.SplitN(name, " ", 2)
	firstName := names[0]
	lastName := ""
	if len(names) > 1 {
		lastName = names[1]
	}

	planId := ""
	if category, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("category")), 10, 64); err == nil {
		if item, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("item")), 10, 64); err == nil {
			planId = strconv.FormatInt(category, 10) + "-" + strconv.FormatInt(item, 10)
		}
	}

	amountString := sanitize(h.Request.PostFormValue("amount"))
	amount, err := strconv.ParseInt(amountString, 10, 64)
	if err != nil {
		return err.Error(), http.StatusTeapot
	}
	if amount < 1 {
		return "Invalid amount.", http.StatusTeapot
	}

	subscriptionString := sanitize(h.Request.PostFormValue("subscription"))
	subscription, err := strconv.ParseBool(subscriptionString)
	if err != nil {
		return err.Error(), http.StatusTeapot
	}

	bt := braintreeInit(h)

	txLog := ""
	success := false

	if subscription {
		apiKey, err := generateApiKey()

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		customer, err := bt.Customer().Create(&braintree.Customer{
			Company:   company,
			Email:     email,
			FirstName: firstName,
			LastName:  lastName,
		})

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		paymentMethod, err := bt.PaymentMethod().Create(&braintree.PaymentMethodRequest{
			CustomerId:         customer.Id,
			PaymentMethodNonce: nonce,
		})

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		tx, err := bt.Subscription().Create(&braintree.SubscriptionRequest{
			PaymentMethodToken: paymentMethod.GetToken(),
			PlanId:             planId,
		})

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		success = tx.Status == braintree.SubscriptionStatusActive
		txLog = "Subscription " + string(tx.Status)

		if success {
			txLog = txLog + "\nAPI key: " + apiKey + "\nCustomer ID: " + customer.Id

			_, err := datastore.Put(
				h.Context,
				datastore.NewKey(h.Context, "Customer", apiKey, 0, nil),
				&Customer{
					ApiKey:      apiKey,
					BraintreeId: customer.Id,
				},
			)

			if err != nil {
				txLog = "\n\nERROR: " + err.Error()
			}
		}
	} else {
		tx, err := bt.Transaction().Create(&braintree.TransactionRequest{
			Type:               "sale",
			Amount:             braintree.NewDecimal(amount, 2),
			PaymentMethodNonce: nonce,
		})

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		bt.Transaction().SubmitForSettlement(tx.Id)

		success = tx.Status == "authorized"
		txJson, _ := json.Marshal(tx)
		txLog = string(txJson)
	}

	subject := "SALE SALE SALE"
	if !isProd {
		subject = "[sandbox] " + subject
	}

	mail.SendToAdmins(h.Context, &mail.Message{
		Sender:  "Cyph Sales <hello@cyph.com>",
		Subject: subject,
		Body: ("" +
			"Nonce: " + nonce +
			"\nPlan ID: " + planId +
			"\nAmount: " + amountString +
			"\nSubscription: " + subscriptionString +
			"\nCompany: " + company +
			"\nName: " + name +
			"\nEmail: " + email +
			"\n\n" + txLog +
			""),
	})

	return success, http.StatusOK
}

func braintreeToken(h HandlerArgs) (interface{}, int) {
	token, err := braintreeInit(h).ClientToken().Generate()

	if err == nil {
		return token, http.StatusOK
	} else {
		return braintreeToken(h)
	}
}

func channelSetup(h HandlerArgs) (interface{}, int) {
	/* Block Facebook tampering with links sent through Messenger */
	org := getOrg(h)
	if org == "Facebook" {
		return "", http.StatusNotFound
	}

	id := sanitize(h.Vars["id"])

	if !isValidCyphId(id) {
		return "Invalid ID.", http.StatusForbidden
	}

	proFeatures := getProFeaturesFromRequest(h)
	now := time.Now().Unix()
	preAuthorizedCyph := &PreAuthorizedCyph{}
	preAuthorizedCyphKey := datastore.NewKey(h.Context, "PreAuthorizedCyph", id, 0, nil)

	err := datastore.Get(h.Context, preAuthorizedCyphKey, preAuthorizedCyph)

	/* Discard pre-authorization after two days */
	if err == nil && now-preAuthorizedCyph.Timestamp > 172800 {
		datastore.Delete(h.Context, preAuthorizedCyphKey)
		return "Pre-authorization expired.", http.StatusForbidden
	}

	var preAuthorizedProFeatures map[string]bool
	json.Unmarshal(preAuthorizedCyph.ProFeatures, &preAuthorizedProFeatures)

	/* For now, disable pro feature check for non-API usage.
	Also, _temporarily_ disable this check for modest branding usage. */
	if proFeatures["api"] && !proFeatures["modestBranding"] {
		for feature, isRequired := range proFeatures {
			if isRequired && !preAuthorizedProFeatures[feature] {
				return "Pro feature " + feature + " not available.", http.StatusForbidden
			}
		}
	}

	channelDescriptor := ""
	status := http.StatusOK

	if item, err := memcache.Get(h.Context, id); err != memcache.ErrCacheMiss {
		datastore.Delete(h.Context, preAuthorizedCyphKey)

		oldValue := item.Value
		item.Value = []byte{}

		if err := memcache.CompareAndSwap(h.Context, item); err != memcache.ErrCASConflict {
			valueLines := strings.Split(string(oldValue), "\n")
			timestamp, _ := strconv.ParseInt(valueLines[0], 10, 64)

			if now-timestamp < config.NewCyphTimeout {
				channelDescriptor = valueLines[1]
			}
		}
	} else {
		channelDescriptor = sanitize(h.Request.FormValue("channelDescriptor"))

		if len(channelDescriptor) > config.MaxChannelDescriptorLength {
			channelDescriptor = ""
		}

		if channelDescriptor != "" {
			memcache.Set(h.Context, &memcache.Item{
				Key:        id,
				Value:      []byte(strconv.FormatInt(now, 10) + "\n" + channelDescriptor),
				Expiration: config.MemcacheExpiration,
			})
		}
	}

	if channelDescriptor == "" {
		status = http.StatusNotFound
	}

	return channelDescriptor, status
}

func getContinent(h HandlerArgs) (interface{}, int) {
	_, continentCode, _, _ := geolocate(h)
	return continentCode, http.StatusOK
}

func getGeolocation(h HandlerArgs) (interface{}, int) {
	continent, continentCode, country, countryCode := geolocate(h)
	org := getOrg(h)

	return map[string]string{
		"continent":     continent,
		"continentCode": continentCode,
		"country":       country,
		"countryCode":   countryCode,
		"org":           org,
	}, http.StatusOK
}

func getIceServers(h HandlerArgs) (interface{}, int) {
	return getTwilioToken(h)["ice_servers"], http.StatusOK
}

func getTimestamp(h HandlerArgs) (interface{}, int) {
	return strconv.FormatInt(time.Now().UnixNano()/1000000, 10), http.StatusOK
}

func preAuth(h HandlerArgs) (interface{}, int) {
	id := sanitize(h.Vars["id"])

	if !isValidCyphId(id) {
		return "Invalid ID.", http.StatusForbidden
	}

	var apiKey string
	if authHeader, ok := h.Request.Header["Authorization"]; ok && len(authHeader) > 0 {
		apiKey = sanitize(authHeader[0])
	} else {
		return "Must include an API key.", http.StatusForbidden
	}

	customer := &Customer{}
	customerKey := datastore.NewKey(h.Context, "Customer", apiKey, 0, nil)

	if err := datastore.Get(h.Context, customerKey, customer); err != nil {
		return "Invalid API key.", http.StatusNotFound
	}

	bt := braintreeInit(h)
	braintreeCustomer, err := bt.Customer().Find(customer.BraintreeId)

	if err != nil {
		return err.Error(), http.StatusTeapot
	}

	proFeatures := map[string]bool{}
	sessionCountLimit := int64(0)
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

		for feature, isAvailable := range plan.ProFeatures {
			if isAvailable {
				proFeatures[feature] = true
			}
		}

		if plan.SessionCountLimit > sessionCountLimit || plan.SessionCountLimit == -1 {
			sessionCountLimit = plan.SessionCountLimit
		}
	}

	now := time.Now()
	lastSession := time.Unix(customer.LastSession, 0)

	if now.Year() > lastSession.Year() || now.Month() > lastSession.Month() {
		customer.SessionCount = 0
	}

	if customer.SessionCount >= sessionCountLimit && sessionCountLimit != -1 {
		return "Session limit exceeded.", http.StatusForbidden
	}

	customer.LastSession = now.Unix()
	customer.SessionCount += 1

	proFeaturesJson, err := json.Marshal(proFeatures)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	_, err = datastore.PutMulti(
		h.Context,
		[]*datastore.Key{
			customerKey,
			datastore.NewKey(h.Context, "PreAuthorizedCyph", id, 0, nil),
		},
		[]interface{}{
			customer,
			&PreAuthorizedCyph{
				Id:          id,
				ProFeatures: proFeaturesJson,
				Timestamp:   customer.LastSession,
			},
		},
	)

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	trackEvent(h, "session", "preauth", apiKey, 1)

	return "", http.StatusOK
}

func signup(h HandlerArgs) (interface{}, int) {
	signup := getSignupFromRequest(h)
	email := signup["email"].(string)

	if !strings.Contains(email, "@") {
		return "", http.StatusTeapot
	}

	jsonSignup, _ := json.Marshal(signup)

	resource := ""
	method := methods.POST
	useridKey := "signup-userid-" + email

	if item, err := memcache.Get(h.Context, useridKey); err != memcache.ErrCacheMiss {
		resource = "/" + string(item.Value)
		method = methods.PUT
	}

	req, _ := http.NewRequest(
		method,
		"https://cyph.prefinery.com/api/v2/betas/9034/testers"+resource+".json?api_key="+prefineryKey,
		bytes.NewBuffer(jsonSignup),
	)

	req.Header.Add("Accept", "application/json")
	req.Header.Add("Content-type", "application/json")

	client := urlfetch.Client(h.Context)
	resp, _ := client.Do(req)

	jsonBody, _ := ioutil.ReadAll(resp.Body)

	var body map[string]interface{}
	json.Unmarshal(jsonBody, &body)

	useridDynamic, _ := body["id"]
	switch userid := useridDynamic.(type) {
	case float64:
		if resource != "" {
			memcache.Delete(h.Context, useridKey)
			return "update", http.StatusOK
		}

		memcache.Set(h.Context, &memcache.Item{
			Key:        useridKey,
			Value:      []byte(strconv.Itoa(int(userid))),
			Expiration: config.MemcacheExpiration,
		})

		return "set", http.StatusOK
	}

	return "Signup failed.", http.StatusInternalServerError
}
