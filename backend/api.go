package main

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/braintree-go/braintree-go"
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
	handleFuncs("/pro/unlock", Handlers{methods.POST: proUnlock})
	handleFuncs("/redox/apikey/delete", Handlers{methods.POST: redoxDeleteAPIKey})
	handleFuncs("/redox/apikey/generate", Handlers{methods.POST: redoxGenerateAPIKey})
	handleFuncs("/redox/apikey/verify", Handlers{methods.POST: redoxVerifyAPIKey})
	handleFuncs("/redox/credentials", Handlers{methods.PUT: redoxAddCredentials})
	handleFuncs("/redox/execute", Handlers{methods.POST: redoxRunCommand})
	handleFuncs("/signups", Handlers{methods.PUT: signup})
	handleFuncs("/timestamp", Handlers{methods.GET: getTimestampHandler})

	handleFunc("/", func(h HandlerArgs) (interface{}, int) {
		return "Welcome to Cyph, lad", http.StatusOK
	})
}

func main() {
	appengine.Main()
}

func braintreeCheckout(h HandlerArgs) (interface{}, int) {
	apiKey := ""
	company := sanitize(h.Request.PostFormValue("company"))
	name := sanitize(h.Request.PostFormValue("name"))
	timestamp := getTimestamp()

	email, err := getEmail(h.Request.PostFormValue("email"))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	signupURL, err := getURL(h.Request.PostFormValue("url"))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	namespace, err = getNamespace(h.Request.PostFormValue("namespace"))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	customerEmail := &CustomerEmail{}
	customerEmailKey := datastore.NewKey(h.Context, "CustomerEmail", email, 0, nil)

	if err = datastore.Get(h.Context, customerEmailKey, customerEmail); err == nil {
		return "API key already exists for this user", http.StatusForbidden
	}

	apiKey, customerKey, err := generateAPIKey(h, "Customer")
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	creditCard := h.Request.PostFormValue("creditCard") == "true"
	nonce := sanitize(h.Request.PostFormValue("nonce"))

	planID := ""
	if category, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("category")), 10, 64); err == nil {
		if item, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("item")), 10, 64); err == nil {
			planID = strconv.FormatInt(category, 10) + "-" + strconv.FormatInt(item, 10)
		}
	}

	amountString := sanitize(h.Request.PostFormValue("amount"))
	amount, err := strconv.ParseInt(amountString, 10, 64)
	if err != nil {
		return err.Error(), http.StatusTeapot
	}
	if amount < 1 {
		return "invalid amount", http.StatusTeapot
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
		names := strings.SplitN(name, " ", 2)
		firstName := names[0]
		lastName := ""
		if len(names) > 1 {
			lastName = names[1]
		}

		braintreeCustomer, err := bt.Customer().Create(h.Context, &braintree.CustomerRequest{
			Company:   company,
			Email:     email,
			FirstName: firstName,
			LastName:  lastName,
		})

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		var paymentMethod braintree.PaymentMethod

		if creditCard {
			paymentMethod, err = bt.CreditCard().Create(h.Context, &braintree.CreditCard{
				CardholderName:     name,
				CustomerId:         braintreeCustomer.Id,
				PaymentMethodNonce: nonce,
			})
		} else {
			paymentMethod, err = bt.PaymentMethod().Create(h.Context, &braintree.PaymentMethodRequest{
				CustomerId:         braintreeCustomer.Id,
				PaymentMethodNonce: nonce,
			})
		}

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		plan, err := bt.Plan().Find(h.Context, planID)

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		priceDelta := amount - braintreeDecimalToCents(plan.Price)

		if priceDelta < 0 {
			return err.Error(), http.StatusTeapot
		}

		subscriptionRequest := &braintree.SubscriptionRequest{
			PaymentMethodToken: paymentMethod.GetToken(),
			PlanId:             planID,
		}

		if priceDelta > 0 {
			subscriptionRequest.AddOns = &braintree.ModificationsRequest{
				Add: []braintree.AddModificationRequest{
					braintree.AddModificationRequest{
						InheritedFromID: "default",
						ModificationRequest: braintree.ModificationRequest{
							Amount:       braintree.NewDecimal(priceDelta, 2),
							NeverExpires: true,
						},
					},
				},
			}
		}

		tx, err := bt.Subscription().Create(h.Context, subscriptionRequest)

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		success = tx.Status == braintree.SubscriptionStatusActive
		txLog += "Subscription " + string(tx.Status)

		if success {
			txLog += "\nAPI key: " + apiKey + "\nCustomer ID: " + braintreeCustomer.Id

			_, err := datastore.Put(
				h.Context,
				customerKey,
				&Customer{
					APIKey:      apiKey,
					BraintreeID: braintreeCustomer.Id,
					Company:     company,
					Email:       email,
					Name:        name,
					Namespace:   namespace,
					SignupURL:   signupURL,
					Timestamp:   timestamp,
				},
			)

			if err != nil {
				txLog += "\n\nERROR: " + err.Error()
			}

			_, err = datastore.Put(
				h.Context,
				datastore.NewKey(h.Context, "CustomerEmail", email, 0, nil),
				&CustomerEmail{
					APIKey: apiKey,
					Email:  email,
				},
			)

			if err != nil {
				txLog += "\n\nERROR: " + err.Error()
			}
		}
	} else {
		tx, err := bt.Transaction().Create(h.Context, &braintree.TransactionRequest{
			Type:               "sale",
			Amount:             braintree.NewDecimal(amount, 2),
			PaymentMethodNonce: nonce,
		})

		if err != nil {
			return err.Error(), http.StatusTeapot
		}

		bt.Transaction().SubmitForSettlement(h.Context, tx.Id)

		success = tx.Status == "authorized"
		txJSON, _ := json.Marshal(tx)
		txLog += string(txJSON)
	}

	if !success {
		return "", http.StatusInternalServerError
	}

	subject := "SALE SALE SALE"
	if !isProd {
		subject = "[sandbox] " + subject
	}

	_, err = datastore.Put(
		h.Context,
		customerKey,
		&Customer{
			APIKey:    apiKey,
			Company:   company,
			Email:     email,
			Name:      name,
			Namespace: namespace,
			SignupURL: signupURL,
			Timestamp: timestamp,
		},
	)

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	_, err = datastore.Put(
		h.Context,
		customerEmailKey,
		&CustomerEmail{
			APIKey: apiKey,
			Email:  email,
		},
	)

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	mail.SendToAdmins(h.Context, &mail.Message{
		Sender:  "Cyph Sales <hello@cyph.com>",
		Subject: subject,
		Body: ("" +
			"Nonce: " + nonce +
			"\nPlan ID: " + planID +
			"\nAmount: " + amountString +
			"\nSubscription: " + subscriptionString +
			"\nCompany: " + company +
			"\nName: " + name +
			"\nEmail: " + email +
			"\n\n" + txLog +
			""),
	})

	sendMail(h, email, "Cyph Purchase Confirmation", "", ""+
		"Welcome to Cyph "+name+", and thanks for signing up!\n"+
		"<div style='text-align: left'>"+
		"Your access code is:&nbsp;&nbsp;"+
		"<a style='font-family: monospace; font-size: 16px' href='"+
		signupURL+"/unlock/"+apiKey+
		"'>"+
		apiKey+
		"</a>"+
		"</div>"+
		"")

	return apiKey, http.StatusOK
}

