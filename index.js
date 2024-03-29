const local = process.argv[2];

if(!local){
    const { Appsignal } = require("@appsignal/nodejs");

    const appsignal = new Appsignal({
        active: true,
        name: "RLChatbots"
    });
}

require('dotenv').config();
const mongo = require('mongoose');
const { Telegraf } = require('telegraf');
const ConfigReader = require('./src/configReader');
const config = ConfigReader.getExpConfig();
const DevConfig = ConfigReader.getDevConfig()
const participants = require('./src/apiControllers/participantApiController');
const experiments = require('./src/apiControllers/experimentApiController');
const answers = require('./src/apiControllers/answerApiController');
const debugs = require('./src/apiControllers/debugInfoApiController');
const idMaps = require('./src/apiControllers/idMapApiController');
const transcripts = require('./src/apiControllers/transcriptApiController');
const Communicator = require('./src/communicator')
const QuestionHandler = require('./src/questionHandler');
const AnswerHandler = require('./src/answerHandler');
const ScheduleHandler = require('./src/scheduleHandler');
const ReminderHandler = require('./src/reminderHandler')
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 5000;
const URL = process.env.URL || "https://immense-caverns-61960.herokuapp.com"
const EXP_PASSWORD = process.env.EXP_PASSWORD;
const ConfigParser = require('./src/configParser')
const moment = require('moment-timezone')
const lodash = require('lodash');
const ActionHandler = require('./src/actionHandler');
const scheduler = require('node-schedule')
const LogicHandler = require('./src/logicHandler')

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

// Validate a password entered by the user to approve certain commands
let validatePassword = (text) => {
    let textSplit = text.split(' ');
    if(textSplit.length > 0){
        let password = textSplit[1];
        if(password === EXP_PASSWORD){
            return true;
        }
    }
    return false;
}

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
    let partCopy = JSON.parse(JSON.stringify(participant))
    delete partCopy["firstName"];
    let pAnswerObj = await answers.getCurrent(participant.uniqueId);
    partCopy.answers = pAnswerObj.answers;
    let participantJSON = JSON.stringify(partCopy);
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
    let partCopy = JSON.parse(JSON.stringify(participant))
    delete partCopy["firstName"];
    let pAnswerObj = await answers.getCurrent(participant.uniqueId);
    // TODO Create separate field for answers in feedback and error object?
    partCopy.answers = pAnswerObj.answers;
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

// Log the debug info of the current node for the current experiment
bot.command('log_debug', async ctx => {
    if(!config.debug.experimenter) return;
    try{
        let secretMap = await getByChatId(config.experimentId, ctx.from.id);
        if(!secretMap){
            console.log("Unable to get participant unique id");
            return;
        }

        console.log('Logging participant.');
        let debug = await debugs.getCurrent(secretMap.uniqueId);
        console.log(debug);
        // console.log(await bot.telegram.getChat(ctx.from.id));

    } catch (err){
        console.log('Failed to log debugInfo');
        console.error(err);
    }

});

// Log the answers of the current node for the current experiment
bot.command('log_answers', async ctx => {
    if(!config.debug.experimenter) return;
    try{
        let secretMap = await getByChatId(config.experimentId, ctx.from.id);
        if(!secretMap){
            console.log("Unable to get participant unique id");
            return;
        }

        console.log('Logging participant.');
        let ans = await answers.getCurrent(secretMap.uniqueId);
        console.log(ans);
        // console.log(await bot.telegram.getChat(ctx.from.id));

    } catch (err){
        console.log('Failed to log debugInfo');
        console.error(err);
    }

});

