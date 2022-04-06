const { Schema, model } = require('mongoose');

exports.ParticipantSchema = new Schema({
  expt_name: String,
  chatId: Number,
  timezone: String,
  stillAsk: Boolean,
  shareData: String,
  dayStart: String,
  dayEnd: String,
  frequency: String,
  answers: [{
    category: String,
    question: String,
    text: String,
    timestamp: String
  }],
  nextCategory: String,
  debug: Boolean,
  dailyScheduleExpression: String,
  weeklyScheduleExpression: String
});

exports.Participant = model('Participant', exports.ParticipantSchema, 'experiment3_participants');
