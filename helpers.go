package api

import (
	"crypto/rand"
	"github.com/gorilla/mux"
	"math/big"
	"net/http"
)

type handlerArgs struct {
	Writer  http.ResponseWriter
	Request *http.Request
	Vars    map[string]string
}
type handler func(handlerArgs)
type handlers map[string]handler
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

func generateImId() string {
	var id = ""

	for i := 0; i < 7; i++ {
		x, _ := rand.Int(rand.Reader, imIdAddressSpaceLength)
		id += imIdAddressSpace[x.Int64()]
	}

	return id
}

func handleFunc(pattern string, handler handler) {
	handleFuncs(pattern, handlers{methods.GET: handler})
}

func handleFuncs(pattern string, handlers handlers) {
	if !isRouterActive {
		http.Handle("/", router)
		isRouterActive = true
	}

	router.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
		handler, ok := handlers[r.Method]

		if ok {
			initHandler(w, r)
			handler(handlerArgs{w, r, mux.Vars(r)})
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
