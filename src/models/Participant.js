const { Schema, model } = require('mongoose');
const config = require('../../json/config.json');
const DevConfig = require('../../json/devConfig.json');

const dataTypeMap = {};
dataTypeMap[DevConfig.OPERAND_TYPES.STRING] = String;
dataTypeMap[DevConfig.OPERAND_TYPES.NUMBER] = Number;
dataTypeMap[DevConfig.OPERAND_TYPES.BOOLEAN] = Boolean;
dataTypeMap[DevConfig.OPERAND_TYPES.STRING_ARRAY] = [String];
dataTypeMap[DevConfig.OPERAND_TYPES.NUMBER_ARRAY] = [Number];

let schemaObject = {
  experimentId: String,
  uniqueId: String,
  conditionIdx: Number,
  conditionName: String,
  parameters: {
    STAGE_DAY : Boolean,
    STAGE_NAME : String,
  },
  parameterTypes : {},
  currentAnswer: [String],
  currentQuestion: {
    qId: String,
    text: String,
    qType: String,
    options: [String],
    replyMessages: [String],
    selectQFirst : Boolean,
    nextActions: [{
      aType : String,
      args : [String]
    }],
    nextQuestion: String,
    qualtricsLink : String,
    cReplyMessages: [
      {
        if : String,
        then: [String],
        else : [String]
      }
    ],
    cNextQuestions: [
      {
        if : String,
        then: String,
        else : String
      }
    ],
    cNextActions: [
      {
        if : String,
        then: [{
          aType : String,
          args : [String]
        }],
        else : [{
          aType : String,
          args : [String]
        }]
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
        if : String,
        tz : String
      }
    ]
  }
}

for(const[key, value] of Object.entries(config.customParameters)){
  if(value in dataTypeMap){
    schemaObject["parameters"][key] = dataTypeMap[value];
  }

}
for(const[key, value] of Object.entries(config.mandatoryParameters)){
  if(value in dataTypeMap){
    schemaObject["parameters"][key] = dataTypeMap[value];
  }
}
for(let i = 0; i < config.experimentConditions.length; i++){
  let condStages = config.experimentStages[config.experimentConditions[i]];
  let varNameStart = condStages.name + "_START_DAY";
  let varNameEnd = condStages.name + "_END_DAY";
  if(!(varNameStart in schemaObject)){
    schemaObject[varNameStart] = String;
  }
  if(!(varNameEnd in schemaObject)){
    schemaObject[varNameEnd] = String;
  }

}


exports.ParticipantSchemaObject = schemaObject;

exports.ParticipantSchema = new Schema(schemaObject);

exports.Participant = model('Participant', exports.ParticipantSchema, 'experiment3_participants');
