package api

import (
	"appengine"
	"appengine/mail"
	"gopkg.in/authboss.v0"
)

type GAEMailer struct {
	Context appengine.Context
}

func NewGAEMailer(_ http.ResponseWriter, r *http.Request) *GAEMailer {
	return &GAEMailer{appengine.NewContext(r)}
}

func (m GAEMailer) Send(Email email) error {
	return mail.Send(m.Context, &mail.Message{
		Sender:   "Cyph <hello@cyph.com>",
		To:       email.To,
		Cc:       email.Cc,
		Bcc:      email.Bcc,
		Subject:  email.Subject,
		Body:     email.TextBody,
		HTMLBody: email.HTMLBody,
	})
}
