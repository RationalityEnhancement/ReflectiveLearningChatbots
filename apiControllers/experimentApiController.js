const { Experiment } = require('../models/Experiment');
const moment = require('moment-timezone');
const defaultTimezone = 'Europe/Berlin';

exports.getAll = () => {
  try {
    return Experiment.find();
  } catch (err) {
    console.error(err);
  }
}

exports.get = experiment_name => {
  try {
    return Experiment.findOne({ experiment_name });
  } catch (err) {
    console.error(err);
  }
}

exports.add = experiment_name => {
  try {
    const experiment = new Experiment();
    console.log(experiment);
    experiment.experiment_name = experiment_name;
    

    return experiment.save();
  } catch (err) {
    console.error(err);
  }
}


exports.updateField = (experiment_name, field, value) => {
  Experiment.findOne({ experiment_name }, (err, experiment) => {
    if (err) {
      console.error(err);
      return err;
    }

    try {
      experiment[field] = value;
      experiment.save(err => {
        if (err) {
          return err;
        }

        return experiment;
      });
    } catch (err) {
      console.error(err);
    }
  });
}
