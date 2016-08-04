package api

import (
	"appengine/mail"
	"appengine/memcache"
	"appengine/urlfetch"
	"bytes"
	"encoding/json"
	"github.com/lionelbarrow/braintree-go"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func init() {
	handleFuncs("/braintree", Handlers{methods.GET: braintreeToken, methods.POST: braintreeCheckout})
	handleFuncs("/channels/{id}", Handlers{methods.POST: channelSetup})
	handleFuncs("/continent", Handlers{methods.GET: getContinent})
	handleFuncs("/iceservers", Handlers{methods.GET: getIceServers})
	handleFuncs("/signups", Handlers{methods.PUT: signup})

	handleFunc("/", func(h HandlerArgs) (interface{}, int) {
		return "Welcome to Cyph, lad", http.StatusOK
	})
}

func braintreeCheckout(h HandlerArgs) (interface{}, int) {
	nonce := sanitize(h.Request.PostFormValue("Nonce"))

	planId := ""
	if category, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("Category")), 10, 64); err == nil {
		if item, err := strconv.ParseInt(sanitize(h.Request.PostFormValue("Item")), 10, 64); err == nil {
			planId = strconv.FormatInt(category, 10) + "-" + strconv.FormatInt(item, 10)
		}
	}

	amountString := sanitize(h.Request.PostFormValue("Amount"))
	amount, err := strconv.ParseInt(amountString, 10, 64)
	if err != nil {
		return err.Error(), http.StatusTeapot
	}

	bt := braintreeInit(h)

	tx, err := bt.Transaction().Create(&braintree.Transaction{
		Type:               "sale",
		Amount:             braintree.NewDecimal(amount, 2),
		PaymentMethodNonce: nonce,
	})

	if err != nil {
		return err.Error(), http.StatusTeapot
	}

	bt.Transaction().SubmitForSettlement(tx.Id)

	txJson, _ := json.Marshal(tx)

	mail.SendToAdmins(h.Context, &mail.Message{
		Sender:  "Cyph Sales <hello@cyph.com>",
		Subject: "SALE SALE SALE",
		Body: ("" +
			string(txJson) +
			"\n\nNonce: " + nonce +
			"\n\nPlan ID: " + planId +
			"\n\nAmount: " + amountString +
			"\n\nName: " + sanitize(h.Request.PostFormValue("Name")) +
			"\n\nEmail: " + sanitize(h.Request.PostFormValue("Email")) +
			""),
	})

	return tx, http.StatusOK
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
	if org == "Facebook" { // || org == "Google Cloud" {
		return "", http.StatusNotFound
	}

	id := h.Vars["id"]
	channelDescriptor := ""
	status := http.StatusOK

	if len(id) == config.AllowedCyphIdLength && config.AllowedCyphIds.MatchString(id) {
		if item, err := memcache.Get(h.Context, id); err != memcache.ErrCacheMiss {
			oldValue := item.Value
			item.Value = []byte{}

			if err := memcache.CompareAndSwap(h.Context, item); err != memcache.ErrCASConflict {
				valueLines := strings.Split(string(oldValue), "\n")
				timestamp, _ := strconv.ParseInt(valueLines[0], 10, 64)

				if time.Now().Unix()-timestamp < config.NewCyphTimeout {
					channelDescriptor = valueLines[1]
				}
			}
		} else {
			channelDescriptor = h.Request.FormValue("channelDescriptor")

			if len(channelDescriptor) > config.MaxChannelDescriptorLength {
				channelDescriptor = ""
			}

			if channelDescriptor != "" {
				memcache.Set(h.Context, &memcache.Item{
					Key:        id,
					Value:      []byte(strconv.FormatInt(time.Now().Unix(), 10) + "\n" + channelDescriptor),
					Expiration: config.MemcacheExpiration,
				})
			}
		}
	}

	if channelDescriptor == "" {
		status = http.StatusNotFound
	}

	return channelDescriptor, status
}

func getContinent(h HandlerArgs) (interface{}, int) {
	_, continent := geolocate(h)
	return continent, http.StatusOK
}

func getIceServers(h HandlerArgs) (interface{}, int) {
	return getTwilioToken(h)["ice_servers"], http.StatusOK
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

	return "fail", http.StatusInternalServerError
}
