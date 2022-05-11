require('dotenv').config();
const mongo = require('mongoose');
const { Telegraf } = require('telegraf');
const config = require('./json/config.json');
const DevConfig = require('./json/devConfig.json');
const participants = require('./src/apiControllers/participantApiController');
const experiments = require('./src/apiControllers/experimentApiController');
const idMaps = require('./src/apiControllers/idMapApiController');
const { checkConfig } = require('./src/configChecker');
const PIDtoConditionMap = require('./json/PIDCondMap.json')
const MessageSender = require('./src/messageSender')
const QuestionHandler = require('./src/questionHandler');
const AnswerHandler = require('./src/answerHandler');
const ScheduleHandler = require('./src/scheduleHandler');
const BOT_TOKEN =  process.env.BOT_TOKEN;
const PORT = process.env.PORT || 5000;
const URL = process.env.URL || "https://immense-caverns-61960.herokuapp.com"
const moment = require('moment-timezone')
const ConfigParser = require('./src/configParser')

const ExperimentUtils = require("./src/experimentUtils");
const {getByUniqueId} = require("./src/apiControllers/idMapApiController");

const local = process.argv[2];


// Validate the config file to ensure that it has all the necessary information
// This throws an error and aborts execution if there is something missing/wrong
// checkConfig();

const qHandler = new QuestionHandler(config);
const bot = new Telegraf(BOT_TOKEN);


//----------------------
//--- database setup ---
//----------------------
mongo.connect(process.env.DB_CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true }, err => {
  if (err) {
    console.log(err);
  } else {
    console.log('\x1b[42m\x1b[30m%s\x1b[0m', `Connected to the database`);
  }
});


//----------------------
//-- helper functions --
//----------------------

// Fetch the participant with error handling
let getParticipant = async (uniqueId) => {
  let participant;
  try{
    participant = await participants.get(uniqueId);
    return participant;
  } catch(err){
    console.log('Failed to get participant info from DB');
    console.error(err);
  }
}

// Fetch the experiment from database with error handling
let getExperiment = async (experimentId) => {
  let experiment;
  try{
    experiment = await experiments.get(experimentId);
    return experiment;
  } catch(err){
    console.log('Failed to get experiment info from DB');
    console.error(err);
  }
}

let getByChatId = async (experimentId, chatId) => {
    try{
        let foundMap = await idMaps.getByChatId(experimentId, chatId);
        return foundMap;
    } catch(err){
        console.log("Failed to get secret mapping")
        console.error(err);
    }

}

// Send the next question
let sendNextQuestion = async (bot, participant, chatId, nextQuestionId) => {

    let conditionName = participant["conditionName"];
    let language = participant.parameters["language"];

  // Get the updated participant
  let nextQObj = qHandler.constructQuestionByID(conditionName, nextQuestionId, language);
  if(nextQObj.returnCode === DevConfig.FAILURE_CODE){
    throw "ERROR: " + nextQObj.data;
  } else {
    let nextQ = nextQObj.data;
    await MessageSender.sendQuestion(bot, participant, chatId, nextQ);
  }

}

