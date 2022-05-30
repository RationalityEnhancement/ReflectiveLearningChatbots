# Defining Your Experiment 

_(up to date for third prototype)_

This pages contains all of the instructions and documentation on how to define an experiment for the Reflective Learning Chatbot in _config.json_.

### Contents
<ol>
  <li><a href="#Overview">Overview</a></li>
  <li><a href="#Structure">JSON Structure</a></li>
  <li><a href="#GettingStarted">Start With an Example!</a></li>
  <li>
    <a href="#ExptInfo">Experiment Information</a>
    <ol>
      <li> <a href="#NandL">Name and Languages</a> </li>
      <li> <a href="#Debug">Debug Flags</a> </li>
      <li> <a href="#Conds">Conditions</a> </li>
      <li> <a href="#Stages">Stages</a> </li>
    </ol>
  </li>
  <li> <a href="#Parameters">Participant Parameters</a></li>
  <li> 
    <a href="#QCats">Question Categories</a>
    <ol>
      <li> <a href="#DefaultCat">Default Category</a> </li>
      <li> <a href="#CQCats">Condition Questions</a> </li>
    </ol>
  </li>
  <li> 
    <a href="#Question">Question Object</a>
    <ol>
      <li> <a href="#QID">Question ID</a> </li>
      <li> <a href="#QText">Question Text</a> </li>
      <li> <a href="#QTypes">Question Types</a> </li>
      <li> 
        <a href="#NextSteps">Next Steps</a> 
        <ol>
          <li><a href="#Replies">Reply Messages</a></li>
          <li><a href="#Actions">Actions</a></li>
          <li><a href="#NextQ">Next Question</a></li>
        </ol>
      </li>
    </ol>
  </li>
  <li> 
    <a href="#Variables">Variables and Constants</a> 
    <ol>
      <li><a href="#ReservedVars">Reserved Variables</a></li>
      <li><a href="#CustomVars">Custom Variables</a></li>
    </ol>
  </li>
  <li><a href="#Scheduled">Scheduling Questions</a></li>
  <li><a href="#Phrases">Mandatory Phrases</a></li>
</ol>

## <span id="Overview"> Overview </span>
<hr>
An experiment is completely defined by a JSON file. This will have to be named "_config.json_" without quotes, and present in this directory. This file _must_ contain the following information that has to be provided by the experimenter: 

* Experiment information:
  * Experiment Name, Unique Identifier for the Experiment
  * List of languages the experiment is available in, and the default language
  * Names of the experiment conditions, how new participants are supposed to be assigned to conditions, and the relative sizes of each experiment condition
  * Stages of the experiment, on which days they occur, and how long each lasts
* Parameters for each participant:
  * The experimenter can define custom parameters (variables) of different types for each participant. These can then be manipulated throughout the course of the experiment as specified by the experimenter, and can be used to condition the behaviour of the chatbot.
* Questions to ask the participant - this forms the bulk of the experiment definition 
  * For each condition, experimenter specifies different categories of questions, each of which is a list of questions.
  * Each question is a JSON object containing a unique identifier for the question, text of the question, type of input expected from the user, and which question to ask next in sequence among other things
* Scheduled questions - specify which questions are to be scheduled when, and conditions for these
* Phrases that are required to be translated into every available language for the sake of bot functionality. 
  * No categories here should be added or removed. The existing phrases should simply be translated into all the possible languages the bot should offer.

