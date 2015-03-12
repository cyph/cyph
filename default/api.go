package api

import (
	"appengine/datastore"
	"appengine/mail"
	"appengine/memcache"
	"encoding/json"
	"net/http"
	"strings"
)

func init() {
	handleFunc("/", root)
	handleFuncs("/betasignups", Handlers{methods.PUT: betaSignup})
	handleFuncs("/channels/{id}", Handlers{methods.POST: channelSetup})
	handleFuncs("/continent", Handlers{methods.GET: getContinent})
	handleFuncs("/errors", Handlers{methods.POST: logError})
	handleFuncs("/smperrors", Handlers{methods.POST: logSmpError})
	handleFuncs("/wserrors", Handlers{methods.POST: logWebSignError})
}

/*** Public API ***/

func betaSignup(h HandlerArgs) (interface{}, int) {
	isNewSignup := false

	betaSignup := getBetaSignupFromRequest(h)

	if strings.Contains(betaSignup.Email, "@") {
		key := datastore.NewKey(h.Context, "BetaSignup", betaSignup.Email, 0, nil)

		existingBetaSignup := new(BetaSignup)

		if err := datastore.Get(h.Context, key, existingBetaSignup); err == nil {
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
		} else {
			isNewSignup = true
		}

		if _, err := datastore.Put(h.Context, key, &betaSignup); err != nil {
			logError(h)
			return err.Error(), http.StatusInternalServerError
		}

		jsonBetaSignup, _ := json.Marshal(betaSignup)
		mail.SendToAdmins(h.Context, &mail.Message{
			Sender:  "test@cyphme.appspotmail.com",
			Subject: "NEW SIGNUP LADS",
			Body:    string(jsonBetaSignup),
		})
	}

	return isNewSignup, http.StatusOK
}

func channelSetup(h HandlerArgs) (interface{}, int) {
	id := h.Vars["id"]
	channelName := ""
	status := http.StatusOK

	if item, err := memcache.Get(h.Context, id); err != memcache.ErrCacheMiss {
		oldValue := item.Value
		item.Value = []byte{}

		if err := memcache.CompareAndSwap(h.Context, item); err != memcache.ErrCASConflict {
			channelName = string(oldValue)
		}
	} else if channelName = h.Request.FormValue("channelName"); channelName != "" {
		memcache.Set(h.Context, &memcache.Item{
			Key:        id,
			Value:      []byte(channelName),
			Expiration: config.MemcacheExpiration,
		})
	}

	if channelName == "" {
		status = http.StatusNotFound
	}

	return channelName, status
}

func getContinent(h HandlerArgs) (interface{}, int) {
	_, continent := geolocate(h)
	return continent, http.StatusOK
}

func logError(h HandlerArgs) (interface{}, int) {
	return logErrorHelper("CYPH: WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS", h)
}

func logSmpError(h HandlerArgs) (interface{}, int) {
	return logErrorHelper("SMP JUST FAILED FOR SOMEONE LADS", h)
}

func logWebSignError(h HandlerArgs) (interface{}, int) {
	return logErrorHelper("SOMEONE JUST GOT THE WEBSIGN ERROR SCREEN LADS", h)
}

func root(h HandlerArgs) (interface{}, int) {
	return "Welcome to Cyph, lad", http.StatusOK
}

/*** Helpers ***/

func logErrorHelper(subject string, h HandlerArgs) (interface{}, int) {
	country, _ := geolocate(h)

	mail.SendToAdmins(h.Context, &mail.Message{
		Sender:  "test@cyphme.appspotmail.com",
		Subject: subject,
		Body:    h.Request.FormValue("error") + "\n\nCountry: " + country,
	})

	return nil, http.StatusOK
}