// Log the current experiment
bot.command('log_exp', async ctx => {
    if(!config.debug.experimenter) return;
    try{
    console.log('Logging experiment.');
    let experiment = await experiments.get(config.experimentId);
    if(!experiment) {
        console.log("Experiment doesn't exist!")
        return;
    }
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

// Log the scheduled questions for the current participant
bot.command('log_scheduled', async ctx => {
    if(!config.debug.experimenter) return;
    try{
        console.log('Logging scheduled questions.');
        let secretMap = await getByChatId(config.experimentId, ctx.from.id);
        if(!secretMap){
            console.log("Unable to get participant unique id");
            return;
        }
        console.log(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.startsWith(""+secretMap.uniqueId)));

    } catch(err){
        console.log('Failed to log experiment');
        console.error(err);
    }
});

// Log the scheduled questions debug queue
bot.command('log_queue', async ctx => {
    if(!config.debug.enableNext) return;
    try{
        console.log('Logging next questions queue');
        let secretMap = await getByChatId(config.experimentId, ctx.from.id);
        if(!secretMap){
            console.log("Unable to get participant unique id");
            return;
        }
        console.log(ScheduleHandler.debugQueue[secretMap.uniqueId]);
        console.log(ScheduleHandler.debugQueueCurrent[secretMap.uniqueId])
        console.log(ScheduleHandler.debugQueueAdjusted[secretMap.uniqueId])

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
    // If the setup phase has passed
    let authorized = true;
    if (participant.stages.activity.length > 0){
        // Disallow deletion if experimenter debug flag is turned off
        if(!config.debug.experimenter) {
            authorized = false;
        }
        // Password protect deletion if experimenter debug flag is turned on
        if(config.debug.requirePassword){
            if(!validatePassword(ctx.update.message.text)){
                authorized = false;
            }
        }
    }
    if(!authorized){
        let partLang = participant.parameters.language;
        Communicator.sendMessage(bot, participant,
            ctx.from.id, config.phrases.experiment.notAuthorized[partLang], !config.debug.messageDelay)
        return;
    }

    // Remove all jobs for participant
    let conditionIdx = participant["conditionIdx"];
    await ScheduleHandler.removeAllJobsForParticipant(uniqueId);

    // Cancel current reminders
    await ReminderHandler.cancelCurrentReminder(participant);

    // Remove participant from database
    await participants.remove(uniqueId);
    await answers.removeAllForId(uniqueId);
    await debugs.removeAllForId(uniqueId);
    await transcripts.removeAllForId(uniqueId);

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
    // Disallow this if experimenter debug flag is turned off
    if(!config.debug.experimenter) {
        ctx.reply("You are not authorized to do that now!")
        return;
    }
    // Password protecting this function even when experimenter debug flag is turned on
    if(config.debug.requirePassword){
        if(!validatePassword(ctx.update.message.text)){
            ctx.reply("You are not authorized to do that now!")
            return;
        }
    }
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

      await idMaps.removeAllForExperiment(config.experimentId);

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
    let timeStamp = moment.tz(participant.parameters.timezone).format();
    transcripts.addMessages(participant.uniqueId, [{
        message: ctx.message.text,
        from: ""+participant.uniqueId,
        timeStamp: timeStamp
    }])
        .catch(err => {
            let errMsg = "Unable to add messages to transcript for participant " + participant.uniqueId + " at time "
                + timeStamp + "\n" + err.message + "\n" + err.stack;
            handleError(participant, errMsg)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log(errMsg);
        })
    let partLang = participant.parameters.language;
    if(SKIP_TO_STAGE[ctx.from.id]){
        SKIP_TO_STAGE[ctx.from.id] = false;
        let message = "Skipping stage has been cancelled. The experiment will continue as normal. Send <i>/repeat</i> to recall any outstanding question.";
        Communicator.sendMessage(bot, participant, ctx.from.id, message, !config.debug.messageDelay)
            .catch(err => {
                handleError(participant, 'Unable to send cancel skip stage message!\n'
                    + err.message + '\n' + err.stack)
                    .catch(err => {
                        console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                    });
            })
    } else if(REPORT_FEEDBACK[ctx.from.id]){
        REPORT_FEEDBACK[ctx.from.id] = false;
        Communicator.sendMessage(bot, participant,
            ctx.from.id, config.phrases.experiment.reportFeedbackCancel[partLang], !config.debug.messageDelay)
            .then((ret) => {
                Communicator.sendMessage(bot, participant,
                    ctx.from.id, config.phrases.experiment.experimentContinue[partLang], !config.debug.messageDelay);
            })
            .catch(err => {
                handleError(participant, 'Unable to send feedback cancel message!\n'
                    + err.message + '\n' + err.stack)
                    .then(ret => {
                        console.log('Unable to send feedback cancel message!');
                        console.error(err);
                    })
                    .catch(err => {
                        console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                    });

            })
    } else if(TALK[ctx.from.id]){
        TALK[ctx.from.id] = false;
        try{
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.talkCancelled[partLang], !config.debug.messageDelay);
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.experimentContinue[partLang], !config.debug.messageDelay);
        } catch(err){
            await handleError(participant, 'Unable to send talk cancel message!\n'
                + err.message + '\n' + err.stack)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log('Unable to send talk cancel message!');
            console.error(err);
        }
    } else {
        try{
            await Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.nothingToCancel[partLang], !config.debug.messageDelay);
        } catch(err){
            await handleError(participant, 'Unable to send no cancel message!\n'
                + err.message + '\n' + err.stack)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log('Unable to send no cancel message!');
            console.error(err);
        }
    }
})

