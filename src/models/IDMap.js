const { Schema, model } = require('mongoose');

exports.IDMapSchema = new Schema({
  experimentName: String,
  experimentId: String,
  IDMappings: [{
    chatId: String,
    uniqueId: String
  }]
});

exports.IDMap = model('IDMap', exports.IDMapSchema, 'experiment3_IDmap');
