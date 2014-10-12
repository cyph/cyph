package api

import (
	"fmt"
)

func init() {
	handleFunc("/", root)
	handleFuncs("/im", handlers{methods.POST: imCreate})
	handleFuncs("/im/{id}", handlers{methods.POST: imConnect})
}

func imConnect(h handlerArgs) {
	fmt.Fprint(h.Writer, "Connecting to session: "+h.Vars["id"])
}

func imCreate(h handlerArgs) {
	fmt.Fprint(h.Writer, "Creatng new session: "+generateImId())
}

func root(h handlerArgs) {
	fmt.Fprint(h.Writer, "Welcome to the Cyph API, lad")
}
