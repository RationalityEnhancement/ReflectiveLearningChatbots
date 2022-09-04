require('dotenv').config();
const mongo = require('mongoose');
const { Telegraf } = require('telegraf');
const ConfigReader = require('./src/configReader');
const config = ConfigReader.getExpConfig();
const DevConfig = ConfigReader.getDevConfig()
const participants = require('./src/apiControllers/participantApiController');
const experiments = require('./src/apiControllers/experimentApiController');
const idMaps = require('./src/apiControllers/idMapApiController');
const Communicator = require('./src/communicator')
const QuestionHandler = require('./src/questionHandler');
const AnswerHandler = require('./src/answerHandler');
const ScheduleHandler = require('./src/scheduleHandler');
const ReminderHandler = require('./src/reminderHandler')
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 5000;
const URL = process.env.URL || "https://immense-caverns-61960.herokuapp.com"
const ConfigParser = require('./src/configParser')
const moment = require('moment-timezone')
const lodash = require('lodash');
const ActionHandler = require('./src/actionHandler');
const LogicHandler = require('./src/logicHandler')

const ExperimentUtils = require("./src/experimentUtils");
const {getByUniqueId} = require("./src/apiControllers/idMapApiController");
const StageHandler = require("./src/stageHandler");

const local = process.argv[2];

const SKIP_TO_STAGE = {};
const REPORT_FEEDBACK = {};
const TALK = {};

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

let handleError = async (participant, errorString) => {
    let timeStamp = moment.tz(participant.parameters.timezone).format();
    let message = timeStamp + "\n" + errorString;
    delete participant["firstName"];
    let participantJSON = JSON.stringify(participant);
    try{
        await experiments.addErrorObject(config.experimentId, {
            message : message,
            participantJSON : participantJSON
        });
    } catch(e){
        console.log("Error while trying to process error lol");
        console.log(e);
    }
}

let handleFeedback = async (participant, feedbackString) => {
    let timeStamp = moment.tz(participant.parameters.timezone).format();
    let message = timeStamp + "\n" + feedbackString;
    delete participant["firstName"];
    let participantJSON = JSON.stringify(participant);
    try{
        await experiments.addFeedbackObject(config.experimentId, {
            message : message,
            participantJSON : participantJSON
        });
    } catch(e){
        console.log("Error while trying to process feedback lol");
        console.log(e);
    }
}

//-----------------
//--- bot setup ---
//-----------------

// "handle" errors
bot.catch((err, ctx) => {
  console.error(`\nEncountered an error for ${ctx.updateType}\n.`, err);
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
    experiment["errorMessages"] = undefined;
    experiment["feedbackMessages"] = undefined;
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
    // In field experiment, only allow deleting in the setup phase
    if(!config.debug.experimenter){
        if(participant.stages.activity.length > 0)
            return;
    }



    // Remove all jobs for participant
    let conditionIdx = participant["conditionIdx"];
    await ScheduleHandler.removeAllJobsForParticipant(uniqueId);

    // Cancel current reminders
    await ReminderHandler.cancelCurrentReminder(uniqueId);

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

bot.command('cancel', async ctx =>{
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    if(!secretMap) {
        console.log("Participant not found while cancelling!")
        return;
    }
    let participant = await getParticipant(secretMap.uniqueId);
    if(!participant){
        console.log("Participant not found while cancelling!")
        return;
    }
    let partLang = participant.parameters.language;
    if(SKIP_TO_STAGE[ctx.from.id]){
        SKIP_TO_STAGE[ctx.from.id] = false;
        await ctx.replyWithHTML("Skipping stage has been cancelled. The experiment will continue as normal. Send <i>/repeat</i> to recall any outstanding question.")
    } else if(REPORT_FEEDBACK[ctx.from.id]){
        REPORT_FEEDBACK[ctx.from.id] = false;
        try{
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.reportFeedbackCancel[partLang], !config.debug.messageDelay);
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.experimentContinue[partLang], !config.debug.messageDelay);
        } catch(err){
            await handleError(participant, 'Unable to send feedback cancel message!\n'
                + err.message + '\n' + err.stack);
            console.log('Unable to send feedback cancel message!');
            console.error(err);
        }
    } else if(TALK[ctx.from.id]){
        TALK[ctx.from.id] = false;
        try{
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.talkCancelled[partLang], !config.debug.messageDelay);
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.experimentContinue[partLang], !config.debug.messageDelay);
        } catch(err){
            await handleError(participant, 'Unable to send talk cancel message!\n'
                + err.message + '\n' + err.stack);
            console.log('Unable to send talk cancel message!');
            console.error(err);
        }
    } else {
        try{
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.nothingToCancel[partLang], !config.debug.messageDelay);
        } catch(err){
            await handleError(participant, 'Unable to send no cancel message!\n'
                + err.message + '\n' + err.stack);
            console.log('Unable to send no cancel message!');
            console.error(err);
        }
    }
})

