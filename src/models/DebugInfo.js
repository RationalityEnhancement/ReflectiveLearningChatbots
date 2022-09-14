const { Schema, model } = require('mongoose');

let schemaObject = {
  experimentId: String,
  uniqueId: String,
  debugInfo: [
    {
      infoType: String,
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
      },
      parameters: {},
      stages : {
        stageName: String,
        stageDay: Number
      },
      info: [String],
      timeStamp: String,
      from: String
    }
  ]
}


exports.DebugInfoSchemaObject = schemaObject;

exports.DebugInfoSchema = new Schema(schemaObject);

exports.DebugInfo = model('DebugInfo', exports.DebugInfoSchema, 'experiment3_debuginfo');
