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
const ConfigParser = require('./src/configParser')
const moment = require('moment-timezone')
const ActionHandler = require('./src/actionHandler');
const LogicHandler = require('./src/logicHandler')

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

//-----------------
//--- bot setup ---
//-----------------

// "handle" errors
bot.catch((err, ctx) => {
  console.error(`Encountered an error for ${ctx.updateType}.`, err);
});

// Log the current participant
bot.command('log_part', async ctx => {
    if(!config.debug.experimenter) return;
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

// Log the current experiment
bot.command('log_exp', async ctx => {
    if(!config.debug.experimenter) return;
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

// Delete the participant
bot.command('delete_me', async ctx => {
    if(!config.debug.experimenter) return;

    // Check if participant exists
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

    // Remove all jobs for participant
    let conditionIdx = participant["conditionIdx"];
    await ScheduleHandler.removeAllJobsForParticipant(uniqueId);

    // Remove participant from database
    await participants.remove(uniqueId);

    // Delete chatID mapping
    await idMaps.deleteByChatId(config.experimentId, ctx.from.id);

    // Update experiment to subtract participant from condition totals
    await experiments.updateConditionAssignees(config.experimentId, conditionIdx, -1);
    ctx.reply('Successfully deleted all your data. To use the bot again, use /start.');
    console.log(`${uniqueId} removed`);

  } catch(err){
    console.log('Failed to delete participant');
    console.error(err);
  }
});

// Delete the experiment
bot.command('delete_exp', async ctx => {
  // TODO: Delete all participants when experiment is deleted?
  // TODO: OR add up all participants when experiment is created again?
  // TODO: OR perhaps recount each time the experiment starts up for a sanity check?
    if(!config.debug.experimenter) return;
  try{
      // Check if experiment exists
    let experiment = await experiments.get(config.experimentId);
    if(!experiment) {
      console.log('Experiment does not exist!')
      return;
    }

    // Remove experiment from DB
    await experiments.remove(config.experimentId);

    // Remove all chatID mappings for current experiment from DB
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

// Next command to pre-empt next scheduled question
bot.command('next', async ctx => {
    if(!config.debug.enableNext) return;
    try{
        // Get the participant's unique ID
        let secretMap = await idMaps.getByChatId(config.experimentId, ctx.from.id);
        if(!secretMap){
            console.log("Participant not initialized yet!");
            return;
        }
        let uniqueId = secretMap.uniqueId;


        // Get the participant
        let participant = await getParticipant(uniqueId);
        let userInfo = bot.telegram.getChat(ctx.from.id);
        participant["firstName"] = userInfo["first_name"];

        // Shift the debug queue for the participant if it hasn't been done already
        let shiftObj = ScheduleHandler.shiftDebugQueueToToday(uniqueId, participant.parameters.timezone);
        if(shiftObj.returnCode === DevConfig.FAILURE_CODE){
            console.log(shiftObj.data);
            return;
        }

        let partCond = participant.conditionName;
        let partLang = participant.parameters.language;

        let nextQuestionFound = false;
        let iterationCount = 0;
        let maxIterationCount = 1000;

        while(!nextQuestionFound && iterationCount <= maxIterationCount){
            iterationCount++;

            // Get the next temporally ordered scheduled question
            let nextQObjObj = ScheduleHandler.getNextDebugQuestion(uniqueId);
            if(nextQObjObj.returnCode === DevConfig.FAILURE_CODE){
                console.log(nextQObjObj.data);
                break;
            }
            let nextQObj = nextQObjObj.data;

            // Show the next question only if it passes the required condition
            let evaluation = true;
            if(nextQObj.if){
                let evaluationObj = ConfigParser.evaluateConditionString(participant, nextQObj.if)
                if(evaluationObj.returnCode === DevConfig.SUCCESS_CODE){
                    evaluation = evaluationObj.data.value;
                } else {
                    console.log(evaluationObj.data);
                    evaluation = false;
                }
            }
            if(!evaluation) continue;

            if(!!nextQObj["qId"]) {

                // Construct the question based on the ID and participant condition
                let qHandler = new QuestionHandler(config);
                let nextQReturnObj = qHandler.constructQuestionByID(partCond, nextQObj.qId, partLang);
                if (nextQReturnObj.returnCode === DevConfig.FAILURE_CODE) {
                    throw "ERROR: " + nextQReturnObj.data;
                }
                let nextQuestion = nextQReturnObj.data;

                // Send a message about when the question will appear
                let nextQMsg = `(Debug) This message will appear at ${nextQObj.atTime} on ${nextQObj.onDays.join('')}`;

                // TODO: How to send next message if it is a dummy?
                // Send the message and the question, if the question is meant to be sent at that time
                await Communicator.sendMessage(bot, participant, ctx.from.id, nextQMsg, true);
                let returnObj = await LogicHandler.sendQuestion(bot, participant, ctx.from.id, nextQuestion, !config.debug.messageDelay);
                if (returnObj.returnCode === DevConfig.FAILURE_CODE) {
                    throw returnObj.data;
                }
                nextQuestionFound = true;
            } else {
                // Send a message about when the action will appear
                let nextQMsg = `(Debug) This action will occur at ${nextQObj.atTime} on ${nextQObj.onDays.join('')}`;

                // Process the action
                if(config.debug.actionMessages){
                    // Send the message and the question, if the question is meant to be sent at that time
                    await Communicator.sendMessage(bot, participant, ctx.from.id, nextQMsg, true);
                    nextQuestionFound = true;
                }

                let actionObj = {
                    aType : nextQObj.aType,
                    args : nextQObj.args
                }
                let returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                if (returnObj.returnCode === DevConfig.FAILURE_CODE) {
                    throw returnObj.data;
                }

            }

        }

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

  // Repeat question only if there is an outstanding question
  if(participant.currentState === "awaitingAnswer"){
      await participants.updateField(uniqueId, "currentState", "repeatQuestion");
    let currentQuestion = participant.currentQuestion;
    let returnObj = await LogicHandler.sendQuestion(bot, participant, ctx.from.id, currentQuestion, !config.debug.messageDelay);
      if(returnObj.returnCode === DevConfig.FAILURE_CODE){
          throw returnObj.data;
      }
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
      await participants.initializeParticipant(uniqueId, config);

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
      let returnObj = await LogicHandler.sendQuestion(bot, participant, ctx.from.id, curQuestion, !config.debug.messageDelay);
      if(returnObj.returnCode === DevConfig.FAILURE_CODE){
          throw returnObj.data;
      }
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
        // if(participant.currentQuestion.qType === "multiChoice"){
        //   await Communicator.sendMessage(bot, participant, ctx.from.id,
        //       config.phrases.keyboards.finishedChoosingReply[participant.parameters.language], !config.debug.messageDelay);
        // }
        // Process the next steps
        let nextStepsObj = await LogicHandler.processNextSteps(bot, uniqueId);
        if(nextStepsObj.returnCode === DevConfig.FAILURE_CODE){
            throw nextStepsObj.data;
        }

      }
      break;

    // Answer was invalid (not part of options, etc.)
    case DevConfig.PARTIAL_FAILURE_CODE:
        // Send the error message
        await Communicator.sendMessage(bot, participant, ctx.from.id, answerHandlerObj.failData, !config.debug.messageDelay);
      // Repeat the question if needed
      if(answerHandlerObj.successData === DevConfig.REPEAT_QUESTION_STRING){
        let returnObj = await LogicHandler.sendQuestion(bot, participant, ctx.from.id,
            participant.currentQuestion, !config.debug.messageDelay)
          if(returnObj.returnCode === DevConfig.FAILURE_CODE){
              throw returnObj.data;
          }
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