// Next command to pre-empt next scheduled question
bot.command('next', async ctx => {
    if(!config.debug.enableNext) return;
    try{
        // If command /skip_to has just been run
        SKIP_TO_STAGE[ctx.from.id] = false;

        // If command /report has just been run
        REPORT_FEEDBACK[ctx.from.id] = false;

        // If command /talk has just been run
        TALK[ctx.from.id] = false;

        // Get the participant's unique ID
        let secretMap = await idMaps.getByChatId(config.experimentId, ctx.from.id);
        if(!secretMap){
            console.log("Participant not initialized yet! No next questions");
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

                // If the question is a dummy that performs only an action, then don't inform the experimenter
                //  and go to the next question
                let onlyAction = false;
                if(nextQuestion.qType === "dummy"){
                    if(nextQuestion.cNextQuestions || nextQuestion.nextQuestion){
                        let nextQMsg = `(Debug) If there is a question at ${nextQObj.atTime} on ${nextQObj.onDays.join('')}, it will appear in the following message(s)`;
                        await Communicator.sendMessage(bot, participant, ctx.from.id, nextQMsg, true);
                        nextQuestionFound = true;
                    } else {
                        onlyAction = true;
                    }
                } else {
                    let nextQMsg = `(Debug) The following question will appear at ${nextQObj.atTime} on ${nextQObj.onDays.join('')}`;
                    await Communicator.sendMessage(bot, participant, ctx.from.id, nextQMsg, true);
                    nextQuestionFound = true;
                }

                let returnObj = await LogicHandler.sendQuestion(bot, participant, ctx.from.id, nextQuestion,
                    true, !config.debug.messageDelay, "nextCommand");
                if (returnObj.returnCode === DevConfig.FAILURE_CODE) {
                    await handleError(participant, returnObj.data);
                    throw returnObj.data;
                }
                if(onlyAction){
                    let firstName = participant.firstName;
                    participant = await getParticipant(uniqueId);
                    participant.firstName = firstName;
                }
            } else {
                // Send a message about when the action will appear
                let nextQMsg = `(Debug) This action will occur at ${nextQObj.atTime} on ${nextQObj.onDays.join('')}`;

                // Process the action
                if(config.debug.actionMessages){
                    // Send the message and the question, if the question is meant to be sent at that time
                    await Communicator.sendMessage(bot, participant, ctx.from.id, nextQMsg, true);
                }

                let actionObj = {
                    aType : nextQObj.aType,
                    args : nextQObj.args
                }
                let returnObj = await ActionHandler.processAction(bot, config, participant, actionObj, "/next");
                if (returnObj.returnCode === DevConfig.FAILURE_CODE) {
                    await handleError(participant, returnObj.data)
                    throw returnObj.data;
                }
                if(config.debug.actionMessages){
                    nextQuestionFound = true;
                } else {
                    let firstName = participant.firstName;
                    participant = await getParticipant(uniqueId);
                    participant.firstName = firstName;
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
        console.log("Participant unique ID not found while repeating!");
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }
    let uniqueId = secretMap.uniqueId;

  let participant = await getParticipant(uniqueId);
    let partLang = participant.parameters.language;
    if(!participant){
        console.log("Participant not found while repeating!")
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }

  // Cancel any outstanding commands
    if(SKIP_TO_STAGE[ctx.from.id]){
        SKIP_TO_STAGE[ctx.from.id] = false;
        await ctx.replyWithHTML("Skipping stage has been cancelled.")
    }
    if(REPORT_FEEDBACK[ctx.from.id]){
        REPORT_FEEDBACK[ctx.from.id] = false;
        try{
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.reportFeedbackCancel[partLang], !config.debug.messageDelay);
        } catch(err){
            await handleError(participant, 'Unable to send feedback cancel message after repeat!\n'
                + err.message + '\n' + err.stack);
            console.log('Unable to send feedback cancel message after repeat!');
            console.error(err);
        }
    }
    if(TALK[ctx.from.id]){
        TALK[ctx.from.id] = false;
        try{
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.talkCancelled[partLang], !config.debug.messageDelay);
        } catch(err){
            await handleError(participant, 'Unable to send talk cancel message after repeat!\n'
                + err.message + '\n' + err.stack);
            console.log('Unable to send talk cancel message after repeat!');
            console.error(err);
        }
    }

  // Repeat question only if there is an outstanding question
  if(participant.currentState.startsWith("awaitingAnswer")){
      await participants.updateField(uniqueId, "currentState", "repeatQuestion");
    let currentQuestion = participant.currentQuestion;
    let returnObj = await LogicHandler.sendQuestion(bot, participant, ctx.from.id, currentQuestion,
        false, !config.debug.messageDelay, "repeat");
      if(returnObj.returnCode === DevConfig.FAILURE_CODE){
          await handleError(participant, returnObj.data);
          throw returnObj.data;
      }
  } else {
      try{
          let partLang = participant.parameters.language;
          await Communicator.sendMessage(bot, participant,
              ctx.from.id, config.phrases.experiment.repeatFail[partLang], !config.debug.messageDelay);
      } catch(err){
          await handleError(participant, 'Unable to send repeat fail message!\n'
              + err.message + '\n' + err.stack);
          console.log('Unable to send repeat fail message!');
          console.error(err);
      }
  }

})

