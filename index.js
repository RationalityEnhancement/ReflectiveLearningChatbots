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
const Communicator = require('./src/communicator')
const QuestionHandler = require('./src/questionHandler');
const AnswerHandler = require('./src/answerHandler');
const ScheduleHandler = require('./src/scheduleHandler');
const BOT_TOKEN =  process.env.BOT_TOKEN;
const PORT = process.env.PORT || 5000;
const URL = process.env.URL || "https://immense-caverns-61960.herokuapp.com"
const moment = require('moment-timezone')
const ConfigParser = require('./src/configParser')
const LogicHandler = require('./src/logicHandler')

const ExperimentUtils = require("./src/experimentUtils");
const {getByUniqueId} = require("./src/apiControllers/idMapApiController");
const {next} = require("lodash/seq");

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

    let debugDev = config.debugDev;
    let debugExp = config.debugExp;
  // Get the updated participant
  let nextQObj = qHandler.constructQuestionByID(conditionName, nextQuestionId, language);
  if(nextQObj.returnCode === DevConfig.FAILURE_CODE){
    throw "ERROR: " + nextQObj.data;
  } else {
    let nextQ = nextQObj.data;
    await Communicator.sendQuestion(bot, participant, chatId, nextQ, debugExp);
  }

}

// Process what happens next based on the next actions,
//  reply messages, or next questions
let processNextSteps = async (bot, uniqueId) => {
  let participant = await getParticipant(uniqueId)
  let partLang = participant.parameters.language;
  let partCond = participant.conditionName;
  let currentQuestion = participant.currentQuestion;
  let debugDev = !!config.debugDev;
  let debugExp = !!config.debugExp;

  let secretMap = await getByUniqueId(config.experimentId, uniqueId);
  if(!secretMap){
      throw "ERROR: PNS: Unable to find participant chat ID";
  }

    // Send replies to the answer, if any
    if(!!currentQuestion.replyMessages && currentQuestion.replyMessages.length > 0){
        await Communicator.sendReplies(bot, participant, secretMap.chatId, currentQuestion.replyMessages, config.debugExp);
    } else if(!!currentQuestion.cReplyMessages && currentQuestion.cReplyMessages.length > 0){
        let rules = currentQuestion.cReplyMessages;
        let options = currentQuestion.options;
        let lastAnswer = participant.currentAnswer;
        let replyMessagesObj = ConfigParser.evaluateAnswerConditions(rules, options, lastAnswer);
        if(replyMessagesObj.returnCode === DevConfig.FAILURE_CODE){
            throw "ERROR: Could not process conditional replies" + replyMessagesObj.data;
        } else if(replyMessagesObj.returnCode === DevConfig.SUCCESS_CODE){
            await Communicator.sendReplies(bot, participant, secretMap.chatId, replyMessagesObj.data, config.debugExp);
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


            // TODO: have disabled overwriting for now, after implementation of /next
          // Debug to schedule all sets of scheduled questions in 3 minute intervals from now
          // if(debugDev && !debugDev){
          //   let nowDateObj = ExperimentUtils.getNowDateObject(participant.parameters.timezone);
          //   if(nowDateObj.returnCode === DevConfig.FAILURE_CODE){
          //     console.error(nowDateObj.data);
          //   }
          //   let qHandler = new QuestionHandler(config);
          //   let schQObj = qHandler.getScheduledQuestions(partCond);
          //   if(schQObj.returnCode === DevConfig.FAILURE_CODE){
          //     throw "ERROR: " + schQObj.data;
          //   }
          //
          //   ScheduleHandler.overrideScheduleForIntervals(schQObj.data, nowDateObj.data, 1);
          // }

          let returnObj = await ScheduleHandler.scheduleAllQuestions(bot, uniqueId, config, debugExp);
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
          if(debugExp){
            await Communicator.sendMessage(bot, participant, secretMap.chatId, "(Debug) You have been assigned to condition: " + conditionName, config.debugExp);
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
    if(!config.debugExp) return;
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
    if(!config.debugExp) return;
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
    if(!config.debugExp) return;

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
    if(!config.debugExp) return;
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
    if(!config.debugExp) return;
    try{
        let debugExp = config.debugExp;
        let debugDev = config.debugDev;
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
        await Communicator.sendMessage(bot, participant, ctx.from.id, nextQMsg, debugExp);
        await LogicHandler.sendQuestion(bot, participant, ctx.from.id, nextQuestion, debugExp)
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
    await LogicHandler.sendQuestion(bot, participant, ctx.from.id, currentQuestion, true)
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
      await LogicHandler.sendQuestion(bot, participant, ctx.from.id, curQuestion, config.debugExp);
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
          await Communicator.sendMessage(bot, participant, ctx.from.id, config.phrases.keyboards.finishedChoosingReply[participant.parameters.language], config.debugExp);
        }
        // Process the next steps
        let nextStepsObj = await LogicHandler.processNextSteps(bot, uniqueId);
        if(nextStepsObj.returnCode === DevConfig.FAILURE_CODE){
            return nextStepsObj;
        }

      }
      break;

    // Answer was invalid (not part of options, etc.)
    case DevConfig.PARTIAL_FAILURE_CODE:
        // Send the error message
        await Communicator.sendMessage(bot, participant, ctx.from.id, answerHandlerObj.failData, config.debugExp);
      // Repeat the question if needed
      if(answerHandlerObj.successData === DevConfig.REPEAT_QUESTION_STRING){
        await LogicHandler.sendQuestion(bot, participant, ctx.from.id, participant.currentQuestion, true)
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

