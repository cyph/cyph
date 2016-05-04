package api

import (
	"appengine"
	"appengine/datastore"
	"github.com/go-authboss/authboss"
	"time"
)

type Remember struct {
	Email  string
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

func (s GAEStorer) userPut(email string, attr authboss.Attributes) error {
	email = sanitize(email)

	var user User
	if err := attr.Bind(&user, true); err != nil {
		return err
	}

	completeKey, err := datastore.Put(
		s.Context,
		datastore.NewIncompleteKey(s.Context, "Remember", nil),
		&Remember{email},
	)
	if err != nil {
		return err
	}

	_, err := datastore.Put(
		s.Context,
		datastore.NewKey(s.Context, "Users", nil, completeKey.IntID(), nil),
		&User{
			sanitize(user.Name),
			sanitize(user.Username),
			email,
			sanitize(user.Password),
			sanitize(user.Oauth2Uid),
			sanitize(user.Oauth2Provider),
			sanitize(user.Oauth2Token),
			sanitize(user.Oauth2Refresh),
			user.Oauth2Expiry,
			sanitize(user.ConfirmToken),
			user.Confirmed,
			user.AttemptNumber,
			user.AttemptTime,
			user.Locked,
			sanitize(user.RecoverToken),
			user.RecoverTokenExpiry,
		},
	)
	return err
}

func (s GAEStorer) userQuery(prop string, value interface{}) (*datastore.Key, *User, error) {
	var user User
	key, err := datastore.NewQuery("Users").Filter(prop+"=", value).Run(s.Context).Next(&user)
	return key, &user, err
}

func (s GAEStorer) rememberQuery(prop string, value interface{}) (*datastore.Key, *Remember, error) {
	var remember Remember
	key, err := datastore.NewQuery("Remember").Filter(prop+"=", value).Run(s.Context).Next(&remember)
	return key, &remember, err
}

func NewGAEStorer(context appengine.Context) *GAEStorer {
	return &GAEStorer{context}
}

func (s GAEStorer) Create(email string, attr authboss.Attributes) error {
	if _, err := s.Get(email); err != nil {
		return s.userPut(email, attr)
	}

	return authboss.ErrUserFound
}

func (s GAEStorer) Put(email string, attr authboss.Attributes) error {
	if _, err := s.Get(email); err != nil {
		return nil
	}

	return s.userPut(email, attr)
}

func (s GAEStorer) Get(email string) (result interface{}, err error) {
	email = sanitize(email)

	_, user, err := s.userQuery("Email", email)
	if err != nil {
		return nil, authboss.ErrUserNotFound
	}

	return user, nil
}

func (s GAEStorer) PutOAuth(uid string, provider string, attr authboss.Attributes) error {
	return s.userPut(uid+provider, attr)
}

func (s GAEStorer) GetOAuth(uid string, provider string) (result interface{}, err error) {
	return s.Get(uid + provider)
}

func (s GAEStorer) AddToken(email string, token string) error {
	email = sanitize(email)
	token = sanitize(token)

	key, remember, err := s.rememberQuery("Email", email)
	if err != nil {
		return authboss.ErrUserNotFound
	}

	if remember.Tokens == nil {
		remember.Tokens = make(map[string]bool)
	}

	remember.Tokens[token] = true

	_, err := datastore.Put(s.Context, key, remember)
	return err
}

func (s GAEStorer) DelTokens(email string) error {
	email = sanitize(email)

	key, remember, err := s.rememberQuery("Email", email)
	if err != nil {
		return authboss.ErrUserNotFound
	}

	remember.Tokens = nil

	_, err := datastore.Put(s.Context, key, remember)
	return err
}

func (s GAEStorer) UseToken(email string, token string) error {
	email = sanitize(email)
	token = sanitize(token)

	key, remember, err := s.rememberQuery("Email", email)
	if err != nil {
		return authboss.ErrUserNotFound
	}

	if _, ok := remember.Tokens[token]; !ok {
		return authboss.ErrTokenNotFound
	}

	remember.Tokens = delete(remember.Tokens, token)

	_, err := datastore.Put(s.Context, key, remember)
	return err
}

func (s GAEStorer) ConfirmUser(confirmToken string) (result interface{}, err error) {
	confirmToken = sanitize(confirmToken)

	if _, user, err := s.userQuery("ConfirmToken", confirmToken); err == nil {
		return user, nil
	}

	return nil, authboss.ErrUserNotFound
}

func (s GAEStorer) RecoverUser(recoverToken string) (result interface{}, err error) {
	recoverToken = sanitize(recoverToken)

	if _, user, err := s.userQuery("RecoverToken", recoverToken); err == nil {
		return user, nil
	}

	return nil, authboss.ErrUserNotFound
}
