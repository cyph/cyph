package api

import (
	"github.com/go-authboss/authboss"
	"github.com/gorilla/securecookie"
	"net/http"
)

var cookieStore *securecookie.SecureCookie

type CookieStorer struct {
	Request *http.Request
	Writer  http.ResponseWriter
}

func NewCookieStorer(w http.ResponseWriter, r *http.Request) authboss.ClientStorer {
	return &CookieStorer{r, w}
}

func (s CookieStorer) Get(key string) (string, bool) {
	cookie, err := s.Request.Cookie(key)
	if err != nil {
		return "", false
	}

	var value string
	err = cookieStore.Decode(key, cookie.Value, &value)
	if err != nil {
		return "", false
	}

	return value, true
}

func (s CookieStorer) Put(key, value string) {
	encoded, _ := cookieStore.Encode(key, value)

	cookie := &http.Cookie{
		Expires: time.Now().UTC().AddDate(1, 0, 0),
		Name:    key,
		Value:   encoded,
		Path:    "/",
	}
	http.SetCookie(s.Writer, cookie)
}

func (s CookieStorer) Del(key string) {
	cookie := &http.Cookie{
		MaxAge: -1,
		Name:   key,
		Path:   "/",
	}
	http.SetCookie(s.Writer, cookie)
}
