const { Schema, model } = require('mongoose');

exports.ParticipantSchema = new Schema({
  experimentId: String,
  chatId: Number,
  participantId: String,
  conditionIdx: Number,
  parameters: {
    language: String
  },
  debug: Boolean,
  currentQuestion: {
    id: String,
    text: String,
    qType: String,
    options: [String],
    saveAnswerTo: String,
  },
  currentState: String,
  answers: 
  [{
    qId: String, 
    timeStamp: Date,
    answer: [String]
  }]
});

exports.Participant = model('Participant', exports.ParticipantSchema, 'experiment3_participants');
