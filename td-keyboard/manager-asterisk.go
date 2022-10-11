package main

import (
	"log"

	"github.com/ivahaev/amigo"
)

func initAmigo() {
	amiClient = amigo.New(&amigo.Settings{
		Username: settings.AmiLogin,
		Password: settings.AmiPassword,
		Host:     settings.AmiHost,
		Port:     settings.AmiPort,
	})
	amiClient.On("connect", func(message string) {
		log.Println("Connect to AMI: OK.", message)
	})
	amiClient.On("error", func(message string) {
		log.Println("Connection error...", message)
	})
	amiClient.Connect()
}

func playDtmf(channel string, digit string) {
	if !amiClient.Connected() {
		log.Println("Error play dtmf: '"+digit+"'", "AMI сlient not connected...")
		return
	}
	action := map[string]string{
		"Action":  "PlayDTMF",
		"Channel": channel,
		"Digit":   digit,
		"Receive": "1",
	}
	result, err := amiClient.Action(action)
	if err != nil || result["Response"] != "Success" {
		log.Println("Error play dtmf: '"+digit+"'", result["Message"])
	} else {
		log.Println("Play dtmf: '"+digit+"'", digit)
	}

}

func startCallback(phone string, queueNum string, queueId string) {
	if !amiClient.Connected() {
		log.Println("Error callback: '"+phone+"'", "AMI rlient not connected...")
		return
	}
	action := map[string]string{
		"Action":   "Originate",
		"Channel":  "Local/" + queueNum + "@internal-originate",
		"Variable": "pt1c_cid=" + settings.PrefixVar + phone + ",SRC_QUEUE=" + queueId,
		"Exten":    settings.PrefixExten + phone,
		"Context":  "all_peers",
		"Priority": "1",
		"Async":    "true",
	}
	result, err := amiClient.Action(action)
	if err != nil || result["Response"] != "Success" {
		log.Println("Fail dial to'"+phone+"'", result["Message"])
	} else {
		log.Println("Dial to : '"+phone+"'", queueNum)
	}

}
