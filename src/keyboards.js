const { Telegraf, Markup } = require('telegraf');
const config = require('../json/config.json');


module.exports.singleChoice = (options) => {
	return Markup.keyboard(options).oneTime().resize();
};

module.exports.multipleChoice = (options, language) => {
	const terminateKeyword = config.phrases.terminateMultipleChoice[language];
	options.push(terminateKeyword);
	return Markup.keyboard(options).resize();
};

module.exports.removeKeyboard = () => {
	return Markup.removeKeyboard();
}