// Process what happens next based on the next actions,
//  reply messages, or next questions
let processNextSteps = async (bot, uniqueId) => {
  let participant = await getParticipant(uniqueId)
  let partLang = participant.parameters.language;
  let partCond = participant.conditionName;
  let currentQuestion = participant.currentQuestion;
  let debug = !!config.debug;

  let secretMap = await getByUniqueId(config.experimentId, uniqueId);
  if(!secretMap){
      throw "ERROR: PNS: Unable to find participant chat ID";
  }

    // Send replies to the answer, if any
    if(!!currentQuestion.replyMessages && currentQuestion.replyMessages.length > 0){
        await MessageSender.sendReplies(bot, participant, secretMap.chatId, currentQuestion.replyMessages);
    } else if(!!currentQuestion.cReplyMessages && currentQuestion.cReplyMessages.length > 0){
        let rules = currentQuestion.cReplyMessages;
        let options = currentQuestion.options;
        let lastAnswer = participant.currentAnswer;
        let replyMessagesObj = ConfigParser.evaluateAnswerConditions(rules, options, lastAnswer);
        if(replyMessagesObj.returnCode === DevConfig.FAILURE_CODE){
            throw "ERROR: Could not process conditional replies" + replyMessagesObj.data;
        } else if(replyMessagesObj.returnCode === DevConfig.SUCCESS_CODE){
            await MessageSender.sendReplies(bot, participant, secretMap.chatId, replyMessagesObj.data);
        }
    }

  // get all next actions
    let nextActions = [];
    if(!!currentQuestion.nextActions && currentQuestion.nextActions.length > 0){
        nextActions = currentQuestion.nextActions;
    } else if(!!currentQuestion.cNextActions && currentQuestion.cNextActions.length > 0){
        let nextActionsObj = ConfigParser.evaluateAnswerConditions(currentQuestion.cNextActions, currentQuestion.options, participant.currentAnswer)
        if(nextActionsObj.returnCode === DevConfig.FAILURE_CODE){
            throw "ERROR: Could not process cond next actions: " + nextActionsObj.data;
        } else if (nextActionsObj.returnCode === DevConfig.SUCCESS_CODE) {
            nextActions = nextActionsObj.data;
        }
    }
    // Process all next actions, if any
    for(let i = 0; i < nextActions.length; i++){
      let aType = nextActions[i];
      switch(aType){
          case "scheduleQuestions":
          // Debug to schedule all sets of scheduled questions in 3 minute intervals from now

            // TODO: have disabled overwriting for now, after implementation of /next
          if(debug && !debug){
            let nowDateObj = ExperimentUtils.getNowDateObject(participant.parameters.timezone);
            if(nowDateObj.returnCode === DevConfig.FAILURE_CODE){
              console.error(nowDateObj.data);
            }
            let qHandler = new QuestionHandler(config);
            let schQObj = qHandler.getScheduledQuestions(partCond);
            if(schQObj.returnCode === DevConfig.FAILURE_CODE){
              throw "ERROR: " + schQObj.data;
            }

            ScheduleHandler.overrideScheduleForIntervals(schQObj.data, nowDateObj.data, 1);
          }
          let returnObj = await ScheduleHandler.scheduleAllQuestions(bot, uniqueId, config, debug);
          if(returnObj.returnCode === DevConfig.FAILURE_CODE){
            throw "ERROR: " + returnObj.data;
          } else if(returnObj.returnCode === DevConfig.PARTIAL_FAILURE_CODE){
            throw "PARTIAL ERROR: " + returnObj.data;
          }
          break;
        case "assignToCondition":
          let experiment = await getExperiment(config.experimentId);
          let ID = participant.parameters.pId;
          if(!ID) ID = uniqueId;
          let scheme = config.assignmentScheme;
          let conditionRatios = experiment["conditionAssignments"];
          let currentAssignments = experiment["currentlyAssignedToCondition"];
          let conditionNames = experiment["experimentConditions"];
          let conditionObj = ExperimentUtils.assignToCondition(ID, PIDtoConditionMap, conditionRatios, currentAssignments, scheme);
          if(conditionObj.returnCode === DevConfig.FAILURE_CODE){
            throw "ERROR: " + conditionObj.data;
          }
          let assignedConditionIdx = conditionObj.data;
          let conditionName = conditionNames[assignedConditionIdx];
          if(debug){
            await MessageSender.sendMessage(bot, participant, secretMap.chatId, "You have been assigned to condition: " + conditionName);
          }
          await participants.updateField(uniqueId, "conditionIdx", assignedConditionIdx);
          await participants.updateField(uniqueId, "conditionName", conditionName);
          await experiments.updateConditionAssignees(config.experimentId, assignedConditionIdx, 1);
          break;
        default:
          throw "ERROR: aType not recognized"
      }
    }


  // get next question:
    let nextQuestion;
    if(!!currentQuestion.nextQuestion){
        nextQuestion = currentQuestion.nextQuestion;
    } else if(!!currentQuestion.cNextQuestions && currentQuestion.cNextQuestions.length > 0){
        let nextQuestionsObj = ConfigParser.evaluateAnswerConditions(currentQuestion.cNextQuestions,
            currentQuestion.options, participant.currentAnswer);
        if(nextQuestionsObj.returnCode === DevConfig.FAILURE_CODE){
            throw "ERROR: Unable to process cond next question: " + nextQuestionsObj.data;
        } else if(nextQuestionsObj.returnCode === DevConfig.SUCCESS_CODE){
            nextQuestion = nextQuestionsObj.data;
        }
    }
  // Process next question
  if(!!nextQuestion){
    await sendNextQuestion(bot, participant, secretMap.chatId, nextQuestion);
  }
}

