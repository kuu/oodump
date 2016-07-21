const config = require('config');
const argv = require('yargs').argv;
const pkg = require('./package.json');

const VERSION = `v${pkg.version}`;
const HELP_TEXT = `
Usage:
    oodump [options] command [parameters]

Example:
    oodump -v
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
  startDate    Start date
  endDate      End date
`;

const CONFIG_HELP_TEXT = `
Please put config file(s) in your work directory.
 $ mkdir config
 $ vi config/default.json
 {
   "api": {
     "key":        {Your Ooyala API Key},
     "secret":     {Your Ooyala API Secret}
   }
 }
`;

if (!config.api) {
  console.info(CONFIG_HELP_TEXT);
} else if (argv.h || argv.help) {
  console.info(HELP_TEXT);
} else if (argv.v || argv.version) {
  console.info(VERSION);
} else {
  const dump = require('./lib');

  const command = argv._[0];
  if (command) {
    const opts = {
      startDate: argv.startDate,
      endDate: argv.endDate,
      daily: command.toLowerCase() === 'daily'
    };
    dump(opts);
  } else {
    console.info(HELP_TEXT);
  }
}
