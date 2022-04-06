const { Schema, model } = require('mongoose');

exports.ExperimentSchema = new Schema({
  experimentName: String,
  experimentId: String,
  experimentConditions: [String],
  conditionAssigments: [Number],
  currentlyAssignedToCondition: [Number],
  lastAssignedCondition: Number
});

exports.Experiment = model('Experiment', exports.ExperimentSchema, 'experiment3_experiment');