//-----------------
//--- bot setup ---
//-----------------

// "handle" errors
bot.catch((err, ctx) => {
  console.error(`Encountered an error for ${ctx.updateType}.`, err);
});

bot.command('log_part', async ctx => {
    if(!config.debug) return;
    try{
      let secretMap = await getByChatId(config.experimentId, ctx.from.id);
      if(!secretMap){
          console.log("Unable to get participant unique id");
          return;
      }

    console.log('Logging participant.');
    let participant = await participants.get(secretMap.uniqueId);
    console.log(participant);
    // console.log(await bot.telegram.getChat(ctx.from.id));

  } catch (err){
    console.log('Failed to log participant');
    console.error(err);
  }
  
});


bot.command('log_exp', async ctx => {
    if(!config.debug) return;
    try{
    console.log('Logging experiment.');
    let experiment = await experiments.get(config.experimentId);
    console.log(experiment);
    let experimentIds = await idMaps.getExperiment(config.experimentId);
    console.log(experimentIds);
  } catch(err){
    console.log('Failed to log experiment');
    console.error(err);
  }
});

bot.command('delete_me', async ctx => {
    if(!config.debug) return;

    try{
      let secretMap = await getByChatId(config.experimentId, ctx.from.id);
      if(!secretMap){
          console.log('Participant does not exist!')
          return
      }
      let uniqueId = secretMap.uniqueId;
    let participant = await participants.get(uniqueId);
    if(!participant) {
      console.log('Participant does not exist!')
      return;
    }
    let conditionIdx = participant["conditionIdx"];
    await ScheduleHandler.removeAllJobsForParticipant(uniqueId);
    await participants.remove(uniqueId);
    await idMaps.deleteByChatId(config.experimentId, ctx.from.id);
    await experiments.updateConditionAssignees(config.experimentId, conditionIdx, -1);
    ctx.reply('Successfully deleted all your data. To use the bot again, use /start.');
    console.log(`${uniqueId} removed`);

  } catch(err){
    console.log('Failed to delete participant');
    console.error(err);
  }
});

bot.command('delete_exp', async ctx => {
  // TODO: Delete all participants when experiment is deleted?
  // TODO: OR add up all participants when experiment is created again?
  // TODO: OR perhaps recount each time the experiment starts up for a sanity check?
    if(!config.debug) return;
  try{
    let experiment = await experiments.get(config.experimentId);
    if(!experiment) {
      console.log('Experiment does not exist!')
      return;
    }

    await experiments.remove(config.experimentId);

      let experimentIds = await idMaps.getExperiment(config.experimentId);
      if(!experimentIds) {
          console.log('Experiment ID Mapping does not exist!')
          return;
      }

      await idMaps.remove(config.experimentId);

    ctx.reply('Successfully deleted your experiment.');
    console.log(`Experiment ${config.experimentId} removed`);

  } catch(err){
    console.log('Failed to delete experiment');
    console.error(err);
  }
});

