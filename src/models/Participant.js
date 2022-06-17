const { Schema, model } = require('mongoose');
const ConfigReader = require('../configReader');
const config = ConfigReader.getExpConfig();
const DevConfig = ConfigReader.getDevConfig();

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
  parameters: {},
  stages :{
    activity : [
      {
        name: String,
        what: String,
        when: String
      }
    ],
    stageDay : {
      type : Number,
      default : 0
    },
    stageName : {
      type: String,
      default: ""
    }
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
    continueStrings : [String],
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
    },
    minLengthChars : Number,
    minLengthWords : Number,
    reminder : {
      freqMins : Number,
      numRepeats : Number
    },
    inputPrompt : String
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
      },
    ],
    actions : [
      {
        jobId : String,
        aType: String,
        args: [String],
        atTime : String,
        onDays : [String],
        if : String,
        tz : String
      }
    ],
    reminders : [
      {
        jobId : String,
        minutes : Number,
        hours : Number
      }
    ]
  }
}

for(const[key, value] of Object.entries(config.customParameters)){
  if(value in dataTypeMap){
    schemaObject["parameters"][key] = {
      type: dataTypeMap[value],
      default: DevConfig.DEFAULT_DTYPE_VALUES[value]
    };
  }
}
for(const[key, value] of Object.entries(config.mandatoryParameters)){
  if(value in dataTypeMap){
    schemaObject["parameters"][key] = {
      type: dataTypeMap[value],
      default: DevConfig.DEFAULT_DTYPE_VALUES[value]
    };
  }
}

exports.ParticipantSchemaObject = schemaObject;

exports.ParticipantSchema = new Schema(schemaObject);

exports.Participant = model('Participant', exports.ParticipantSchema, 'experiment3_participants');
