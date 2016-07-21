# oodump

## Install
First, install Node.js (version 6) on your system.
```
$ git clone git@github.com:kuu/oodump.git
$ cd oodump
$ npm install
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
  }
}
```

## CLI
```
Usage:
    npm test [options] command [parameters]

Example:
    npm test total
    npm test daily
    npm test daily --startDate 2016-01-01 --endDate 2016-06-30

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
