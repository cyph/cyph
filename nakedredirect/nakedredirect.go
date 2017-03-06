package main

import (
	"net/http"
)

func init() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		w.Header().Set("Public-Key-Pins", config.HPKPHeader)
		w.Header().Set("Strict-Transport-Security", config.HSTSHeader)

		path := r.URL.Path
		if len(r.URL.RawQuery) > 0 {
			path += "?" + r.URL.RawQuery
		}

		http.Redirect(w, r, "https://www.cyph.com"+path, http.StatusMovedPermanently)
	})
}