bot.command('next', async ctx => {
    if(!config.debug) return;
    try{
        let secretMap = await idMaps.getByChatId(config.experimentId, ctx.from.id);
        if(!secretMap){
            console.log("Participant not initialized yet!");
            return;
        }
        let uniqueId = secretMap.uniqueId;
        if(!ScheduleHandler.debugQueue[uniqueId]) {
            console.log("No scheduled questions (yet)!");
            return;
        }
        let nextQObj = ScheduleHandler.debugQueue[uniqueId][0];

        let participant = await getParticipant(uniqueId);
        let partCond = participant.conditionName;
        let partLang = participant.parameters.language;

        let qHandler = new QuestionHandler(config);
        let nextQReturnObj = qHandler.constructQuestionByID(partCond, nextQObj.qId, partLang);
        if(nextQReturnObj.returnCode === DevConfig.FAILURE_CODE){
            throw "ERROR: " + nextQReturnObj.data;
        }
        let nextQuestion = nextQReturnObj.data;
        let nextQMsg = `This message will appear at ${nextQObj.atTime} on ${nextQObj.onDays.join('')}`;
        ExperimentUtils.rotateLeftByOne(ScheduleHandler.debugQueue[uniqueId]);
        await MessageSender.sendMessage(bot, participant, ctx.from.id, nextQMsg);
        await MessageSender.sendQuestion(bot, participant, ctx.from.id, nextQuestion)
    } catch(err){
        console.log("Failed to serve next scheduled question");
        console.error(err);
    }
})

// Repeat a question that has an outstanding answer
bot.command('repeat', async ctx => {
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    if(!secretMap){
        console.log("Participant unique ID not found!");
        return;
    }
    let uniqueId = secretMap.uniqueId;

  let participant = await getParticipant(uniqueId);

  if(participant.currentState === "awaitingAnswer"){
      await participants.updateField(uniqueId, "currentState", "repeatQuestion");
    let currentQuestion = participant.currentQuestion;
    await MessageSender.sendQuestion(bot, participant, ctx.from.id, currentQuestion)
  }

})

bot.start(async ctx => {
  console.log('Starting');
  // Check if experiment has already been initialized
  let experiment = await getExperiment(config.experimentId);
  // If not, add the experiment to the database and initialize
  //  with basic information
  if(!experiment){
    try{
      await experiments.add(config.experimentId);
      await experiments.initializeExperiment(config.experimentId, config.experimentName, config.experimentConditions, config.conditionAssignments);

      // Use the new experiment henceforth
      experiment = await experiments.get(config.experimentId);
    } catch(err){
      console.log('Failed to initialize new experiment');
      console.error(err);
    } 
  }

  //Check if ID Mapping exists for experiment already
    let experimentIds = await idMaps.getExperiment(config.experimentId);
  // If not, add it
    if(!experimentIds){
        try{
            await idMaps.addExperiment(config.experimentId);
        }catch(err){
            console.log('Failed to create new experiment for mapping');
            console.error(err);
        }
    }

    // Check if participant is already present in the ID Mapping system
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    let uniqueId;
    // if not, generate a new ID for the participant and add it
    if(!secretMap){
        try{
            uniqueId = await idMaps.generateUniqueId(config.experimentId);
            await idMaps.addIDMapping(config.experimentId, ctx.from.id, uniqueId);
        } catch(err){
            console.log('Unable to generate a new ID for participant!');
            console.error(err);
        }
    } else {
        uniqueId = secretMap.uniqueId;
    }

  // Check if the participant has already been added
  let participant = await getParticipant(uniqueId);

  // If not, add and initialize the participant with basic information
  if(!participant){
    try{
      await participants.add(uniqueId);
      await participants.updateField(uniqueId, 'experimentId', config.experimentId);
      await participants.updateField(uniqueId, 'parameters', { "language" : config.defaultLanguage });
      await participants.updateField(uniqueId, 'currentState', 'starting');

      // Use the new participant henceforth
      participant = await participants.get(uniqueId);
    } catch(err){
      console.log('Failed to initialize new participant');
      console.error(err);
    }
  }

  // Start the setup question chain
  let curQuestionObj = qHandler.getFirstQuestionInCategory(undefined, "setupQuestions", config.defaultLanguage);
  if(curQuestionObj.returnCode === -1){
    throw "ERROR: " + curQuestionObj.data;
  } else {
    let curQuestion = curQuestionObj.data;
    try{
      await MessageSender.sendQuestion(bot, participant, ctx.from.id, curQuestion);
    } catch(err){
      console.log('Failed to send language question');
      console.error(err);
    }
  }
});

