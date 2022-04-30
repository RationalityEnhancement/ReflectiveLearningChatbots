const { Schema, model } = require('mongoose');
const config = require('../../json/config.json');
const dataTypeMap = {
  "string" : String,
  "number" : Number,
  "boolean" : Boolean,
  "date" : Date,
  "stringArray" : [String]
};

let schemaObject = {
  experimentId: String,
  chatId: Number,
  conditionIdx: Number,
  parameters: {},
  debug: Boolean,
  currentAnswer: [String],
  currentQuestion: {
    qId: String,
    text: String,
    qType: String,
    options: [String],
    saveAnswerTo: String,
    replyMessages: [String],
    nextAction: {
      aType: String,
      data: String
    }
  },
  currentState: String,
  answers:
    [{
      qId: String,
      text: String,
      timeStamp: Date,
      answer: [String]
    }],
  scheduledOperations : {
    questions : [
      {
        jobId : String,
        qId: String,
        atTime : String,
        onDays : [String],
        tz : String
      }
    ]
  }
}

for(const[key, value] of Object.entries(config.participantParameters)){
  if(value in dataTypeMap)
    schemaObject["parameters"][key] = dataTypeMap[value];
}

exports.ParticipantSchema = new Schema(schemaObject);

exports.Participant = model('Participant', exports.ParticipantSchema, 'experiment3_participants');
