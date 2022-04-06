const Telegraf = require('telegraf');
const config = require('./config.json');
const timezones = require('./timezones.json').timezones;

module.exports.removeMenu = Telegraf.Extra.markup(m => m.removeKeyboard());

module.exports.shareDataMenu = Telegraf.Extra.markup(m => m.keyboard(config.shareDataOptions.map(option =>
  m.callbackButton(option)
)));

module.exports.frequentTimezonesMenu = Telegraf.Extra.markup(m => m.keyboard(config.frequentTimezones.map(option =>
  m.callbackButton(option)
)));

module.exports.allTimezonesMenu = Telegraf.Extra.markup(m => m.keyboard(timezones.map(option =>
  m.callbackButton(option)
)));

module.exports.dayStartMenu = Telegraf.Extra.markup(m => m.keyboard(config.dayStartOptions.map(option =>
  m.callbackButton(option)
)));

module.exports.dayEndMenu = Telegraf.Extra.markup(m => m.keyboard(config.dayEndOptions.map(option =>
  m.callbackButton(option)
)));

module.exports.frequencyMenu = Telegraf.Extra.markup(m => m.keyboard(config.frequencyOptions.map(option =>
  m.callbackButton(option)
)));

module.exports.constructivenessMenu = Telegraf.Extra.markup(m => m.keyboard([
  "Very constructive",
  "Constructive",
  "Unconstructive",
  "Very unconstructive",
  "Not applicable",
  "Please remind me what that means"
].map(option =>
  m.callbackButton(option)
)));
