package api

import (
	"net/http"
)

func init() {
	handleFunc("/", root)
	handleFuncs("/im", handlers{methods.POST: imCreate})
	handleFuncs("/im/{id}", handlers{methods.POST: imConnect})
}

func imConnect(h handlerArgs) (interface{}, int) {
	return "Connecting to session: " + h.Vars["id"], http.StatusOK
}

func imCreate(h handlerArgs) (interface{}, int) {
	imId := generateImId()
	longId := generateLongId()

	return []string{imId, longId}, http.StatusOK
}

func root(h handlerArgs) (interface{}, int) {
	return "Welcome to the Cyph API, lad", http.StatusOK
}
