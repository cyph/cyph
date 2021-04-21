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
	"strings"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/buu700/braintree-go-tmp"
	"github.com/stripe/stripe-go"
	stripeSessionAPI "github.com/stripe/stripe-go/checkout/session"
	stripeSubscriptionAPI "github.com/stripe/stripe-go/sub"
	"google.golang.org/api/iterator"
)

func main() {
	handleFuncs("/accountstanding/{userToken}", false, Handlers{methods.GET: isAccountInGoodStanding})
	handleFuncs("/analytics/*", false, Handlers{methods.GET: analytics, methods.POST: analytics})
	handleFuncs("/braintreetoken", false, Handlers{methods.GET: braintreeToken})
	handleFuncs("/channels/{id}", false, Handlers{methods.DELETE: channelDelete, methods.POST: channelSetup})
	handleFuncs("/checkout", false, Handlers{methods.POST: checkout})
	handleFuncs("/continent", false, Handlers{methods.GET: getContinent})
	handleFuncs("/downgradeaccount/{userToken}", false, Handlers{methods.GET: downgradeAccount})
	handleFuncs("/geolocation/{language}", false, Handlers{methods.GET: getGeolocation})
	handleFuncs("/iceservers", false, Handlers{methods.GET: getIceServers})
	handleFuncs("/package/*", false, Handlers{methods.GET: getPackage})
	handleFuncs("/packagetimestamp/*", false, Handlers{methods.GET: getPackageTimestamp})
	handleFuncs("/preauth/{id}", false, Handlers{methods.POST: preAuth})
	handleFuncs("/pro/unlock", false, Handlers{methods.POST: proUnlock})
	handleFuncs("/redox/apikey/delete", false, Handlers{methods.POST: redoxDeleteAPIKey})
	handleFuncs("/redox/apikey/generate", false, Handlers{methods.POST: redoxGenerateAPIKey})
	handleFuncs("/redox/apikey/verify", false, Handlers{methods.POST: redoxVerifyAPIKey})
	handleFuncs("/redox/credentials", false, Handlers{methods.PUT: redoxAddCredentials})
	handleFuncs("/redox/execute", false, Handlers{methods.POST: redoxRunCommand})
	handleFuncs("/signups", false, Handlers{methods.PUT: signUp})
	handleFuncs("/stripesession", false, Handlers{methods.POST: stripeSession})
	handleFuncs("/timestamp", false, Handlers{methods.GET: getTimestampHandler})
	handleFuncs("/waitlist/invite", true, Handlers{methods.GET: rollOutWaitlistInvites})
	handleFuncs("/warmupcloudfunctions", true, Handlers{methods.GET: warmUpCloudFunctions})
	handleFuncs("/whatismyip", false, Handlers{methods.GET: whatismyip})

	handleFunc("/", false, func(h HandlerArgs) (interface{}, int) {
		return "Welcome to Cyph, lad", http.StatusOK
	})

	stripe.Key = stripeSecretKey

	port := os.Getenv("PORT")
	if port == "" {
		port = "443"
	}
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), nil))

	checkAllIPFSGateways(false)
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
	req.URL.Path = req.URL.Path[10:]
	req.URL.Scheme = "https"

	resp, err := client.Do(req)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	return resp.Body, resp.StatusCode
}

func braintreeToken(h HandlerArgs) (interface{}, int) {
	token, err := braintreeInit(h).ClientToken().Generate(h.Context)

	if err == nil {
		return token, http.StatusOK
	}

	return braintreeToken(h)
}

