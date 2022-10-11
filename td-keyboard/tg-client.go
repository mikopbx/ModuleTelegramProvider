package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/patrickmn/go-cache"
	"github.com/zelenin/go-tdlib/client"
)

var (
	clientCacheManager cache.Cache
)

func isNumeric(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

func sendMessage(tdlibClient *client.Client, chatId int64, message string) {
	// Отправляем сообщение (если оно одно и то же) не чаще раз в 30 секунд.
	id := fmt.Sprintf("%d", chatId)
	_, found := clientCacheManager.Get(id + message)
	if found == true {
		log.Printf("chatId: %d, messageL %s.The answering machine has already been with such a message in the next 30 seconds..", chatId, message)
		return
	}
	clientCacheManager.Set(id+message, "1", 30*time.Second)
	tdlibClient.SendMessage(&client.SendMessageRequest{
		ChatId: chatId,
		InputMessageContent: &client.InputMessageText{
			Text: &client.FormattedText{Text: message},
		},
	})
}

/*
Отправка keyboard от имени пользователя TG
*/
func sendMsgFromBot(tdlibClient *client.Client, query string, botId int64, chatId int64) int64 {
	msgId := int64(0)
	results, errInline := tdlibClient.GetInlineQueryResults(&client.GetInlineQueryResultsRequest{
		BotUserId: botId,
		Query:     query,
	})
	if results != nil && len(results.Results) > 0 {
		response, err := tdlibClient.SendInlineQueryResultMessage(&client.SendInlineQueryResultMessageRequest{
			ChatId:   chatId,
			QueryId:  results.InlineQueryId,
			ResultId: results.Results[0].(*client.InlineQueryResultArticle).Id,
		})
		if response != nil && err == nil {
			msgId = response.Id
		} else {
			log.Printf("Fail send inline result msg.")
			log.Println(err)
		}
	} else {
		log.Printf("Inline bot did not return an answer. botId: %d query: %s", botId, query)
		log.Println(errInline)
	}
	return msgId
}

func findPeerId(tdlibClient *client.Client, username string) int64 {
	result := 0

	contacts, err := tdlibClient.SearchContacts(&client.SearchContactsRequest{Query: username, Limit: 1})
	if err == nil && contacts.TotalCount > 0 {
		return contacts.UserIds[0]
	}
	chat, err := tdlibClient.SearchPublicChat(&client.SearchPublicChatRequest{
		Username: username,
	})
	if err == nil {
		return chat.Id
	}
	return int64(result)
}

func getChannelFromCache(userId string) string {
	channel := ""
	var ctx = context.Background()
	rdb := redis.NewClient(&redis.Options{
		Addr:     settings.RedisAddres,
		Password: "",
		DB:       settings.RedisDbIndex,
	})
	val, err := rdb.Get(ctx, settings.RedisKeyPrefix+userId).Result()
	if err == nil {
		var info UserInfo
		err := json.Unmarshal([]byte(val), &info)
		if err == nil {
			channel = info.Channel
		}
	}
	return channel
}

func tdUserListner(onlyAuth bool, testDc bool) {

	clientCacheManager = *cache.New(30*time.Second, 30*time.Second)
	log.Printf("Starting tg client... ")
	authorizer := client.ClientAuthorizer()

	if onlyAuth == true {
		authorizer.PhoneNumber <- settings.TgPhone
	}
	go client.CliInteractor(authorizer)

	authorizer.TdlibParameters <- &client.TdlibParameters{
		UseTestDc:              testDc,
		DatabaseDirectory:      filepath.Join(settings.TdDir, "database"),
		FilesDirectory:         filepath.Join(settings.TdDir, "files"),
		UseFileDatabase:        true,
		UseChatInfoDatabase:    true,
		UseMessageDatabase:     true,
		UseSecretChats:         false,
		ApiId:                  settings.ApiId,
		ApiHash:                settings.ApiHash,
		SystemLanguageCode:     "en",
		DeviceModel:            "MikoPBX",
		SystemVersion:          "1.0.0",
		ApplicationVersion:     "1.0.0",
		EnableStorageOptimizer: true,
		IgnoreFileNames:        false,
	}
	log.Printf("Set loglevel to %d... ", settings.LogLevel)
	_, err := client.SetLogVerbosityLevel(&client.SetLogVerbosityLevelRequest{
		NewVerbosityLevel: settings.LogLevel,
	})
	if err != nil {
		log.Fatalf("SetLogVerbosityLevel error: %s", err)
	}
	log.Printf("Create tg client... ")
	tdlibClient, err := client.NewClient(authorizer)
	if err != nil {
		log.Fatalf("NewClient error: %s", err)
	}

	me, err := tdlibClient.GetMe()
	if err != nil {
		log.Fatalf("GetMe error: %s", err)
	}
	if onlyAuth == true {
		// Authorization OK
		fmt.Println("Authorization OK")
		os.Exit(0)
	}
	log.Printf("username: %s, phone: %s", me.Username, me.PhoneNumber)
	log.Printf("Create tg listener... ")

	sendMessage(tdlibClient, settings.BotId, "/start")
	listener := tdlibClient.GetListener()
	defer listener.Close()
	for update := range listener.Updates {
		if "updateUserStatus" == update.GetType() {
			continue
		}
		if update.GetType() == client.TypeUpdateUser {
			user := update.(*client.UpdateUser).User
			_, ok := user.Type.(*client.UserTypeBot)
			if ok == true {
				clientCacheManager.Set(fmt.Sprintf("bot-%d", user.Id), true, 60*time.Second)
			}
		} else if update.GetClass() == client.ClassUpdate && update.GetType() == client.TypeUpdateNewMessage {
			Outgoing := update.(*client.UpdateNewMessage).Message.IsOutgoing
			content := update.(*client.UpdateNewMessage).Message.Content
			switch content.(type) {
			default:
				continue
			case *client.MessageCall:
				if Outgoing == true {
					if content.(*client.MessageCall).Duration < 2 {
						userData, err := tdlibClient.GetUser(&client.GetUserRequest{UserId: update.(*client.UpdateNewMessage).Message.ChatId})
						if userData != nil && err == nil {
							queryData := fmt.Sprintf("callback:%s:%d:%s", userData.PhoneNumber, userData.Id, userData.Username)
							// Отправляем визитку с кнопкой "перезвонить".
							sendMsgFromBot(tdlibClient, queryData, settings.BotId, update.(*client.UpdateNewMessage).Message.ChatId)
						}
					}
				} else {
					// Удаляем высланную ранее клавиатуру.
					chatId := update.(*client.UpdateNewMessage).Message.ChatId
					id := fmt.Sprintf("%d", chatId)
					messageId, found := clientCacheManager.Get(id)
					if messageId == nil || found == false {
						continue
					}
					mIds := make([]int64, 1)
					mIds[0] = messageId.(int64)
					log.Printf("Delete message from chatId: %d messageId:%d", chatId, mIds[0])
					tdlibClient.DeleteMessages(&client.DeleteMessagesRequest{
						ChatId:     update.(*client.UpdateNewMessage).Message.ChatId,
						MessageIds: mIds,
						Revoke:     true,
					})
					clientCacheManager.Set(id, "", 1*time.Second)
				}
				continue
			case *client.MessageText:
				if Outgoing {
					continue
				}

				dtmfCodes := content.(*client.MessageText).Text.Text
				chatId := update.(*client.UpdateNewMessage).Message.ChatId

				isBot, found := clientCacheManager.Get(fmt.Sprintf("bot-%d", chatId))
				if found == false {
					userData, err := tdlibClient.GetUser(&client.GetUserRequest{
						UserId: chatId,
					})
					if err != nil {
						log.Println(err)
						continue
					}
					_, isBot = userData.Type.(*client.UserTypeBot)
					clientCacheManager.Set(fmt.Sprintf("bot-%d", userData.Id), isBot, 60*time.Second)
				}
				if isBot == true {
					continue
				}

				log.Printf("Get message from chatId: %d message:%s", chatId, dtmfCodes)
				if isNumeric(dtmfCodes) {
					// Проверка на добавочный номер.
					id := fmt.Sprintf("%d", chatId)
					channel := getChannelFromCache(id)
					log.Printf("play dtmf: %s UserID:%s Channel: %s", dtmfCodes, id, channel)
					if channel == "" {
						// Автоответчик, когда нет активного канала на АТС.
						sendMessage(tdlibClient, chatId, settings.AutoAnswerText)
						continue
					} else {
						// Набрать добавочный номер, если есть активный разговор.
						playDtmf(channel, dtmfCodes)
					}

				} else {
					// Автоответчик, если тест не "Numeric".
					sendMessage(tdlibClient, chatId, settings.AutoAnswerText)
				}

			}
		} else if update.GetType() == client.TypeUpdateCall {
			uCall := update.(*client.UpdateCall)
			if uCall.Call.IsOutgoing != true {
				// Анализируем только входящие.
				stateCall := uCall.Call.State
				switch stateCall.(type) {
				default:
					continue
				case *client.CallStatePending:
					// Отправляем DTMF клавиатуру.
					messageId := sendMsgFromBot(tdlibClient, "keyboard:", settings.BotId, uCall.Call.UserId)
					if messageId != 0 {
						chatId := fmt.Sprintf("%d", uCall.Call.UserId)
						clientCacheManager.Set(chatId, messageId, 600*time.Second)
					}
				}
			}
		}
	}
}
