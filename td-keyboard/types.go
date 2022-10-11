package main

type UserInfo struct {
	Channel  string `json:"channel"`
	ID       string `json:"X-TG-ID"`
	Context  string `json:"X-GW-Context"`
	Phone    string `json:"X-TG-Phone"`
	Username string `json:"X-TG-Username"`
}

type Settings struct {
	ApiId              int32
	ApiHash            string
	QueueNum           string
	QueueId            string
	PrefixVar          string
	PrefixExten        string
	Token              string
	CallbackTitle      string
	CallbackText       string
	CallbackButtonText string
	DtmfTitle          string
	DtmfText           string
	RedisKeyPrefix     string
	RedisAddres        string
	RedisDbIndex       int
	AmiHost            string
	AmiPort            string
	AmiLogin           string
	AmiPassword        string
	TdDir              string
	LogLevel           int32
	BotId              int64
	AutoAnswerText     string
	LogFile            string
	LogDir             string
	TgPhone            string
}