func braintreeToken(h HandlerArgs) (interface{}, int) {
	token, err := braintreeInit(h).ClientToken().Generate(h.Context)

	if err == nil {
		return token, http.StatusOK
	}

	return braintreeToken(h)
}

func channelSetup(h HandlerArgs) (interface{}, int) {
	/* Block Facebook tampering with links sent through Messenger */
	org := getOrg(h)
	if org == "Facebook" {
		return "", http.StatusNotFound
	}

	id := sanitize(h.Vars["id"])

	if !isValidCyphID(id) {
		return "invalid ID", http.StatusForbidden
	}

	proFeatures := getProFeaturesFromRequest(h)
	now := getTimestamp()
	preAuthorizedCyph := &PreAuthorizedCyph{}
	preAuthorizedCyphKey := datastore.NewKey(h.Context, "PreAuthorizedCyph", id, 0, nil)

	err := datastore.Get(h.Context, preAuthorizedCyphKey, preAuthorizedCyph)

	/* Discard pre-authorization after two days */
	if err == nil && now-preAuthorizedCyph.Timestamp > 172800000 {
		datastore.Delete(h.Context, preAuthorizedCyphKey)
		return "pre-authorization expired", http.StatusForbidden
	}

	var preAuthorizedProFeatures map[string]bool
	json.Unmarshal(preAuthorizedCyph.ProFeatures, &preAuthorizedProFeatures)

	/* For now, disable pro feature check for non-API usage.
	Also, _temporarily_ disable this check for modest branding usage. */
	if proFeatures["api"] && !proFeatures["modestBranding"] {
		for feature, isRequired := range proFeatures {
			if isRequired && !preAuthorizedProFeatures[feature] {
				return "pro feature " + feature + " not available", http.StatusForbidden
			}
		}
	}

	channelID := ""
	status := http.StatusOK

	if item, err := memcache.Get(h.Context, id); err != memcache.ErrCacheMiss {
		datastore.Delete(h.Context, preAuthorizedCyphKey)

		oldValue := item.Value
		item.Value = []byte{}

		if err := memcache.CompareAndSwap(h.Context, item); err != memcache.ErrCASConflict {
			valueLines := strings.Split(string(oldValue), "\n")
			timestamp, _ := strconv.ParseInt(valueLines[0], 10, 64)

			if now-timestamp < config.NewCyphTimeout {
				channelID = valueLines[1]
			}
		}
	} else {
		channelID = sanitize(h.Request.FormValue("channelID"))

		if len(channelID) > config.MaxChannelDescriptorLength {
			channelID = ""
		}

		if channelID != "" {
			memcache.Set(h.Context, &memcache.Item{
				Key:        id,
				Value:      []byte(strconv.FormatInt(now, 10) + "\n" + channelID),
				Expiration: config.MemcacheExpiration,
			})
		}
	}

	if channelID == "" {
		status = http.StatusNotFound
	}

	return channelID, status
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

func getTimestampHandler(h HandlerArgs) (interface{}, int) {
	return strconv.FormatInt(getTimestamp(), 10), http.StatusOK
}

func preAuth(h HandlerArgs) (interface{}, int) {
	id := sanitize(h.Vars["id"])

	if !isValidCyphID(id) {
		return "invalid ID", http.StatusForbidden
	}

	customer, customerKey, err := getCustomer(h)
	if err != nil {
		return err.Error(), http.StatusNotFound
	}

	proFeatures, sessionCountLimit, err := getPlanData(h, customer)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	now := time.Now()
	lastSession := time.Unix(customer.LastSession/1e6, 0)

	if now.Year() > lastSession.Year() || now.Month() > lastSession.Month() {
		customer.SessionCount = 0
	}

	if customer.SessionCount >= sessionCountLimit && sessionCountLimit != -1 {
		return "session limit exceeded", http.StatusForbidden
	}

	customer.LastSession = now.UnixNano() / 1e6
	customer.SessionCount++

	proFeaturesJSON, err := json.Marshal(proFeatures)
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
				ID:          id,
				ProFeatures: proFeaturesJSON,
				Timestamp:   customer.LastSession,
			},
		},
	)

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	trackEvent(h, "session", "preauth", customer.APIKey, 1)

	return "", http.StatusOK
}

