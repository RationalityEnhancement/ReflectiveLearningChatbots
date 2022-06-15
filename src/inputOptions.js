const { Telegraf, Markup } = require('telegraf');

const ConfigReader = require('./configReader');
const config = ConfigReader.getExpConfig();

module.exports.singleChoice = (options) => {
	return Markup.keyboard(options).oneTime().resize();
};

module.exports.multiChoice = (options, language) => {
	const terminateKeyword = config.phrases.keyboards.terminateAnswer[language];
	let optionsCopy = options.slice()
	optionsCopy.push(terminateKeyword);
	return Markup.keyboard(optionsCopy);
};

module.exports.removeKeyboard = () => {
	return Markup.removeKeyboard();
}
