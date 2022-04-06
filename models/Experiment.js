const { Schema, model } = require('mongoose');

exports.ExperimentSchema = new Schema({
  experiment_name: String,
  conditions: [String],
  assigned_to_condition: [Number]
});

exports.Experiment = model('Experiment', exports.ExperimentSchema, 'experiment3_experiment');
