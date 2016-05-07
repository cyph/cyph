package api

import (
	"appengine"
	"appengine/mail"
	"gopkg.in/authboss.v0"
	"net/http"
)

type GAEMailer struct {
	request *http.Request
}

func NewGAEMailer(_ http.ResponseWriter, r *http.Request) authboss.Mailer {
	return &GAEMailer{r}
}

func (m GAEMailer) getContext() appengine.Context {
	return appengine.NewContext(m.request)
}

func (m GAEMailer) Send(email authboss.Email) error {
	return mail.Send(m.getContext(), &mail.Message{
		Sender:   config.EmailAddress,
		To:       email.To,
		Cc:       email.Cc,
		Bcc:      email.Bcc,
		Subject:  email.Subject,
		Body:     email.TextBody,
		HTMLBody: email.HTMLBody,
	})
}
