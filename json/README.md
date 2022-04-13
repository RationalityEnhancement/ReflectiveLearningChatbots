# Defining Your Experiment

An experiment is completely defined by a JSON file. This will have to be named "_config.json_" without quotes. The remainder of this description will show you the mandatory and optional features an experiment requires to run.

Follow this documentation along with an [example experiment configuration](./exampleExptConfig.json) to see how the following example would translate into an actual document.

```
experimentName : "ExampleExperiment"                    // Mandatory: name of your experiment 
                                                        //    - can be any string of characters
experimentId : "experiment123"                          // Mandatory: unique identifier for your experiment
                                                        //    - can be any string of characters
                                          
experimentConditions : ["1", "2"]                       // Mandatory: names of the experimental conditions
                                                        //    - list of character strings
conditionAssignments : [1, 1]                           // Mandatory: ratio of experimental group sizes
                                                        //    - must be of same length as experimentalConditions
                                                        //    - example corresponds to equal group sizes (1:1 ratio)
                                          
assignmentScheme : "balanced"                           // Mandatory: can take any of the following values:
                                                        //     "pid" - assign new subject to condition based on ID
                                                        //        mapping specified in 'PIDCondMap.json'
                                                        //        requires one of the setup questions to ask for this
                                                        //      "balanced" - assign to condition to preserve group ratios
                                                        //      "random" - assign to condition randomly
                                          
participantParameters :                                 // Custom parameters that can be defined by the experimenter
|- pid : "number"                                       // Each participant will have one set of these parameters
|- isSmoker : "boolean"                                 // "pid" is mandatory if subject is to be assigned based on it
|- birthday : "date"                                    // "language" is mandatory if multiple options are possible
|- language : "string"                                  // Data type must be one of the four in this example
  
languages : ["English", "Deutsch"]                      // List of strings specifying the possible languages

defaultLanguage : "English"                             // Mandatory, even if the experiment has only one language

questionCategories :                                    // Categories under which questions can fall
|                                                       // Contains objects whose names are the names of the categories
|
|- setupQuestions :                                     // First question category. This category is mandatory to set 
|  |                                                    // the values of some important parameters.
|  |                                                    // Category is a list of question objects
|  | 
|  |- [0]                                               // This denotes the first (index 0) question object in list
|  |  |- qId: "lang"                                    // Mandatory: unique identifier of question
|  |  |- text:                                          // Mandatory: display text of question
|  |  |  |- English: "Language?"                        // must be specified in all available languages
|  |  |  |- Deutsch: "Sprache?"   
|  |  |             
|  |  |- qType : "singleChoice"                         // Mandatory: specifies input format
|  |  |                                                 // one of ["singleChoice", "freeform"]
|  |  |- options :                                      // Mandatory if qType is "singleChoice"
|  |  |  |- English : ["EN","DE"]                       // options must be specified in all available languages
|  |  |  |- Deutsch : ["EN","DE"]                       // (although it is redundant for this question)
|  |  |                                    
|  |  |- saveAnswerTo : "language"                      // Optional: save the answer to one of the custom parameters
|  |  |
|  |  |- start : true                                   // First question in category. Exactly one question in category
|  |  |                                                 //  must have this
|  |  |- nextQuestion : "setupQuestions.pidQ"           // Optional: next question to be asked immediately
|  |  |                                                 // after this one. Must have the form:
|  |  |                                                 // <questionCategory>.<qId>
                                                                                    
```

... to be continued ...
