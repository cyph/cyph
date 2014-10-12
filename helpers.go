package api

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"math/big"
	"net/http"
)

type handlerArgs struct {
	Writer  http.ResponseWriter
	Request *http.Request
	Vars    map[string]string
}
type handler func(handlerArgs) (interface{}, int)
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

func handleFunc(pattern string, handler handler) {
	handleFuncs(pattern, handlers{methods.GET: handler})
}

func handleFuncs(pattern string, handlers handlers) {
	if !isRouterActive {
		http.Handle("/", router)
		isRouterActive = true
	}

	router.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
		if handler, ok := handlers[r.Method]; ok {
			initHandler(w, r)

			responseBody, responseCode := handler(handlerArgs{w, r, mux.Vars(r)})

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