// Command to skip to a stage
bot.command('skip_to', async ctx => {
    if(!config.debug.experimenter) return;
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    if(!secretMap) {
        console.log("Participant not found while skipping to stage!")
        return;
    }
    let participant = await getParticipant(secretMap.uniqueId);
    if(!participant){
        console.log("Participant not found while skipping to stage!")
        return;
    }
    const StageHandler = require('./src/stageHandler');
    let stageListObj = StageHandler.getStageList(config, participant.conditionName);
    if(stageListObj.returnCode === DevConfig.FAILURE_CODE){
        console.log(stageListObj.data);
        return;
    }
    SKIP_TO_STAGE[ctx.from.id] = true;
    REPORT_FEEDBACK[ctx.from.id] = false;
    TALK[ctx.from.id] = false;
    let stageListStrings = stageListObj.data.map(stage => {
        let string = "* " + stage.name;
        if(stage.lengthDays){
            string += " (" + stage.lengthDays + " days)"
        }
        return string;
    })

    await ctx.replyWithHTML("In the following message, type in the name of the stage you want to skip to, and the desired stage day separated by a comma\n\nExample: <i>Intervention, 0</i>" +
        "\n\nYour options are: \n\n" + stageListStrings.join('\n') + "\n\nSend <i>/cancel</i> to cancel skipping to another stage.");
})

