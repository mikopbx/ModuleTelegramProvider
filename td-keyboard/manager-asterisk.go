package main

import (
	"log"

	"github.com/ivahaev/amigo"
)

func playDtmf(channel string, digit string) {
	a := amigo.New(&amigo.Settings{
		Username: settings.AmiLogin,
		Password: settings.AmiPassword,
		Host:     settings.AmiHost,
		Port:     settings.AmiPort,
	})
	a.On("connect", func(message string) {
		action := map[string]string{
			"Action":  "PlayDTMF",
			"Channel": channel,
			"Digit":   digit,
			"Receive": "1",
		}
		result, err := a.Action(action)
		if err != nil || result["Response"] != "Success" {
			log.Println("Error play dtmf: '"+digit+"'", result["Message"])
		} else {
			log.Println("Play dtmf: '"+digit+"'", digit)
		}
	})
	a.On("error", func(message string) {
		log.Println("Connection error:", digit)
	})
	a.Connect()
}

func startCallback(phone string, queueNum string, queueId string) {

	a := amigo.New(&amigo.Settings{
		Username: settings.AmiLogin,
		Password: settings.AmiPassword,
		Host:     settings.AmiHost,
		Port:     settings.AmiPort,
	})
	a.On("connect", func(message string) {
		action := map[string]string{
			"Action":   "Originate",
			"Channel":  "Local/" + queueNum + "@internal-originate",
			"Variable": "pt1c_cid=" + settings.PrefixVar + phone + ",SRC_QUEUE=" + queueId,
			"Exten":    settings.PrefixExten + phone,
			"Context":  "all_peers",
			"Priority": "1",
			"Async":    "true",
		}
		result, err := a.Action(action)
		if err != nil || result["Response"] != "Success" {
			log.Println("Fail dial to'"+phone+"'", result["Message"])
		} else {
			log.Println("Dial to : '"+phone+"'", queueNum)
		}
	})
	a.On("error", func(message string) {
		log.Println("Connection error:", message)
	})
	a.Connect()
}
