const { Telegraf, Markup } = require('telegraf');
const config = require('../json/config.json');
const participants = require('./apiControllers/participantApiController');
const InputOptions = require('./inputOptions');

/**
 * Sends a question to the bot user based on the type of question
 * and the text as specified in the question object (see questionHandler.js)
 *
 * @param ctx current telegram context
 * @param question question object
 * @returns {Promise<void>}
 */
module.exports.sendQuestion = async (ctx, question) => {
    let participant = await participants.get(ctx.from.id);
    let language = participant.parameters.language;
    let delayMs = 300;
    switch(question.qType){
        case 'singleChoice':
            await ctx.replyWithHTML(question.text, InputOptions.removeKeyboard());
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
            await ctx.replyWithHTML(config.phrases.keyboards.singleChoice[language], InputOptions.singleChoice(question.options));
            break;
        case 'multiChoice':
            await ctx.replyWithHTML(question.text, InputOptions.removeKeyboard());
            await new Promise(res => {
                setTimeout(res, delayMs)
            });
            await ctx.replyWithHTML(config.phrases.keyboards.multiChoice[language], InputOptions.multiChoice(question.options, language));
            break;
        case 'freeform':
            await ctx.replyWithHTML(question.text, InputOptions.removeKeyboard());
            break;
        default:
            throw "Message Sender: Question type not recognized"
    }
    await participants.updateField(ctx.from.id, 'currentState', 'awaitingAnswer');
    await participants.eraseCurrentAnswer(ctx.from.id)
    await participants.updateField(ctx.from.id, 'currentQuestion', question);
}

/**
 * Sends list of replies from question.replyMessages, with delay in between
 * each message
 *
 * @param ctx current telegram context
 * @param question question object
 * @returns {Promise<*>}
 */
module.exports.sendReplies = async (ctx, question) => {
	if(!question.replyMessages) return question;

    // TODO: Set reply delay based on length of message?
    // TODO: Send typing notification while typing out message?
	const delayMs = 500;
	for(let i = 0; i < question.replyMessages.length; i++){
		const reply = question.replyMessages[i];
        await new Promise(res => {
            setTimeout(res, delayMs)
        });
		await ctx.replyWithHTML(reply, InputOptions.removeKeyboard());

	}
    await new Promise(res => {
        setTimeout(res, delayMs)
    });
}

module.exports.sendMessage = async (ctx, message) => {
    await ctx.replyWithHTML(message, InputOptions.removeKeyboard());
}