func proUnlock(h HandlerArgs) (interface{}, int) {
	customer, _, err := getCustomer(h)
	if err != nil {
		return err.Error(), http.StatusNotFound
	}

	proFeatures, _, err := getPlanData(h, customer)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	if !proFeatures["api"] {
		return "invalid or expired API key", http.StatusForbidden
	}

	json, err := json.Marshal(map[string]string{
		"company":   customer.Company,
		"name":      customer.Name,
		"namespace": customer.Namespace,
	})

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	return string(json), http.StatusOK
}

func redoxAddCredentials(h HandlerArgs) (interface{}, int) {
	if sanitize(h.Request.PostFormValue("cyphAdminKey")) != cyphAdminKey {
		return "", http.StatusForbidden
	}

	redoxAPIKey := sanitize(h.Request.PostFormValue("redoxAPIKey"))
	redoxSecret := sanitize(h.Request.PostFormValue("redoxSecret"))
	username := sanitize(h.Request.PostFormValue("username"))

	masterAPIKey, redoxCredentialsKey, err := generateAPIKey(h, "RedoxCredentials")
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	_, err = datastore.Put(
		h.Context,
		redoxCredentialsKey,
		&RedoxCredentials{
			APIKey:      masterAPIKey,
			RedoxAPIKey: redoxAPIKey,
			RedoxSecret: redoxSecret,
			Username:    username,
		},
	)

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	return masterAPIKey, http.StatusOK
}

