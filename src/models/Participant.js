const { Schema, model } = require('mongoose');

exports.ParticipantSchema = new Schema({
  experimentId: String,
  chatId: Number,
  conditionIdx: Number,
  parameters: {
    language: String,
    pId: String,
    timezone: String
  },
  debug: Boolean,
  currentQuestion: {
    qId: String,
    text: String,
    qType: String,
    options: [String],
    saveAnswerTo: String,
    replyMessages: [String],
    nextQuestion: String
  },
  currentState: String,
  answers: 
  [{
    qId: String, 
    text: String,
    timeStamp: Date,
    answer: [String]
  }]
});

exports.Participant = model('Participant', exports.ParticipantSchema, 'experiment3_participants');
