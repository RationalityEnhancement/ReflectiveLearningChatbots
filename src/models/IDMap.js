const { Schema, model } = require('mongoose');

exports.IDMapSchema = new Schema({
  experimentName: String,
  experimentId: String,
  uniqueId: String,
  chatId: Number
});

exports.IDMap = model('IDMap', exports.IDMapSchema, 'experiment3_IDmap');
