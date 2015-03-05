package api

import (
	"appengine/datastore"
	"appengine/mail"
	"appengine/memcache"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func init() {
	handleFunc("/", root)
	handleFuncs("/betasignups", Handlers{methods.PUT: betaSignup})
	handleFuncs("/continent", Handlers{methods.GET: getContinent})
	handleFuncs("/errors", Handlers{methods.POST: logError})
	handleFuncs("/smperrors", Handlers{methods.POST: logSmpError})
	handleFuncs("/websignerrors", Handlers{methods.POST: logWebSignError})

	/* Admin-restricted methods */
	handleFuncs("/stats", Handlers{methods.GET: getStats})
	handleFuncs("/tasks/logstats", Handlers{methods.GET: logStats})
}

/*** Handlers ***/

func betaSignup(h HandlerArgs) (interface{}, int) {
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
			memcache.Increment(h.Context, "totalSignups", 1, 0)
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

	return nil, http.StatusOK
}

func getContinent(h HandlerArgs) (interface{}, int) {
	_, continent := geolocate(h)
	return continent, http.StatusOK
}

func getStats(h HandlerArgs) (interface{}, int) {
	totalCyphs, _ := memcache.Increment(h.Context, "totalCyphs", 0, 0)
	totalMessages, _ := memcache.Increment(h.Context, "totalMessages", 0, 0)
	totalSignups, _ := memcache.Increment(h.Context, "totalSignups", 0, 0)

	return Stats{
		TotalCyphs:    int64(totalCyphs),
		TotalMessages: int64(totalMessages),
		TotalSignups:  int64(totalSignups),
	}, http.StatusOK
}

func logError(h HandlerArgs) (interface{}, int) {
	return logErrorHelper("CYPH: WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS", h)
}

func logSmpError(h HandlerArgs) (interface{}, int) {
	return logErrorHelper("SMP JUST FAILED FOR SOMEONE LADS", h)
}

func logStats(h HandlerArgs) (interface{}, int) {
	s, _ := getStats(h)
	stats := s.(Stats)

	key := datastore.NewKey(h.Context, "Stats", "", time.Now().Unix(), nil)

	if _, err := datastore.Put(h.Context, key, &stats); err != nil {
		return err.Error(), http.StatusInternalServerError
	}

	return nil, http.StatusOK
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
