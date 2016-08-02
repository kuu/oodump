# oodump
A tool for dumping Ooyala v2 analytics data per asset/label

## Install
First, install Node.js (version 6+) on your system.
```
$ npm install -g oodump
```

## Configure
```
$ mkdir config
$ touch config/default.json
```
Edit `config/default.json` as follows:
```
{
  "api": {
    "key": {Your Ooyala API Key},
    "secret": {Your Ooyala API Secret}
  },
  "concurrencies": [1, 1, 5, 5, 5]
}
```

## CLI
```
Usage:
    oodump [options] command [parameters]

Example:
    oodump total
    oodump daily
    oodump daily --startDate 2016-01-01 --endDate 2016-06-30

Options:
  -h, --help    Print help
  -v, --version Print version

Commands:
  total        Dump total plays count for each asset
  daily        Dump daily plays count for each asset

Parameters:
  startDate    Start date (YYYY-MM-DD) default=2012-07-12
  endDate      End date (YYYY-MM-DD) default=2016-06-30
```