func redoxDeleteAPIKey(h HandlerArgs) (interface{}, int) {
	apiKey := sanitize(h.Request.PostFormValue("apiKey"))
	masterAPIKey := sanitize(h.Request.PostFormValue("masterAPIKey"))

	redoxCredentials := &RedoxCredentials{}
	redoxCredentialsKey := datastore.NewKey(h.Context, "RedoxCredentials", apiKey, 0, nil)

	if err := datastore.Get(h.Context, redoxCredentialsKey, redoxCredentials); err != nil {
		return "invalid API key", http.StatusNotFound
	}
	if redoxCredentials.MasterAPIKey != masterAPIKey {
		return "invalid master API key", http.StatusForbidden
	}

	if err := datastore.Delete(h.Context, redoxCredentialsKey); err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	return "", http.StatusOK
}

func redoxGenerateAPIKey(h HandlerArgs) (interface{}, int) {
	masterAPIKey := sanitize(h.Request.PostFormValue("masterAPIKey"))
	username := sanitize(h.Request.PostFormValue("username"))

	apiKey, redoxCredentialsKey, err := generateAPIKey(h, "RedoxCredentials")
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	_, err = datastore.Put(
		h.Context,
		redoxCredentialsKey,
		&RedoxCredentials{
			APIKey:       apiKey,
			MasterAPIKey: masterAPIKey,
			Username:     username,
		},
	)

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	return apiKey, http.StatusOK
}

func redoxVerifyAPIKey(h HandlerArgs) (interface{}, int) {
	apiKeyOrMasterAPIKey := sanitize(h.Request.PostFormValue("apiKeyOrMasterAPIKey"))

	redoxCredentials := &RedoxCredentials{}

	err := datastore.Get(
		h.Context,
		datastore.NewKey(
			h.Context,
			"RedoxCredentials",
			apiKeyOrMasterAPIKey,
			0,
			nil,
		),
		redoxCredentials,
	)

	if err != nil {
		return `{"isMaster": false, "isValid": false}`, http.StatusOK
	} else if redoxCredentials.MasterAPIKey != "" {
		return `{"isMaster": false, "isValid": true}`, http.StatusOK
	} else {
		return `{"isMaster": true, "isValid": true}`, http.StatusOK
	}
}

