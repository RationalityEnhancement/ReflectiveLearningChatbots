const { Telegraf, Markup } = require('telegraf');
const config = require('../json/config.json');
const participants = require('./apiControllers/participantApiController');
const InputOptions = require('./keyboards');


module.exports.sendQuestion = async (ctx, question) => {
  await participants.updateField(ctx.from.id, 'currentState', 'awaitingAnswer');
  await participants.updateField(ctx.from.id, 'currentQuestion', question);
  
  switch(question.qType){
    case 'singleChoice':
      ctx.replyWithHTML(question.text, InputOptions.singleChoice(question.options));
      break;
    default:
      throw "ERROR: Question type not recognized"
  }
}
module.exports.sendReplies = async (ctx, question) => {
	if(!question.replyMessages) return question;
	const delayMs = 1000;
	for(let i = 0; i < question.replyMessages.length; i++){
		const reply = question.replyMessages[i];
		ctx.replyWithHTML(reply);
		await new Promise(res => {
			setTimeout(()=>{}, 1000)
		});
	}
  	
}
