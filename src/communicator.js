const config = require('../json/config.json');
const DevConfig = require('../json/devConfig.json');
const participants = require('./apiControllers/participantApiController');
const InputOptions = require('./inputOptions');
const AnswerHandler = require('./answerHandler');
const idMaps = require('./apiControllers/idMapApiController')
const ConfigParser = require('./configParser');

const msPerCharacter = DevConfig.MS_PER_CHARACTER_DELAY;
/**
 * This class deals with all of the direct communication with
 * the user. Mainly sends questions and messages.
 *
 */

/**
 *  Substitute variables for a given string with error handling
 *  if error occurs, return original string without replacing any variables
 *
 * @param participant
 * @param text
 * @param sensitiveDataAlso
 * @returns {*}
 */
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
 * Also sends prompt messages as required for the question type, after a delay
 *
 * @param bot current telegram bot instance
 * @param participant object of current participant
 * @param chatId telegram chatId of user to send message to
 * @param question question object
 * @param noDelay
 * @returns {Promise<void>}
 */
module.exports.sendQuestion = async (bot, participant, chatId, question, noDelay = false) => {

    let language = participant.parameters.language;
    let delayMs = 500;

    if(!("firstName" in participant) || !participant["firstName"]){
        let userInfo = await bot.telegram.getChat(chatId);
        participant["firstName"] = userInfo.first_name;
    }

    question.text = substituteVariables(participant, question.text, false);

    // Handle any outstanding questions before sending next question.
    await AnswerHandler.handleNoResponse(participant.uniqueId);

    let qLength = question.text.length;
    let qDelayMs = qLength * msPerCharacter;

    // Simulate typing by adding delay and sending chat action
    if(!noDelay){
        bot.telegram.sendChatAction(chatId, "typing");
        await new Promise(res => {
            setTimeout(res, qDelayMs)
        });
    }
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
        case 'number':
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });

            break;
        case 'freeform':
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, config.phrases.keyboards.freeformSinglePrompt[language], true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            break;
        case 'freeformMulti':
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, config.phrases.keyboards.freeformMultiPrompt[language], true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });
            break;
        case 'qualtrics' :
            let link = question.qualtricsLink;

            // Send the question text
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, question.text, true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });

            // Send the prompt to fill the link
            await new Promise(res => {
                setTimeout(res, delayMs * 2)
            });
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, config.phrases.keyboards.qualtricsFillPrompt[language], true), {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });

            // Send the link
            let linkRef = "\<a href='" + substituteVariables(participant, link, true) + "'\> " +
                config.phrases.keyboards.linkToSurvey[language] + " </a>";
            await new Promise(res => {
                setTimeout(res, delayMs * 2)
            });
            await bot.telegram.sendMessage(chatId, linkRef, {
                parse_mode: "HTML",
                reply_markup: InputOptions.removeKeyboard().reply_markup
            });

            // Send the instruction on how to continue
            await new Promise(res => {
                setTimeout(res, delayMs * 2)
            });
            await bot.telegram.sendMessage(chatId, substituteVariables(participant, config.phrases.keyboards.qualtricsDonePrompt[language], true), {
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
module.exports.sendReplies = async (bot, participant, chatId, replyMessages, noDelay = false) => {

    if(!("firstName" in participant) || !participant["firstName"]){
        let userInfo = await bot.telegram.getChat(chatId);
        participant["firstName"] = userInfo.first_name;
    }

    // Send each reply message
	for(let i = 0; i < replyMessages.length; i++){
		const reply = replyMessages[i];

        // Simulate typing by adding delay and sending chat action
        if(!noDelay){
            bot.telegram.sendChatAction(chatId, "typing");
            let delayMs = reply.length * msPerCharacter;
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
        }

        // Send the message
		await bot.telegram.sendMessage(chatId, substituteVariables(participant, reply, true), {
            parse_mode: "HTML",
            reply_markup: InputOptions.removeKeyboard().reply_markup
        });
	}

    await new Promise(res => {
        setTimeout(res, 300)
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
module.exports.sendMessage = async (bot, participant, chatId, message, noDelay = false) => {

    if(!("firstName" in participant) || !participant["firstName"]){
        let userInfo = await bot.telegram.getChat(chatId);
        participant["firstName"] = userInfo.first_name;
    }

    let delayMs = message.length * msPerCharacter;

    // Simulate typing by adding delay and sending chat action
    if(!noDelay){
        bot.telegram.sendChatAction(chatId, "typing");
        await new Promise(res => {
            setTimeout(res, delayMs)
        });
    }
    await bot.telegram.sendMessage(chatId, substituteVariables(participant, message, true), {
        parse_mode: "HTML",
        reply_markup: InputOptions.removeKeyboard().reply_markup
    });
}
