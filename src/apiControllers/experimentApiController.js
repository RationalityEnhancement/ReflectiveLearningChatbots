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

exports.get = async (experiment_name) => {
  try {
    return Experiment.findOne({ experiment_name });
  } catch (err) {
    console.error(err);
  }
}

exports.add = async (experimentId) => {
  try {
    const experiment = new Experiment();
    // console.log(experiment);
    experiment.experimentId = experimentId;
    

    return experiment.save();
  } catch (err) {
    console.error(err);
  }
}


exports.updateField = async (experimentId, field, value) => {
  console.log('update field called')
  try{
    let experiment = await Experiment.findOne({ experimentId });
    experiment[field] = value;
    let savedExp = await experiment.save();
    return savedExp;
  } catch (err) {
    console.error(err);
  }
}

exports.updateConditionAssignees = async (experimentId, conditionIdx, updateVal) => {
  try{
    const field = "currentlyAssignedToCondition";
    let experiment = await Experiment.findOne({ experimentId });
    let curAssigned = experiment[field];
    
    curAssigned[conditionIdx] += updateVal;
    if(curAssigned[conditionIdx] < 0) curAssigned[conditionIdx] = 0;
    experiment[field] = curAssigned;
   
    let savedExp = await experiment.save();
    return savedExp;

  } catch (err) {
    console.error(err);
  }
}
exports.removeAll = async () => {
  try {
    return Experiment.deleteMany({});
  } catch (err) {
    console.error(err);
  }
}

exports.remove = async chatId => {
  try {
    return Experiment.deleteOne({ chatId });
  } catch (err) {
    console.error(err);
  }
}
