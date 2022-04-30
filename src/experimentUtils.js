const moment = require('moment-timezone')

/**
  Assigns to an experiment condition based on input parameters. If there exists
  a pre-existing mapping between PID and condition number, return that. Otherwise
  assigned randomly to one of the conditions, or balance according to the 
  given condition assignment ratios.

  In:
    participantId -> Id of participant
    pidMap -> object mapping PIDs to condition indices
    conditionAssignments -> array of same length containing ratios of group
                            sizes
    currentAssignment -> array of same length containing number of participants
                          already assigned to each corresponding condition
    assignmentScheme -> "balanced", "random", or "pid"

  Out:
    index of the assigned condition, selected according to the above scheme. If PID
    exists in numbers are exceeded 

*/
module.exports.assignToCondition = (participantId, pidMap, conditionAssignments, currentAssignments, assignmentScheme) => {
  if(assignmentScheme === "pid" && participantId in pidMap){
    return pidMap[participantId];
  } else {
    assignmentScheme = "balanced";
  }
  if(assignmentScheme === "balanced" && currentAssignments.some(val => val > 0)){
    totalParts = currentAssignments.reduce((a, b) => a + b, 0);
    relCurAssignments = currentAssignments.map(n => parseFloat(n / totalParts));
    
    relParts = conditionAssignments.reduce((a, b) => a + b, 0);
    relReqAssignments = conditionAssignments.map(n => parseFloat(n / relParts));

    relDiffs = [];
    for(let i=0; i < relCurAssignments.length; i++){
      relDiffs.push(relReqAssignments[i] - relCurAssignments[i]);
    }
    return relDiffs.indexOf(Math.max(...relDiffs));

  } else {
    return Math.floor(Math.random() * conditionAssignments.length);
  }
}

/**
 * Takes a moment date string (moment.tz().format()) and converts it into a date object to access
 *  the numbers directly
 *
 * @param dateString moment date string of the format "YYYY-MM-DDTHH:MM:SS+OH:OM" (OH, OM = offset hours, minutes)
 *                                                 or "YYYY-MM-DDTHH:MM:SS-OH:OM"
 * @returns {{}} date object with following int properties: hours, minutes, seconds, years, months, days
 */

let parseMomentDateString = (dateString) => {
  let dateObj = {};
  let dateTimeSplit = dateString.split(/[T]/)
  let date = dateTimeSplit[0];
  let time = dateTimeSplit[1];

  let dateSplit = date.split('-');
  dateObj.years = parseInt(dateSplit[0]);
  dateObj.months = parseInt(dateSplit[1]);
  dateObj.days = parseInt(dateSplit[2]);

  let timeSplit = time.split(/[-\+:]/);
  dateObj.hours = parseInt(timeSplit[0]);
  dateObj.minutes = parseInt(timeSplit[1]);
  dateObj.seconds = parseInt(timeSplit[2]);

  return dateObj;
}

module.exports.parseMomentDateString = parseMomentDateString;

/**
 * Takes a given timezone in tz-database format and returns a date object
 *
 * @param timezone string in tz database format (see Wikipedia)
 * @returns {{}} date object with following int properties: hours, minutes, seconds, years, months, days
 */
module.exports.getNowDateObject = (timezone) => {
  let now = moment.tz(timezone);
  let dateObj = parseMomentDateString(now.format());

  return dateObj;
}