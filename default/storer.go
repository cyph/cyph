package api

import (
	"appengine"
	"appengine/datastore"
	"gopkg.in/authboss.v0"
	"net/http"
	"time"
)

type Remember struct{}

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
	request *http.Request
}

func (s GAEStorer) getContext() appengine.Context {
	return appengine.NewContext(s.request)
}

func (s GAEStorer) userPut(email string, attr authboss.Attributes) error {
	email = sanitize(email)

	var user User
	if err := attr.Bind(&user, true); err != nil {
		return err
	}

	key, _, err := s.userQuery("Email", true, email)
	if err != nil {
		key = datastore.NewIncompleteKey(s.getContext(), "Users", nil)
	}

	_, err = datastore.Put(
		s.getContext(),
		key,
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

func (s GAEStorer) userQuery(prop string, keyOnly bool, value interface{}) (*datastore.Key, *User, error) {
	var user User
	q := datastore.NewQuery("Users").Filter(prop+"=", value)

	if keyOnly {
		q = q.KeysOnly()
	}

	key, err := q.Run(s.getContext()).Next(&user)
	return key, &user, err
}

func (s GAEStorer) rememberKey(userKey *datastore.Key, token string) *datastore.Key {
	return datastore.NewKey(s.getContext(), "Remember", token, 0, userKey)
}

func NewGAEStorer(_ http.ResponseWriter, r *http.Request) authboss.Storer {
	return &GAEStorer{r}
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

	_, user, err := s.userQuery("Email", false, email)
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

	userKey, _, err := s.userQuery("Email", true, email)
	if err != nil {
		return authboss.ErrUserNotFound
	}

	_, err = datastore.Put(
		s.getContext(),
		s.rememberKey(userKey, token),
		&Remember{},
	)
	return err
}

func (s GAEStorer) DelTokens(email string) error {
	email = sanitize(email)

	userKey, _, err := s.userQuery("Email", true, email)
	if err != nil {
		return authboss.ErrUserNotFound
	}

	keys, err := datastore.NewQuery("Remember").Ancestor(userKey).KeysOnly().GetAll(s.getContext(), nil)
	if err != nil {
		return err
	}

	return datastore.DeleteMulti(s.getContext(), keys)
}

func (s GAEStorer) UseToken(email string, token string) error {
	email = sanitize(email)
	token = sanitize(token)

	userKey, _, err := s.userQuery("Email", true, email)
	if err != nil {
		return authboss.ErrUserNotFound
	}

	if err = datastore.Delete(s.getContext(), s.rememberKey(userKey, token)); err != nil {
		return authboss.ErrTokenNotFound
	}

	return nil
}

func (s GAEStorer) ConfirmUser(confirmToken string) (result interface{}, err error) {
	confirmToken = sanitize(confirmToken)

	if _, user, err := s.userQuery("ConfirmToken", false, confirmToken); err == nil {
		return user, nil
	}

	return nil, authboss.ErrUserNotFound
}

func (s GAEStorer) RecoverUser(recoverToken string) (result interface{}, err error) {
	recoverToken = sanitize(recoverToken)

	if _, user, err := s.userQuery("RecoverToken", false, recoverToken); err == nil {
		return user, nil
	}

	return nil, authboss.ErrUserNotFound
}
