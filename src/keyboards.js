const { Telegraf, Markup } = require('telegraf');
const config = require('../json/config.json');


module.exports.singleChoice = (options) => {
	return Markup.keyboard(options).oneTime().resize();
};

module.exports.multiChoice = (options, language) => {
	const terminateKeyword = config.phrases.keyboards.terminateMultipleChoice[language];
	let optionsCopy = options.slice()
	optionsCopy.push(terminateKeyword);
	return Markup.keyboard(optionsCopy);
};

module.exports.removeKeyboard = () => {
	return Markup.removeKeyboard();
}
