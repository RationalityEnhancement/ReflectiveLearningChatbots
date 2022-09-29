const { Schema, model } = require('mongoose');


let schemaObject = {
  experimentId: String,
  uniqueId: String,
    current: Boolean,
    start: Boolean,
    linkId: String,
    nextLinkId: String,
  messages:
    [{
      message: String,
      from: String,
      timeStamp: String
    }]
}


exports.TranscriptSchemaObject = schemaObject;

exports.TranscriptSchema = new Schema(schemaObject);

exports.Transcript = model('Transcript', exports.TranscriptSchema, 'experiment3_transcripts');