// Command to report feedback
bot.command('report', async ctx => {
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    if(!secretMap) {
        console.log("Participant not found while reporting!")
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }
    let participant = await getParticipant(secretMap.uniqueId);
    if(!participant){
        console.log("Participant not found while reporting!")
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }

    SKIP_TO_STAGE[ctx.from.id] = false;
    TALK[ctx.from.id] = false;
    REPORT_FEEDBACK[ctx.from.id] = true;
    try{
        let partLang = participant.parameters.language;
        await Communicator.sendMessage(bot, participant,
            ctx.from.id, config.phrases.experiment.reportFeedback[partLang], !config.debug.messageDelay);
    } catch(err){
        await handleError(participant, 'Unable to send report feedback message!\n'
            + err.message + '\n' + err.stack);
        console.log('Unable to send report feedback message!');
        console.error(err);
    }

})

// Command to initiate talking
bot.command('talk', async ctx => {
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    if(!secretMap) {
        console.log("Participant not found while talking!")
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }
    let participant = await getParticipant(secretMap.uniqueId);
    let partLang = participant.parameters.language;
    if(!participant){
        console.log("Participant not found while talking!")
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }

    // Don't allow initiation of talking if there is an outstanding question
    if(participant.currentState.startsWith('awaitingAnswer')){
        try {
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.cannotStartTalkOutstanding[partLang], !config.debug.messageDelay);
            return;
        } catch(err){
            await handleError(participant, 'Unable to send talk cannot start message!\n'
                + err.message + '\n' + err.stack);
            console.log('Unable to send talk cannot start message!');
            console.error(err);
        }
    }

    // Cancel other open operations, if any
    SKIP_TO_STAGE[ctx.from.id] = false;
    REPORT_FEEDBACK[ctx.from.id] = false;
    TALK[ctx.from.id] = false;
    let sendText = config.phrases.experiment.cannotStartTalk[participant.parameters.language];

    // Try to build the text if there are any possible options, otherwise send default message that there are no
    //      questions available to prompt.
    let userInfo;
    try{
        userInfo = await bot.telegram.getChat(ctx.from.id);
    } catch(e) {
        await handleError(participant, 'Unable to get userID in /talk\n' + e.message + "\n" + e.stack);
        console.log("ERROR: Unable to get userID in /talk\n" + e.message + "\n" + e.stack);
        return;
    }

    participant.firstName = userInfo.first_name;
    let textObj = ConfigParser.buildQuestionPromptText(participant, config);
    if(textObj.returnCode === DevConfig.SUCCESS_CODE){
        TALK[ctx.from.id] = true;
        sendText = textObj.data;
    } else if(textObj.returnCode === DevConfig.FAILURE_CODE){
        await handleError(participant, 'Unable to build talk start message\n' + textObj.data);
    }
    try {
        await Communicator.sendMessage(bot, participant,
            ctx.from.id, sendText, !config.debug.messageDelay);
    } catch(err){
        await handleError(participant, 'Unable to send talk start message!\n'
            + err.message + '\n' + err.stack);
        console.log('Unable to send talk start message!');
        console.error(err);
    }

})

