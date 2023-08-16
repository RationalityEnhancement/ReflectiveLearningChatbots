# Explanation of software for developers

The main entry point of the chatbot is `index.js` of the root directory. In this file, the `telegraf-js` chatbot instance is initialized and all of the commands are defined.

The functions `bot.on(...)` and `bot.command(...)` define what happens when the bot receives certain messages from the participant. These functions then call the other classes to process the data and provide an appropriate response.

Each of the files in this directory contains a class that has specific functions as described below.

* `actionHandler.js` - Processes the actions (Section ...) that the experimenter can define
* `answerHandler.js` - Processes an answer that the user inputs
* `communicator.js` - Any message that is sent to the participant is sent through this class
* `configParser.js` - Functions to parse the experimenter configuration file and extract specific information
* `configReader.js` - Reads the experimenter configuration file
* `experimentUtils.js` - Miscellaneous utility functions 
* `inputOptions.js` - Defines keyboards for different types of questions
* `logicHandler.js` - Handles the step-by-step logic of the interaction with a user
* `questionHandler.js` - Reads questions from the experimenter configuration file and constructs corresponding objects
* `reminderHandler.js` - Handles the creation and scheduling of reminders for questions
* `returnMethods.js` - Defines standard return methods that every function uses to signify success or error
* `scheduleHandler.js` - Handles the scheduling of questions and actions
* `stageHandler.js` - Handles the flow of experiment stages

# How data is stored in the database

Data is stored in the database as documents in a MongoDB cloud database. 

The following are the different types of MongoDB document models that exist - 
* Answers (`Answers.js`) - List of answers for a given participant
* DebugInfo (`DebugInfo.js`) - List of debug info objects for a given participant
* Experiment (`Experiment.js`) - Single document for an experiment with information about the experiment
* IDMap (`IDMap.js`) - Each document is a mapping from a Telegram chat ID to an unidentifiable unique ID, for a given experiment
* Participant (`Participant.js`) - Single document for a single participant in a given experiment, contains values of parameters, condition, stages, etc.
* Transcript (`Transcript.js`) - List of messages exchanged between a given participant and chatbot

For the models above that have lists of data, all of the data for a single participant is divided over multiple documents. With large arrays, reading and writing documents takes a long time, so the answers are stored in multiple lists over different documents, and connected to each other as a linked list. A new link is created every day (in `case "incrementStageDay"` of function `processAction` of `src/actionHandler.js`), to ensure that the sizes of the active documents being written to remain short.

# Debug Info

During trial runs of the experiment, you can also generate debug info for each participant that is stored to the database along with the participant data. The purpose of the debug info is to trace the evolution of the participant object as they progress through the experiment. For this, debug info is saved after right before an action, right after an action, and when a question is asked.

The following information is saved in each debug info object:
* Participant Parameters at the given time
* State of scheduled operations at the time
* Timestamp of occurrence of action or question
* Information about which action or question was initiated/completed
* The function from which the action or question was initiated/completed


The debug info can be viewed by using the command `npm run download-data include-debug` from the root directory. This will save the participant data to the `results/` folder, with each participant having an additional field for the list of debug info objects.
