package api

import (
	"appengine"
	"appengine/delay"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
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
	Id        string
	Destroy   bool
	Message   string
	Misc      string
	Recipient string
}

type ImSetup struct {
	ChannelId    string
	ChannelToken string
	IsCreator    bool
}

type Stats struct {
	TotalCyphs    int64
	TotalMessages int64
	TotalSignups  int64
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

var destroyJson = "{\"Destroy\": true}"

var laterImTeardown = delay.Func("imTeardown", imTeardown)
var laterSendChannelMessageBase = delay.Func("sendChannelMessage", sendChannelMessageTask)
var laterSendChannelMessage *delay.Function

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

func getImDataFromRequest(h HandlerArgs) ImData {
	return ImData{
		Destroy: h.Request.PostFormValue("Destroy") == "true",
		Message: h.Request.PostFormValue("Message"),
		Misc:    h.Request.PostFormValue("Misc"),
	}
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
		var method string
		if m, ok := r.Header["Access-Control-Request-Method"]; ok && len(m) > 0 {
			method = m[0]
		} else {
			method = r.Method
		}

		if handler, ok := handlers[method]; ok {
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
		w.Header().Add("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,DELETE,TRACE,OPTIONS,CONNECT")
	}
}

func nullHandler(h HandlerArgs) (interface{}, int) {
	return nil, http.StatusOK
}
