package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	tele "gopkg.in/telebot.v3"
)

func startBot(onlyAuth bool) {
	log.Printf("Starting bot... ")

	// Init bot
	b, err := tele.NewBot(tele.Settings{
		Token:  settings.Token,
		Poller: &tele.LongPoller{Timeout: 10 * time.Second},
	})
	if err != nil {
		log.Fatal(err)
		return
	}

	if onlyAuth == true {
		// Authorization OK
		fmt.Println("Authorization OK")
		os.Exit(0)
	}

	// Init DTMF keyboard
	menuDtmf := &tele.ReplyMarkup{ResizeKeyboard: false}
	b1 := menuDtmf.Data("1", "", "dtmf:1")
	b2 := menuDtmf.Data("2", "", "dtmf:2")
	b3 := menuDtmf.Data("3", "", "dtmf:3")
	b4 := menuDtmf.Data("4", "", "dtmf:4")
	b5 := menuDtmf.Data("5", "", "dtmf:5")
	b6 := menuDtmf.Data("6", "", "dtmf:6")
	b7 := menuDtmf.Data("7", "", "dtmf:7")
	b8 := menuDtmf.Data("8", "", "dtmf:8")
	b9 := menuDtmf.Data("9", "", "dtmf:9")
	b0 := menuDtmf.Data("0", "", "dtmf:0")
	bA := menuDtmf.Data("*", "", "dtmf:*")
	bS := menuDtmf.Data("#", "", "dtmf:#")
	menuDtmf.Inline(
		menuDtmf.Row(b1, b2, b3),
		menuDtmf.Row(b4, b5, b6),
		menuDtmf.Row(b7, b8, b9),
		menuDtmf.Row(bA, b0, bS),
	)

	b.Handle("\acallback", func(c tele.Context) error {
		data := strings.Split(c.Update().Callback.Data, ":")
		if len(data) < 2 {
			return nil
		}
		if data[0] == "dtmf" {
			id := fmt.Sprintf("%d", c.Update().Callback.Sender.ID)
			channel := getChannelFromCache(id)
			log.Printf("play dtmf: %s UserID:%s Channel: %s", data[1], id, channel)
			if channel == "" {
				log.Printf("Channel not found")
				return nil
			}
			playDtmf(channel, data[1])
		} else if data[0] == "dial" {
			_, found := cacheManager.Get(data[0] + ":" + data[1])
			if found == false {
				startCallback(data[1], settings.QueueNum, settings.QueueId)
				cacheManager.Set(data[0]+":"+data[1], "1", 10*time.Second)
			} else {
				log.Printf("flud dial: " + data[1])
			}
		}
		return nil
	})

	b.Handle(tele.OnQuery, func(c tele.Context) error {
		data := strings.Split(c.Update().Query.Text, ":")
		if len(data) < 2 {
			return nil
		}
		results := make(tele.Results, 1)
		if data[0] == "callback" {
			result := &tele.ArticleResult{
				Title:   settings.CallbackTitle,
				Text:    settings.CallbackText,
				HideURL: true,
			}
			menuCallback := &tele.ReplyMarkup{ResizeKeyboard: false}
			calbackButton := menuCallback.Data(settings.CallbackButtonText, "", "dial:"+data[1])
			menuCallback.Inline(
				menuCallback.Row(calbackButton),
			)
			result.SetReplyMarkup(menuCallback)
			results[0] = result
		} else {
			result := &tele.ArticleResult{
				Title:   settings.DtmfTitle,
				Text:    settings.DtmfText,
				HideURL: true,
			}
			result.SetReplyMarkup(menuDtmf)
			results[0] = result
		}

		return c.Answer(&tele.QueryResponse{
			Results:   results,
			CacheTime: 60,
		})
	})

	b.Start()
}
