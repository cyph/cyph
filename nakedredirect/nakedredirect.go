package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		w.Header().Set("Strict-Transport-Security", config.HSTSHeader)

		path := r.URL.Path
		if len(r.URL.RawQuery) > 0 {
			path += "?" + r.URL.RawQuery
		}

		http.Redirect(w, r, "https://www.cyph.com"+path, http.StatusMovedPermanently)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "443"
	}
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), nil))
}
