package main

import (
	"encoding/json"
	"flag"
	"io/ioutil"
	"log"
	"os"
	"sync"
	"time"

	"github.com/patrickmn/go-cache"
	lumberjack "gopkg.in/natefinch/lumberjack.v2"
)

var (
	settingsFile string
	settings     Settings
	cacheManager cache.Cache
)

func main() {

	sFile := flag.String("c", "settings.conf", "path to setting file")
	onlyUser := flag.Bool("u", false, "if true start as user, else start as bot")
	onlyAuth := flag.Bool("auth", false, "if true auth only , else auth and listen message")
	testDc := flag.Bool("test", false, "use test DC")
	flag.Parse()

	settingsFile = *sFile
	/**
	Инициализация / получение настроек
	**/
	settingsByte, errRead := ioutil.ReadFile(settingsFile)
	if errRead != nil {
		log.Printf("Settings file not found... %s", errRead)
		os.Exit(2)
	}
	errJson := json.Unmarshal(settingsByte, &settings)
	if errJson != nil {
		log.Printf("The settings file %s must be valid json. %s", settingsFile, errJson)
		os.Exit(3)
	}
	cacheManager = *cache.New(30*time.Second, 60*time.Second)

	/**
	Настройка логгера
	**/
	log.SetOutput(&lumberjack.Logger{
		Filename:   settings.LogFile,
		MaxSize:    1, // megabytes
		MaxBackups: 5,
		MaxAge:     1,     //days
		Compress:   false, // disabled by default
	})
	log.Printf("Log init. Done.")

	/**
	Основной код программы.
	**/
	var wg sync.WaitGroup
	if *onlyUser == true {
		wg.Add(1)
		go tdUserListner(*onlyAuth, *testDc)
	} else {
		wg.Add(1)
		go startBot(*onlyAuth)
	}
	wg.Wait()

}