func redoxRunCommand(h HandlerArgs) (interface{}, int) {
	/* Get Redox API credentials */

	apiKeyOrMasterAPIKey := sanitize(h.Request.PostFormValue("apiKeyOrMasterAPIKey"))
	redoxCommand := h.Request.PostFormValue("redoxCommand")
	timestamp := getTimestamp()

	redoxCredentials := &RedoxCredentials{}

	err := datastore.Get(
		h.Context,
		datastore.NewKey(
			h.Context,
			"RedoxCredentials",
			apiKeyOrMasterAPIKey,
			0,
			nil,
		),
		redoxCredentials,
	)

	if err != nil {
		return "invalid API key", http.StatusNotFound
	}

	username := redoxCredentials.Username

	if redoxCredentials.RedoxAPIKey == "" || redoxCredentials.RedoxSecret == "" {
		if redoxCredentials.MasterAPIKey == "" {
			return "retired API key", http.StatusNotFound
		}

		err := datastore.Get(
			h.Context,
			datastore.NewKey(
				h.Context,
				"RedoxCredentials",
				redoxCredentials.MasterAPIKey,
				0,
				nil,
			),
			redoxCredentials,
		)

		if err != nil {
			return err.Error(), http.StatusInternalServerError
		}

		if redoxCredentials.RedoxAPIKey == "" || redoxCredentials.RedoxSecret == "" {
			return "redox credentials not found", http.StatusInternalServerError
		}
	}

	/* Get Redox API auth token */

	redoxAuth := &RedoxAuth{}
	redoxAuthKey := datastore.NewKey(h.Context, "RedoxAuth", redoxCredentials.RedoxAPIKey, 0, nil)

	err = datastore.Get(h.Context, redoxAuthKey, redoxAuth)

	if err != nil || redoxAuth.AccessToken == "" || redoxAuth.Expires < (timestamp+3600000) {
		var req *http.Request

		if redoxAuth.RefreshToken == "" {
			req, err = http.NewRequest(
				methods.POST,
				"https://api.redoxengine.com/auth/authenticate",
				bytes.NewBuffer([]byte(
					`{"apiKey": "`+
						redoxCredentials.RedoxAPIKey+
						`", "secret": "`+
						redoxCredentials.RedoxSecret+
						`"}`,
				)),
			)
		} else {
			req, err = http.NewRequest(
				methods.POST,
				"https://api.redoxengine.com/auth/refreshToken",
				bytes.NewBuffer([]byte(
					`{"apiKey": "`+
						redoxCredentials.RedoxAPIKey+
						`", "refreshToken": "`+
						redoxAuth.RefreshToken+
						`"}`,
				)),
			)
		}

		if err != nil {
			return err.Error(), http.StatusInternalServerError
		}

		req.Header.Add("Content-type", "application/json")

		client := urlfetch.Client(h.Context)
		resp, err := client.Do(req)
		if err != nil {
			return err.Error(), http.StatusInternalServerError
		}

		jsonBody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return err.Error(), http.StatusInternalServerError
		}

		var body map[string]interface{}
		err = json.Unmarshal(jsonBody, &body)
		if err != nil {
			return err.Error(), http.StatusInternalServerError
		}

		accessTokenDynamic, _ := body["accessToken"]
		switch accessToken := accessTokenDynamic.(type) {
		case string:
			redoxAuth.AccessToken = accessToken
		default:
			return "invalid Redox auth data", http.StatusInternalServerError
		}

		expiresDynamic, _ := body["expires"]
		switch expires := expiresDynamic.(type) {
		case string:
			expiryTimestamp, _ := time.Parse(time.RFC3339, expires)
			redoxAuth.Expires = expiryTimestamp.UnixNano() / 1e6
		default:
			return "invalid Redox auth data", http.StatusInternalServerError
		}

		refreshTokenDynamic, _ := body["refreshToken"]
		switch refreshToken := refreshTokenDynamic.(type) {
		case string:
			redoxAuth.RefreshToken = refreshToken
		default:
			return "invalid Redox auth data", http.StatusInternalServerError
		}

		redoxAuth.RedoxAPIKey = redoxCredentials.RedoxAPIKey

		datastore.Put(h.Context, redoxAuthKey, redoxAuth)
	}

	/* Make and log request */

	req, err := http.NewRequest(
		methods.POST,
		"https://api.redoxengine.com/query",
		bytes.NewBuffer([]byte(redoxCommand)),
	)

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	req.Header.Add("Authorization", "Bearer "+redoxAuth.AccessToken)
	req.Header.Add("Content-type", "application/json")

	client := urlfetch.Client(h.Context)
	resp, err := client.Do(req)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	responseBody := string(responseBodyBytes)

	datastore.Put(
		h.Context,
		datastore.NewKey(h.Context, "RedoxRequestLog", "", 0, nil),
		&RedoxRequestLog{
			RedoxCommand: sanitize(redoxCommand),
			Response:     sanitize(responseBody),
			Timestamp:    timestamp,
			Username:     username,
		},
	)

	return responseBody, http.StatusOK
}

func signup(h HandlerArgs) (interface{}, int) {
	signup := getSignupFromRequest(h)

	email, err := getEmail(signup["email"].(string))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	jsonSignup, _ := json.Marshal(signup)

	resource := ""
	method := methods.POST
	useridKey := "signup-userid-" + email

	if item, err := memcache.Get(h.Context, useridKey); err != memcache.ErrCacheMiss {
		resource = "/" + string(item.Value)
		method = methods.PUT
	}

	req, err := http.NewRequest(
		method,
		"https://cyph.prefinery.com/api/v2/betas/9034/testers"+resource+".json?api_key="+prefineryKey,
		bytes.NewBuffer(jsonSignup),
	)

	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	req.Header.Add("Accept", "application/json")
	req.Header.Add("Content-type", "application/json")

	client := urlfetch.Client(h.Context)
	resp, err := client.Do(req)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	jsonBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	var body map[string]interface{}
	err = json.Unmarshal(jsonBody, &body)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

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

	return "signup failed", http.StatusInternalServerError
}
