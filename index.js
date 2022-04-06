require('dotenv').config();
const mongo = require('mongoose');
const { Telegraf, Markup } = require('telegraf');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const config = require('./json/config.json');
const timezones = require('./json/timezones.json').timezones;
const participants = require('./src/apiControllers/participantApiController');
const experiments = require('./src/apiControllers/experimentApiController');
const { checkConfig } = require('./src/configChecker');
const { PIDtoConditionMap } = require('./json/PIDCondMap')
const {
  shareDataMenu,
  frequentTimezonesMenu,
  allTimezonesMenu,
  dayStartMenu,
  dayEndMenu,
  frequencyMenu,
  removeMenu,
  constructivenessMenu
} = require('./src/menus');

const {
  assignToCondition
} = require('./src/experimentUtils')

// Validate the config file to ensure that it has all the necessary information
// This throws an error and aborts execution if there is something missing/wrong
checkConfig();

const bot = new Telegraf(process.env.BOT_TOKEN);
const scheduledJobs = {};
const defaultTimezone = 'Europe/Berlin';

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
console.log('Listening to humans');



/*
  Assigns to an experiment condition based on input parameters. If there exists
  a pre-existing mapping between PID and condition number, return that. Otherwise
  assigned randomly to one of the conditions, or balance according to the 
  given condition assignment ratios.

  In:
    participantId -> Id of participant
    pidMap -> object mapping PIDs to condition indices
    conditionAssignments -> array of same length containing ratios of group
                            sizes
    currentAssignment -> array of same length containing number of participants
                          already assigned to each corresponding condition
    assignmentScheme -> "balanced" or "random"

  Out:
    index of the assigned condition, selected according to the above scheme. If PID
    exists in numbers are exceeded 

*/


//-----------------
//--- bot setup ---
//-----------------

// "handle" errors
bot.catch((err, ctx) => {
  console.error(`Encountered an error for ${ctx.updateType}.`, err);
});

bot.start(ctx => {
  // Check if experiment has already been initialized
  experiments.get(config.experimentId).then(experiment => {
    // If not, add the experiment to the database
    if(!experiment){
      experiments.add(config.experimentId).then(() => {
        experiment.updateField(config.experimentId, 'experimentName', config.experimentName);
        experiment.updateField(config.experimentId, 'experimentConditions', config.experimentConditions);
        experiment.updateField(config.experimentId, 'conditionAssignments', config.conditionAssignments);
        experiment.updateField(config.experimentId, 'assignedToConditions', new Array(config.experimentConditions.length))
      }, error => {
        console.log('Failed to add experiment ' + config.experimentId);
        console.log(error);
      })
    }
  })
})
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
    participants.updateField(participant.chatId, 'debug', !participant.debug);
    ctx.reply(`debug set to ${!participant.debug}`, removeMenu);
  });
});

// reschedule old tasks after server restart
participants.getAll().then(allParticipants => {
  for (const participant of allParticipants.filter(p => !!p.dailyScheduleExpression)) {
    scheduledJobs[`stillAskReset_${participant.chatId}`] = schedule.scheduleJob(
      { rule: '45 23 * * *', tz: participant.timezone || defaultTimezone }, 
      () => {
        participants.updateField(participant.chatId, 'stillAsk', true);
      }
    );
    console.log(`${participant.chatId} ${moment().tz(participant.timezone || defaultTimezone).format()}`);
    scheduledJobs[`d_${participant.chatId}`] = schedule.scheduleJob(
      { rule: participant.dailyScheduleExpression, tz: participant.timezone || defaultTimezone },
      () => {
        participants.get(participant.chatId).then(realTimeParticipant => {
          let timeStamp = realTimeParticipant.debug ? ` [server time: ${moment().format('DD.MM. HH:mm')}] (restart)` : '';
          if (realTimeParticipant.stillAsk) {
            bot.telegram.sendMessage(
              realTimeParticipant.chatId,
              config.questions[0].text + timeStamp,
              Telegraf.Extra.markup(m => m.keyboard(config.questions[0].options.map(option =>
                m.callbackButton(option)
              )))
            );
            participants.updateField(realTimeParticipant.chatId, 'nextCategory', config.questions[0].category);
            participants.updateField(realTimeParticipant.chatId, 'stillAsk', false);
          }
        });
      }
    );
    if (config.customFrequency) {
      scheduledJobs[`w_${participant.chatId}`] = schedule.scheduleJob(
        { rule: participant.weeklyScheduleExpression, tz: participant.timezone || defaultTimezone }, 
        () => {
          bot.telegram.sendMessage(participant.chatId, config.frequencyQuestion, frequencyMenu);
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