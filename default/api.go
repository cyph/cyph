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
	channelDescriptor := ""
	status := http.StatusOK

	if item, err := memcache.Get(h.Context, id); err != memcache.ErrCacheMiss {
		oldValue := item.Value
		item.Value = []byte{}

		if err := memcache.CompareAndSwap(h.Context, item); err != memcache.ErrCASConflict {
			channelDescriptor = string(oldValue)
		}
	} else if channelDescriptor = h.Request.FormValue("channelDescriptor"); channelDescriptor != "" {
		memcache.Set(h.Context, &memcache.Item{
			Key:        id,
			Value:      []byte(channelDescriptor),
			Expiration: config.MemcacheExpiration,
		})
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

func root(h HandlerArgs) (interface{}, int) {
	return "Welcome to Cyph, lad", http.StatusOK
}
