package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/braintree-go/braintree-go"
)

func main() {
	handleFuncs("/analytics/*", Handlers{methods.GET: analytics})
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
	handleFuncs("/whatismyip", Handlers{methods.GET: whatismyip})

	handleFunc("/", func(h HandlerArgs) (interface{}, int) {
		return "Welcome to Cyph, lad", http.StatusOK
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "443"
	}
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), nil))
}

func analytics(h HandlerArgs) (interface{}, int) {
	client := &http.Client{}

	req, err := http.NewRequest(
		h.Request.Method,
		h.Request.URL.String(),
		h.Request.Body,
	)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	req.Header = h.Request.Header
	req.URL.Host = "www.google-analytics.com"
	req.URL.Scheme = "https"

	resp, err := client.Do(req)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	return resp.Body, resp.StatusCode
}

func braintreeCheckout(h HandlerArgs) (interface{}, int) {
	bitPayInvoiceID := sanitize(h.Request.PostFormValue("bitPayInvoiceID"))
	company := sanitize(h.Request.PostFormValue("company"))
	countryCode := sanitize(h.Request.PostFormValue("countryCode"))
	firstName := sanitize(h.Request.PostFormValue("firstName"))
	lastName := sanitize(h.Request.PostFormValue("lastName"))
	postalCode := sanitize(h.Request.PostFormValue("postalCode"))
	streetAddress := sanitize(h.Request.PostFormValue("streetAddress"))
	timestamp := getTimestamp()

	email, err := getEmail(h.Request.PostFormValue("email"))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	signupURL, err := getURL(h.Request.PostFormValue("url"))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	/* If checking out from the Cyph website, assume our Pro environment */
	if signupURL == "https://www.cyph.com" {
		signupURL = "https://cyph.pro"
	}

	namespace, err := getNamespace(h.Request.PostFormValue("namespace"))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	var apiKey string
	var customerKey *datastore.Key

	customerEmail := &CustomerEmail{}
	customerEmailKey := datastoreKey("CustomerEmail", email)

	if err = h.Datastore.Get(h.Context, customerEmailKey, customerEmail); err == nil {
		apiKey = customerEmail.APIKey
		customerKey = datastoreKey("Customer", apiKey)
	} else {
		apiKey, customerKey, err = generateAPIKey(h, "Customer")
		if err != nil {
			return err.Error(), http.StatusInternalServerError
		}
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

	braintreeID := ""
	txLog := ""
	success := false

	name := firstName
	if lastName != "" {
		name = name + " " + lastName
	}

	billingAddress := &braintree.Address{
		Company:           company,
		CountryCodeAlpha2: countryCode,
		FirstName:         firstName,
		LastName:          lastName,
		PostalCode:        postalCode,
		StreetAddress:     streetAddress,
	}

	if subscription {
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
				BillingAddress:     billingAddress,
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
			return errors.New("insufficient payment"), http.StatusTeapot
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

			braintreeID = braintreeCustomer.Id

			_, err := h.Datastore.Put(
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
				success = false
			}
		}

		if success {
			_, err = h.Datastore.Put(
				h.Context,
				datastoreKey("CustomerEmail", email),
				&CustomerEmail{
					APIKey: apiKey,
					Email:  email,
				},
			)

			if err != nil {
				txLog += "\n\nERROR: " + err.Error()
				success = false
			}
		}
	} else {
		if plan, hasPlan := config.Plans[planID]; hasPlan && plan.Price > amount {
			return errors.New("insufficient payment"), http.StatusTeapot
		}

		if bitPayInvoiceID == "" {
			tx, err := bt.Transaction().Create(h.Context, &braintree.TransactionRequest{
				Amount:             braintree.NewDecimal(amount, 2),
				BillingAddress:     billingAddress,
				PaymentMethodNonce: nonce,
				Type:               "sale",
			})

			if err != nil {
				return err.Error(), http.StatusTeapot
			}

			bt.Transaction().SubmitForSettlement(h.Context, tx.Id)

			success = tx.Status == "authorized"
			txJSON, _ := json.Marshal(tx)
			txLog += string(txJSON)
		} else {
			invoice, err := getBitPayInvoice(bitPayInvoiceID)

			if err != nil {
				return err.Error(), http.StatusTeapot
			}

			price := int64(0)
			invoicePriceDynamic, _ := invoice["price"]
			switch invoicePrice := invoicePriceDynamic.(type) {
			case int64:
				price = invoicePrice
			default:
				return "bad response from BitPay", http.StatusTeapot
			}

			/*
				Note: For now we'll deliver on "paid" status and handle it
				after the fact if a payment fails to confirm. This will be
				reconsidered if we ever sell something physical or otherwise
				unrecoverable.
			*/

			success =
				invoice["currency"] == "USD" &&
					(price*100) == amount &&
					(invoice["status"] == "complete" ||
						invoice["status"] == "confirmed" ||
						invoice["status"] == "paid")
		}

		if success {
			txLog += "\nAPI key: " + apiKey

			_, err = h.Datastore.Put(
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
				txLog += "\n\nERROR: " + err.Error()
				success = false
			}
		}

		if success {
			_, err = h.Datastore.Put(
				h.Context,
				customerEmailKey,
				&CustomerEmail{
					APIKey: apiKey,
					Email:  email,
				},
			)

			if err != nil {
				txLog += "\n\nERROR: " + err.Error()
				success = false
			}
		}
	}

	subject := "SALE SALE SALE"
	if !isProd {
		subject = "[sandbox] " + subject
	}
	if !success {
		subject = "FAILED: " + subject
	}

	sendMail("hello+sales-notifications@cyph.com", subject, ("" +
		"Nonce: " + nonce +
		"\nPlan ID: " + planID +
		"\nAmount: " + amountString +
		"\nSubscription: " + subscriptionString +
		"\nCompany: " + company +
		"\nName: " + name +
		"\nEmail: " + email +
		"\n\n" + txLog +
		""), "")

	if !success {
		return "", http.StatusInternalServerError
	}

	plan, hasPlan := config.Plans[planID]

	if hasPlan && plan.AccountsPlan != "" {
		welcomeLetter, err := generateInvite(email, name, plan.AccountsPlan, braintreeID, true)

		if err != nil {
			sendMail("hello+sales-invite-failure@cyph.com", "INVITE FAILED: "+subject, ("" +
				"Nonce: " + nonce +
				"\nPlan ID: " + planID +
				"\nAmount: " + amountString +
				"\nSubscription: " + subscriptionString +
				"\nCompany: " + company +
				"\nName: " + name +
				"\nEmail: " + email +
				"\nAccounts Plan: " + plan.AccountsPlan +
				"\n\n" + txLog +
				""), "")
		}

		return welcomeLetter, http.StatusOK
	}

	if subscription && hasPlan {
		sendMail(email, "Cyph Purchase Confirmation", "", ""+
			"<p>Welcome to Cyph "+name+", and thanks for signing up!</p>"+
			"<p style='text-align: left'>"+
			"Your access code is:&nbsp;&nbsp;"+
			"<a style='font-family: monospace; font-size: 16px' href='"+
			signupURL+"/unlock/"+apiKey+
			"'>"+
			apiKey+
			"</a>"+
			"</p>"+
			"")

		return "$APIKEY: " + apiKey, http.StatusOK
	}

	if planID == "10000-0" {
		sendMail(email, "Thank You!", "", ""+
			"<p>Thanks so much for your donation "+name+"!</p>"+
			"<p>"+
			"Your support means a lot to us, and helps ensure "+
			"that we're able to keep the lights on and continue "+
			"our work to protect user privacy."+
			"</p>"+
			"")
	} else {
		sendMail(email, "Cyph Purchase Confirmation", "", ""+
			"<p>Welcome to Cyph "+name+", and thanks for signing up!</p>"+
			"<p>We'll follow up as soon as we have an update on your order.</p>"+
			"")
	}

	return "", http.StatusOK
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
	preAuthorizedCyphKey := datastoreKey("PreAuthorizedCyph", id)

	err := h.Datastore.Get(h.Context, preAuthorizedCyphKey, preAuthorizedCyph)

	/* Discard pre-authorization after two days */
	if err == nil && now-preAuthorizedCyph.Timestamp > 172800000 {
		h.Datastore.Delete(h.Context, preAuthorizedCyphKey)
		return "pre-authorization expired", http.StatusForbidden
	}

	var preAuthorizedProFeatures map[string]bool
	json.Unmarshal(preAuthorizedCyph.ProFeatures, &preAuthorizedProFeatures)

	/* For now, disable pro feature check for non-API usage. */
	if proFeatures["api"] {
		for feature, isRequired := range proFeatures {
			if isRequired && !preAuthorizedProFeatures[feature] {
				return "pro feature " + feature + " not available", http.StatusForbidden
			}
		}
	}

	channelID := ""
	status := http.StatusOK

	_, transactionErr := h.Datastore.RunInTransaction(h.Context, func(tx *datastore.Transaction) error {
		burnerChannel := &BurnerChannel{}
		burnerChannelKey := datastoreKey("BurnerChannel", id)

		h.Datastore.Get(h.Context, burnerChannelKey, burnerChannel)

		if now-burnerChannel.Timestamp > config.BurnerChannelExpiration {
			burnerChannel = &BurnerChannel{}
		}

		if burnerChannel.ID != "" {
			h.Datastore.Delete(h.Context, preAuthorizedCyphKey)

			if now-burnerChannel.Timestamp < config.NewCyphTimeout {
				channelID = burnerChannel.ChannelID
			}

			burnerChannel.ChannelID = ""
			burnerChannel.Timestamp = 0

			if _, err := h.Datastore.Put(h.Context, burnerChannelKey, burnerChannel); err != nil {
				return err
			}
		} else {
			channelID = sanitize(h.Request.FormValue("channelID"))

			if len(channelID) > config.MaxChannelDescriptorLength {
				channelID = ""
			}

			if channelID != "" {
				burnerChannel.ChannelID = channelID
				burnerChannel.ID = id
				burnerChannel.Timestamp = now

				if _, err := h.Datastore.Put(h.Context, burnerChannelKey, burnerChannel); err != nil {
					return err
				}
			}
		}

		return nil
	})

	if transactionErr != nil {
		channelID = ""
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

	_, err = h.Datastore.PutMulti(
		h.Context,
		[]*datastore.Key{
			customerKey,
			datastoreKey("PreAuthorizedCyph", id),
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

	_, err = h.Datastore.Put(
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
	redoxCredentialsKey := datastoreKey("RedoxCredentials", apiKey)

	if err := h.Datastore.Get(h.Context, redoxCredentialsKey, redoxCredentials); err != nil {
		return "invalid API key", http.StatusNotFound
	}
	if redoxCredentials.MasterAPIKey != masterAPIKey {
		return "invalid master API key", http.StatusForbidden
	}

	if err := h.Datastore.Delete(h.Context, redoxCredentialsKey); err != nil {
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

	_, err = h.Datastore.Put(
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

	err := h.Datastore.Get(
		h.Context,
		datastore.NameKey(
			"RedoxCredentials",
			apiKeyOrMasterAPIKey,
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

	err := h.Datastore.Get(
		h.Context,
		datastore.NameKey(
			"RedoxCredentials",
			apiKeyOrMasterAPIKey,
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

		err := h.Datastore.Get(
			h.Context,
			datastore.NameKey(
				"RedoxCredentials",
				redoxCredentials.MasterAPIKey,
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
	redoxAuthKey := datastoreKey("RedoxAuth", redoxCredentials.RedoxAPIKey)

	err = h.Datastore.Get(h.Context, redoxAuthKey, redoxAuth)

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

		client := &http.Client{}
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

		h.Datastore.Put(h.Context, redoxAuthKey, redoxAuth)
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

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	responseBodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	responseBody := string(responseBodyBytes)

	h.Datastore.Put(
		h.Context,
		datastoreKey("RedoxRequestLog", ""),
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
	betaSignup, signup := getSignupFromRequest(h)

	_, err := getEmail(signup["email"].(string))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	betaSignupKey := datastoreKey("BetaSignup", betaSignup.Email)
	existingBetaSignup := new(BetaSignup)
	if err := h.Datastore.Get(h.Context, betaSignupKey, existingBetaSignup); err == nil {
		if existingBetaSignup.Comment != "" {
			betaSignup.Comment = existingBetaSignup.Comment
		}
		if existingBetaSignup.Country != "" {
			betaSignup.Country = existingBetaSignup.Country
		}
		if existingBetaSignup.Language != "" {
			betaSignup.Language = existingBetaSignup.Language
		}
		if existingBetaSignup.Name != "" {
			betaSignup.Name = existingBetaSignup.Name
		}
		if existingBetaSignup.PrefineryID != 0 {
			betaSignup.PrefineryID = existingBetaSignup.PrefineryID
		}
		if existingBetaSignup.Referer != "" {
			betaSignup.Referer = existingBetaSignup.Referer
		}
		if existingBetaSignup.Time != 0 {
			betaSignup.Time = existingBetaSignup.Time
		}
		if existingBetaSignup.UsernameRequest != "" {
			betaSignup.UsernameRequest = existingBetaSignup.UsernameRequest
		}
	}
	if _, err := h.Datastore.Put(h.Context, betaSignupKey, &betaSignup); err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	sendMail(betaSignup.Email, "Thanks for your interest in Cyph!", "", ""+
		"<p>Thank you! You've been added to the Cyph beta waitlist. We'll notify you when your invitation is ready.</p>"+
		"<p>There's no need to respond to this email, but you certainly can if you have any questions, comments or concerns.</p>"+
		"")

	jsonData := map[string]interface{}{}
	jsonData["tester"] = signup
	jsonSignup, _ := json.Marshal(jsonData)

	resource := ""
	method := methods.POST

	if betaSignup.PrefineryID != 0 {
		resource = "/" + string(betaSignup.PrefineryID)
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

	client := &http.Client{}
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
			return "update", http.StatusOK
		}

		betaSignup.PrefineryID = int(userid)
		if _, err := h.Datastore.Put(h.Context, betaSignupKey, &betaSignup); err != nil {
			return err.Error(), http.StatusInternalServerError
		}

		return "set", http.StatusOK
	}

	return "signup failed", http.StatusInternalServerError
}

func whatismyip(h HandlerArgs) (interface{}, int) {
	return getIPString(h), http.StatusOK
}
