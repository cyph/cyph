package api

import (
	"appengine"
	"io"
	"net/http"
)

type GAELogger struct {
	request *http.Request
}

func NewGAELogger(_ http.ResponseWriter, r *http.Request) io.Writer {
	return &GAELogger{r}
}

func (l GAELogger) getContext() appengine.Context {
	return appengine.NewContext(l.request)
}

func (l GAELogger) Write(p []byte) (n int, err error) {
	l.getContext().Debugf(string(p))
	return len(p), nil
}
