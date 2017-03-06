package main

import (
	"net/http"
	"strings"
)

func init() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		w.Header().Set("Public-Key-Pins", config.HPKPHeader)
		w.Header().Set("Strict-Transport-Security", config.HSTSHeader)

		http.Redirect(w, r, "https://www.cyph.com"+strings.SplitAfterN(r.URL.String(), "cyph.com", 2)[1], http.StatusMovedPermanently)
	})
}