func channelDelete(h HandlerArgs) (interface{}, int) {
	id := sanitize(h.Vars["id"])

	if !isValidCyphID(id) {
		return "invalid ID", http.StatusForbidden
	}

	burnerChannelKey := datastoreKey("BurnerChannel", id)

	emptyBurnerChannel := &BurnerChannel{
		ChannelID: "",
		ID:        id,
		Timestamp: 0,
	}

	for {
		_, err := h.Datastore.Put(h.Context, burnerChannelKey, emptyBurnerChannel)

		if err == nil {
			break
		}
	}

	return "", http.StatusOK
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

	now := getTimestamp()
	preAuthorizedCyph := &PreAuthorizedCyph{}
	preAuthorizedCyphKey := datastoreKey("PreAuthorizedCyph", id)

	err := h.Datastore.Get(h.Context, preAuthorizedCyphKey, preAuthorizedCyph)

	/* Discard pre-authorization after two days */
	if err == nil && now-preAuthorizedCyph.Timestamp > 172800000 {
		h.Datastore.Delete(h.Context, preAuthorizedCyphKey)
		return "pre-authorization expired", http.StatusForbidden
	}

	channelID := ""
	status := http.StatusOK

	for {
		_, transactionErr := h.Datastore.RunInTransaction(h.Context, func(datastoreTransaction *datastore.Transaction) error {
			burnerChannel := &BurnerChannel{}
			burnerChannelKey := datastoreKey("BurnerChannel", id)

			datastoreTransaction.Get(burnerChannelKey, burnerChannel)

			if now-burnerChannel.Timestamp > config.BurnerChannelExpiration {
				burnerChannel = &BurnerChannel{}
			}

			if burnerChannel.ID != "" {
				datastoreTransaction.Delete(preAuthorizedCyphKey)

				if now-burnerChannel.Timestamp < config.NewCyphTimeout {
					channelID = burnerChannel.ChannelID
				}

				burnerChannel.ChannelID = ""
				burnerChannel.Timestamp = 0

				/*
					For now, clear out channel data in channelDelete instead

					if _, err := datastoreTransaction.Put(burnerChannelKey, burnerChannel); err != nil {
						datastoreTransaction.Rollback()
						return err
					}
				*/
			} else {
				channelID = sanitize(h.Request.FormValue("channelID"))

				if len(channelID) > config.MaxChannelDescriptorLength {
					channelID = ""
				}

				if channelID != "" {
					burnerChannel.ChannelID = channelID
					burnerChannel.ID = id
					burnerChannel.Timestamp = now

					if _, err := datastoreTransaction.Put(burnerChannelKey, burnerChannel); err != nil {
						datastoreTransaction.Rollback()
						return err
					}
				}
			}

			return nil
		})

		if transactionErr == nil {
			break
		}
	}

	if channelID == "" {
		status = http.StatusNotFound
	}

	return channelID, status
}

