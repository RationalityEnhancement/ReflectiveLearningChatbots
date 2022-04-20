# Defining Your Experiment 

_(up to date for first prototype)_

An experiment is completely defined by a JSON file. This will have to be named "_config.json_" without quotes. The remainder of this description will show you the mandatory and optional features an experiment requires to run.

Follow this documentation along with an [example experiment configuration](./exampleConfig.json) to see how the following example would translate into an actual document. 

```
experimentName : "ExampleExperiment"                    // Mandatory: name of your experiment 
                                                        //    - can be any string of characters
experimentId : "experiment123"                          // Mandatory: unique identifier for your experiment
                                                        //    - can be any string of characters
                                          
participantParameters :                                 // Custom parameters that can be defined by the experimenter
|- pid : "string"                                       // Each participant will have one set of these parameters                                   
|- language : "string"                                  //   "language" is mandatory if multiple options are possible
  
languages : ["English", "Deutsch"]                      // List of strings specifying the possible languages

defaultLanguage : "English"                             // Mandatory, even if the experiment has only one language

questionCategories :                                    // Categories under which questions can fall
|                                                       // Contains objects whose names are the names of the categories
|
|- setupQuestions :                                     // First question category. This category is mandatory to set 
|  |                                                    // the values of some important parameters.
|  |                                                    // Category is a list of question objects
|  |                                                    // Setup questions are asked at the very beginning by default
|  | 
|  |- [0]                                               // This denotes the first (index 0) question object in list
|  |  |- qId: "lang"                                    // Mandatory: unique identifier of question
|  |  |- text:                                          // Mandatory: display text of question
|  |  |  |- English: "Language?"                        // must be specified in all available languages
|  |  |  |- Deutsch: "Sprache?"   
|  |  |             
|  |  |- qType : "singleChoice"                         // Mandatory: specifies input format
|  |  |                                                 // one of ["singleChoice", "freeform", "multiChoice"]
|  |  |- options :                                      // Mandatory if qType is "singleChoice" or "multiChoice"
|  |  |  |- English : ["EN","DE"]                       // options must be specified in all available languages
|  |  |  |- Deutsch : ["EN","DE"]                       // (although it is redundant for this question)
|  |  |                                    
|  |  |- saveAnswerTo : "language"                      // Optional: save the answer to one of the custom parameters
|  |  |
|  |  |- start : true                                   // First question in category. Exactly one question in category
|  |  |                                                 //  must have this
|  |  |- nextAction :                                   // Optional: next action to execute after question has
|  |  |  |                                              //   been answered
|  |  |  |- aType : "sendQuestion"                      // Mandatory: can be "sendQuestion" or "scheduleQuestions"
|  |  |  |                                              // 
|  |  |  |- data : "setupQuestions.pId"                 // If aType = "sendQuestion", data must be valid 
|  |  |                                                 //    "<questionCategory>.<qId>"
|  |  |           
|  |  [1]
|  |  |- qId: "pId"                                     // Defining another set-up question to collect Participant ID
|  |  |- text:                                          // Mandatory: display text of question
|  |  |  |- English: "Enter PID"                        // must be specified in all available languages
|  |  |  |- Deutsch: "Gib PID ein"   
|  |  |             
|  |  |- qType : "freeform"                             // Specifying freeform text input
|  |  |                                    
|  |  |- saveAnswerTo : "pid"                           // Optional: save the answer to one of the custom parameters
|  |  |
|  |  |
|  |  |- nextAction :                                   // Optional: next action to execute after question has 
|  |  |  |- aType : "scheduleQuestions"                 // been answered. This schedules all of the questions 
|                                                       // listed in "scheduledQuestions"
|                                                   
|- morningQuestions :                                   // Creating another question category 
|  |                                                    
|  | 
|  |- [0]                                               // This denotes the first (index 0) question object 
|  |  |                                                 //  in category list
|  |  |- qId: "feelings"                                   
|  |  |- text:                                          // Mandatory: display text of question
|  |  |  |- English: "Which feelings today?"            // must be specified in all available languages
|  |  |  |- Deutsch: "Welche Gefühle heute?"   
|  |  |             
|  |  |- qType : "multiChoice"                          // Specifying question where multiple options can be selected
|  |  |                                                 
|  |  |- options :                                      // Mandatory if qType is "singleChoice" or "multiChoice"
|  |  |  |- English : ["sad","happy","bored"]           
|  |  |  |- Deutsch : ["traurig","froh","gelangweilt"]  
|  |  |                                    
|  |  |- start : true                 

scheduledQuestions :                                    // List of questions that are to be scheduled every day
|                                                       //    details about time/days to schedule
|- [0]                                                  // First question to be scheduled in list
|  |- qId : "morningQuestions.feelings"                 // Mandatory: Valid <questionCategory>.<qId>
|  |
|  |- atTime : "09:00"                                  // Mandatory: time in 24-hr format - "HH:MM"
|  |                                                    //   Question specified in PID asked at this time
|  |- onDays : ["Mon","Tue","Wed"]                      // Mandatory: Days on which question should be asked
                                                        //   [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
                                                        
phrases                                                 // Mandatory phrases to be translated into every language      
|                                                       //  !! Only translations for these given phrases into each 
|                                                       //    language must be added here. Nothing else to be changed !! 
|                             
|- answerValidation :                                   // Phrases related to telling the user about wrong answer format
|  |                                                    
|  |- option                                            // Phrase displayed when user is prompted to select options, but
|  |  |                                                 //  types in another answer that is not in the options.
|  |  |- English: "Choose only from options"            // Must be specified in all available languages
|  |  |- Deutsch: "Nur aus den Optionen wählen"   
|
|- keyboards :                                          // Phrases related to prompting the user to input/select
|  |                                                    
|  |- singleChoice                                      // Phrase displayed when user must select only one option
|  |  |                                                 
|  |  |- English: "Choose one option"          
|  |  |- Deutsch: "Eine Option wählen"  
|  |
|  |- multiChoice                                       // Phrase displayed when user must select multiple options
|  |  |                                                 
|  |  |- English: "Choose many options"          
|  |  |- Deutsch: "Mehrere Optionen wählen"
|  |
|  |- terminateMultipleChoice                           // Text displayed on button that signifies that the user is 
|  |  |                                                 //   done choosing (for multiChoice questions)
|  |  |- English: "Done"          
|  |  |- Deutsch: "Fertig"
|  |
|  |- finishedChoosingReply                             // Message sent to confirm that the user's options have been 
|  |  |                                                 //   registered (for multiChoice questions)
|  |  |- English: "Choices registered"          
|  |  |- Deutsch: "Wahlen erfasst"
                                                                                  
```

This experiment config file will result in a chatbot that has the following functionality:

* When user sends `/start`, begin by asking the setup questions:
  * First ask to choose one language which user prefers (`setupQuestions.lang`)
    * This will be stored to the `language` variable of participant parameters
  * Then ask immediately after to type in PID (`setupQuestions.pid`)
    * This will be stored to the `pid` variable of participant parameters
* After setup questions are complete, questions specified in `scheduledQuestions` are scheduled for the given times.
  * On Monday, Tuesday, and Wednesday at 09:00, the chatbot will ask the user to select multiple emotions they are feeling.

Relevant data that is saved in the database:
* All custom participant parameters and values
* List of answer received with the following information:
  * ID of question asked
  * Text of question asked
  * Timestamp of answer
  * Content(s) of answer
