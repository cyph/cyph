package api

import (
	"gopkg.in/authboss.v0"
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
	key = sanitize(key)

	cookie, err := s.Request.Cookie(key)
	if err != nil {
		return "", false
	}

	var value string
	err = cookieStore.Decode(key, cookie.Value, &value)
	if err != nil {
		return "", false
	}

	return sanitize(value), true
}

func (s CookieStorer) Put(key string, value string) {
	key = sanitize(key)
	key = sanitize(value)

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
	key = sanitize(key)

	cookie := &http.Cookie{
		MaxAge: -1,
		Name:   key,
		Path:   "/",
	}
	http.SetCookie(s.Writer, cookie)
}