It is useful to edit the JSON file in an IDE, such as [IntelliJ Idea](https://www.jetbrains.com/idea/). Depending on the number of conditions, the experiment definition may run into thousands of lines (about half of which are empty space for easier visualization). However, being able to collapse and expand sections of the JSON file will greatly help reduce visual clutter while defining your experiment.


## <span id="Structure">JSON Structure</span>
<hr>

In order to create a JSON object properly, it is important to follow the correct syntax. While the syntax is simple, it is still possible to make mistakes when defining large JSON objects such as an experiment, especially when a lot of copying and pasting is occurring. This section will begin with a short overview of JSON objects and lists in general, and will then move on to the description of the structure of the experiment JSON file in particular.

The most important elements of a JSON file are 'objects' and 'lists'. These can be used in a nested manner to define the experiment in greater detail.

### Objects
Objects are units with properties. The object is defined within curly braces, and its properties are a set comma-separated key-value pairs, each separated by commas. The keys must be strings, but the values can be any JSON element (object, list, string, boolean, or number).

Here is an example of an object defining a dog named Fido with a string property, number property, and boolean property:

```
{
  "name" : "Fido",
  "numberOfLegs" : 4,
  "isCanine" : true
}
```

### Lists
Lists are square-bracket-enclosed structures that contain a sequence of elements, each separated by commas. 

Let us add a property to the above dog object, that defines a list of "friends" that Fido has. Here, the property "friends" is a list of strings.

```
{
  "name" : "Fido",
  "numberOfLegs" : 4,
  "isCanine" : true,
  "friends" : ["Bub", "Nyla", "Frankie"]
}
```

### Recursion

These elements can be used recursively to an arbitrary depth - an object can contain list properties, and a list can contain objects. An object

This can be illustrated with an example of a dog shelter with multiple dogs, Fido being one of them. The dog shelter object has a property "residents" which is a list of Dog objects, each Dog object having a list property. The dog shelter also has a property "suppliers" that itself is an object.

Note the position of the commas - between the properties and elements of a list, but not after the last property/list element.

```
{
  "shelterName" : "We love doggies",
  "location" : "Earth",
  "suppliers" : {
    "food" : "Dog Food Co.",
    "crates" : "Cratemeister.com",
    "blankets" : "Blankets & Beyond"
  },
  "residents" : [
    {
      "name" : "Fido",
      "numberOfLegs" : 4,
      "isCanine" : true,
      "friends" : ["Bub", "Nyla", "Frankie"]
    },
    {
      "name" : "Nyla",
      "numberOfLegs" : 4,
      "isCanine" : true,
      "friends" : ["Bub", "Fido", "Frankie"]
    }
  ]
}
```

### Experiment Config Structure

The experiment config is essentially one monolithic JSON object. Most of the properties of the experiment exist as properties of the main JSON object (they are at the first level).

Other parts of the experiment definition, such as stages, question categories, and phrases are themselves objects with more properties, despite being properties of the main experiment object.

Templates such as [this](json/exampleConfig.json) provide the structure already, whose properties only need to be replaced/filled in by the experimenter (see also: next section).

<b><i> ! WARNING - Valid JSON Syntax does NOT mean valid experiment file ! </i></b>

It is important to pay attention to the case of the property names. Use capital letters where directed, and don't use them where not. For example, the field `experimentId` must not be written as `experimentID` or as `ExperimentId`.

It is also important to pay attention to the data type of a given field. If it is mentioned that a field must contain a string value, it cannot contain any other value. E.g., `defaultLanguage` must be a string, and cannot be `4` or `false` or `["English", "German"]`.

## <span id="GettingStarted"> Start With an Example </span>
<hr>



## <span id="ExptInfo"> Experiment Information </span>
<hr>

This is the basic defining information of the experiment. These exist at the first level of the experiment JSON object.

### <span id="NandL"> Name and Languages </span>

The following are fields that exist at the first level of the experiment JSON object:

* `experimentName` - Name of the experiment
* `experimentId` - String that uniquely identifies the current experiment
* `languages` - List of strings containing all the languages the experiment is available in
* `defaultLanguage` - String containing the default language

The following example shows the beginning of the experiment JSON file
```
{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : ["English", "Deutsch"],
  "defaultLanguage" : "English",
  ...
}
```

### <span id="Debug"> Debug Flags </span>

This is an object of boolean properties that exists at the first level of the experiment JSON object. These contain various flags to turn certain features on or off, for the purposes of debugging.

* `experimenter` - Enables functionalities such as logging information, deleting participants/experiment, etc.
* `actionMessages` - Enables messages whenever an action has been completed (scheduling question, setting variable, etc.)
* `enableNext` - Enables the `/next` command that allows the experimenter to skip to the next scheduled question without waiting
* `messageDelay` - Enables message delay to simulate typing of the bot. Can be turned off so that experimenter doesn't have to wait.
* `developer` - For the person writing code. Better to keep this at `false` if you are an experimenter


Continuation of the beginning of the experiment JSON file, if this were the actual deployed experiment:
```
{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : ["English", "Deutsch"],
  "defaultLanguage" : "English",
  "debug" : {
    "experimenter" : false,
    "actionMessages" : false,
    "enableNext" : false,
    "messageDelay" : true,
    "developer" : false
  },
  ...
}
```

### <span id="Conds"> Conditions </span>

Here you can define the different possible experimental conditions for the Reflective Learning Chatbot experiment. You can define completely different behaviour of the chatbot for each condition. There is theoretically no limit to the number of conditions there can be, but it would be better limited to 2 or 3 for the sake of having a manageable configuration file.

Experiment conditions are optional! However, if you want to use experiment conditions, all of the following fields MUST be specified. Furthermore, the action `"assignToCondition"` must be invoked at some point during the experiment (see <a href="#DefaultCat">Default Category</a> or <a href="#Actions">Actions</a>).

These are all fields at the first level of the experiment JSON object. 

* `experimentConditions` - List of strings containing the names of each possible condition
* `conditionAssignments` - List of numbers that define the relative group sizes of each condition. Must be of same length as experimentConditions.
  * For example, `[1,1]` or `[2,2]` would mean equal group sizes, `[1,2]` would mean the second condition should have twice as many participants as the first.
* `assignmentScheme` - Defines how participants are to be assigned to condition. It is a string with the possible options:
  * `"pid"` - Assign new participant to a condition based on participant ID (see below)
  * `"balanced"` - Assign new participant to the condition that would best help maintain the relative group sizes in `conditionAssignments`, based on how many participants are already assigned to all conditions. First participant is assigned randomly.
  * `"random"` - Assign new participant to a random condition
  
Continuation of the beginning of the experiment JSON file, adding two conditions of equal sizes:
```
{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : ["English", "Deutsch"],
  "defaultLanguage" : "English",
  "debug" : {
    "experimenter" : false,
    "actionMessages" : false,
    "enableNext" : false,
    "messageDelay" : true,
    "developer" : false
  },
  "experimentConditions" : ["Condition1", "Condition2"],
  "conditionAssignments" : [1,1],
  "assignmentScheme" : "balanced"
  ...
}
```
  
#### Assigning to Condition By Participant ID

If the `assignmentScheme` is set to be `"pid"`, then the software uses the information in the file `json/PIDCondMap.json`. 

This JSON file is itself an object with only one level. The properties are the participant ID of the participant (string, stored to the parameter `PID`), and the value is the _index_ of the condition the participant with that PID is to be assigned to. The _index_ is a number corresponding to the position of the condition in the list `experimentConditions`, with `0` being the first.

Note that this requires you to obtain the participant ID from the participant through chat interactions and store it to the participant parameter `PID`. Details about how to do this will be explained in the coming sections.

The following is an example of `json/PIDCondMap.json`. In this example, `experimentConditions` is `["Experimental","Control"]`. Participant with `PID = 1234` will be assigned to condition `Experimental`, and `4321` will be assigned to `Control`.

```
{
  "1234" : 1,
  "4321" : 0
}
```

### <span id="Stages"> Stages </span>


## <span id="Parameters"> Participant Parameters </span>
<hr>

## <span id="QCats"> Question Categories </span>
<hr>

### <span id="DefaultCat"> Default Category </span>
### <span id="CQCats"> Condition Questions </span>

## <span id="Question"> Question Object </span>
<hr>

### <span id="QID"> Question ID</span>
### <span id="QText">Question Text </span>
### <span id="QTypes"> Question Types</span>
### <span id="NextSteps"> Next Steps </span>

#### <span id="Replies">Reply Messages</span>
#### <span id="Actions"> Actions </span>
#### <span id="NextQ"> Next Question</span>

## <span id="Variables">Variables and Constants</span>
<hr>

### <span id="ReservedVars"> Reserved Variables </span>
### <span id="CustomVars"> Custom Variables </span>
### <span id="Constants"> Using Constants </span>

## <span id="Scheduled"> Scheduling Questions </span>
<hr>

## <span id="Phrases"> Mandatory Phrases </span>
<hr>

The remainder of this description will show you the mandatory and optional features an experiment requires to run.

Follow this documentation along with an [example experiment configuration](json/others/exampleConfig.json) to see how the following example would translate into an actual document. 

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
|  |  |                                                 // listed in "scheduledQuestions"
|  |  |
|  |  |- replyMessages :                                // Optional: Messages to send when answer is received
|  |  |  |                                              // List of messages to be specified in all languages
|  |  |  |- English : ["Received","Thanks"]
|  |  |  |- Deutsch : ["Erhalten","Danke"]
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
|  |- atTime : "10:00"                                  // Mandatory: time in 24-hr format - "HH:MM"
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
|
|- schedule :                                           // Phrases related to telling the user about scheduled questions
|  |                                                    
|  |- scheduleNotif                                     // Message to user about a question being scheduled, and on which
|  |  |                                                 //  times and days
|  |  |- English: "Questions scheduled"            
|  |  |- Deutsch: "Frage geplant"   
                                                                                  
```

This experiment config file will result in a chatbot that has the following functionality:

* When user sends `/start`, begin by asking the setup questions:
  * First ask to choose one language which user prefers (`setupQuestions.lang`)
    * This will be stored to the `language` variable of participant parameters
  * Then ask immediately after to type in PID (`setupQuestions.pid`)
    * This will be stored to the `pid` variable of participant parameters
* After setup questions are complete, questions specified in `scheduledQuestions` are scheduled for the given times.
  * On Monday, Tuesday, and Wednesday at 10:00, the chatbot will ask the user to select multiple emotions they are feeling.

![git1](https://user-images.githubusercontent.com/42759570/164409102-dc514ae1-9681-4f9c-a668-42b120cf5e13.png)
![git2](https://user-images.githubusercontent.com/42759570/164409111-4a689baf-b3cd-4699-b567-83477c5e6c82.png)
![git3](https://user-images.githubusercontent.com/42759570/164409113-369199d6-078e-42c6-8510-8cbfeaf0b757.png)
![git4](https://user-images.githubusercontent.com/42759570/164409116-888f0e66-2e25-407c-9eb6-abd6628fd133.png)
![git5](https://user-images.githubusercontent.com/42759570/164409117-2428a859-ff99-4cf4-b66e-bb249255887b.png)

Relevant data that is saved in the database:
* All custom participant parameters and values
* List of answer received with the following information:
  * ID of question asked
  * Text of question asked
  * Timestamp of answer
  * Content(s) of answer
