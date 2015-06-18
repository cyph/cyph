package api

import (
	"appengine/datastore"
	"appengine/mail"
	"appengine/memcache"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func init() {
	handleFuncs("/channels/{id}", Handlers{methods.POST: channelSetup})
	handleFuncs("/continent", Handlers{methods.GET: getContinent})
	handleFuncs("/signups", Handlers{methods.PUT: signup})

	handleFunc("/", func(h HandlerArgs) (interface{}, int) {
		return "Welcome to Cyph, lad", http.StatusOK
	})
}

func channelSetup(h HandlerArgs) (interface{}, int) {
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

func signup(h HandlerArgs) (interface{}, int) {
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