// Command to ask for help
bot.command('help', async ctx => {
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    if(!secretMap) {
        console.log("Participant not found while asking for help!")
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }
    let participant = await getParticipant(secretMap.uniqueId);
    if(!participant){
        console.log("Participant not found while asking for help!")
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }
    let instructionText = config.instructionText;
    try{
        let insMessages = instructionText[participant.parameters.language];
        for(let i = 0; i < insMessages.length; i++){
            await Communicator.sendMessage(bot, participant, ctx.from.id, insMessages[i], !config.debug.messageDelay)
        }
    } catch(err){
        await ctx.replyWithHTML(config.phrases.experiment.cannotHelp[participant.parameters.language]);
        await handleError(participant, 'Unable to send instructions!\n'
            + err.message + '\n' + err.stack);
        console.log('Unable to send instructions!');
        console.error(err);
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
  } else {
      // Recount number of participants assigned to each condition
      let allParticipants = await participants.getAll();
      let condCounts = Array(experiment.currentlyAssignedToCondition.length).fill(0);
      for(let i = 0; i < allParticipants.length; i++){
          let curExperiment = allParticipants[i].experimentId;
          let curCondIdx = allParticipants[i].conditionIdx;
          if(typeof curCondIdx !== "undefined" && curExperiment === config.experimentId){
              condCounts[curCondIdx] += 1;
          }
      }
      if(!lodash.isEqual(condCounts, experiment.currentlyAssignedToCondition)){
          await experiments.updateField(config.experimentId, "currentlyAssignedToCondition",condCounts);
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
            await handleError({}, 'Unable to generate a new ID for participant!\n'
                + err.message + '\n' + err.stack);
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
        await handleError({}, 'Failed to initialize new participant\n'
            + err.message + '\n' + err.stack)
      console.log('Failed to initialize new participant');
      console.error(err);
    }
  }

  if(participant.currentState !== "starting"){
      console.log('Participant ' + uniqueId + ' has already started!');
      return;
  }

  // Start the setup question chain
  let curQuestionObj = qHandler.getFirstQuestionInCategory(undefined, "setupQuestions", config.defaultLanguage);
  if(curQuestionObj.returnCode === -1){
      await handleError(participant, curQuestionObj.data);
    throw "ERROR: " + curQuestionObj.data;
  } else {
    let curQuestion = curQuestionObj.data;
    try{
      let returnObj = await LogicHandler.sendQuestion(bot, participant, ctx.from.id, curQuestion,
          false, !config.debug.messageDelay, "firstQuestion");
      if(returnObj.returnCode === DevConfig.FAILURE_CODE){
          await handleError(participant, returnObj.data)
          throw returnObj.data;
      }
    } catch(err){
        await handleError(participant, "Failed to send language question\n"
            + err.message + '\n' + err.stack);
      console.log('Failed to send language question');
      console.error(err);
    }
  }
});

