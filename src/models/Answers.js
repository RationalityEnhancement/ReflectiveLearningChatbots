const { Schema, model } = require('mongoose');



let schemaObject = {
  experimentId: String,
  uniqueId: String,
  answers:
    [{
      qId: String,
      text: String,
      askTimeStamp: String,
      answerTimeStamp: String,
      stageName: String,
      stageDay: Number,
      answer: [String]
    }]
}


exports.AnswersSchemaObject = schemaObject;

exports.AnswersSchema = new Schema(schemaObject);

exports.Answers = model('Answer', exports.AnswersSchema, 'experiment3_answers');
