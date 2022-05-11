const config = require('../json/config.json');
const DevConfig = require('../json/devConfig.json');
const participants = require('./apiControllers/participantApiController');
const InputOptions = require('./inputOptions');
const AnswerHandler = require('./answerHandler');
const idMaps = require('./apiControllers/idMapApiController')
const ConfigParser = require('./configParser');


let substituteVariables = (participant, text, sensitiveDataAlso) => {
    let newText = text;
    let varReplaceObj = ConfigParser.replaceVariablesInString(participant, text, sensitiveDataAlso);
    if(varReplaceObj.returnCode === DevConfig.SUCCESS_CODE) newText = varReplaceObj.data;
    return newText;
}

/**
 * Sends a question to the bot user based on the type of question
 * and the text as specified in the question object (see questionHandler.js)
 *
 * @param bot current telegram bot instance
 * @param chatId telegram chatId of user to send message to
 * @param question question object
 * @returns {Promise<void>}
 */
module.exports.sendQuestion = async (bot, participant, chatId, question) => {

    let language = participant.parameters.language;
    let delayMs = 300;

    let userInfo = await bot.telegram.getChat(chatId);
    participant["firstName"] = userInfo.first_name;

    question.text = substituteVariables(participant, question.text, false);

    // Handle any outstanding questions before sending next question.
    await AnswerHandler.handleNoResponse(participant.uniqueId);

    switch(question.qType){
        case 'singleChoice':
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            await new Promise(res => {
                setTimeout(res, delayMs)
            });

            await bot.telegram.sendMessage(chatId, substituteVariables(participant, config.phrases.keyboards.singleChoice[language], true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.singleChoice(question.options).reply_markup
            });
            break;

        case 'multiChoice':

            await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, config.phrases.keyboards.multiChoice[language], true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.multiChoice(question.options, language).reply_markup
            });
            break;
        case 'freeform':
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            break;
        default:
            throw "Message Sender: Question type not recognized"
    }
    await participants.updateField(participant.uniqueId, 'currentState', 'awaitingAnswer');
    await participants.eraseCurrentAnswer(participant.uniqueId)
    await participants.updateField(participant.uniqueId, 'currentQuestion', question);
}

/**
 * Sends list of replies from question.replyMessages, with delay in between
 * each message
 *
 * @param bot current telegram bot instance
 * @param chatId chatId of user to send message to
 * @param replyMessages array of reply messages
 * @returns {Promise<*>}
 */
module.exports.sendReplies = async (bot, participant, chatId, replyMessages) => {

    let userInfo = await bot.telegram.getChat(chatId);
    participant["firstName"] = userInfo.first_name;

    // TODO: Set reply delay based on length of message?
    // TODO: Send typing notification while typing out message?
	const delayMs = 500;
	for(let i = 0; i < replyMessages.length; i++){
		const reply = replyMessages[i];
        await new Promise(res => {
            setTimeout(res, delayMs)
        });
		await bot.telegram.sendMessage(chatId, substituteVariables(participant, reply, true), {
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
module.exports.sendMessage = async (bot, participant, chatId, message) => {

    let userInfo = await bot.telegram.getChat(chatId);
    participant["firstName"] = userInfo.first_name;

    await bot.telegram.sendMessage(chatId, substituteVariables(participant, message, true), {
        parse_mode: "HTML",
        reply_markup: InputOptions.removeKeyboard().reply_markup
    });
}
