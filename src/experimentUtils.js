
/*
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