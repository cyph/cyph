package api

import (
	"appengine"
	"appengine/channel"
	"appengine/mail"
	"appengine/memcache"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

func init() {
	handleFunc("/", root)
	handleFuncs("/ims", Handlers{methods.POST: imCreate})
	handleFuncs("/ims/{id}", Handlers{methods.POST: imConnect})
	handleFuncs("/channels/{id}", Handlers{methods.POST: channelReceive})
	handleFuncs("/errors", Handlers{methods.POST: logError})
	handleFuncs("/messages/{id}", Handlers{methods.PUT: channelAck})
	handleFuncs("/_ah/channel/disconnected/", Handlers{methods.POST: channelClose})
}

/*** Handlers ***/

func channelAck(h HandlerArgs) (interface{}, int) {
	memcache.Delete(h.Context, h.Vars["id"])
	return nil, http.StatusOK
}

func channelClose(h HandlerArgs) (interface{}, int) {
	id := h.Request.FormValue("from")
	idBase := id[:len(id)-1]

	memcache.Increment(h.Context, idBase+"-closed", 1, 0)
	laterSendChannelMessage.Call(h.Context, idBase)

	return nil, http.StatusOK
}

func channelReceive(h HandlerArgs) (interface{}, int) {
	imData := getImDataFromRequest(h)

	if imData.Destroy != false || imData.Message != "" || imData.Misc != "" {
		sendChannelMessage(h.Context, h.Vars["id"], imData)
	}

	return nil, http.StatusOK
}

func imConnect(h HandlerArgs) (interface{}, int) {
	idBase := h.Vars["id"]
	connect := idBase + "-connect"
	n, _ := memcache.Increment(h.Context, connect, 1, 0)
	id := idBase + strconv.FormatUint(n-1, 10)

	if item, err := memcache.Get(h.Context, id); err != memcache.ErrCacheMiss {
		imSetupString := string(item.Value)
		memcache.Delete(h.Context, item.Key)
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
	msg := &mail.Message{
		Sender:  "test@cyphme.appspotmail.com",
		Subject: "CYPH: WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS",
		Body:    h.Request.FormValue("error"),
	}
	if err := mail.SendToAdmins(h.Context, msg); err != nil {
		h.Context.Errorf("Alas, my user, the email failed to sendeth: %v", err)
	}

	return nil, http.StatusOK
}

func root(h HandlerArgs) (interface{}, int) {
	return "Welcome to Cyph, lad", http.StatusOK
}

/*** Helpers ***/

func sendChannelMessage(c appengine.Context, channelId string, imData ImData) {
	channelIdEnd := len(channelId) - 1
	id := channelId[:channelIdEnd]

	n, _ := memcache.Increment(c, id+"-messageCount", 1, 0)
	n -= 1

	imData.Id = id + "-message" + strconv.FormatUint(n, 10)
	imData.Recipient = channelId[channelIdEnd:]
	imDataBytes, _ := json.Marshal(imData)

	item := memcache.Item{Key: imData.Id, Value: imDataBytes, Expiration: config.MessageSendTimeout * time.Minute}
	memcache.Set(c, &item)

	laterSendChannelMessage.Call(c, id)
}

/*** Tasks ***/

func imTeardown(c appengine.Context, longId string, key0 string, key1 string, value1 string) {
	time.Sleep(config.IMConnectTimeout * time.Minute)

	if item, err := memcache.Get(c, key1); err != memcache.ErrCacheMiss && string(item.Value) == string(value1) {
		memcache.Increment(c, longId+"-closed", 1, 0)
		laterSendChannelMessage.Call(c, longId)
		memcache.DeleteMulti(c, []string{key0, key1})
	}
}

func sendChannelMessageTask(c appengine.Context, id string) {
	lockKey := id + "-messageQueueLock"

	if lockValue, _ := memcache.Increment(c, lockKey, 1, 0); lockValue == 1 {
		closedKey := id + "-closed"
		countKey := id + "-messageCount"
		sentKey := id + "-messagesSent"

		noMoreRetries := map[string]bool{
			id + "0": false,
			id + "1": false,
		}

		for numTries := 0; true; numTries++ {
			count, _ := memcache.Increment(c, countKey, 0, 0)
			sent, _ := memcache.Increment(c, sentKey, 0, 0)

			var sentIncrement int64
			sentIncrement = 0

			if closedValue, _ := memcache.Increment(c, closedKey, 0, 0); closedValue > 0 {
				channel.Send(c, id+"0", destroyJson)
				channel.Send(c, id+"1", destroyJson)

				numKeys := count + 5
				keys := make([]string, numKeys, numKeys)
				keys[count] = lockKey
				keys[count+1] = closedKey
				keys[count+2] = countKey
				keys[count+3] = sentKey
				keys[count+4] = id + "-connect"

				var i uint64
				for i = 0; i < count; i++ {
					keys[i] = id + "-message" + strconv.FormatUint(i, 10)
				}
				memcache.DeleteMulti(c, keys)

				return
			}

			/* Avoid letting task exceed deadline */

			if count == sent {
				break
			} else if numTries > 0 {
				laterSendChannelMessageTwo.Call(c, id)
				return
			}

			for count > sent {
				messageKey := id + "-message" + strconv.FormatUint(sent, 10)

				item, err := memcache.Get(c, messageKey)
				if err == memcache.ErrCacheMiss {
					time.Sleep(10 * time.Millisecond)
					continue
				}

				sentIncrement++
				sent++

				var imData ImData
				imDataString := string(item.Value)
				json.Unmarshal(item.Value, &imData)

				/* Send + retry logic */

				channelId := id + imData.Recipient

				channel.Send(c, channelId, imDataString)

				if !noMoreRetries[channelId] {
					i := 1
					for {
						time.Sleep(50 * time.Millisecond)

						if _, err := memcache.Get(c, messageKey); err == memcache.ErrCacheMiss {
							break
						} else if i >= config.MessageSendRetries {
							noMoreRetries[channelId] = true
							break
						} else if i%10 == 0 {
							channel.Send(c, channelId, imDataString)
						}

						i++
					}
				}
			}

			memcache.IncrementExisting(c, sentKey, sentIncrement)
		}

		memcache.Delete(c, lockKey)
	}
}
