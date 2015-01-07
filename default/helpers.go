package api

import (
	"./geoip2"
	"appengine"
	"appengine/delay"
	csRand "crypto/rand"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"math/big"
	noncsRand "math/rand"
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

type ImData struct {
	Id      string
	Destroy bool
	Message string
	Misc    string
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

var laterImTeardown = delay.Func("imTeardown", imTeardown)

var empty = struct{}{}

var router = mux.NewRouter()
var isRouterActive = false

var geoipdb, _ = geoip2.Open("GeoIP2-Country.mmdb")

var imIdAddressSpaceLength = len(imIdAddressSpace)
var imIdAddressSpaceLengthBig = big.NewInt(int64(imIdAddressSpaceLength))

func noncsGuid(length int) string {
	var id = ""

	for i := 0; i < length; i++ {
		x := noncsRand.Intn(imIdAddressSpaceLength)
		id += imIdAddressSpace[x]
	}

	return id
}

func csGuid(length int) string {
	var id = ""

	for i := 0; i < length; i++ {
		x, _ := csRand.Int(csRand.Reader, imIdAddressSpaceLengthBig)
		id += imIdAddressSpace[x.Int64()]
	}

	return id
}

func generateImId() string {
	return csGuid(7)
}

func generateLongId() string {
	return csGuid(52)
}

func geolocate(h HandlerArgs) string {
	return geolocateIp(h.Request.RemoteAddr)
}

func geolocateIp(ip string) string {
	record, err := geoipdb.Country(net.ParseIP(ip))
	if err != nil {
		return ""
	}
	return record.Country.IsoCode
}

func getBetaSignupFromRequest(h HandlerArgs) BetaSignup {
	return BetaSignup{
		Comment:  h.Request.PostFormValue("Comment"),
		Country:  geolocate(h),
		Email:    strings.ToLower(h.Request.PostFormValue("Email")),
		Language: strings.ToLower(h.Request.PostFormValue("Language")),
		Name:     h.Request.PostFormValue("Name"),
		Referer:  h.Request.Referer(),
		Time:     time.Now().Unix(),
	}
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
