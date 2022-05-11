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
  uniqueId: String,
  conditionIdx: Number,
  conditionName: String,
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
    nextActions: [String],
    nextQuestion: String,
    cReplyMessages: [
      {
        optionIndices : [Number],
        data: [String]
      }
    ],
    cNextQuestions: [
      {
        optionIndices : [Number],
        data: String
      }
    ],
    cNextActions: [
      {
        optionIndices : [Number],
        data: [String]
      }
    ],
    range : {
      lower: Number,
      upper: Number
    }
  },
  currentState: String,
  answers:
    [{
      qId: String,
      text: String,
      timeStamp: String,
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

for(const[key, value] of Object.entries(config.customParameters)){
  if(value in dataTypeMap)
    schemaObject["parameters"][key] = dataTypeMap[value];
}
for(const[key, value] of Object.entries(config.mandatoryParameters)){
  if(value in dataTypeMap)
    schemaObject["parameters"][key] = dataTypeMap[value];
}

exports.ParticipantSchema = new Schema(schemaObject);

exports.Participant = model('Participant', exports.ParticipantSchema, 'experiment3_participants');