func checkout(h HandlerArgs) (interface{}, int) {
	appStoreReceipt := sanitize(h.Request.PostFormValue("appStoreReceipt"))
	bitPayInvoiceID := sanitize(h.Request.PostFormValue("bitPayInvoiceID"))
	company := sanitize(h.Request.PostFormValue("company"))
	countryCode := sanitize(h.Request.PostFormValue("countryCode"))
	firstName := sanitize(h.Request.PostFormValue("firstName"))
	inviteCode := sanitize(h.Request.PostFormValue("inviteCode"))
	lastName := sanitize(h.Request.PostFormValue("lastName"))
	partnerTransactionID := sanitize(h.Request.PostFormValue("partnerTransactionID"))
	postalCode := sanitize(h.Request.PostFormValue("postalCode"))
	recaptchaResponse := sanitize(h.Request.PostFormValue("recaptchaResponse"))
	streetAddress := sanitize(h.Request.PostFormValue("streetAddress"))
	userToken := sanitize(h.Request.PostFormValue("userToken"))
	timestamp := getTimestamp()

	email := ""
	if appStoreReceipt == "" && bitPayInvoiceID == "" {
		_email, err := getEmail(h.Request.PostFormValue("email"))
		if err != nil {
			return err.Error(), http.StatusBadRequest
		}
		email = _email
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

	username := ""
	if userToken != "" {
		username, _ = getUsername(userToken)
		if username == "" {
			return "invalid or expired token", http.StatusBadRequest
		}
	}

	txLog := ""

	var apiKey string
	var customerKey *datastore.Key
	var customerEmailKey *datastore.Key
	customerRequestEmail := email

	if email != "" {
		customerEmail := &CustomerEmail{}
		customerEmailKey = datastoreKey("CustomerEmail", email)

		if err = h.Datastore.Get(h.Context, customerEmailKey, customerEmail); err == nil {
			apiKey = customerEmail.APIKey
			customerKey = datastoreKey("Customer", apiKey)
		}
	} else {
		customerRequestEmail = "emailless-checkout@cyph.com"
	}

	if apiKey == "" {
		apiKey, customerKey, err = generateAPIKey(h, "Customer")
		if err != nil {
			return err.Error(), http.StatusInternalServerError
		}
		txLog += "\nAPI key: " + apiKey
	}

	nonce := sanitize(h.Request.PostFormValue("nonce"))

	if appStoreReceipt == "" && bitPayInvoiceID == "" && nonce == "" {
		return "invalid payment information", http.StatusBadRequest
	}

	planID := ""
	if category, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("category")), 10, 64); err == nil {
		if item, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("item")), 10, 64); err == nil {
			planID = strconv.FormatInt(category, 10) + "-" + strconv.FormatInt(item, 10)
		}
	}
	plan, hasPlan := plans[planID]
	if !hasPlan {
		return "invalid plan", http.StatusTeapot
	}

	amountString := sanitize(h.Request.PostFormValue("amount"))
	amount, err := strconv.ParseInt(amountString, 10, 64)
	if err != nil {
		return err.Error(), http.StatusTeapot
	}
	if amount < 100 {
		return "invalid amount", http.StatusTeapot
	}

	subscription := plan.SubscriptionType != ""

	subscriptionCountString := sanitize(h.Request.PostFormValue("subscriptionCount"))
	subscriptionCount, err := strconv.ParseInt(subscriptionCountString, 10, 64)
	if err != nil {
		return err.Error(), http.StatusTeapot
	}
	if subscriptionCount < 0 || (subscription && subscriptionCount < 1) {
		return "invalid subscription count", http.StatusTeapot
	}

	totalAmount := amount
	if subscription {
		totalAmount = amount * subscriptionCount
	}

	bt := braintreeInit(h)

	partnerOrderID := ""
	braintreeIDs := []string{}
	braintreeSubscriptionIDs := []string{}
	success := true

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

	var braintreeCustomer *braintree.Customer

	if nonce != "" {
		paymentMethodNonce, err := bt.PaymentMethodNonce().Find(h.Context, nonce)

		if err != nil {
			return "Invalid payment nonce", http.StatusTeapot
		}

		if paymentMethodNonce.Type == "CreditCard" {
			if postalCode == "" {
				return "Postal code required", http.StatusTeapot
			}

			if !verifyRecaptchaResponse(recaptchaResponse) {
				return "reCAPTCHA verification failed", http.StatusTeapot
			}
		}

		braintreeCustomer, err = bt.Customer().Create(h.Context, &braintree.CustomerRequest{
			Company:   company,
			Email:     customerRequestEmail,
			FirstName: firstName,
			LastName:  lastName,
		})

		if err != nil {
			return err.Error(), http.StatusTeapot
		}
	}

	if subscription {
		if appStoreReceipt == "" {
			verifyCard := true

			paymentMethod, err := bt.PaymentMethod().Create(h.Context, &braintree.PaymentMethodRequest{
				BillingAddress: billingAddress,
				CardholderName: name,
				CustomerId:     braintreeCustomer.Id,
				Options: &braintree.PaymentMethodRequestOptions{
					VerifyCard: &verifyCard,
				},
				PaymentMethodNonce: nonce,
			})

			if err != nil {
				return err.Error(), http.StatusTeapot
			}

			btPlan, err := bt.Plan().Find(h.Context, planID)

			if err != nil {
				return err.Error(), http.StatusTeapot
			}

			price := braintreeDecimalToCents(btPlan.Price)
			priceDelta := amount - price

			priceDeltaFloor := int64(0)
			if partnerTransactionID != "" {
				priceDeltaFloor = -price * config.PartnerDiscountRate / 100
			}

			if priceDelta < priceDeltaFloor {
				return "insufficient payment", http.StatusTeapot
			}

			txLog += "\nCustomer ID: " + braintreeCustomer.Id

			type SubscriptionResult struct {
				BraintreeID             string
				BraintreeSubscriptionID string
				Error                   error
				Log                     string
				SuccessStatus           bool
			}

			subscriptionResults := make(chan SubscriptionResult, subscriptionCount)

			/* De-parallelized to work around "Too Many Requests (429)" error */
			go func() {
				for i := 0; i < int(subscriptionCount); i++ {
					subscriptionRequest := &braintree.SubscriptionRequest{
						Id:                 generateRandomID(),
						PaymentMethodToken: paymentMethod.GetToken(),
						PlanId:             planID,
					}

					if priceDelta > 0 {
						subscriptionRequest.AddOns = &braintree.ModificationsRequest{
							Add: []braintree.AddModificationRequest{
								braintree.AddModificationRequest{
									InheritedFromID: "addon",
									ModificationRequest: braintree.ModificationRequest{
										Amount:       braintree.NewDecimal(priceDelta, 2),
										NeverExpires: true,
									},
								},
							},
						}
					} else if priceDelta < 0 {
						subscriptionRequest.Discounts = &braintree.ModificationsRequest{
							Add: []braintree.AddModificationRequest{
								braintree.AddModificationRequest{
									InheritedFromID: "discount",
									ModificationRequest: braintree.ModificationRequest{
										Amount:       braintree.NewDecimal(priceDelta*-1, 2),
										NeverExpires: true,
									},
								},
							},
						}
					}

					tx, err := bt.Subscription().Create(h.Context, subscriptionRequest)

					if err != nil {
						subscriptionResults <- SubscriptionResult{Error: err}
						return
					}

					successStatus := tx.Status == braintree.SubscriptionStatusActive
					log := "\nSubscription " + string(tx.Status)

					if successStatus {
						subscriptionResults <- SubscriptionResult{
							BraintreeID:             braintreeCustomer.Id,
							BraintreeSubscriptionID: tx.Id,
							Log:                     log,
							SuccessStatus:           true,
						}
					} else {
						subscriptionResults <- SubscriptionResult{
							Log:           log,
							SuccessStatus: false,
						}
					}
				}
			}()

			for i := 0; i < int(subscriptionCount); i++ {
				subscriptionResult := <-subscriptionResults

				if subscriptionResult.Error != nil {
					return subscriptionResult.Error.Error(), http.StatusTeapot
				}

				txLog += subscriptionResult.Log

				if subscriptionResult.SuccessStatus {
					braintreeIDs = append(braintreeIDs, subscriptionResult.BraintreeID)
					braintreeSubscriptionIDs = append(
						braintreeSubscriptionIDs,
						subscriptionResult.BraintreeSubscriptionID,
					)
				} else {
					success = false
				}
			}

			partnerOrderID = braintreeSubscriptionIDs[0]
		} else {
			txLog += "\nApp Store Receipt: " + appStoreReceipt

			appStorePlanID, err := getAppStoreTransactionData(appStoreReceipt)

			if err == nil && appStorePlanID == planID {
				success = true
				partnerOrderID = appStoreReceipt
			} else {
				success = false
				if err != nil {
					txLog += "\n\nERROR: " + err.Error()
				}
			}
		}

		if success {
			braintreeID := ""
			if len(braintreeIDs) > 0 {
				braintreeID = braintreeIDs[0]
			}

			_, err := h.Datastore.Put(
				h.Context,
				customerKey,
				&Customer{
					APIKey:          apiKey,
					AppStoreReceipt: appStoreReceipt,
					BraintreeID:     braintreeID,
					Company:         company,
					Email:           email,
					Name:            name,
					Namespace:       namespace,
					SignupURL:       signupURL,
					Timestamp:       timestamp,
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
		if plan.Price > amount {
			return "insufficient payment", http.StatusTeapot
		}

		if appStoreReceipt != "" {
			return "in-app payments for subscriptions only", http.StatusTeapot
		}

		if bitPayInvoiceID == "" {
			tx, err := bt.Transaction().Create(h.Context, &braintree.TransactionRequest{
				Amount:             braintree.NewDecimal(amount, 2),
				BillingAddress:     billingAddress,
				CustomerID:         braintreeCustomer.Id,
				PaymentMethodNonce: nonce,
				Type:               "sale",
			})

			if err != nil {
				return err.Error(), http.StatusTeapot
			}

			partnerOrderID = tx.Id

			bt.Transaction().SubmitForSettlement(h.Context, tx.Id)

			success = tx.Status == "authorized"
			txJSON, _ := json.Marshal(tx)
			txLog += string(txJSON)
		} else {
			partnerOrderID = bitPayInvoiceID

			invoice, err := getBitPayInvoice(bitPayInvoiceID)

			if err != nil {
				return err.Error(), http.StatusTeapot
			}

			price := int64(0)
			invoicePriceDynamic, _ := invoice["price"]
			switch invoicePrice := invoicePriceDynamic.(type) {
			case float64:
				price = int64(invoicePrice)
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

		if success && customerEmailKey != nil {
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

	subjectExtra := email
	if appStoreReceipt != "" {
		subjectExtra = "iOS"
	} else if bitPayInvoiceID != "" {
		subjectExtra = "BitPay"
	}

	subject := "SALE: " + name + " <" + subjectExtra + ">, $" + strconv.FormatInt(totalAmount/100, 10)
	if !isProd {
		subject = "[sandbox] " + subject
	}
	if !success {
		subject = "FAILED: " + subject
	}

	if success && partnerTransactionID != "" {
		err = trackPartnerConversion(h, partnerOrderID, partnerTransactionID, totalAmount)
		if err != nil {
			subject = "PARTNER CONVERSION FAILURE: " + subject
		}
	}

	sendMail("hello+sales-notifications@cyph.com", subject, ("" +
		"Nonce: " + nonce +
		"\nPlan ID: " + planID +
		"\nAmount: " + amountString +
		"\nInvite Code: " + inviteCode +
		"\nSubscription: " + plan.SubscriptionType +
		"\nSubscription count: " + subscriptionCountString +
		"\nCompany: " + company +
		"\nName: " + name +
		"\nEmail: " + email +
		"\nPartner transaction ID: " + partnerTransactionID +
		"\n\n" + txLog +
		""), "")

	if success && plan.AccountsPlan != "" {
		_inviteCode, oldBraintreeSubscriptionID, welcomeLetter, err := generateInvite(email, name, plan.AccountsPlan, appStoreReceipt, braintreeIDs, braintreeSubscriptionIDs, []string{}, inviteCode, username, plan.GiftPack, true, false)

		inviteCode := _inviteCode

		if err != nil {
			sendMail("hello+sales-invite-failure@cyph.com", "INVITE FAILED: "+subject, ("" +
				"Nonce: " + nonce +
				"\nPlan ID: " + planID +
				"\nAmount: " + amountString +
				"\nInvite Code: " + inviteCode +
				"\nSubscription: " + plan.SubscriptionType +
				"\nSubscription count: " + subscriptionCountString +
				"\nCompany: " + company +
				"\nName: " + name +
				"\nEmail: " + email +
				"\nAccounts Plan: " + plan.AccountsPlan +
				"\nCustomer IDs: " + strings.Join(braintreeIDs, ", ") +
				"\nSubscription IDs: " + strings.Join(braintreeSubscriptionIDs, ", ") +
				"\nApp Store Receipt: " + appStoreReceipt +
				"\n\n" + txLog +
				""), "")
		}

		if oldBraintreeSubscriptionID != "" {
			bt.Subscription().Cancel(h.Context, oldBraintreeSubscriptionID)
		}

		if appStoreReceipt != "" {
			return inviteCode, http.StatusOK
		}

		return welcomeLetter, http.StatusOK
	}

	if !success {
		return "", http.StatusInternalServerError
	}

	if subscription {
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

func downgradeAccount(h HandlerArgs) (interface{}, int) {
	userToken := sanitize(h.Vars["userToken"])

	appStoreReceipt, braintreeSubscriptionID, stripeData, _ := downgradeAccountHelper(
		userToken,
		false,
	)

	if appStoreReceipt != "" {
		_, err := getAppStoreTransactionData(appStoreReceipt)

		if err != nil {
			downgradeAccountHelper(userToken, true)
			return false, http.StatusOK
		}

		return "cannot cancel App Store subscription server-side", http.StatusInternalServerError
	}

	if stripeData != nil {
		_, err := stripeSubscriptionAPI.Cancel(stripeData.SubscriptionID, nil)
		if err != nil {
			return err.Error(), http.StatusInternalServerError
		}
	}

	if braintreeSubscriptionID == "" {
		return false, http.StatusOK
	}

	bt := braintreeInit(h)

	_, err := bt.Subscription().Cancel(h.Context, braintreeSubscriptionID)
	if err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	return true, http.StatusOK
}

func getContinent(h HandlerArgs) (interface{}, int) {
	_, continentCode, _, _, _, _, _, _ := geolocate(h)
	return continentCode, http.StatusOK
}

func getGeolocation(h HandlerArgs) (interface{}, int) {
	// continent, continentCode, country, countryCode, city, postalCode, analID, firebaseRegion := geolocate(h)
	_, _, _, countryCode, _, _, analID, firebaseRegion := geolocate(h)
	// org := getOrg(h)

	/* Return fields on an as-needed basis to avoid unnecessarily scaring users */
	return map[string]string{
		"analID": analID,
		// "city":          city,
		// "continent":     continent,
		// "continentCode": continentCode,
		// "country":       country,
		"countryCode":    countryCode,
		"firebaseRegion": firebaseRegion,
		// "org":           org,
		// "postalCode":    postalCode,
	}, http.StatusOK
}

func getIceServers(h HandlerArgs) (interface{}, int) {
	return getTwilioToken(h)["ice_servers"], http.StatusOK
}

func getPackage(h HandlerArgs) (interface{}, int) {
	packageName := h.Request.URL.Path[9:]
	packageData, ok := packages[packageName]

	if !ok {
		return "package not found", http.StatusBadRequest
	}

	_, continentCode, _, _, _, _, _, _ := geolocate(h)

	return map[string]interface{}{
		"gateways":  getIPFSGateways(continentCode),
		"package":   packageData.Package,
		"timestamp": packageData.Timestamp,
	}, http.StatusOK
}

func getPackageTimestamp(h HandlerArgs) (interface{}, int) {
	packageName := h.Request.URL.Path[18:]
	packageData, ok := packages[packageName]

	if !ok {
		return "package not found", http.StatusBadRequest
	}

	return packageData.Timestamp, http.StatusOK
}

func getTimestampHandler(h HandlerArgs) (interface{}, int) {
	return strconv.FormatInt(getTimestamp(), 10), http.StatusOK
}

func isAccountInGoodStanding(h HandlerArgs) (interface{}, int) {
	userToken := sanitize(h.Vars["userToken"])

	appStoreReceipt, braintreeSubscriptionID, planTrialEnd, stripeData, _ := getSubscriptionData(userToken)

	/* Check trial against current timestamp if applicable */

	if planTrialEnd != 0 {
		return planTrialEnd > getTimestamp(), http.StatusOK
	}

	/* Check App Store receipt, if applicable */

	if appStoreReceipt != "" {
		_, err := getAppStoreTransactionData(appStoreReceipt)
		return err == nil, http.StatusOK
	}

	/* Check Stripe, if applicable */

	if stripeData != nil {
		stripeSub, err := stripeSubscriptionAPI.Get(stripeData.SubscriptionID, nil)
		if err != nil {
			return true, http.StatusOK
		}

		if stripeSub.Status == "active" {
			return true, http.StatusOK
		}

		return false, http.StatusOK
	}

	/*
		If no subscription ID, assume free or lifetime plan.

		In error cases, err on the side of false negatives
		rather than false positives.
	*/

	if braintreeSubscriptionID == "" {
		return true, http.StatusOK
	}

	bt := braintreeInit(h)

	btSub, err := bt.Subscription().Find(h.Context, braintreeSubscriptionID)
	if err != nil {
		return true, http.StatusOK
	}

	if btSub.Status == braintree.SubscriptionStatusActive || btSub.Status == braintree.SubscriptionStatusPending {
		return true, http.StatusOK
	}

	return false, http.StatusOK
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

	customer.LastSession = time.Now().UnixNano() / 1e6
	customer.SessionCount++

	_, err = h.Datastore.PutMulti(
		h.Context,
		[]*datastore.Key{
			customerKey,
			datastoreKey("PreAuthorizedCyph", id),
		},
		[]interface{}{
			customer,
			&PreAuthorizedCyph{
				ID:        id,
				Timestamp: customer.LastSession,
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

func rollOutWaitlistInvites(h HandlerArgs) (interface{}, int) {
	it := h.Datastore.Run(
		h.Context,
		datastoreQuery("BetaSignup").Filter("Invited =", false),
	)

	invitedKeys := []*datastore.Key{}
	invitedItems := []*BetaSignup{}

	for {
		var betaSignup BetaSignup
		_, err := it.Next(&betaSignup)
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("Error fetching next item in rollOutWaitlistInvites: %v", err)
			break
		}

		_, _, _, err = generateInvite(betaSignup.Email, betaSignup.Name, "", "", []string{""}, []string{""}, []string{}, "", "", false, false, false)

		if err != nil {
			log.Printf("Failed to invite %s in rollOutWaitlistInvites: %v", betaSignup.Email, err)
			break
		}

		betaSignup.Invited = true

		invitedKeys = append(invitedKeys, datastoreKey("BetaSignup", betaSignup.Email))
		invitedItems = append(invitedItems, &betaSignup)
	}

	_, err := h.Datastore.PutMulti(h.Context, invitedKeys, invitedItems)

	if err != nil {
		log.Printf("Failed to invites in rollOutWaitlistInvites: %v", err)
	}

	return "", http.StatusOK
}

func signUp(h HandlerArgs) (interface{}, int) {
	betaSignup, signup := getSignupFromRequest(h)

	_, err := getEmail(signup["email"].(string))
	if err != nil {
		return err.Error(), http.StatusBadRequest
	}

	response := "set"

	betaSignupKey := datastoreKey("BetaSignup", betaSignup.Email)
	existingBetaSignup := new(BetaSignup)
	if err := h.Datastore.Get(h.Context, betaSignupKey, existingBetaSignup); err == nil {
		response = "update"

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
		"<p>If you have any questions, comments, or concerns, please email <a href=\"mailto:support@cyph.com\">support@cyph.com</a>.</p>"+
		"")

	return response, http.StatusOK
}

/* TODO: Factor out common logic with checkout */
func stripeSession(h HandlerArgs) (interface{}, int) {
	partnerTransactionID := sanitize(h.Request.PostFormValue("partnerTransactionID"))
	userToken := sanitize(h.Request.PostFormValue("userToken"))

	/*
		timestamp := getTimestamp()

		url, err := getURL(h.Request.PostFormValue("url"))
		if err != nil {
			return err.Error(), http.StatusBadRequest
		}

		namespace, err := getNamespace(h.Request.PostFormValue("namespace"))
		if err != nil {
			return err.Error(), http.StatusBadRequest
		}
	*/

	username := ""
	if userToken != "" {
		username, _ = getUsername(userToken)
		if username == "" {
			return "invalid or expired token", http.StatusBadRequest
		}
	}

	planID := ""
	if category, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("category")), 10, 64); err == nil {
		if item, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("item")), 10, 64); err == nil {
			planID = strconv.FormatInt(category, 10) + "-" + strconv.FormatInt(item, 10)
		}
	}
	plan, hasPlan := plans[planID]
	if !hasPlan {
		return "invalid plan", http.StatusTeapot
	}

	amountString := sanitize(h.Request.PostFormValue("amount"))
	amount, err := strconv.ParseInt(amountString, 10, 64)
	if err != nil {
		return err.Error(), http.StatusTeapot
	}
	if amount < 100 {
		return "invalid amount", http.StatusTeapot
	}

	interval := ""
	if plan.SubscriptionType == "monthly" {
		interval = "month"
	} else if plan.SubscriptionType == "annual" {
		interval = "year"
	}

	mode := stripe.CheckoutSessionModePayment
	var recurring *stripe.CheckoutSessionLineItemPriceDataRecurringParams

	if interval != "" {
		mode = stripe.CheckoutSessionModeSubscription
		recurring = &stripe.CheckoutSessionLineItemPriceDataRecurringParams{
			Interval: stripe.String(interval),
		}
	}

	price := plan.Price
	priceDelta := amount - price

	priceDeltaFloor := int64(0)
	if partnerTransactionID != "" {
		priceDeltaFloor = -price * config.PartnerDiscountRate / 100
	}

	if priceDelta < priceDeltaFloor {
		return "insufficient payment", http.StatusTeapot
	}

	adjustableQuantity := &stripe.CheckoutSessionLineItemAdjustableQuantityParams{
		Enabled: stripe.Bool(true),
	}
	quantity := stripe.Int64(1)
	if plan.MaxUsers > 0 {
		adjustableQuantity.Maximum = stripe.Int64(plan.MaxUsers)
	}
	if plan.MinUsers > 0 {
		adjustableQuantity.Minimum = stripe.Int64(plan.MinUsers)
		quantity = adjustableQuantity.Minimum
	}

	params := &stripe.CheckoutSessionParams{
		CancelURL: stripe.String(websiteURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			&stripe.CheckoutSessionLineItemParams{
				AdjustableQuantity: adjustableQuantity,
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String(string(stripe.CurrencyUSD)),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String("Cyph " + plan.Name),
					},
					Recurring:  recurring,
					UnitAmount: stripe.Int64(amount),
				},
				Quantity: quantity,
			},
		},
		Mode: stripe.String(string(mode)),
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		SuccessURL: stripe.String(websiteURL + "/checkout/success"),
	}

	session, err := stripeSessionAPI.New(params)
	if err != nil {
		log.Printf("stripeSessionAPI.New: %v", err)
		return err.Error(), http.StatusInternalServerError
	}

	return session.ID, http.StatusOK
}

func warmUpCloudFunctions(h HandlerArgs) (interface{}, int) {
	resultCount := len(config.FirebaseRegions) * len(config.FirebaseProjects)

	results := make(chan int, resultCount)

	for i := range config.FirebaseRegions {
		region := config.FirebaseRegions[i]

		for j := range config.FirebaseProjects {
			project := config.FirebaseProjects[j]

			go func() {
				for k := range config.CloudFunctionRoutes {
					route := config.CloudFunctionRoutes[k]

					client := &http.Client{}

					req, _ := http.NewRequest(
						methods.POST,
						"https://"+region+"-"+project+".cloudfunctions.net/"+route,
						bytes.NewBuffer([]byte("")),
					)

					req.Header.Add("X-Warmup-Ping", "true")

					client.Do(req)
				}

				results <- 0
			}()
		}
	}

	for i := 0; i < resultCount; i++ {
		<-results
	}

	return "", http.StatusOK
}

func whatismyip(h HandlerArgs) (interface{}, int) {
	return getIPString(h), http.StatusOK
}
