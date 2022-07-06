const { Markup } = require('telegraf');

const ConfigReader = require('./configReader');
const config = ConfigReader.getExpConfig();

/**
 *
 * Get the telegram button layout based on the options to choose
 * from and the number of columns the options should be evenly
 * distributed over.
 *
 * With multiChoice questions (when terminateWord) is passed,
 * the Done button always occurs on its own in the last row
 *
 * @param options Options to go on buttons
 * @param buttonLayoutCols number of columns to distribute over. Default is 1
 * @param terminateWord For multiChoice questions - text to terminate choice
 * @returns {*[]}
 */
module.exports.getButtonLayout = (options, buttonLayoutCols, terminateWord) => {
	// Validate inputs
	if(typeof buttonLayoutCols !== "number") buttonLayoutCols = undefined;
	buttonLayoutCols = Math.ceil(buttonLayoutCols);
	if(buttonLayoutCols < 1) buttonLayoutCols = undefined;
	if(buttonLayoutCols > options.length) buttonLayoutCols = options.length;

	// Either string or undefined
	if(typeof terminateWord !== "string") terminateWord = undefined;

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