// Handling any answer
bot.on('text', async ctx => {
  const messageText = ctx.message.text;
  // Ignore commands
  if(messageText.charAt[0] === '/') return;

  // Get the participants unique ID
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    if(!secretMap){
        console.log("Unable to find participant unique ID!");
        return;
    }
    let uniqueId = secretMap.uniqueId;
  // Get the participant
  let participant = await getParticipant(uniqueId);

  // Participant has not started yet
  if(!participant) return;

  const answerText = ctx.message.text;

  // Handle the answer and respond appropriately
  let answerHandlerObj = await AnswerHandler.processAnswer(participant, answerText);
  switch(answerHandlerObj.returnCode){
    // Answer was valid
    case DevConfig.SUCCESS_CODE:
      if(answerHandlerObj.data === DevConfig.NEXT_ACTION_STRING){
        // Move on to the next actions
        // Send this message only if participant has finished choosing from multi-choice
        if(participant.currentQuestion.qType === "multiChoice"){
          await MessageSender.sendMessage(bot, participant, ctx.from.id, config.phrases.keyboards.finishedChoosingReply[participant.parameters.language]);
        }
        // Process the next steps
        await processNextSteps(bot, uniqueId);
      }
      break;

    // Answer was invalid (not part of options, etc.)
    case DevConfig.PARTIAL_FAILURE_CODE:
      // Repeat the question
      if(answerHandlerObj.successData === DevConfig.REPEAT_QUESTION_STRING){
        await MessageSender.sendMessage(bot, participant, ctx.from.id, answerHandlerObj.failData);
        await MessageSender.sendQuestion(bot, participant, ctx.from.id, participant.currentQuestion)
      }
      break;

    // Failure occurred
    case DevConfig.FAILURE_CODE:
      throw "ERROR: " + answerHandlerObj.data;

    default:
      throw "ERROR: Answer Handler did not respond appropriately"
  }
  
});

// Reschedule all operations after server restart
ScheduleHandler.rescheduleAllOperations(bot, config).then(returnObj => {
  console.log('Listening to humans');
  if(!!local && local === "-l"){
    console.log('Local launch')
    bot.launch();
  } else {
    console.log('Server launch');
    bot.launch({
      webhook: {
        domain: URL,
        port: PORT
      }
    });
  }
});


