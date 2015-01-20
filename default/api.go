package api

import (
	"appengine"
	"appengine/channel"
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
	handleFunc("/", root)
	handleFuncs("/amibanned", Handlers{methods.GET: amIBanned})
	handleFuncs("/betasignups", Handlers{methods.PUT: betaSignup})
	handleFuncs("/continent", Handlers{methods.GET: getContinent})
	handleFuncs("/channels/{id}", Handlers{methods.POST: channelReceive})
	handleFuncs("/errors", Handlers{methods.POST: logError})
	handleFuncs("/ims", Handlers{methods.POST: imCreate})
	handleFuncs("/ims/{id}", Handlers{methods.POST: imConnect})
	handleFuncs("/messages/{id}", Handlers{methods.PUT: channelAck})
	handleFuncs("/_ah/channel/disconnected/", Handlers{methods.POST: channelClose})

	/* Admin-restricted methods */
	handleFuncs("/stats", Handlers{methods.GET: getStats})
	handleFuncs("/tasks/logstats", Handlers{methods.GET: logStats})
}

/*** Handlers ***/

func amIBanned(h HandlerArgs) (interface{}, int) {
	country, _ := geolocate(h)
	_, isBanned := config.BannedCountries[country]
	return isBanned, http.StatusOK
}

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

func channelAck(h HandlerArgs) (interface{}, int) {
	memcache.Delete(h.Context, "messageAck-"+h.Vars["id"])
	return nil, http.StatusOK
}

func channelClose(h HandlerArgs) (interface{}, int) {
	id := h.Request.FormValue("from")
	idBase := id[:len(id)-1]

	channelCloseHelper(h.Context, idBase)

	return nil, http.StatusOK
}

func channelReceive(h HandlerArgs) (interface{}, int) {
	imData := getImDataFromRequest(h)

	if imData.Destroy != false || imData.Message != "" || imData.Misc != "" {
		return nil, sendChannelMessage(h.Context, h.Vars["id"], imData)
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

func imConnect(h HandlerArgs) (interface{}, int) {
	idBase := h.Vars["id"]
	connect := idBase + "-connect"
	n, _ := memcache.Increment(h.Context, connect, 1, 0)
	id := idBase + strconv.FormatUint(n-1, 10)

	if item, err := memcache.Get(h.Context, id); err != memcache.ErrCacheMiss {
		imSetupString := string(item.Value)
		memcache.Delete(h.Context, item.Key)

		if n == 2 {
			memcache.Increment(h.Context, "totalCyphs", 1, 0)
		}

		return imSetupString, http.StatusOK
	}

	memcache.Delete(h.Context, connect)
	return nil, http.StatusNotFound
}

func imCreate(h HandlerArgs) (interface{}, int) {
	imId := generateImId()
	longId := generateLongId()

	for {
		if _, err := memcache.Get(h.Context, imId+"1"); err == memcache.ErrCacheMiss {
			break
		} else {
			imId = generateImId()
		}
	}

	imIdItems := []memcache.Item{
		{Key: imId + "0", Expiration: config.DefaultMemcacheExpiration * time.Minute},
		{Key: imId + "1", Value: []byte{}, Expiration: config.DefaultMemcacheExpiration * time.Minute},
	}
	memcache.Set(h.Context, &imIdItems[1])

	for i := range imIdItems {
		channelId := longId + strconv.Itoa(i)

		var otherChannelId string
		if i == 0 {
			otherChannelId = longId + "1"
		} else {
			otherChannelId = longId + "0"
		}

		token, _ := channel.Create(h.Context, channelId)
		val, _ := json.Marshal(ImSetup{ChannelId: otherChannelId, ChannelToken: token, IsCreator: i == 0})
		imIdItems[i].Value = val
	}

	memcache.SetMulti(h.Context, []*memcache.Item{&imIdItems[0], &imIdItems[1]})

	laterImTeardown.Call(h.Context, longId, imIdItems[0].Key, imIdItems[1].Key, string(imIdItems[1].Value))

	return imId, http.StatusOK
}

func logError(h HandlerArgs) (interface{}, int) {
	mail.SendToAdmins(h.Context, &mail.Message{
		Sender:  "test@cyphme.appspotmail.com",
		Subject: "CYPH: WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS",
		Body:    h.Request.FormValue("error"),
	})

	return nil, http.StatusOK
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

func root(h HandlerArgs) (interface{}, int) {
	return "Welcome to Cyph, lad", http.StatusOK
}

/*** Helpers ***/

func channelCloseHelper(c appengine.Context, idBase string) {
	for _, i := range []string{"0", "1"} {
		id := idBase + i
		sendChannelMessage(c, id, ImData{Destroy: true})
	}
}

func sendChannelMessage(c appengine.Context, channelId string, imData ImData) int {
	key := "messageAck-" + imData.Id

	memcache.Increment(c, key, 1, 0)

	var i time.Duration
	for i = 0; i < config.MessageSendRetries; i++ {
		channel.SendJSON(c, channelId, imData)

		for j := 0; j < 20; j++ {
			time.Sleep(50 * time.Millisecond)

			if _, err := memcache.Get(c, key); err == memcache.ErrCacheMiss {
				if imData.Message != "" {
					memcache.Increment(c, "totalMessages", 1, 0)
				}

				return http.StatusOK
			}
		}
	}

	memcache.Delete(c, key)
	return http.StatusTeapot
}

/*** Tasks ***/

func imTeardown(c appengine.Context, longId string, key0 string, key1 string, value1 string) {
	time.Sleep(config.IMConnectTimeout * time.Minute)

	if item, err := memcache.Get(c, key1); err != memcache.ErrCacheMiss && string(item.Value) == string(value1) {
		channelCloseHelper(c, longId)
		memcache.DeleteMulti(c, []string{key0, key1})
	}
}
