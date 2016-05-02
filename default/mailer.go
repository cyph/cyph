package api

import (
	"appengine"
	"appengine/mail"
	"github.com/go-authboss/authboss"
)

type GAEMailer struct {
	Context appengine.Context
}

func NewGAEMailer(context appengine.Context) *GAEMailer {
	return &GAEMailer{context}
}

func (m GAEMailer) Send(Email email) error {
	message := &mail.Message{
		Sender:   "Cyph <hello@cyph.com>",
		To:       email.To,
		Cc:       email.Cc,
		Bcc:      email.Bcc,
		Subject:  email.Subject,
		HTMLBody: email.HTMLBody,
	}

	if len(message.HTMLBody) == 0 {
		message.Body = email.TextBody
	}

	return mail.Send(m.Context, message)
}
