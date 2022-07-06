const { Telegraf, Markup } = require('telegraf');

const ConfigReader = require('./configReader');
const {copy} = require("request/lib/helpers");
const config = ConfigReader.getExpConfig();

module.exports.getButtonLayout = (options, buttonLayoutCols, terminateWord) => {
	if(typeof buttonLayoutCols !== "number") buttonLayoutCols = undefined;
	buttonLayoutCols = Math.ceil(buttonLayoutCols);
	if(buttonLayoutCols < 1) buttonLayoutCols = undefined;
	if(buttonLayoutCols > options.length) buttonLayoutCols = options.length;
	let updatedOptions;
	if(buttonLayoutCols) {
		updatedOptions = []
		let copyOptions = options.slice();
		while (copyOptions.length) {
			updatedOptions.push(copyOptions.splice(0, buttonLayoutCols))
		}
		if (terminateWord) updatedOptions.push([terminateWord]);
	} else{
		updatedOptions = options.slice();
		if(terminateWord) updatedOptions.push(terminateWord);
	}
	return updatedOptions;
}
module.exports.singleChoice = (options, buttonLayoutCols) => {
	return Markup.keyboard(this.getButtonLayout(options,buttonLayoutCols)).oneTime().resize();
};

module.exports.multiChoice = (options, language, buttonLayoutCols) => {
	const terminateKeyword = config.phrases.keyboards.terminateAnswer[language];
	return Markup.keyboard(this.getButtonLayout(options, buttonLayoutCols, terminateKeyword));
};

module.exports.removeKeyboard = () => {
	return Markup.removeKeyboard();
}
