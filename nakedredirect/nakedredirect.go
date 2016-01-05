package nakedredirect

import (
	"net/http"
    "strings"
)

func init() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		w.Header().Set("Public-Key-Pins", "max-age=31536000; includeSubdomains; pin-sha256=\"8jdS3zcG5kUApHWDrLH5Q8wEygqGbGEhYApjSDtufBU=\"; pin-sha256=\"AMRT67hN1KPI+u7Aw9JpZlzyRaKeO+6u2H+jtOmWVy8=\"")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubdomains; preload")

		http.Redirect(w, r, "https://www.cyph.com" + strings.SplitAfterN(r.URL.String(), "cyph.com", 2)[1], 301)
	})
}