/**
// handle /delete_me command
bot.command('delete_me', ctx => {
  participants.get(ctx.from.id).then(participant => {
    let dId = `d_${ctx.from.id}`;
    let wId = `w_${ctx.from.id}`;
    console.log('Before delete');
    console.log(scheduledJobs);
    if (!!scheduledJobs[dId]) {
      scheduledJobs[dId].cancel();
    }
    if (!!scheduledJobs[wId]) {
      scheduledJobs[wId].cancel();
    }
    participants.remove(ctx.from.id).then(() => {
      ctx.reply('Successfully deleted all your data. To use the bot again, use /start.', removeMenu);
      console.log(`${ctx.from.id} removed`);
      
    });
  });
});

// handle /debug command
bot.command('debug', ctx => {
  participants.get(ctx.from.id).then(participant => {
    participants.updateField(participant.uniqueId, 'debug', !participant.debug);
    ctx.reply(`debug set to ${!participant.debug}`, removeMenu);
  });
});

// reschedule old tasks after server restart
participants.getAll().then(allParticipants => {
  for (const participant of allParticipants.filter(p => !!p.dailyScheduleExpression)) {
    scheduledJobs[`stillAskReset_${participant.uniqueId}`] = schedule.scheduleJob(
      { rule: '45 23 * * *', tz: participant.timezone || defaultTimezone }, 
      () => {
        participants.updateField(participant.uniqueId, 'stillAsk', true);
      }
    );
    console.log(`${participant.uniqueId} ${moment().tz(participant.timezone || defaultTimezone).format()}`);
    scheduledJobs[`d_${participant.uniqueId}`] = schedule.scheduleJob(
      { rule: participant.dailyScheduleExpression, tz: participant.timezone || defaultTimezone },
      () => {
        participants.get(participant.uniqueId).then(realTimeParticipant => {
          let timeStamp = realTimeParticipant.debug ? ` [server time: ${moment().format('DD.MM. HH:mm')}] (restart)` : '';
          if (realTimeParticipant.stillAsk) {
            bot.telegram.sendMessage(
              realTimeParticipant.uniqueId,
              config.questions[0].text + timeStamp,
              Telegraf.Extra.markup(m => m.keyboard(config.questions[0].options.map(option =>
                m.callbackButton(option)
              )))
            );
            participants.updateField(realTimeParticipant.uniqueId, 'nextCategory', config.questions[0].category);
            participants.updateField(realTimeParticipant.uniqueId, 'stillAsk', false);
          }
        });
      }
    );
    if (config.customFrequency) {
      scheduledJobs[`w_${participant.uniqueId}`] = schedule.scheduleJob(
        { rule: participant.weeklyScheduleExpression, tz: participant.timezone || defaultTimezone }, 
        () => {
          bot.telegram.sendMessage(participant.uniqueId, config.frequencyQuestion, frequencyMenu);
        }
      );
    }
  }
  console.log(scheduledJobs);
});


// handle /start command
bot.start(ctx => {
  experiments.get(config.experiment_name).then(experiment => {
    if(!experiment){
      experiments.add(config.experiment_name).then(() => {
        experiment.updateField(config.experiment_name, 'conditions', config.experiment_conditions)
      })
    }
  })
  participants.get(ctx.from.id).then(participant => {
    if (!participant) {
      participants.add(ctx.from.id).then(() => {
        participants.updateField(ctx.from.id, 'expt_name', config.experiment_name);
        if (!config.customDayStartAndEnd) {
          participants.updateField(ctx.from.id, 'dayStart', config.defaultDayStart);
          participants.updateField(ctx.from.id, 'dayEnd', config.defaultDayEnd);
        }
        if (config.customFrequency) {
          participants.updateField(ctx.from.id, 'frequency', config.defaultFrequency);
        }
      });
    }
  });

  let delay = 1;
  for (const [i, message] of config.startMessages.entries()) {
    schedule.scheduleJob(moment().add(delay, 's').format('ss mm HH DD MM ?'), () => {
      ctx.reply(message, i === config.startMessages.length - 1 ? shareDataMenu : removeMenu);
      ctx.telegram.sendChatAction(ctx.from.id, 'typing');
    });
    delay += 0.5; //config.debug ? 0.5 : message.length / 27;
  }
});

// handle answers to the question about sharing data preference
bot.hears(config.shareDataOptions, ctx => {
  participants.updateField(ctx.from.id, 'shareData', ctx.message.text);
  ctx.reply(config.timezoneQuestion, frequentTimezonesMenu);
});

// handle answers to the question about the timezone
bot.hears(config.frequentTimezones, ctx => {
  if (ctx.message.text === 'other') {
    ctx.reply(config.timezoneQuestion, allTimezonesMenu);
  } else {
    participants.updateField(ctx.from.id, 'timezone', ctx.message.text);
    if (config.customDayStartAndEnd) {
      ctx.reply(config.dayStartQuestion, dayStartMenu);
    } else {
      participants.updateField(ctx.from.id, 'dayStart', config.defaultDayStart);
      participants.updateField(ctx.from.id, 'dayEnd', config.defaultDayEnd);
      if (config.customFrequency) {
        ctx.reply(config.frequencyQuestion, frequencyMenu);
      } else {
        participants.updateField(ctx.from.id, 'frequency', config.defaultFrequency);
        scheduleNew(ctx, config.defaultFrequency);
      }
    }
  }
});

// handle answers to the question about timezones after selecting "other"
bot.hears(timezones, ctx => {
  participants.updateField(ctx.from.id, 'timezone', ctx.message.id);
  if (config.customDayStartAndEnd) {
    ctx.reply(config.dayStartQuestion, dayStartMenu);
  } else {
    participants.updateField(ctx.from.id, 'dayStart', config.defaultDayStart);
    participants.updateField(ctx.from.id, 'dayEnd', config.defaultDayEnd);
    if (config.customFrequency) {
      ctx.reply(config.frequencyQuestion, frequencyMenu);
    } else {
      participants.updateField(ctx.from.id, 'frequency', config.defaultFrequency);
      scheduleNew(ctx, config.defaultFrequency);
    }
  }
});

// handle answers to the question about the start of the day
bot.hears(config.dayStartOptions, ctx => {
  participants.updateField(ctx.from.id, 'dayStart', ctx.message.text);
  ctx.reply(config.dayEndQuestion, dayEndMenu);
});

// handle answers to the question about the end of the day
bot.hears(config.dayEndOptions, ctx => {
  participants.updateField(ctx.from.id, 'dayEnd', ctx.message.text);
  if (config.customFrequency) {
    ctx.reply(config.frequencyQuestion, frequencyMenu);
  } else {
    participants.updateField(ctx.from.id, 'frequency', config.defaultFrequency);
  }
});

// handle answers to the question about frequency and schedule questions accordingly
bot.hears(config.frequencyOptions, ctx => {
  participants.updateField(ctx.from.id, 'frequency', ctx.message.text);
  scheduleNew(ctx, ctx.message.text);
});
let scheduleNew = function(ctx, freq) {
  console.log('scheduling');
  const freqString = freq;
  participants.get(ctx.from.id).then(participant => {
    const weeklyExpression = moment().tz(participant.timezone || defaultTimezone)
      .add(7, 'd').format('mm HH ? * dddd');
    scheduledJobs[`w_${ctx.from.id}`] = schedule.scheduleJob(
      { rule: weeklyExpression, tz: participant.timezone || defaultTimezone }, 
      () => {
        ctx.reply(config.frequencyQuestion, frequencyMenu);
      }
    );
    participants.updateField(ctx.from.id, 'weeklyScheduleExpression', weeklyExpression);
    console.log('w: ' + weeklyExpression);
    

    

    let start = participant.dayStart, end = participant.dayEnd;
    freq = freq.replace(/\D/g, '');
    freq = freq.length === 0 ? '' : parseInt(freq);
    mins = participant.debug ? '*' : '0';
    
    scheduledJobs[`d_${ctx.from.id}`] = schedule.scheduleJob(
      { rule: expression, tz: participant.timezone || defaultTimezone },
      () => {
        participants.get(ctx.from.id).then(realTimeParticipant => {
          let timeStamp = realTimeParticipant.debug ? ` [server time: ${moment().format('DD.MM. HH:mm')}]` : '';
          if (realTimeParticipant.stillAsk) {
            // ask the first question of the block
            ctx.reply(
              config.questions[0].text + timeStamp,
              Telegraf.Extra.markup(m => m.keyboard(config.questions[0].options.map(option =>
                m.callbackButton(option)
              )))
            );
            participants.updateField(ctx.from.id, 'nextCategory', config.questions[0].category);
            participants.updateField(ctx.from.id, 'stillAsk', false);
          }
        });
      }
    );
    participants.updateField(ctx.from.id, 'dailyScheduleExpression', expression);
    participants.updateField(ctx.from.id, 'stillAsk', true);

    if (freq === '') {
      ctx.reply(`Got it! You will be asked questions ${freqString} every day at ${start}`, removeMenu);
    } else {
      let now = moment().tz(participant.timezone || defaultTimezone);
      let firstDay = now.hours() >= parseInt(end.substr(0, 2)) ? 'tomorrow' : 'today';
      let first = start;
      if (firstDay === 'today') {
        for (let i = parseInt(start.substr(0,2)); i <= parseInt(end.substr(0,2)); i += freq === 30 ? 1 : freq) {
          if (now.hours() < i) {
            first = freq === 30 && now.minutes() < 30
            ? moment().tz(participant.timezone || defaultTimezone).hours(i - 1).minutes(30).format('HH:mm')
            : moment().tz(participant.timezone || defaultTimezone).hours(i).minutes(0).format('HH:mm');
            break;
          }
        }
      }
      ctx.reply(
        `Got it! You will be asked questions ${freqString} every day between ${start} and ${end} starting ${firstDay} at ${first}`,
        removeMenu
      );
    }
  });
  console.log(scheduledJobs);
}

bot.hears([].concat.apply([], config.questions.map(q => q.options)), ctx => {
  // finding the question to which the answer was given relies on purpose on the options here
  // to minimise bugs caused by incorrectly updated set nextCategory
  const question = config.questions.find(q => q.options.indexOf(ctx.message.text) > -1);
  participants.updateField(ctx.from.id, 'stillAsk', true);
  participants.updateLastAnswerField(ctx.from.id, 'category', question.category, true);
  participants.updateLastAnswerField(ctx.from.id, 'question', question.text);
  participants.updateLastAnswerField(ctx.from.id, 'text', ctx.message.text);
  sendFeedback(ctx, question);
  // an example of a custom question for a particular answer
  if (question.options[optionId] === 'Please remind me what that means') {
    ctx.reply(question.text, constructivenessMenu); // an example of a predefined menu (imported from menus.js)
  } else if (false) {// add your own condition
    // insert the custom question
  } else {
    const questionId = config.questions.indexOf(question);
    if (config.questions.length > questionId + 1) {
      const nextQuestion = config.questions[questionId + 1];
      participants.updateField(ctx.from.id, 'nextCategory', nextQuestion.category);
      ctx.reply(nextQuestion.text, Telegraf.Extra.markup(m => m.keyboard(nextQuestion.options.map(option =>
        m.callbackButton(option)
      ))));
    } else {
      participants.updateField(ctx.from.id, 'nextCategory', config.questions[0].category);
    }
  }
});

const sendFeedback = (ctx, question) => {
  const optionId = question.options.indexOf(ctx.message.text);
  if (question.feedback.length === 0) {
    question.feedback.push('Got it.');
  }
  question.feedback[optionId].forEach(message => {
    ctx.reply(message, removeMenu);
  });
}

// handle answers to questions without any options specified
bot.on('text', ctx => {
  console.log('text_received')
  console.log(ctx.from);
  participants.updateField(ctx.from.id, 'stillAsk', true);
  participants.get(ctx.from.id).then(participant => {
    const question = config.questions.find(q => q.category === participant.nextCategory);
    participants.updateLastAnswerField(ctx.from.id, 'category', question.category, true);
    participants.updateLastAnswerField(ctx.from.id, 'question', question.text);
    participants.updateLastAnswerField(ctx.from.id, 'text', ctx.message.text);
    const questionId = config.questions.indexOf(question);
    if (config.questions.length > questionId + 1) {
      const nextQuestion = config.questions[questionId + 1];
      participants.updateField(ctx.from.id, 'nextCategory', nextQuestion.category);
      ctx.reply(nextQuestion.text, Telegraf.Extra.markup(m => m.keyboard(nextQuestion.options.map(option =>
        m.callbackButton(option)
      ))));
    } else {
      participants.updateField(ctx.from.id, 'nextCategory', config.questions[0].category);
    }
  });
});

bot.on('sticker', ctx => {
  console.log('Sticker received');
  console.log(ctx.message);
  ctx.reply('this is \n  *bold*  and _italic_  bruhhh', ['pick one', 'two']);//, { parse_mode: 'MarkdownV2' });
  // ctx.reply(':cry:');
});


bot.on('photo', ctx => {
  console.log('photo received');
  console.log(ctx.message);
  for(const pho of ctx.message.photo){
    ctx.telegram.getFileLink(pho.file_id).then(url => console.log(url));
  }
});
bot.on('voice', ctx => {
  console.log('voice received');
  ctx.reply('\xF0\x9F\x98\x81');
  ctx.reply('\U0001F525');
  console.log(ctx.message);
  ctx.telegram.getFileLink(ctx.message.voice.file_id).then(url => console.log(url));
  
});

bot.launch();

**/