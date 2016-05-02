package main

import (
	"appengine"
	"appengine/datastore"
	"appengine/mail"
	"appengine/memcache"
	"github.com/go-authboss/authboss"
	"time"
)

type Remember struct {
	Tokens map[string]bool
}

type User struct {
	Name     string
	Username string

	/* Auth */
	Email    string
	Password string

	/* OAuth2 */
	Oauth2Uid      string
	Oauth2Provider string
	Oauth2Token    string
	Oauth2Refresh  string
	Oauth2Expiry   time.Time

	/* Confirm */
	ConfirmToken string
	Confirmed    bool

	/* Lock */
	AttemptNumber int64
	AttemptTime   time.Time
	Locked        time.Time

	/* Recover */
	RecoverToken       string
	RecoverTokenExpiry time.Time
}

type GAEStorer struct {
	Context appengine.Context
}

func (s GAEStorer) RememberKey(key string) *datastore.Key {
	return datastore.NewKey(s.Context, "Remember", key, 0, nil)
}

func (s GAEStorer) UserKey(key string) *datastore.Key {
	return datastore.NewKey(s.Context, "Users", key, 0, nil)
}

func (s GAEStorer) UserPut(key string, attr authboss.Attributes) error {
	var user User
	var remember Remember

	if err := attr.Bind(&user, true); err != nil {
		return err
	}

	if _, err := datastore.Put(s.Context, s.RememberKey(key), &remember); err != nil {
		return err
	}

	_, err := datastore.Put(s.Context, s.UserKey(key), &user)
	return err
}

func (s GAEStorer) UserQuery(prop string, value interface{}) *User {
	var user User
	_, err := datastore.NewQuery("Users").Filter(prop+"=", value).Run(s.Context).Next(&user)
	return &user, err
}

func NewGAEStorer(context appengine.Context) *GAEStorer {
	return &GAEStorer{Context: context}
}

func (s GAEStorer) Create(key string, attr authboss.Attributes) error {
	if _, err := s.Get(key); err != nil {
		return s.UserPut(key, attr)
	}

	return authboss.ErrUserFound
}

func (s GAEStorer) Put(key string, attr authboss.Attributes) error {
	if _, err := s.Get(key); err != nil {
		return nil
	}

	return s.UserPut(key, attr)
}

func (s GAEStorer) Get(key string) (result interface{}, err error) {
	var user User

	if err := datastore.Get(s.Context, s.UserKey(key), &user); err != nil {
		return nil, authboss.ErrUserNotFound
	}

	return &user, nil
}

func (s GAEStorer) PutOAuth(uid, provider string, attr authboss.Attributes) error {
	return s.UserPut(uid+provider, attr)
}

func (s GAEStorer) GetOAuth(uid, provider string) (result interface{}, err error) {
	return s.Get(uid+provider)
}

func (s GAEStorer) AddToken(key, token string) error {
	var remember Remember

	if err := datastore.Get(s.Context, s.RememberKey(key), &remember); err != nil {
		return authboss.ErrUserNotFound
	}

	if remember.Tokens == nil {
		remember.Tokens = make(map[string]bool)
	}

	remember.Tokens[token] = true

	_, err := datastore.Put(s.Context, s.RememberKey(key), &remember)
	return err
}

func (s GAEStorer) DelTokens(key string) error {
	var remember Remember

	if err := datastore.Get(s.Context, s.RememberKey(key), &remember); err != nil {
		return authboss.ErrUserNotFound
	}

	remember.Tokens = nil

	_, err := datastore.Put(s.Context, s.RememberKey(key), &remember)
	return err
}

func (s GAEStorer) UseToken(key, token string) error {
	var remember Remember

	if err := datastore.Get(s.Context, s.RememberKey(key), &remember); err != nil {
		return authboss.ErrUserNotFound
	}

	if _, ok := remember.Tokens[token]; !ok {
		return authboss.ErrTokenNotFound
	}

	remember.Tokens = delete(remember.Tokens, token)

	_, err := datastore.Put(s.Context, s.RememberKey(key), &remember)
	return err
}

func (s GAEStorer) ConfirmUser(confirmToken string) (result interface{}, err error) {
	if user, err := UserQuery("ConfirmToken", confirmToken); err == nil {
		return user, nil
	}

	return nil, authboss.ErrUserNotFound
}

func (s GAEStorer) RecoverUser(recoverToken string) (result interface{}, err error) {
	if user, err := UserQuery("RecoverToken", recoverToken); err == nil {
		return user, nil
	}

	return nil, authboss.ErrUserNotFound
}
