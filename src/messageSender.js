const config = require('../json/config.json');
const participants = require('./apiControllers/participantApiController');
const InputOptions = require('./inputOptions');
const AnswerHandler = require('./answerHandler');

/**
 * Sends a question to the bot user based on the type of question
 * and the text as specified in the question object (see questionHandler.js)
 *
 * @param bot current telegram bot instance
 * @param chatId telegram chatId of user to send message to
 * @param question question object
 * @returns {Promise<void>}
 */
module.exports.sendQuestion = async (bot, chatId, question) => {
    let participant = await participants.get(chatId);
    let language = participant.parameters.language;
    let delayMs = 300;

    // Handle any outstanding questions before sending next question.
    await AnswerHandler.handleNoResponse(chatId);

    switch(question.qType){
        case 'singleChoice':
            await bot.telegram.sendMessage(chatId, question.text, {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
            await bot.telegram.sendMessage(chatId, config.phrases.keyboards.singleChoice[language], {
                parse_mode: "HTML",
                reply_markup: InputOptions.singleChoice(question.options).reply_markup
            });
            break;
        case 'multiChoice':
            await bot.telegram.sendMessage(chatId, question.text, {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
            await bot.telegram.sendMessage(chatId, config.phrases.keyboards.multiChoice[language], {
                parse_mode: "HTML",
                reply_markup: InputOptions.multiChoice(question.options, language).reply_markup
            });
            break;
        case 'freeform':
            await bot.telegram.sendMessage(chatId, question.text, {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            break;
        default:
            throw "Message Sender: Question type not recognized"
    }
    await participants.updateField(chatId, 'currentState', 'awaitingAnswer');
    await participants.eraseCurrentAnswer(chatId)
    await participants.updateField(chatId, 'currentQuestion', question);
}

/**
 * Sends list of replies from question.replyMessages, with delay in between
 * each message
 *
 * @param bot current telegram bot instance
 * @param chatId chatId of user to send message to
 * @param question question object
 * @returns {Promise<*>}
 */
module.exports.sendReplies = async (bot, chatId, question) => {
	if(!question.replyMessages) return question;

    // TODO: Set reply delay based on length of message?
    // TODO: Send typing notification while typing out message?
	const delayMs = 500;
	for(let i = 0; i < question.replyMessages.length; i++){
		const reply = question.replyMessages[i];
        await new Promise(res => {
            setTimeout(res, delayMs)
        });
		await bot.telegram.sendMessage(chatId, reply, {
            parse_mode: "HTML",
            reply_markup: InputOptions.removeKeyboard().reply_markup
        });

	}
    await new Promise(res => {
        setTimeout(res, delayMs)
    });
}

/**
 * Sends simple message
 *
 * @param bot current telegram bot instance
 * @param chatId chatId of user to send message to
 * @param message message to be sent
 * @returns {Promise<*>}
 */
module.exports.sendMessage = async (bot, chatId, message) => {
    await bot.telegram.sendMessage(chatId, message, {
        parse_mode: "HTML",
        reply_markup: InputOptions.removeKeyboard().reply_markup
    });
}
