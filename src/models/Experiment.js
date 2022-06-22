const { Schema, model } = require('mongoose');

exports.ExperimentSchema = new Schema({
  experimentName: String,
  experimentId: String,
  experimentConditions: [String],
  conditionAssignments: [Number],
  currentlyAssignedToCondition: [Number],
  lastAssignedCondition: Number,
  errorMessages : [{
    message: String,
    participantJSON: String
  }]
});

exports.Experiment = model('Experiment', exports.ExperimentSchema, 'experiment3_experiment');