// TODO Debug this? Might not be working
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


        let partCond = participant.conditionName;
        let partLang = participant.parameters.language;

        let nextQuestionFound = false;
        let iterationCount = 0;
        let maxIterationCount = 1000;

        while(!nextQuestionFound && iterationCount <= maxIterationCount){
            // Shift the debug queue for the participant if it hasn't been done already
            let shiftObj = ScheduleHandler.shiftDebugQueueToToday(uniqueId, participant.parameters.timezone);
            if(shiftObj.returnCode === DevConfig.FAILURE_CODE){
                console.log(shiftObj.data);
                return;
            }
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
                    console.log(returnObj.data);
                    handleError(participant, returnObj.data)
                        .catch(err => {
                            console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                        });
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
                    console.log(returnObj.data)
                    handleError(participant, returnObj.data)
                        .catch(err => {
                            console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                        });

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
        ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }
    let uniqueId = secretMap.uniqueId;


    let participant = await getParticipant(uniqueId);
    let partLang = participant.parameters.language;
    if(!participant){
        console.log("Participant not found while repeating!")
        ctx.replyWithHTML("Send /start to begin interacting with me!")
        return;
    }

    let timeStamp = moment.tz(participant.parameters.timezone).format();
    transcripts.addMessages(participant.uniqueId, [{
        message: ctx.message.text,
        from: ""+participant.uniqueId,
        timeStamp: timeStamp
    }])
        .catch(err => {
            let errMsg = "Unable to add messages to transcript for participant " + participant.uniqueId + " at time "
                + timeStamp + "\n" + err.message + "\n" + err.stack;
            handleError(participant, errMsg)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log(errMsg);
        })

    // Cancel any outstanding commands
    if(SKIP_TO_STAGE[ctx.from.id]){
        SKIP_TO_STAGE[ctx.from.id] = false;
        ctx.replyWithHTML("Skipping stage has been cancelled.")
    }
    if(REPORT_FEEDBACK[ctx.from.id]){
        REPORT_FEEDBACK[ctx.from.id] = false;
        Communicator.sendMessage(bot, participant,
            ctx.from.id, config.phrases.experiment.reportFeedbackCancel[partLang], !config.debug.messageDelay)
            .catch((err) => {
                handleError(participant, 'Unable to send feedback cancel message after repeat!\n'
                    + err.message + '\n' + err.stack)
                    .catch(err => {
                        console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                    });
                console.log('Unable to send feedback cancel message after repeat!');
                console.error(err);
            });
    }


    if(TALK[ctx.from.id]){
        TALK[ctx.from.id] = false;
        Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.talkCancelled[partLang], !config.debug.messageDelay)
            .catch((err) => {
                handleError(participant, 'Unable to send talk cancel message after repeat!\n'
                    + err.message + '\n' + err.stack)
                    .catch(err => {
                        console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                    });
                console.log('Unable to send talk cancel message after repeat!');
                console.error(err);
            });
    }

  // Repeat question only if there is an outstanding question
  if(participant.currentState.startsWith("awaitingAnswer")){

    let currentQuestion = participant.currentQuestion;
    // Update state to repeat question
      participants.updateField(uniqueId, "currentState", "repeatQuestion")
          .then( (res) => {
                  return LogicHandler.sendQuestion(bot, participant, ctx.from.id, currentQuestion,
                      false, !config.debug.messageDelay, "repeat")
          })
          .then((returnObj) => {
              if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                  throw returnObj.data;
              }
          })
          .catch((err) => {
              participants.updateField(uniqueId, "currentState", "awaitingAnswer")
                  .catch((err) => {
                      handleError(participant,
                          'Unable to update participant '+ uniqueId +' state after fail in repeat!\n'
                          + err.message + '\n' + err.stack)
                          .catch(err => {
                              console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                          });
                      console.log('Unable to update participant state after fail in repeat!');
                      console.error(err);
                  });
              handleError(participant, 'Unable to send repeat question for participant ' + uniqueId + '!\n'
                  + err.message + '\n' + err.stack)
                  .catch(err => {
                      console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                  });
              console.log('Unable to send repeat question for participant ' + uniqueId + '!\n' + err);
          });


  } else {
      let partLang = participant.parameters.language;
      Communicator.sendMessage(bot, participant,
          ctx.from.id, config.phrases.experiment.repeatFail[partLang], !config.debug.messageDelay)
        .catch((err) => {
          handleError(participant, 'Unable to send repeat fail message!\n'
              + err.message + '\n' + err.stack)
              .catch(err => {
                  console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
              });
          console.log('Unable to send repeat fail message!');
          console.error(err);
      })
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
    let timeStamp = moment.tz(participant.parameters.timezone).format();
    transcripts.addMessages(participant.uniqueId, [{
        message: ctx.message.text,
        from: ""+participant.uniqueId,
        timeStamp: timeStamp
    }])
        .catch(err => {
            let errMsg = "Unable to add messages to transcript for participant " + participant.uniqueId + " at time "
                + timeStamp + "\n" + err.message + "\n" + err.stack;
            console.log(errMsg);
            handleError(participant, errMsg)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });

        })


    SKIP_TO_STAGE[ctx.from.id] = false;
    TALK[ctx.from.id] = false;
    REPORT_FEEDBACK[ctx.from.id] = true;

    let partLang = participant.parameters.language;
    Communicator.sendMessage(bot, participant,
        ctx.from.id, config.phrases.experiment.reportFeedback[partLang], !config.debug.messageDelay)
        .catch(err => {
            let errMsg = 'Unable to send report feedback message for participant ' + participant.uniqueId + '!\n'
                + err.message + '\n' + err.stack;
            console.log(errMsg);
            handleError(participant, errMsg)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
        })
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

    let timeStamp = moment.tz(participant.parameters.timezone).format();
    transcripts.addMessages(participant.uniqueId, [{
        message: ctx.message.text,
        from: ""+participant.uniqueId,
        timeStamp: timeStamp
    }])
        .catch(err => {
            let errMsg = "Unable to add messages to transcript for participant " + participant.uniqueId + " at time "
                + timeStamp + "\n" + err.message + "\n" + err.stack;
            handleError(participant, errMsg)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log(errMsg);
        })

    // Don't allow initiation of talking if there is an outstanding question
    if(participant.currentState.startsWith('awaitingAnswer')){
        Communicator.sendMessage(bot, participant,
            ctx.from.id, config.phrases.experiment.cannotStartTalkOutstanding[partLang], !config.debug.messageDelay)
            .catch(err => {
                console.log('Unable to send talk cannot start message for participant ' +
                    + participant.uniqueId + '!\n' + err.message + '\n' + err.stack);
                console.error(err);
                return handleError(participant, 'Unable to send talk cannot start message for participant ' +
                    + participant.uniqueId + '!\n' + err.message + '\n' + err.stack)
                    .catch(err => {
                        console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                    });
            })
            return;
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
        console.log("ERROR: Unable to get userID in /talk\n" + e.message + "\n" + e.stack);
        return handleError(participant, 'Unable to get userID in /talk\n' + e.message + "\n" + e.stack)
            .catch(err => {
                console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
            });
    }

    participant.firstName = userInfo.first_name;
    let textObj = ConfigParser.buildQuestionPromptText(participant, config);
    if(textObj.returnCode === DevConfig.SUCCESS_CODE){
        TALK[ctx.from.id] = true;
        sendText = textObj.data;
    } else if(textObj.returnCode === DevConfig.FAILURE_CODE){
        handleError(participant, 'Unable to build talk start message\n' + textObj.data)
            .catch(err => {
                console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
            });
    }

    Communicator.sendMessage(bot, participant,
        ctx.from.id, sendText, !config.debug.messageDelay)
        .catch(err => {
            let errMsg = 'Unable to send talk start message for participant ' +participant.uniqueId + '!\n'
                + err.message + '\n' + err.stack
            console.log(errMsg);
            handleError(participant, errMsg)
            .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
        })
});

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
    let timeStamp = moment.tz(participant.parameters.timezone).format();
    transcripts.addMessages(participant.uniqueId, [{
        message: ctx.message.text,
        from: ""+participant.uniqueId,
        timeStamp: timeStamp
    }])
        .catch(err => {
            let errMsg = "Unable to add messages to transcript for participant " + participant.uniqueId + " at time "
                + timeStamp + "\n" + err.message + "\n" + err.stack;
            handleError(participant, errMsg)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log(errMsg);
        })

    let instructionText = config.instructionText;
    try{
        let insMessages = instructionText[participant.parameters.language];
        for(let i = 0; i < insMessages.length; i++){
            Communicator.sendMessage(bot, participant, ctx.from.id, insMessages[i], !config.debug.messageDelay)
                .catch(err => {
                    throw err;
                })
        }
    } catch(err){
        Communicator.sendMessage(config.phrases.experiment.cannotHelp[participant.parameters.language])
            .then(ret => {
                return handleError(participant, 'Unable to send instructions!\n'
                    + err.message + '\n' + err.stack)
            })
            .then(ret => {
                console.log('Unable to send instructions!');
                console.error(err);
            })
            .catch(err => {
                console.log("Unable to send can't send instructions message: " + participant.uniqueId + "\n"
                + err.message + "\n" + err.stack)
            })

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
      await experiments.initializeExperiment(config.experimentId, config.experimentName, config.experimentConditions, config.relConditionSizes);

      // Use the new experiment henceforth
      experiment = await experiments.get(config.experimentId);
    } catch(err){
      console.log('Failed to initialize new experiment');
      console.error(err);
    } 
  } else {
      // Recount number of participants assigned to each condition
      participants.getByExperimentId(config.experimentId)
          .then(allParticipants => {
              let condCounts = Array(experiment.conditionAssignments.length).fill(0);
              for(let i = 0; i < allParticipants.length; i++){
                  let curExperiment = allParticipants[i].experimentId;
                  let curCondIdx = allParticipants[i].conditionIdx;
                  if(typeof curCondIdx !== "undefined" && curExperiment === config.experimentId){
                      condCounts[curCondIdx] += 1;
                  }
              }
              if(!lodash.isEqual(condCounts, experiment.conditionAssignments)){
                  return experiments.updateField(config.experimentId, "conditionAssignments",condCounts);
              }
          })
  }

    // Check if participant is already present in the ID Mapping system
    let secretMap = await getByChatId(config.experimentId, ctx.from.id);

    // if not, generate a new unique ID for the participant and add it
    while(!secretMap){
        try{
            let newId = idMaps.generateUniqueId();
            secretMap = await idMaps.addIDMapping(config.experimentId, ctx.from.id, newId);
        } catch(err){
            await handleError({}, 'Unable to generate a new ID for participant!\n'
                + err.message + '\n' + err.stack)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log('Unable to generate a new ID for participant!');
            console.error(err);
        }
    }
    let uniqueId = secretMap.uniqueId;

  // Check if the participant has already been added
  let participant = await getParticipant(uniqueId);

  // If not, add and initialize the participant with basic information
  if(!participant){
    try{
      await participants.add(uniqueId);
      await participants.initializeParticipant(uniqueId, config, bot.telegram.token);

      await answers.add(uniqueId);
      await answers.initializeAnswer(uniqueId, config.experimentId)

        await transcripts.add(uniqueId);
        await transcripts.initializeTranscript(uniqueId, config.experimentId)

        await debugs.add(uniqueId);
        await debugs.initializeDebugInfo(uniqueId, config.experimentId)
      // Use the new participant henceforth
      participant = await participants.get(uniqueId);
    } catch(err){
        await handleError({}, 'Failed to initialize new participant\n'
            + err.message + '\n' + err.stack)
            .catch(err => {
                console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
            });
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
      await handleError(participant, curQuestionObj.data)
          .catch(err => {
              console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
          });
    throw "ERROR: " + curQuestionObj.data;
  } else {
    let curQuestion = curQuestionObj.data;
    LogicHandler.sendQuestion(bot, participant, ctx.from.id, curQuestion,
          false, !config.debug.messageDelay, "firstQuestion")
        .then(returnObj => {
            if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                throw returnObj.data;
            }
        })
        .catch(err => {
            handleError(participant, "Failed to send language question\n"
                + err.message + '\n' + err.stack)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log('Failed to send language question');
            console.error(err);
        })

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
  let timeStamp = moment.tz(participant.parameters.timezone).format();
    transcripts.addMessages(participant.uniqueId, [{
        message: messageText,
        from: ""+uniqueId,
        timeStamp: timeStamp
    }])
        .catch(err => {
            let errMsg = "Unable to add messages to transcript for participant " + participant.uniqueId + " at time "
                + timeStamp + "\n" + err.message + "\n" + err.stack;
            handleError(participant, errMsg)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
            console.log(errMsg);
        })

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
        let partLang = participant.parameters.language;
        REPORT_FEEDBACK[ctx.from.id] = false;
        return handleFeedback(participant, feedback)
            .then(ret => {
                return Communicator.sendMessage(bot, participant,
                    ctx.from.id, config.phrases.experiment.reportFeedbackThanks[partLang], !config.debug.messageDelay);
            })
            .then(ret => {
                return Communicator.sendMessage(bot, participant,
                    ctx.from.id, config.phrases.experiment.experimentContinue[partLang], !config.debug.messageDelay);
            })
            .catch(err => {
                handleError(participant, 'Unable to save feedback message or send feedback complete' +
                    'for participant ' + participant.uniqueId + '!\n' + err.message + '\n' + err.stack)
                    .catch(err => {
                        console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                    });
            })
    }

    // If text is supposed to be keyword to start talking about something
    if(TALK[ctx.from.id]){
        TALK[ctx.from.id] = false;
        let userInfo;
        try{
            userInfo = await bot.telegram.getChat(ctx.from.id);
        } catch(e) {
            console.log("ERROR: Unable to get userID in /talk answer\n" + e.message + "\n" + e.stack);
            return handleError(participant, 'Unable to get userID in /talk answer\n' + e.message + "\n" + e.stack)
                .catch(err => {
                    console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                });
        }
        participant["firstName"] = userInfo.first_name;
        let partLang = participant.parameters.language;

        // Get the QID for the entered keyword
        let getQIDObj = ConfigParser.getUserPromptQID(participant, config, messageText);
        if(getQIDObj.returnCode !== DevConfig.SUCCESS_CODE){
            return Communicator.sendMessage(bot, participant,
                ctx.from.id, config.phrases.experiment.talkKeywordNotRecognized[partLang], !config.debug.messageDelay)
                .catch(err => {
                    let errMsg = 'Unable to send didnt understand message for participant ' + participant.uniqueId +'!\n'
                        + err.message + '\n' + err.stack;
                    console.log(errMsg);
                    handleError(participant, errMsg)
                        .catch(err => {
                            console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                        });
                })
        }

        // Create the question
        let questionObj = qHandler.constructQuestionByID(participant.conditionName,
            getQIDObj.data, partLang);
        if(questionObj.returnCode !== DevConfig.SUCCESS_CODE){
            let errMsg = 'Unable to construct question ' + messageText + ' prompted by user ' + participant.uniqueId +'!\n'
                + questionObj.data;
            return handleError(participant, errMsg)
                .catch(err => {
                console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
            });
        }

        // Ask the question
        return LogicHandler.sendQuestion(bot, participant, ctx.from.id,
            questionObj.data, false, config.debug.experimenter, "talk")
            .then(returnObj => {
                if(returnObj.returnCode === DevConfig.FAILURE_CODE) {
                    throw returnObj.data;
                }
            })
            .catch(err => {
                let errMsg = 'Unable to send question '
                    + questionObj.data + ' prompted by user ' + participant.uniqueId +'!\n'
                    + err.message + '\n' + err.stack
                return handleError(participant, errMsg)
                    .catch(err => {
                        console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                    });
            })

    }

  const answerText = ctx.message.text;

  // Handle the answer and respond appropriately
    if(config.debug.experimenter){
        console.time("\nProcessing Answer")
    }

  AnswerHandler.processAnswer(participant, answerText)
      .then((answerHandlerObj) => {
          if(config.debug.experimenter){
              console.timeEnd("\nProcessing Answer")
              console.time("Handling answer return")
          }

          switch(answerHandlerObj.returnCode){
              // Answer was valid
              case DevConfig.SUCCESS_CODE:
                  if(answerHandlerObj.data === DevConfig.NEXT_ACTION_STRING){
                      // Process the next steps
                      LogicHandler.processNextSteps(bot, uniqueId)
                          .then((result) => {
                              if(config.debug.experimenter){
                                  console.timeEnd("Handling answer return")
                              }

                              if(result.returnCode === DevConfig.FAILURE_CODE){
                                  console.log(result.data)
                                  return handleError(participant, result.data)
                              }
                          })
                          .catch(err => {
                              let errMsg = "Unable to process next actions for participant " + participant.uniqueId +
                                  "\n" + err.message + "\n" + err.stack
                              handleError(participant, errMsg);
                              console.log(errMsg);
                          });
                  }
                  break;

              // Answer was invalid (not part of options, etc.)
              case DevConfig.PARTIAL_FAILURE_CODE:
                  // Send the error message
                  Communicator.sendMessage(bot, participant, ctx.from.id, answerHandlerObj.failData, !config.debug.messageDelay);
                  // Repeat the question if needed
                  if(answerHandlerObj.successData === DevConfig.REPEAT_QUESTION_STRING){
                      LogicHandler.sendQuestion(bot, participant, ctx.from.id,
                          participant.currentQuestion, false, !config.debug.messageDelay, "invalid")
                          .then(returnObj => {
                              if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                                  console.log(returnObj.data);
                                  return handleError(participant, returnObj.data)

                              }
                          })
                          .catch(err => {
                              let errMsg = "Unable to repeat question after invalid for participant " + participant.uniqueId +
                                  "\n" + err.message + "\n" + err.stack
                              handleError(participant, errMsg)
                              console.log(errMsg);
                          });
                  }
                  break;

              // Failure occurred
              case DevConfig.FAILURE_CODE:
                  handleError(participant, answerHandlerObj.data)
                      .then(() => {
                          console.log("ERROR: " + answerHandlerObj.data);
                      })
                      .catch(err => {
                          console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                      });
                  break;

              default:
                  handleError(participant, "Answer Handler did not respond appropriately")
                      .then(() => {
                          console.log("ERROR: Answer Handler did not respond appropriately");
                      })
                      .catch(err => {
                          console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
                      });
                  break;
          }
      })
      .catch((err) => {
          handleError(participant, 'Error while processing answer for participant ' +uniqueId+'!\n'
              + err.message + '\n' + err.stack)
              .catch(err => {
                  console.log("ERROR: Unable to handle error: \n" +err.message + "\n" + err.stack);
              });
      });
  
});

// Reschedule all operations after server restart

if(!!local && local === "-l"){
    console.log('Local launch')
    bot.launch().then(() => {

        console.log('Listening to humans');
        console.log("Starting resched   uling now")
        console.time("Rescheduling all participants")
        ScheduleHandler.rescheduleAllOperations(bot, config).then(returnObj => {
            console.timeEnd("Rescheduling all participants")
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
        console.log("Starting rescheduling now")
        console.time("Rescheduling all participants")
        ScheduleHandler.rescheduleAllOperations(bot, config).then(returnObj => {
            console.timeEnd("Rescheduling all participants")
        }).catch(err => {
            console.log(err.message + "\n" + err.stack);
            throw err
        });
    }).catch((err) => {
        console.log(err.message + "\n" + err.stack);
    });
}


// Enable graceful stop
process.once('SIGINT', () => {
    scheduler.gracefulShutdown().then(res => {
        bot.stop('SIGINT')
    });

})
process.once('SIGTERM', () => {
    scheduler.gracefulShutdown().then(res => {
        bot.stop('SIGTERM')
    });
})
