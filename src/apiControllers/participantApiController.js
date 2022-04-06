const { Participant } = require('../models/Participant');
const moment = require('moment-timezone');
const defaultTimezone = 'Europe/Berlin';

exports.getAll = () => {
  try {
    return Participant.find();
  } catch (err) {
    console.error(err);
  }
}

exports.get = chatId => {
  try {
    return Participant.findOne({ chatId });
  } catch (err) {
    console.error(err);
  }
}

exports.add = chatId => {
  try {
    const participant = new Participant();
    participant.chatId = chatId;
    participant.stillAsk = true;
    participant.answers = [];
    participant.debug = false;

    return participant.save();
  } catch (err) {
    console.error(err);
  }
}

exports.update = (chatId, updatedParticipant) => {
  Participant.findOne({ chatId }, (err, participant) => {
    if (err) {
      console.error(err);
      return err;
    }

    try {
      participant.expt_name = updatedParticipant.expt_name;
      participant.chatId = updatedParticipant.chatId;
      participant.timezone = updatedParticipant.timezone;
      participant.stillAsk = updatedParticipant.stillAsk;
      participant.shareData = updatedParticipant.shareData;
      participant.dayStart = updatedParticipant.dayStart;
      participant.dayEnd = updatedParticipant.dayEnd;
      participant.frequency = updatedParticipant.frequency;
      participant.answers = updatedParticipant.answers;
      participant.nextCategory = updatedParticipant.nextCategory;
      participant.debug = updatedParticipant.debug;
      participant.dailyScheduleExpression = updatedParticipant.dailyScheduleExpression;
      participant.weeklyScheduleExpression = updatedParticipant.weeklyScheduleExpression;
      participant.save(err => {
        if (err) {
          return err;
        }

        return participant;
      });
    } catch (err) {
      console.error(err);
    }
  });
}

exports.updateField = (chatId, field, value) => {
  Participant.findOne({ chatId }, (err, participant) => {
    if (err) {
      console.error(err);
      return err;
    }

    try {
      participant[field] = value;
      participant.save(err => {
        if (err) {
          return err;
        }

        return participant;
      });
    } catch (err) {
      console.error(err);
    }
  });
}

exports.updateLastAnswerField = (chatId, field, value, addNewAnswer = false) => {
  Participant.findOne({ chatId }, (err, participant) => {
    if (err) {
      console.error(err);
      return err;
    }

    try{
      if (addNewAnswer) {
        participant.answers.push({});
      }

      if (participant.shareData === 'Opt out.'
      || field === 'text' &&  participant.shareData === 'Anonymously share the choices only.') {
        value = '---opted.out---'
      }

      participant.answers[participant.answers.length - 1][field] = value;
      if (field === 'text') {
        participant.answers[participant.answers.length - 1].timestamp = moment()
        .tz(participant.timezone || defaultTimezone).format();
      }
    } catch (err) {
      console.error(err);
    }

    participant.save(err => {
      if (err) {
        return err;
      }

      return participant;
    });
  });
}

exports.removeAll = () => {
  try {
    return Participant.deleteMany({});
  } catch (err) {
    console.error(err);
  }
}

exports.remove = chatId => {
  try {
    return Participant.deleteOne({ chatId });
  } catch (err) {
    console.error(err);
  }
}
