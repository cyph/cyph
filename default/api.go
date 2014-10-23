package api

import (
	"appengine"
	"appengine/channel"
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
	handleFuncs("/messages/{id}", Handlers{methods.PUT: channelAck})
	handleFuncs("/_ah/channel/disconnected/", Handlers{methods.POST: channelClose})
}

func channelAck(h HandlerArgs) (interface{}, int) {
	memcache.Delete(h.Context, h.Vars["id"])
	return nil, http.StatusOK
}

func channelClose(h HandlerArgs) (interface{}, int) {
	id := h.Request.FormValue("from")
	idBase := id[:len(id)-1]

	item := memcache.Item{Key: id + "-closed", Value: []byte{}, Expiration: config.MessageSendTimeout * time.Minute}
	memcache.Set(c, &item)

	for i := 0; i < 2; i++ {
		thisId := idBase + strconv.Itoa(i)
		sendChannelMessage(h.Context, thisId, ImData{Destroy: true})
	}

	return nil, http.StatusOK
}

func channelReceive(h HandlerArgs) (interface{}, int) {
	imData := getImDataFromRequest(h)

	if imData.Destroy != false || imData.Message != "" || (imData.Misc != "" && imData.Misc != "pong") {
		sendChannelMessage(h.Context, h.Vars["id"], imData)
	}

	return nil, http.StatusOK
}

func imConnect(h HandlerArgs) (interface{}, int) {
	for i := 0; i < 2; i++ {
		if item, err := memcache.Get(h.Context, h.Vars["id"]+strconv.Itoa(i)); err != memcache.ErrCacheMiss {
			imSetupString := string(item.Value)
			memcache.Delete(h.Context, item.Key)
			return imSetupString, http.StatusOK
		}
	}

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

	imIdItems := []memcache.Item{{Key: imId + "0"}, {Key: imId + "1", Value: []byte{}}}
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
		memcache.Set(h.Context, &imIdItems[i])
	}

	laterImTeardown.Call(h.Context, longId, imIdItems[0].Key, imIdItems[1].Key, imIdItems[1].Value)

	return imId, http.StatusOK
}

func imTeardown(c appengine.Context, longId string, key0 string, key1 string, value1 string) {
	time.Sleep(config.IMConnectTimeout * time.Minute)

	if item, _ := memcache.Get(c, key1); string(item.Value) == string(value1) {
		channel.SendJSON(c, longId+"1", ImData{Destroy: true})
		memcache.DeleteMulti(c, []string{key0, key1})
	}
}

func root(h HandlerArgs) (interface{}, int) {
	return "Welcome to Cyph, lad", http.StatusOK
}

func sendChannelMessage(c appengine.Context, channelId string, imData ImData) {
	id := generateLongId()

	item := memcache.Item{Key: id, Value: []byte{}, Expiration: config.MessageSendTimeout * time.Minute}
	memcache.Set(c, &item)

	imData.Id = id
	b, _ := json.Marshal(imData)
	imDataString = string(b)

	laterSendChannelMessage.Call(c, id, channelId, imDataString)
}

func sendChannelMessageTask(c appengine.Context, id string, channelId string, imData string) {
	/* Retry every 10 seconds until timeout before giving up, but stop if channel dies */

	channelClosed := channelId + "-closed"

	for i := 0; i < config.MessageSendRetries; i++ {
		if _, err := memcache.Get(c, channelClosed); err != memcache.ErrCacheMiss {
			break
		}

		if _, err := memcache.Get(c, id); err == memcache.ErrCacheMiss {
			break
		} else {
			channel.Send(c, channelId, imData)
		}

		time.Sleep(10 * time.Second)
	}
}