// Handling any answer
bot.on('text', async ctx => {
  const messageText = ctx.message.text;

  // Get the participants unique ID
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);
    if(!secretMap){
        console.log("Unable to find participant unique ID!");
        await ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }
    let uniqueId = secretMap.uniqueId;
  // Get the participant
  let participant = await getParticipant(uniqueId);

  // Participant has not started yet
  if(!participant) {
      console.log("Participant has not started yet!");
      await ctx.replyWithHTML("Send /start to begin interacting with me!")
      return;
  }

    // Ignore commands
    if(messageText.charAt[0] === '/') return;

    // If it is a response to a scheduled question, cancel all open operations
    //  so that answer is registered for the question
    if(participant.currentState === "awaitingAnswerScheduled"){
        SKIP_TO_STAGE[ctx.from.id] = false;
        TALK[ctx.from.id] = false;
        REPORT_FEEDBACK[ctx.from.id] = false;
    }

    // If the text is supposed to be a stage name to skip to
    if(SKIP_TO_STAGE[ctx.from.id]){
        let split = messageText.split(',');
        let stageName = split[0].trim(), stageDay;
        try{
            stageDay = parseInt(split[1].trim());
        } catch(e){
            stageDay = 0;
        }
        let ActionHandler = require('./src/actionHandler')
        let copyConfig = JSON.parse(JSON.stringify(config));
        copyConfig.debug.actionMessages = true;
        let returnObj = await ActionHandler.processAction(bot, copyConfig, participant, {
            "aType" : "startStage",
            "args" : [stageName]
        }, "/skip_to");
        if(returnObj.returnCode === DevConfig.FAILURE_CODE){
            await ctx.replyWithHTML("Unable to start stage " + stageName +". See console for more information.");
            console.log(returnObj.data);
        }
        await participants.updateStageParameter(uniqueId, "stageDay", stageDay);
        SKIP_TO_STAGE[ctx.from.id] = false;
        return;
    }

    // If the text is supposed to be feedback that is reported
    if(REPORT_FEEDBACK[ctx.from.id]){
        let feedback = messageText;

        await handleFeedback(participant, feedback);
        REPORT_FEEDBACK[ctx.from.id] = false;
        let partLang = participant.parameters.language;
        try{
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.reportFeedbackThanks[partLang], !config.debug.messageDelay);
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.experimentContinue[partLang], !config.debug.messageDelay);
        } catch(err){
            await handleError(participant, 'Unable to send feedback cancel message!\n'
                + err.message + '\n' + err.stack);
            console.log('Unable to send feedback cancel message!');
            console.error(err);
        }
        return;
    }

    // If text is supposed to be keyword to start talking about something
    if(TALK[ctx.from.id]){
        TALK[ctx.from.id] = false;
        let userInfo;
        try{
            userInfo = await bot.telegram.getChat(ctx.from.id);
        } catch(e) {
            await handleError(participant, 'Unable to get userID in /talk answer\n' + e.message + "\n" + e.stack);
            console.log("ERROR: Unable to get userID in /talk answer\n" + e.message + "\n" + e.stack);
            return;
        }
        participant["firstName"] = userInfo.first_name;
        let partLang = participant.parameters.language;

        // Get the QID for the entered keyword
        let getQIDObj = ConfigParser.getUserPromptQID(participant, config, messageText);
        if(getQIDObj.returnCode !== DevConfig.SUCCESS_CODE){
            try{
                await Communicator.sendMessage(bot, participant,
                    ctx.from.id, config.phrases.experiment.talkKeywordNotRecognized[partLang], !config.debug.messageDelay);
            } catch(err){
                await handleError(participant, 'Unable to send didnt understand message!\n'
                    + err.message + '\n' + err.stack);
                console.log('Unable to send didnt understand message!');
                console.error(err);
            }
            return;
        }

        // Create the question
        let questionObj = qHandler.constructQuestionByID(participant.conditionName,
            getQIDObj.data, partLang);
        if(questionObj.returnCode !== DevConfig.SUCCESS_CODE){
            await handleError(participant, 'Unable to construct question prompted by user!\n'
                + questionObj.data);
            throw questionObj.data;
        }

        // Ask the question
        let returnObj = await LogicHandler.sendQuestion(bot, participant, ctx.from.id,
            questionObj.data, false, config.debug.experimenter, "talk")
        if(returnObj.returnCode === DevConfig.FAILURE_CODE){
            await handleError(participant, returnObj.data);
            throw returnObj.data;
        }

        return;
    }

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
            await handleError(participant, nextStepsObj.data);
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
            participant.currentQuestion, false, !config.debug.messageDelay, "invalid")
          if(returnObj.returnCode === DevConfig.FAILURE_CODE){
              await handleError(participant, returnObj.data);
              throw returnObj.data;
          }
      }
      break;

    // Failure occurred
    case DevConfig.FAILURE_CODE:
        await handleError(participant, answerHandlerObj.data);
      throw "ERROR: " + answerHandlerObj.data;

    default:
        await handleError(participant, "Answer Handler did not respond appropriately");
      throw "ERROR: Answer Handler did not respond appropriately"
  }
  
});

// Reschedule all operations after server restart

if(!!local && local === "-l"){
    console.log('Local launch')
    bot.launch().then(() => {

        console.log('Listening to humans');
        let start = Date.now();
        console.log("Starting rescheduling now")
        ScheduleHandler.rescheduleAllOperations(bot, config).then(returnObj => {
            let end = Date.now();
            console.log("Finished rescheduling: time taken = " + ((end - start)/1000));
        });
    });
} else {
    console.log('Server launch');
    bot.launch({
        webhook: {
            domain: URL,
            port: PORT
        }
    }).then(() => {
        console.log('Listening to humans');
        let start = Date.now();
        console.log("Starting rescheduling now")
        ScheduleHandler.rescheduleAllOperations(bot, config).then(returnObj => {
            let end = Date.now();
            console.log("Finished rescheduling: time taken = " + ((end - start)/1000));
        }).catch(err => {
            console.log(err.message + "\n" + err.stack);
            throw err
        });
    }).catch((err) => {
        console.log(err.message + "\n" + err.stack);
        throw err
    });
}


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
