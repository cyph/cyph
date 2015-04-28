package api

import (
	"appengine"
	"encoding/json"
	"fmt"
	"geoip2"
	"github.com/gorilla/mux"
	"net"
	"net/http"
	"strings"
	"time"
)

type HandlerArgs struct {
	Context appengine.Context
	Request *http.Request
	Writer  http.ResponseWriter
	Vars    map[string]string
}
type Handler func(HandlerArgs) (interface{}, int)
type Handlers map[string]Handler

type BetaSignup struct {
	Comment  string
	Country  string
	Email    string
	Language string
	Name     string
	Referer  string
	Time     int64
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

var geoipdb, _ = geoip2.Open("GeoIP2-Country.mmdb")

func geolocate(h HandlerArgs) (string, string) {
	return geolocateIp(h.Request.RemoteAddr)
}

func geolocateIp(ip string) (string, string) {
	record, err := geoipdb.Country(net.ParseIP(ip))
	if err != nil {
		return "", ""
	}

	country := strings.ToLower(record.Country.IsoCode)
	continent := strings.ToLower(record.Continent.Code)

	if _, ok := config.Continents[continent]; !ok {
		continent = config.DefaultContinent
	}

	return country, continent
}

func getBetaSignupFromRequest(h HandlerArgs) BetaSignup {
	country, _ := geolocate(h)

	return BetaSignup{
		Comment:  h.Request.PostFormValue("Comment"),
		Country:  country,
		Email:    strings.ToLower(h.Request.PostFormValue("Email")),
		Language: strings.ToLower(h.Request.PostFormValue("Language")),
		Name:     h.Request.PostFormValue("Name"),
		Referer:  h.Request.Referer(),
		Time:     time.Now().Unix(),
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
	if _, ok := config.AllowedOrigins[r.Host]; ok || appengine.IsDevAppServer() {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,DELETE,TRACE,OPTIONS,CONNECT")
	}
}

func nullHandler(h HandlerArgs) (interface{}, int) {
	return nil, http.StatusOK
}
