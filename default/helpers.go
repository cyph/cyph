package api

import (
	"appengine"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"io/ioutil"
	"math/big"
	"net/http"
)

type HandlerArgs struct {
	Context appengine.Context
	Request *http.Request
	Writer  http.ResponseWriter
	Vars    map[string]string
}
type Handler func(HandlerArgs) (interface{}, int)
type Handlers map[string]Handler

type ImData struct {
	Destroy bool
	Message string
	Misc    string
}

type ImSetup struct {
	ChannelId    string
	ChannelToken string
	IsCreator    bool
}

type none struct{}

var methods = struct {
	GET     string
	HEAD    string
	POST    string
	PUT     string
	DELETE  string
	TRACE   string
	OPTIONS string
	CONNECT string
}{
	"GET",
	"HEAD",
	"POST",
	"PUT",
	"DELETE",
	"TRACE",
	"OPTIONS",
	"CONNECT",
}

var empty = struct{}{}

var router = mux.NewRouter()
var isRouterActive = false

var imIdAddressSpaceLength = big.NewInt(int64(len(imIdAddressSpace)))

func generateGuid(length int) string {
	var id = ""

	for i := 0; i < length; i++ {
		x, _ := rand.Int(rand.Reader, imIdAddressSpaceLength)
		id += imIdAddressSpace[x.Int64()]
	}

	return id
}

func generateImId() string {
	return generateGuid(7)
}

func generateLongId() string {
	return generateGuid(52)
}

func getImData(b []byte) ImData {
	var imData ImData
	json.Unmarshal(b, imData)
	return imData
}

func getImDataFromRequest(h HandlerArgs) ImData {
	if len(h.Request.Form) > 0 {
		return ImData{
			Destroy: h.Request.Form["Destroy"][0] == "true", 
			Message: h.Request.Form["Message"][0], 
			Misc: h.Request.Form["Misc"][0]
		}
	}

	requestBody, _ := ioutil.ReadAll(h.Request.Body)
	return getImData(requestBody)
}

func handleFunc(pattern string, handler Handler) {
	handleFuncs(pattern, Handlers{methods.GET: handler})
}

func handleFuncs(pattern string, handlers Handlers) {
	if !isRouterActive {
		http.Handle("/", router)
		isRouterActive = true
	}

	router.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
		if handler, ok := handlers[r.Method]; ok {
			initHandler(w, r)

			responseBody, responseCode := handler(HandlerArgs{appengine.NewContext(r), r, w, mux.Vars(r)})

			w.WriteHeader(responseCode)

			if responseBody != nil {
				output := ""

				if s, ok := responseBody.(string); ok {
					output = s
				} else if b, err := json.Marshal(responseBody); err == nil {
					output = string(b)
					w.Header().Set("Content-Type", "application/json")
				}

				fmt.Fprint(w, output)
			}
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
}

func initHandler(w http.ResponseWriter, r *http.Request) {
	if _, ok := config.AllowedOrigins[r.Host]; ok {
		w.Header().Add("Access-Control-Allow-Origin", "*")
	}
}
