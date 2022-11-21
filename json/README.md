# Defining Your Experiment 

_(up to date for third prototype)_

This pages contains all of the instructions and documentation on how to define an experiment for the Reflective Learning Chatbot in _config.json_.

Sections 1-3 give you a quick overview of the structure of the experiment configuration file, as well as a short example to get started quickly.

Sections 4 onwards contain detailed documentation of each part of the experiment, and show how to build a different example experiment configuration file from start to finish. (However, the example shown will not be complete, and will only contain a few examples of the essential portions of the configuration file, the rest of which have to be filled out by the experimenter.)

### Contents
<ol>
  <li><a href="#Overview">Overview</a></li>
  <li><a href="#Structure">JSON Structure</a></li>
  <li><a href="#GettingStarted">Start With an Example!</a></li>
  <li>
    <a href="#ExptInfo">Experiment Information</a>
    <ol>
      <li> <a href="#NandL">Name and Languages</a> </li>
      <li> <a href="#Instructions">Instructions</a> </li>
      <li> <a href="#Debug">Debug Flags</a> </li>
      <li> <a href="#Conds">Conditions</a> </li>
      <li> <a href="#Stages">Experiment Stages</a> </li>
    </ol>
  </li>
  <li> <a href="#Parameters">Participant Parameters</a></li>
  <li> 
    <a href="#QCats">Question Categories</a>
    <ol>
      <li> <a href="#DefaultCat">Default/Conditionless Categories</a> </li>
      <li> <a href="#CQCats">Condition Question Categories</a> </li>
    </ol>
  </li>
  <li> 
    <a href="#Question">Question Object</a>
    <ol>
      <li> <a href="#QID">Question ID</a> </li>
      <li> <a href="#QText">Question Text</a> </li>
      <li> <a href="#QTypes">Question Types</a> </li>
      <li> 
        <a href="#DefNextSteps">Default Next Steps</a> 
        <ol>
          <li><a href="#Replies">Reply Messages</a></li>
          <li><a href="#Actions">Actions</a></li>
          <li><a href="#NextQ">Next Question</a></li>
        </ol>
      </li>
      <li> 
        <a href="#CondNextSteps">Conditional Next Steps</a> 
        <ol>
          <li><a href="#CReplies">Reply Messages</a></li>
          <li><a href="#CActions">Actions</a></li>
          <li><a href="#CNextQ">Next Question</a></li>
        </ol>
      </li>
      <li>
        <a href="#Reminders">Reminders</a>
      </li>
    </ol>
  </li>
  <li> 
    <a href="#Variables">Variables and Constants</a> 
    <ol>
      <li><a href="#ReservedVars">Reserved Variables</a></li>
      <li><a href="#CustomVars">Custom Variables</a></li>
      <li><a href="#Constants">Using Constants</a></li>
    </ol>
  </li>
  <li><a href="#Conditions">Conditional Expressions</a></li>
  <li><a href="#Scheduled">Scheduling Questions</a></li>
  <li><a href="#UserPrompt">User Prompted Questions</a></li>
  <li><a href="#Setup">Setup Questions and Starting the Experiment</a></li>
  <li><a href="#Phrases">Mandatory Phrases</a></li>
  <li><a href="#Split">Splitting Up the Configuration File</a></li>
</ol>

## <span id="Overview"> Overview </span>

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

Properties in objects have no particular ordering. That means the following object would be equivalent to the previous one.

```
{
  "numberOfLegs" : 4,
  "isCanine" : true,
  "name" : "Fido"
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

Templates such as [this](others/exampleConfig.json) provide the structure already, whose properties only need to be replaced/filled in by the experimenter (see also: next section).

<b><i> ! WARNING - Valid JSON Syntax does NOT mean valid experiment file ! </i></b>

It is important to pay attention to the case of the property names. Use capital letters where directed, and don't use them where not. For example, the field `experimentId` must not be written as `experimentID` or as `ExperimentId`.

It is also important to pay attention to the data type of a given field. If it is mentioned that a field must contain a string value, it cannot contain any other value. E.g., `defaultLanguage` must be a string, and cannot be `4` or `false` or `["English", "German"]`.

## <span id="GettingStarted"> Start With an Example </span>

Before moving on to designing an entire experiment, it is probably a good idea to start with a simple example! [Here](others/exampleConfig.json) is a pre-built example for you with some of the basic functionalities of an experiment. You can try running this experiment yourself. This section will then describe to you what occurs in the experiment and which sections you can locate the definition for these in the config file. 

Reading the <a href="#Overview">Overview</a> section first may be useful before following through with this.

How to run this example (assuming you have completed set-up as described [here](../README.md)): 
* Step 1: open the example file in an IDE or text editor and copy all the text
* Step 2: replace all the text in `json/config.json` with the copied text
* Step 3: navigate to the main folder (where you see the file `index.js`)
* Step 4: run the command `npm run start-local`
* Step 5: open Telegram and start chatting with your bot!
* Step 6: if you would like to start over to try to be assigned to a different condition, type `/delete_me`, and then type `/start` again.

The following lines will describe what you should expect from your interaction with the bot along with links to the lines in the example file where these functionalities can be defined.
* [Link](others/exampleConfig.json#L3-L5) - The experiment has two possible conditions, C1 and C2, of equal sizes.
* [Link](others/exampleConfig.json#L14-L34) - Both conditions are 4 days long. C1 has two stages, and C2 has just one.
* [Link](others/exampleConfig.json#L47-L78) - On first interaction, you are welcomed and are given options to choose your language
* [Link](others/exampleConfig.json#L67-L5) - Your answer is saved and you are then assigned to a condition 
  * ([Link](others/exampleConfig.json#L124-L260) - we will assume you are assigned to C1, so you get these questions)
  * ([Link](others/exampleConfig.json#L261-L354) - if you weren't, you would have got these questions)
  * you can start over (Step 6 above) if you weren't assigned to C1 and you would like to be
* [Link](others/exampleConfig.json#L66) - The next question for your timezone is selected.
* [Link](others/exampleConfig.json#L79-121) - You are asked for your timezone.
* [Link](others/exampleConfig.json#L117-L119) - All of the questions for your condition are scheduled.
  * ([Link](others/exampleConfig.json#L246-L259) - C1 scheduled questions defined here.)
  * ([Link](others/exampleConfig.json#L346-L352) - C2 scheduled questions defined here.)
* [Link](others/exampleConfig.json#L132-L139) - You type `/next` and the stage First-Half begins.
* [Link](others/exampleConfig.json#L148-L154) - The question is selected based on whether it's an odd day or even day of the stage
* [Link](others/exampleConfig.json#L172-L186) - On the first day, you can enter an answer over multiple lines
  * [Link](others/exampleConfig.json#L179-L184) - Once you answer, a variable is incremented
  * [Link](others/exampleConfig.json#L185) - The next question is automatically selected
  * [Link](others/exampleConfig.json#L157-L171) - You receive a question which you answer in only one message.
  * [Link](others/exampleConfig.json#L161-L162) - The question text contains the value of the variable that is being incremented
* [Link](others/exampleConfig.json#L188-L245) - After typing `/next` until the stage Second-Half starts, you get the choice questions of the next stage.
* [Link](others/exampleConfig.json#L148-L154) - Finally, you type next until you reach the end of the experiment.

Hopefully this, along with the overview of the file structure, helps you make some connections between what the file looks like and what you see in the experiment.

The remaining sections will explain in detail the evolution of an experiment file from start to finish!

## <span id="ExptInfo"> Experiment Information </span>

This is the basic defining information of the experiment. These exist at the first level of the experiment JSON object.

### <span id="NandL"> Name and Languages </span>

The following are fields that exist at the first level of the experiment JSON object:

* `experimentName` - Name of the experiment
* `experimentId` - String that uniquely identifies the current experiment
* `languages` - List of strings containing all the languages the experiment is available in
* `defaultLanguage` - String containing the default language
* `msPerCharacterDelay` - Number of milliseconds the bot waits per character typed, in order to simulate typing.

The following example shows the beginning of the experiment JSON file, titled `config.json`, stored in the directory `json`, which is located in the main directory of your project. If you want to copy the below object into your JSON file, copy only the object and not the text `"In json/config.json"`.

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : ["English", "Deutsch"],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5
  ...
}
```
### <span id="Instructions"> Instructions </span>

The `instructions` property will contain instructions that you would like to present to the user. Users can prompt these instructions to be sent to them at any time during the experiment by using the command `/help`.

The `instructions` object contains a property for each language available for the experiment, with each language having a list of strings corresponding to the instruction text for that language.

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : ["English", "Deutsch"],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {
    "English" : ["Welcome to the test experiment of the Reflective Learning Bot!", "These instructions are not useful."],
    "Deutsch" : ["Nachricht 1", "Nachricht 2"]
  }
  ...
}
```

When the user types the command `/help`, the bot simply sends these messages in response, based on the language that the user has selected. Each string in the list will be sent in a separate message (so, the above example will send two messages.)

Note that the Telegram limit for length of a text is 4096 characters. If your instructions are longer than this, split them up into multiple messages.

### <span id="Debug"> Debug Flags </span>

This is an object of boolean properties that exists at the first level of the experiment JSON object. These contain various flags to turn certain features on or off, for the purposes of debugging.

* `experimenter` - Enables functionalities such as logging information, deleting participants/experiment, etc.
* `actionMessages` - Enables messages whenever an action has been completed (scheduling question, setting variable, etc.)
* `enableNext` - Enables the `/next` command that allows the experimenter to skip to the next scheduled question without waiting
* `messageDelay` - Enables message delay to simulate typing of the bot. Can be turned off so that experimenter doesn't have to wait.
  * Length of delay can be adjusted by changing the parameter `msPerCharacterDelay` (see above)
* `developer` - For the person writing code. Better to keep this at `false` if you are an experimenter


Continuation of the beginning of the experiment JSON file, if this were the actual deployed experiment:
```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : ["English", "Deutsch"],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
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

Experiment conditions are optional! However, if you want to use experiment conditions, all of the following fields MUST be specified. Furthermore, the action `"assignToCondition"` must be invoked at some point during the experiment (see <a href="#Setup">Setup Questions</a> or <a href="#Actions">Actions</a>).

These are all fields at the first level of the experiment JSON object. 

* `experimentConditions` - List of strings containing the names of each possible condition
* `relConditionSizes` - List of numbers that define the relative group sizes of each condition. Must be of same length as experimentConditions.
  * For example, `[1,1]` or `[2,2]` would mean equal group sizes, `[1,2]` would mean the second condition should have twice as many participants as the first.
* `assignmentScheme` - Defines how participants are to be assigned to condition. It is a string with the possible options:
  * `"pid"` - Assign new participant to a condition based on participant ID (see below)
  * `"balanced"` - Assign new participant to the condition that would best help maintain the relative group sizes in `relConditionSizes`, based on how many participants are already assigned to all conditions. First participant is assigned randomly.
  * `"random"` - Assign new participant to a random condition
* `conditionMapping` - Object containing mapping between PID and the index of the condition to which participants with that PID should be assigned to. (See below)
  
Continuation of the beginning of the experiment JSON file, adding two conditions of equal sizes:
```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : ["English", "Deutsch"],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : {
    "experimenter" : false,
    "actionMessages" : false,
    "enableNext" : false,
    "messageDelay" : true,
    "developer" : false
  },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {
    "1234" : 0,
    "4321" : 1
  }
  ...
}
```
  
#### Assigning to Condition By Participant ID

If the `assignmentScheme` is set to be `"pid"`, then the software uses the information in the property `conditionMapping`, which is an object with only one level. 

The properties of the `conditionMapping` object are the participant ID of the participant (string, stored to the parameter `PID`), and the value is the **index** of the condition the participant with that PID is to be assigned to. The **index** is a number corresponding to the position of the condition in the list `experimentConditions`, with `0` being the first.

Note that this requires you to obtain the participant ID from the participant through chat interactions and store it to the participant parameter `PID` using the `"saveAnswerTo"` action. Details about how to do this will be explained in the coming sections (see [Setup Questions](#span-idsetup-setup-questions-and-starting-the-experimentspan)).

The following is an example of `conditionMapping`. In this example, `experimentConditions` is `["Experimental","Control"]`. Participant with `PID` of value `"1234"` will be assigned to condition `Experimental`, since that has the index `0` in the list of conditions, and `4321` will be assigned to `Control`, since that has the index `1` in the list of conditions.

```
{
  "1234" : 1,
  "4321" : 0
}
```

### <span id="Stages"> Experiment Stages </span>

An experimental condition **must** be composed of one or more consecutive stages. A stage is a period of the experiment of definite or indefinite length, only one of which runs at a time. Stages are mainly used to define different functionality of the chatbot depending on how long it has been since the user has begun interaction. Therefore, the length of each stage, if specified, is quantified by the number of days a stage lasts before moving on to the next.

In this beginning section of the experimenter configuration file, only the names and durations of the stages are specified. Stage-dependent chatbot behaviour must be defined by using the variables `STAGE_NAME` and `STAGE_DAY` in conditional expressions during the scheduling/definition of questions (see sections <a href="#ReservedVars">Reserved Variables</a>, <a href="#Conditions">Conditional Expressions</a>, and <a href="#CondNextSteps">Next Steps after Question</a>).

**The first stage must be started manually** at the appropriate time after all of the stage-independent setup questions are complete, by using the action `"startStage"` (see section <a href="#Actions">Actions</a>)

Once the first stage has begun, the stage day will automatically increment by 1 between 04:00 and 05:00 **only on every morning that the stage is defined to be running**. If the number of days of the current stage exceeds the specified number of days for that stage, the next stage is **automatically** started. If there is no next stage, the experiment is automatically ended.

It is possible to have a stage of indefinite length. However, in this case, it is up to the experimenter to **manually** ensure that the next stage begins under the right conditions, by using the action `"startStage"` (see [actions](#span-idactions-actions-span))whenever required (for example, after a certain question is answered).

The `experimentStages` object must have the keys of **ALL** of the possible experiment conditions, which means stages have to be specified individually for each condition. The value of each of these keys will be a list of individual stage objects. A stage object has the following fields:

* name - (Mandatory) String name of the stage
* lengthDays - (Optional) Number of days the stage is to run.
  * If omitted, stage is of indefinite length.
* onDays - (Optional) List of strings of days on which the stage is supposed to be active.
  * Each entry in list must be one of `"Sun"`, `"Mon"`, `"Tue"`, `"Wed"`, `"Thu"`, `"Fri"`, `"Sat"` (capitalization is important)
  * The stage will not progress outside of these days.
  * If omitted, defaults to all days of week.

Let us add some stages to our example experiment. For `"Condition1"`, we will have one stage of indefinite length, and two stages of length 2 days each, all occurring only on the weekdays. This means that the second stage will also have to be **manually** started after the conditions defined by the experimenter are met. The third stage will automatically start two weekdays after the second stage starts, and the experiment automatically ends two weekdays after the third stage starts. 

For `"Condition2"`, we will have just one stage that lasts 4 days, but it only occurs on weekends. This means that the experiment will end 4 weekend days (in about two weeks) after the stage has been manually started.

```
In experimentStages of json/config.json

{
  "Condition1" : [
    {
      "name" : "Pre-Test",
      "onDays" : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    },
    {
      "name" : "Test",
      "lengthDays" : 2
      "onDays" : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    },
    {
      "name" : "Post-Test",
      "lengthDays" : 2
      "onDays" : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    }
  ],
  "Condition2" : [
    {
      "name" : "Intermediate",
      "onDays" : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    }
    {
      "name" : "Test",
      "lengthDays" : 2
      "onDays" : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    }
  ]
}
```

Now, to add this to the experiment JSON object we are building, we must simply assign it to the `experimentStages` field.

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {
    "Condition1" : [{ "name" : "Pre-Test" ...}, { "name" : "Test" ...}, { "name" : "Post-Test" ...}],
    "Condition2" : [{ "name" : "Test" ...}]
   }
  ...
}
```

### Stages without Experimental Conditions

If you decide not to define experimental conditions, it is still possible to define stages. However, in this case, the field experimentStages at the first level of the experiment JSON object must directly be a list of stage objects, instead of an object with each condition as it is above.

Example (of a different, condition-less experiment configuration file), `noCondsConfig.json`, also in the folder `json`: 

```
In json/noCondsConfig.json

{
  "experimentName" : "NoConditions",
  "experimentId" : "RL-NoCond-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentStages" : [
    {
      "name" : "Test",
      "lengthDays" : 2
      "onDays" : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    },
    {
      "name" : "Post-Test",
      "lengthDays" : 2
      "onDays" : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    }
  ]
  ...
}
```


## <span id="Parameters"> Participant Parameters </span>

Now, experimenters can define parameters, which are essentially variable values that are stored for each participant, and that can be manipulated in certain ways throughout the course of the experiment (see section <a href="#Actions">Actions</a>). These do not only store information about the participant (e.g., `participantIsSmoker`), but also can be used to set variables that control the behaviour of the chatbot (e.g., `setGoalsToday`).

These are defined by two objects at the first level of the experiment JSON object. 

The first parameter object is called `mandatoryParameters`. This contains parameters essential to the running of the experiment, such as `"language"`, `"timezone"`, and `"PID"`. It is better to leave this object alone, as custom parameters cannot be defined here, and the pre-defined parameters need to have the same names and data types as is given. 

The second parameter object is called `customParameters`. Here, the experimenter can define any number of key-value pairs, the key being the name of the variable (string) and the value being the data type of the variable (string). The following are the possible data types:
* "str" - Simple string variable (default value is empty string)
* "number" - Simple number variable (integer or decimal; default value is 0)
* "boolean" - Simple boolean (true or false; default value is false)
* "strArr" - Array of simple strings (default value is empty array)
* "numArr" - Array of simple numbers (default value is empty array)

For example, let us define four parameters. The first one will be a number `numGoalsSet`, that stores the number of goals that the user set, the second one a string array `goalsSet` that stores each of the goals that the user set for themselves on that day, the third one a boolean `wantsToReflect`, indicating a user's preference on whether or not they want to reflect on that given day, and the fourth one `reflectionText` storing the user's answer to a reflection prompt.

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {
    "language" : "string",
    "PID" : "string",
    "timezone" : "string"
  },
  "customParameters" : {
    "numGoalsSet" : "number",
    "goalsSet" : "strArr",
    "wantsToReflect" : "boolean",
    "reflectionText" : "strArr"
  }
  ...
}
```

## <span id="QCats"> Question Categories </span>

Now, we come to the most important part of the question - what the users actually receive. That's right, those are the questions. However, before we start delving into how the questions are defined, we will talk about how they are organized within the experiment JSON object.

Organization of questions happens mainly through so-called "question categories." Essentially, a question category is a list of question objects (each question object corresponding to one question). The only purpose question categories serve is to organize the questions according to their relevance. For example, you might want to have the category `"morningQuestions"` for questions that would be asked in the morning, or `"reflectionQuestions"` for questions that specifically prompt reflection. However, question categories are **essential**. You cannot define a question outside of a question category.

Question categories can occur in two places: (1) at the first level of the JSON experimenter object (default/condition-less question categories) and (2) categories defined specifically for each condition.

Both of these can (and usually will) exist at the same time, so it is important to note the distinction between the two:

(1) The default/conditionless categories are accessed **only when the user has NOT been assigned to a condition yet**. This might be at the beginning of the experiment during the setup phase, or if the experiment does not have any conditions at all. These are **NOT accessible once the user has been assigned to a condition**.

(2) The condition question categories are accessed when a user has been assigned to a particular condition. That is, only the question categories pertaining to a user's condition are accessible. Questions in categories not defined under the user's current condition are not accessible! If there is one category of questions that should be defined for two different conditions, they must be defined separately (even if duplicated) under each condition.

Let us now go deeper into how these look in the experiment file.

### <span id="DefaultCat"> Default/Conditionless Categories </span>

The default categories are present in an object, `questionCategories`, that occurs at the first level of the experiment JSON object. The `questionCategories` object contains the names of all of the default question categories as keys, and their values are the list of question objects that belong to each of those categories.

Since our example experiment has two different conditions, the only questions we would want to have in the default categories are questions that collect basic information from the participant before assigning them to a condition. Otherwise, any other questions here will no longer be accessible to us once the participant is assigned to a condition. 

Let us create a question category called `"setupQuestions"` as the only category in our conditionless categories. Since we have not yet seen what question objects look like, we will make placeholders for them and revisit them in the section <a href="#Setup">Setup Questions</a> after we have discussed question objects at length.

```
In questionCategories of json/config.json

{
  "setupQuestions" : [
    {
      "qId" : "language",
      "start" : true,
      ...
    },
    {
      "qId" : "participantID",
      ...
    },
    {
      "qId" : "timezone"
    }
  ]
}
```

We've successfully created a conditionless question category object! Now all we have to do is assign this to the field `questionCategories` at the first level of the experiment JSON object.

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {
    "setupQuestions" : [...]
  }
  ...
}
```

In case your experiment does not have any conditions, you can (and have to) define all your question categories in this default object. We will add this field to our example with no conditions, along with the same setup questions.

```
In json/noCondsConfig.json

{
  "experimentName" : "NoConditions",
  "experimentId" : "RL-NoCond-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentStages" : [...],
  "questionCategories" : {
    "setupQuestions" : [...]
  }
  ...
}
```

### <span id="CQCats"> Condition Question Categories </span>

NOTE: These are theoretically optional, but will likely be necessary in most cases. As long as your experiment doesn't have any conditions, you can leave these out completely. But if your experiment does have conditions, you must create a set of question categories for each condition. 

After creating our conditionless question categories, we now want to create sets of question categories for each condition. The condition question categories are, syntactically, the exact same as the conditionless question categories. The only difference is where they are placed in the experiment JSON object!

The experiment JSON object has, at the first level, another object called `"conditionQuestions"`. This, just like the one for `"experimentStages"`, contains the names of the conditions as keys. All conditions must be present in this object. The values of each of these objects is another object that we will soon go deeper into.

Let us already create the skeleton of this object with each of the conditions:

```
In conditionQuestions of json/config.json

{
  "Condition1" : {...},
  "Condition2" : {...}
}

```

Each of these condition objects has exactly **ONE** property, namely `"questionCategories"`. And if you hadn't guessed it already, this is exactly what you know from the last section - an object containing experimenter-defined names as keys and lists of question objects as values.

Imagine that we want to create, in the first condition, a category for questions in the stage `"Pre-Test"`, two categories for the stage `"Test"`, and two more for the stage `"Post-Test"`. Functionally, these are in no way connected to the actual experiment stages, so you may divide the questions up and name the categories as you want.

Note that each of the lists corresponding to the question categories would be lists of "question objects", as mentioned before, but we will leave those out now because we haven't covered them yet.

```
In conditionQuestions of json/config.json

{
  "Condition1" : {
    "questionCategories" : {
      "preTestQs" : [...],
      "testMorningQs" : [...],
      "testEveningQs" : [...],
      "postTestMorningQs" : [...],
      "postTestEveningQs" : [...]
    }
  },
  "Condition2" : {...}
}

```

Similarly, we can imagine that for our second condition, we only have one type of question that we want to ask every day. So we shall define just one question category.

```
In conditionQuestions of json/config.json

{
  "Condition1" : {
    "questionCategories" : {
      "preTestQs" : [...],
      "testMorningQs" : [...],
      "testEveningQs" : [...],
      "postTestMorningQs" : [...],
      "postTestEveningQs" : [...]
    }
  },
  "Condition2" : {
    "questionCategories" : {
      "intermediate" : [...],
      "morningQs" : [...]
    }
  }
}
```

Note how the question categories of `"Condition2"` are independent of those of `"Condition1"`, and will not be accessible if the user is assigned to `"Condition1"`, and vice versa.

Finally, all we have to do is assign this entire object to the `conditionQuestions` field at the first level of the experiment JSON object. Doing this, we get:

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {...},
  "conditionQuestions" : {
    "Condition1" : {
      "questionCategories" : {...}
    },
    "Condition2" : {
      "questionCategories" : {...}
    }
  }
  ...
}
```


## <span id="Question"> Question Object </span>

After much anticipation, we finally come to the most important part of the experiment - the actual questions! And we're not making any digressions this time.

As mentioned once before, a question object is a single JSON object that represents a question. A question object can only exist within a question category (as an element of the list), and would occupy the places of the placeholder questions shown in the previous sections.

A question object contains the following components : 

* A unique question ID
* A question type, depending on the type of response expected from the user
  * Additional optional/mandatory parameters corresponding to the question type
* Text of the question translated into all available languages
* What happens after a valid response is received:
  * Reply messages
  * Actions
  * Next question to be shown


The cycle of a question involves asking the question, receiving an appropriate response from the user, and then processing what happens next. The next sections will cover this process in this order

Step by step, we will build up a simple question asking a yes-or-no question to the user on whether they would like to later receive a prompt to reflect on the goals that they have just set, and what happens after that.


### <span id="QID"> Question ID</span>

The question ID is simply a unique identifier for the question within the question category. No other question within the category is allowed to have the same name, although questions in other categories may have the same name.

It is a simple string, and it will occupy the value of the field `qId` (case is important) of the question object.

So, here we have our new-born question object that we have just christened:

```
Example question object 1

{
  "qId" : "askReflect"
}
```

### <span id="QText">Question Text </span>

The next element of the question object is the text that will be displayed when the question is asked.

The question text for each language will take the form of a simple string, with the following additional options for formatting:
* "This text will have <b>bold</b>" -> This text will have **bold**
* "This text will have <i>italics</i>" -> This text will have _italics_
* "This text will have \"quotes\"" -> This text will have "quotes"
* "This is the first line \nThis is the second line" -> This is the first line (line break)This is the second line
* "This text will have the smiling emoji: :simple_smile:" -> This text will have the smiling emoji: :simple_smile:
  * See [this website](https://www.webfx.com/tools/emoji-cheat-sheet/) for a catalog of all the emojis that you can use in your text.

The question text can also contain values of variables, which you can access as described in section <a href="#Variables">Variables</a>.

By default, the amount of time it takes for a question to appear to the user depends on the length of the question, in order to simulate typing by the bot.

Let us now actually write the text for our example question, in both languages. The value of the `text` field of the question object is itself an object, with the keys being all of the available languages for the experiment, and the values being the text string that is to be displayed for a user who has chosen that particular language. Our example question object, taking some shape, now ends up looking like this:

```
Example question object 1

{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  }
}
```

### <span id="QImages">Question Images </span>

Another optional element that can be added to a question is the display of images. Specifically, an image specified by the experimenter can be sent to the user in a separate message **before** the text of the question appears.

An image with file type `.jpg`, `.jpeg`, or `.png` can be added either from the local directory or from a URL.

An image can be added to a question simply by setting the `image` property of the question object. Images can be added to questions of any type (see [qType](#span-idqtypes-question-typesspan) below). 

The image property is itself an object with the following mandatory attributes:

* `sourceType` - this takes the string value of either `"local"` for image files from the local repository or `"url"` for links to images on the internet.
* `source` - this is the string containing the path to the image file
  * if `sourceType` is `local`, this property will be the path to this file (including file extension) from the root directory of the repository
  * if `sourceType` is `url`, this property will be the internet URL to the **image file** (and NOT to a web page)
  * In case you would like to use a different image for different languages, this property can also be an object containing the name of each language, and the corresponding file path for that specific language.

Let us look at an example below of an example question object with a different image added to it for each language. 

```
Example question object 1

{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  }
  "image" : {
    "sourceType" : "local",
    "source" : {
      "English" : "data/images/reflectImg_eng.jpg",
      "Deutsch" : "data/images/reflectImg_ger.jpg"
    }
  }
}
```

### <span id="QTypes"> Question Types</span>

The question type of the question, a string occupying the field `qType` of the question object, defines the type of response that a user is supposed to give to the question. Each question type has some additional associated parameters, either optional or mandatory, that are added directly to the question object.

Before continuing on with our example question object, let us take a look at all of the possible question types and the additional parameters. You can <a href="#qtskip">skip ahead</a> if you simply want to continue with the example.

<hr> 

#### Freeform Text - "freeform"

Allows the user to type text into a single message, and sending the message counts as submission of their answer to the outstanding question.

The value of the `qType` of the question object should be `"freeform"`

The following are optional parameters that can be added to the question object:
* `minLengthChars` - a number specifying the minimum number of characters the answer must be in order to be valid
  * if invalid, the user is sent the <a href="#Phrases">phrase</a> `answerValidation.notLongEnoughChars` and the question is repeated
  * this parameter cannot be set if `minLengthWords` is also set
* `minLengthWords` - a number specifying the minimum number of words the answer must be in order to be valid
  * if invalid, the user is sent the <a href="#Phrases">phrase</a> `answerValidation.notLongEnoughWords` and the question is repeated
  * this parameter cannot be set if `minLengthChars` is also set
* `answerShouldBe` - a list of answers that the user's answer has to match
  * if invalid, the user is sent the [phrase](#span-idphrases-mandatory-phrases-span) `answerValidation.answerNotConforming`
  * the user is also suggested a list of 5 answers that are closest in edit distance to the answer that the user input, in case the user has misspelled something
  * see example below for more information

Example question that prompts free typing in a single message, with the requirement that the answer is at least 10 words:

```
Example question object freeform

{
  "qId" : "exFreeform",
  "text" : {...},
  "qType" : "freeform",
  "minLengthWords" : 10
}
```

```
Example question object freeform - with parameter "answerShouldBe"

{
  "qId" : "exFreeform",
  "text" : {...},
  "qType" : "freeform",
  "answerShouldBe" : ["answer1", "not an answer", "answer12", "answer123"]
}
```

```
Example chatbot response if the user sends the answer "answer" to the above question

That is not a valid answer. Did you mean one of the following?

* answer1

* answer12

* answer123

* not an answer

```



#### Freeform Multiline - "freeformMulti"

Allows the user to type text over multiple messages. The user has to send the <a href="#Phrases">phrase</a> `keyboards.terminateAnswer`, as defined for the particular language, in a single message, in order to signify that they are done typing their answer.

The value of the `qType` of the question object should be `"freeformMulti"`

The following are optional parameters that can be added to the question object:
* `minLengthChars` - a number specifying the minimum number of characters the answer (all messages included) must be in order to be valid
  * if invalid, the user is sent the phrase `answerValidation.notLongEnoughChars` (see <a href="#Phrases">Phrases</a>) and the question is repeated
  * this parameter cannot be set if `minLengthWords` is also set
* `minLengthWords` - a number specifying the minimum number of words the answer (all messages included) must be in order to be valid
  * if invalid, the user is sent the phrase `answerValidation.notLongEnoughWords` (see <a href="#Phrases">Phrases</a>) and the question is repeated
  * this parameter cannot be set if `minLengthChars` is also set

Example question that prompts free typing over multiple messages, with the requirement that the answer is at least 100 characters:

```
Example question object freeformMulti

{
  "qId" : "exFreeformMulti",
  "text" : {...},
  "qType" : "freeformMulti",
  "minLengthChars" : 100
}
```

#### Single Choice - "singleChoice"

Allows the user to select one choice out of a list of options. The user is presented with a list of buttons with the option text on them, and the clicked button is submitted as the answer.

The value of the `qType` of the question object should be `"singleChoice"`

The following are mandatory parameters that must be added to the question object for this question type to function appropriately
* `options` - specifies the available options as a list of strings for each language
  * value of this field must be an object with keys being available languages (just as with the field `text`), whose values are however the list of strings of the options translated in that language.

The following are optional parameters that can be added to the question object:
* `buttonLayoutCols` - Number of columns that the grid layout of the keyboard that displays the options should have.
  * Must not be more than the number of options available.
  * If the number of options is not evenly divisible by this number, the last row of the keyboard layout will have fewer columns (buttons) than this number
  * If this option is not included, the default number of columns is 1. That is, options will appear in a single list from top to bottom.

Example question that prompts selection of one of three options, depending on the language the user has selected.

```
Example question object singleChoice

{
  "qId" : "exSingleChoice",
  "text" : {...},
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Option A", "Option B", "Option C"],
    "Deutsch" : ["Wahl A", "Wahl B", "Wahl C"]
  }
}
```

#### Multiple Choice - "multiChoice"

Allows the user to select multiple choices out of a list of options. The user is presented with a list of buttons with the option text on them, and are allowed to click as many as they like. If the same answer is clicked multiple times, it is still counted only once.

In order to signify that they are finished choosing, users must click the very last button in the list, which will contain the <a href="#Phrases">phrase</a> `keyboards.terminateAnswer` for the given language. Accordingly, the experimenter must make sure that **none of the options has the same text as this phrase**.

The value of the `qType` of the question object should be `"multiChoice"`

The following are mandatory parameters that must be added to the question object for this question type to function appropriately
* `options` - specifies the available options as a list of strings for each language
  * value of this field must be an object with keys being available languages (just as with the field `text`), whose values are however the list of strings of the options translated in that language.
  * the option to finish choosing is added automatically, so that need not be included in this list of options

The following are optional parameters that can be added to the question object:
* `buttonLayoutCols` - Number of columns that the grid layout of the keyboard that displays the options should have. 
  * Must not be more than the number of options available.
  * If the number of options is not evenly divisible by this number, the last row of the keyboard layout will have fewer columns (buttons) than this number
  * If this option is not included, the default number of columns is 1. That is, options will appear in a single list from top to bottom.

Example question that prompts selection of any number of three options, depending on the language the user has selected, along with a fourth option to finish choosing.

```
Example question object multiChoice

{
  "qId" : "exMultiChoice",
  "text" : {...},
  "qType" : "multiChoice",
  "options" : {
    "English" : ["Option A", "Option B", "Option C"],
    "Deutsch" : ["Wahl A", "Wahl B", "Wahl C"]
  },
  "buttonLayoutCols": 3
}
```

With the addition of the property `buttonLayoutCols`, the keyboard prompted by the above question will have 3 options in a single row, as opposed to a single option in 3 rows, which is the default when this property is not set.

#### Likert 5 - "likert5"

Requires the user to select one choice from a list of choices (essentially a `singleChoice` question), with the options being 5 points on a Likert scale.

The choices of the likert scale are defined in `keyboards.likert5Options` of `phrases` (see section <a href="#Phrases">Mandatory Phrases</a>), and can be adjusted there.

The user need not enter any options for this one, as the options for every `likert5` type question will be the same.

Example question that prompts selecting from the likert scale with 5 points:

```
Example question object likert5

{
  "qId" : "exLikert5",
  "text" : {...},
  "qType" : "likert5"
}
```

#### Likert 7 - "likert7"

Requires the user to select one choice from a list of choices (essentially a `singleChoice` question), with the options being 7 points on a Likert scale.

The choices of the likert scale are defined in `keyboards.likert7Options` of `phrases` (see section <a href="#Phrases">Mandatory Phrases</a>), and can be adjusted there.

The user need not enter any options for this one, as the options for every `likert7` type question will be the same.

Example question that prompts selecting from the likert scale with 7 points:

```
Example question object likert7

{
  "qId" : "exLikert7",
  "text" : {...},
  "qType" : "likert7"
}
```

#### Number - "number"

Requires the user to enter a number into the text field to continue, with the option of ensuring that the number is within a certain range.

If the user enters something that is not a number, or a number that is outside the range, the <a href="#Phrases">phrases</a> `notANumber`, `numberTooLow`, or `numberTooHigh` of `answerValidation` are accordingly shown, and the question is repeated.

The value of the `qType` of the question object should be `"number"`

The following are optional parameters that can be added to the question object for this question type to expand functionality
* `range` - specifies an inclusive range for the allowed values
  * value of this field must be an object with the keys either `upper` (upper bound), `lower` (lower bound), or both.
  * if one of `upper` or `lower` is omitted, then the range is open on that end
  * `upper` and `lower` must be numbers (real or integer)

Example question that prompts entering a number. The answer is only accepted if the text represents a number that lies between -12.5 and 12.5.

```
Example question object number

{
  "qId" : "exNumber",
  "text" : {...},
  "qType" : "number",
  "range" : {
    "lower" : -12.5,
    "upper" : 12.5
  }
}
```

#### Qualtrics Survey - "qualtrics"

Provides the user with a link to an experimenter-specified qualtrics survey. The experimenter can also add fields that will be added as query strings to the survey link, in order to serve as meta-data for that particular response to the survey (for example, linking the participant's ID to the survey response.)

Once the user is finished with the survey, they must send the <a href="#Phrases">phrase</a> `keyboards.terminateAnswer` for the appropriate language in a single message, so that the chatbot can continue. It is also possible to set custom strings that the user must send to continue from the survey.

The value of the `qType` of the question object should be `"qualtrics"`

The following are mandatory parameters that must be added to the question object for this question type to function appropriately:
* `qualtricsLink` - string containing the base URL to the target survey (without any query strings)

The following are optional parameters that can be added to the question object for expanded functionality:
* `qualtricsFields` - list containing objects each having a `field` and `value`. Each of these is appended to the link as query strings to be passed as meta-data for the survey response.
  * `field` and `value` must be strings. `value` can also be the value of a <a href="#Variables">variable</a> at that point in time.
  * `value` should not contain characters &, = or ?
* `continueStrings` - list of strings containing custom answers that the user can send in order to continue from the survey
  * e.g., can be used to input survey completion codes, to ensure interaction does not continue until the survey is completed

Example question that shows the question text and then prompts the user to fill out a survey, passing the meta-data of the user's unique ID, as well as the current stage and the experimental condition.

```
Example question object qualtrics

{
  "qId" : "exQualtrics",
  "text" : {...},
  "qType" : "qualtrics",
  "qualtricsLink" : "https://www.qualtrics.com/jfe/form/SfsdkavV_8ND85CfuO"
  "qualtricsFields" : [
    {
      "field" : "uniqueId",
      "value" : "${UNIQUE_ID}"
    },
    {
      "field" : "stage",
      "value" : "${STAGE_NAME}"
    },
    {
      "field" : "condition",
      "value" : "Condition1"
    }
  ]
}
```

Assuming participant `12345` in condition `Condition1` is currently in stage `Pre-Test`, the above object serves the survey link:

`https://www.qualtrics.com/jfe/form/SfsdkavV_8ND85CfuO?uniqueId=12345&stage=Pre-Test&condition=Condition1`

#### Dummy Question - "dummy"

This is actually not a question at all. That is, nothing will be displayed to the user and the user is not prompted for a response.

The purpose of the dummy question is to be able to use conditions to select questions, actions or responses, using the <a href="#CondNextSteps">next steps options</a>. As you will see in that section, these steps can be undertaken only after a question, so if you want to be able to apply a certain condition that does not immediately follow after another question, then you would use a dummy (for example, selecting the first question of the day.)

The value of the `qType` of the question object should be `"dummy"`. In a question of this type, the `text` field is not necessary, and if entered, will be ignored.

Example dummy question that evaluates some conditions, then sends some messages and selects a question based on the evaluations. These are intentionally filled with placeholders (in angle brackets) for now, since they have not yet been covered. See section <a href="#CondNextSteps">Conditional Next Steps</a> for how to fill in these details.

```
Example question object dummy

{
  "qId" : "exDummySelector",
  "qType" : "dummy",
  "cReplyMessages" : [
    {
      "if" : <Conditional Expression>,
      "then" : <Reply Messages True>,
      "else" : <Reply Messages False>
    }
  ],
  "cNextQuestions" : [
    {
      "if" : <Conditional Expression>
      "then" : <Next Question True>,
      "else" : <Next Question False>
    }
  ]
}
```

<hr>

<span id="qtskip"> Now, we can get back to our example. </span>

Since we wanted to create a yes-or-no question, it seems like the obvious choice of `qType` is `singleChoice`. Let us add that to our steadily-growing question object:

```
Example question object 1

{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Yes", "No"],
    "Deutsch" : ["Ja", "Nein"]
  }
}
```

Now we are done with the first part of our question object! We have defined what we want to ask the user, and what sort of responses we want to elicit from them.

This is theoretically a complete question. However, it still lacks something in that nothing happens after the user provides an answer to this question. Therefore, we will proceed to the instructions on how to specify next steps, such as replies to send, actions to perform, or questions to ask next. 

If you would like to see how this question object finally gets added to a question category, skip to the end of the section <a href="#CActions">Conditional Next Actions</a>

### <span id="DefNextSteps"> Default Next Steps </span>

As mentioned before, there is still more to a question object. In this section, we ask the question: what happens next after the user provides an answer? The answer is: it's up to you!

After the user provides a satisfactory answer, three things can occur **in this order** (regardless of the order of the fields in the question objects):
* You can send some reply messages (under certain conditions, if necessary)
* You can perform some actions related to variables or the experiment (under certain conditions, if necessary)
* You can select the next question that will be asked immediately after this one (under certain conditions, if necessary)
  * With this function, you can form a "chain" or "series" of questions that are asked one after the other.

None of these is necessary, and it is possible to define a question object after which nothing at all happens, like our example question in its current state. 

Moreover, it is possible to slightly alter the order of occurrence of these events and select the next question **before** executing all of the next actions, in case the selection of the next question is contingent on some certain state that the participant was in before the question was answered, and before the parameters were updated. This is done by adding the boolean property to the question object: `"selectQfirst" : true`. An example use case is if, when selecting the next question, you want to compare the current answer to the value stored in a variable earlier, but also write the current answer to that variable afterwards, such as when comparing the user's current day's progress to the previous day. If the question were not selected first in this case, then the variable would be overwritten first, and then the comparison would be made, making the comparison redundant. 

As mentioned before, each of these next steps can also be specified to occur by default (in all cases) or only under certain conditions. 

However, for each of these, **you cannot define both default steps and conditional steps**! For example, you cannot define certain reply messages to be sent in all cases, as well as additional reply messages that are to be sent in only some conditions. If you wanted to achieve that, you would have to specify conditional reply messages and include the "default messages" in all of the conditions, even if this means repetition. You can, however, define default reply messages to be sent in all cases, while selecting your next actions or questions based on conditions. More on how this is specified will be elaborated in the coming subsections.

#### <span id="Replies">Reply Messages</span>

If you want your bot to react to the user's response in the same manner regardless of what the response is, you have come to the right place!

`replyMessages` is an optional field where you can specify a list of strings that are to be sent as replies once the user successfully submits an answer. Each string in the list will be sent as a different message, allowing you to break down longer reply texts over multiple messages. The text can also contain <a href="#Variables">variables</a>

As with all things that can exist in multiple languages, reply messages must also be contained in an object with the keys being the available languages. The values of each of these language properties is the **list of string reply messages** that are to be sent to the user who has selected that particular answer.

Let's now add some default reply messages to our example question object, thanking the user for answering the yes or no question.

```
Example question object 1

{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Yes", "No"],
    "Deutsch" : ["Ja", "Nein"]
  },
  "replyMessages" : {
    "English" : ["Thank you for answering the yes-or-no question!", "Let's move on to the next one"],
    "Deutsch" : ["Danke für deine Antwort auf die Ja-oder-Nein-Frage!", "Machen wir weiter mit der nächsten Frage."]
  }
  
}
```

Note: `replyMessages` cannot be specified along with `cReplyMessages` (condition reply messages, see later subsections). If neither of these is present in the question object, then there will be no text replies after the user provides a response, though other next steps, if present, will still occur.

#### <span id="Actions"> Actions </span>

After the reply messages are sent, the next thing that can be performed is the execution of certain actions. 

So we finally come to the topic that has been teased a few times before - what is an action? An action is essentially an experimenter-triggered sequence of events that either change the state of the participant, of the experiment, or manipulate some variables.

Each action has an action type, `aType`, and zero or more string arguments `args` that are required for a particular action. Together, these two fields form the 'action object', representing the execution of a single action. After seeing, in the following table, the descriptions of each action and their arguments, we will pick appropriate actions we might want to perform after our example question.

| aType                  | description                                                                                 | arg 1               | arg 1 type                | arg 2                  | arg 2 type                                | example action object                                                                                                 | notes                                                                                                                                        |
|------------------------|---------------------------------------------------------------------------------------------|---------------------|---------------------------|------------------------|-------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `assignToCondition`    | Assigns user to a particular condition based on the `assignmentScheme`                      | none                | none                      | none                   | none                                      | `{ "aType" : "assignToCondition" }`                                                                                   |                                                                                                                                              |
| `startStage`           | Starts a certain experiment stage at day 1, ending the previous stage if any was running    | name of valid stage | string                    | none                   | none                                      | `{ "aType" : "startStage", args : ["Pre-Test"] }`                                                                     | If the experiment has conditions, execute only when user is **already assigned to a condition**                                              |
| `incrementStageDay`    | Manually increment the current day of a stage by 1                                          | name of valid stage | string                    | none                   | none                                      | `{ "aType" : "incrementStageDay", args : ["Test"] }`                                                                  | incrementing of stage day occurs automatically on a daily basis already                                                                      | 
| `endExperiment`        | Manually causes the experiment to end                                                       | none                | none                      | none                   | none                                      | `{ "aType" : "incrementStageDay" }`                                                                                   | ending experiment occurs automatically after the end of last stage (if it has finite length)                                                 |
| `saveAnswerTo`         | Save the user's answer to the current question to a certain variable (parameter)            | valid variable name | string, strArr, or number | none                   | none                                      | `{ "aType" : "saveAnswerTo", args : ["numGoalsSet"] }`                                                                | save to number only when `qType` is `"number"`                                                                                               |
| `saveOptionIdxTo`      | Save the index of the user's answer in the list of options to a variable (parameter)        | valid variable name | number, numArr            | none                   | none                                      | `{ "aType" : "saveOptionIdxTo", args : ["selectedGoalIdx"] }`                                                         | only possible for `singleChoice` and `multiChoice` type questions. `multiChoice` type question saves array of indices of all chosen answers. |
| `addAnswerTo`          | Add the user's current answer to the end of a certain array variable (parameter)            | valid variable name | strArr or numArr          | none                   | none                                      | `{ "aType" : "addAnswerTo", args : ["goalsSetToday"] }`                                                               | add to number array only when `qType` is `"number"`                                                                                          |
| `setBooleanVar`        | Set the value of a particular boolean variable to either true or false                      | valid variable name | boolean                   | new value              | <a href="#Constants">boolean constant</a> | `{ "aType" : "setBooleanVar", args : ["wantsToReflect", "$B{true}"] }`                                                |                                                                                                                                              |
| `addValueTo`           | Add a number value to a number variable                                                     | valid variable name | number                    | added value            | <a href="#Constants">number constant</a>  | `{ "aType" : "addValueTo", args : ["numGoalsSet", "$N{2}"] }`                                                         |                                                                                                                                              |
| `clearVars`            | Clears one or several variables to default value (see <a href="#Parameters">Parameters</a>) | valid variable name | any parameter type        | none or valid var name | none or any parameter type                | `{ "aType" : "clearVars", args : ["goalsSetToday", "reflectionStarted"] }`                                            | Takes any number of arguments, each of which is a variable name. At least one argument required.                                             |
| `rescheduleCurrentStage` | Reschedules the questions in the current stage without updating stage name or day           | none | none | none | none | `{ "aType" : "rescheduleCurrentStage" }` | Useful, e.g., when changing the time at which user wants to receive questions.                                                               |


As you may see in the examples already, building an action object requires a field `aType` and a field `args`. If there are no required arguments for a given `aType`, the `args` field can be omitted from the action object. If there are arguments, then `args` must be a **list of strings**, even if there is only one argument.

Since our example user might be preparing to answer a reflection prompt later in the day, we can clear the parameter `reflectionText` so that we can store today's reflection answer in that parameter later on. To do this, we just assign to the field `nextActions` the list of action objects we would want to be performed in sequence. Here, we only have one action, but we still have to enter it in a list.

```
Example question object 1

{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Yes", "No"],
    "Deutsch" : ["Ja", "Nein"]
  },
  "replyMessages" : {
    "English" : ["Thank you for answering the yes-or-no question!", "Let's move on to the next one"],
    "Deutsch" : ["Danke für deine Antwort auf die Ja-oder-Nein-Frage!", "Machen wir weiter mit der nächsten Frage."]
  }
  "nextActions" : [
    {
      "aType" : "clearVars",
      "args" : ["reflectionText"]
    }
  ]
}
```

Note: `nextActions` cannot be specified along with `cNextActions` (condition next actions, see later subsections). If neither of these is present in the question object, then there will be no actions occurring after the user provides a response, though other next steps, if present, will still occur.

#### <span id="NextQ"> Next Question</span>

The last step of the next action process, after all the replies have been sent and the actions executed, is selecting the next question. This field specifies which question appears immediately after the previous one, and signifies the end of the current question cycle of asking, processing the response, and processing the next steps.

If the field `nextQuestion` is present in the question object, then the chatbot tries to serve the question that is specified in the string value of the field. Therefore it's important to ensure that you specify the next question in the correct format. And that correct format is:

`[questionCategory].[qId]`

The first part of specifying which question occurs next is the question category that the question is in. This must be a question category that is present among the categories for the same condition, and cannot be the question category of a different condition.

The second part is the question ID, namely the string that is present in the `qId` field of the question object that you want to serve next. Ensure that the category actually has a question object in the list with the specified `qId`. In both fields, pay attention to spelling and case!

Let us assume that we are in `Condition1`, and that the category `"testMorningQs"`, that we defined before, contains a question `"satisfactionSurvey"`. Suppose that we want to ask this question every time after the user answers our yes-or-no question. We just add this as a simple string to the field `nextQuestion` of the question object. 

Note that the field `nextQuestion` is a **string**, and not a list like `replyMessages` or `nextActions`, since only one next question can be selected.

```
Example question object 1

{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Yes", "No"],
    "Deutsch" : ["Ja", "Nein"]
  },
  "replyMessages" : {
    "English" : ["Thank you for answering the yes-or-no question!", "Let's move on to the next one"],
    "Deutsch" : ["Danke für deine Antwort auf die Ja-oder-Nein-Frage!", "Machen wir weiter mit der nächsten Frage."]
  }
  "nextActions" : [
    {
      "aType" : "clearVars",
      "args" : ["reflectionText"]
    }
  ],
  "nextQuestion" : "testMorningQs.satisfactionSurvey"
}
```

Note: It is possible to slightly alter the order of occurrence of these events and select the next question **before** executing all of the next actions, in case the selection of the next question is contingent on some certain state that the participant was in before the question was answered, and before the parameters were updated. This is done by adding the boolean property to the question object: `"selectQfirst" : true`. An example use case is if, when selecting the next question, you want to compare the current answer to the value stored in a variable earlier, but also write the current answer to that variable afterwards, such as when comparing the user's current day's progress to the previous day. If the question were not selected first in this case, then the variable would be overwritten first, and then the comparison would be made, making the comparison redundant.

### <span id="CondNextSteps"> Conditional Next Steps </span>

Note: the following section requires some background on specifying conditional expressions. If you are not familiar with this already, it is a good idea to skip slightly ahead to the <a href="#Conditions">next section</a>, and then return to this one to continue. 

Now we have an idea of what can be specified to happen after a question... But what if I want those things to occur only in certain cases, and not for every answer that the user gives, or for every state of the experiment/participant?

That's where conditions come in! You can simply replace in the question object any of `replyMessages`, `nextActions`, or `nextQuestion` with their conditional equivalents - `cReplyMessages`, `cNextActions`, or `cNextQuestions`, respectively. Note that you **must replace** the former field with the latter one if you want to use it - you cannot have, for example, both `nextActions` and `cNextActions` in the same question object.

Each of these is exactly like their unconditional counterparts. The difference is that, instead of having only one possible outcome, you can specify different types of outcomes based on conditional rules.

Each of the conditional fields must contain a **list** of conditional rules. Each conditional rule is an object that has at least the fields `if` and `then`, which specify the condition to be evaluated and the outcome if the condition is evaluated to true, respectively. A conditional rule can also have an optional `else` field, which specifies the outcome if the condition evaluates to false.

Let us take a simple rule:

"nextQuestion" : "testQuestions.yesQuestion"

and convert it into a conditional one:

```
"cNextQuestions" : [
  {
    "if" : "${STAGE_NAME} == $S{Pre-Test}",
    "then" : testQuestions.preTest
  },
  {
    "if" : "${STAGE_NAME} == $S{Post-Test},
    "then" : testQuestions.postTest
  },
  {
    "if" : "${STAGE_DAY} > $N{2},
    "then" : testQuestions.lateStage,
    "else" : testQuestions.earlyStage
  }
]
```

We have constructed a list of 3 conditional objects. These objects specify 4 possible outcomes of what the ID of the next question could be. So how are these rules evaluated to decide the outcome?

The rules are evaluated in sequence. In our example, we get the following decision algorithm:

* The first rule is evaluated first. 
  * If the evaluation is `true` (when the stage name is `Pre-Test`), then the question `testQuestions.preTest` is selected and evaluation stops.
  * If the evaluation is `false`, proceed to evaluating next rule
* The second rule is evaluated.
  * If the evaluation is `true` (when the stage name is `Post-Test`), then the question `testQuestions.postTest` is selected and evaluation stops.
  * If the evaluation is `false`, proceed to evaluating next rule
* The third rule is evaluated.
  * If the evaluation is `true` (when the stage day is greater than `2`), then the question `testQuestions.lateStage` is selected and evaluation stops.
  * If the evaluation is `false`, then the question `testQuestions.earlyStage` is selected and evaluation stops.

Here are two other possible scenarios that might have come to mind:
* What happens when the first rule has an `else` field?
  * In that case, since the first rule always gets evaluated first to either `true` or `false`, then either the `then` or `else` outcomes will respectively be selected. This would make any rule after a rule with an `else` field redundant, as they will never get evaluated.
* What happens if there is no `else` field at all?
  * Then the first rule that evaluates to `true` will be selected. If there is no rule that evaluates to `true`, nothing happens!

With the general idea of how conditional rules are evaluated, the following subsections will include the specifics of each type of conditional next step.\

#### <span id="CReplies">Reply Messages</span>

In order to conditionally send certain replies, then you would have to replace `replyMessages` with `cReplyMessages` in the question object.

`cReplyMessages` has to contain a **list** of conditional rules, each conditional rule being an object with at least `if` and `then` fields, and optionally an `else` field. 

The `then` and `else` fields of a conditional rule will contain exactly that which `replyMessages` would contain: an object specifying a list of reply messages for each language.

As an example, let us bring back our example question object, and replace the mandatory reply messages with messages that are based on the answer. Specifically, we will give a different reply depending on whether the answer to the question was "Yes" or "No". Since this was an option question, we can use the operator `HAS_CHOICE_IDX` from <a href="#Conditions">Conditional Expressions</a> to determine whether the answer is yes or no.

```
Example question object 1

{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Yes", "No"],
    "Deutsch" : ["Ja", "Nein"]
  },
  "nextActions" : [
    {
      "aType" : "clearVars",
      "args" : ["reflectionText"]
    }
  ],
  "nextQuestion" : "testMorningQs.satisfactionSurvey",
  "cReplyMessages" : [
    {
      "if" : "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0}",
      "then" : {
        "English" : ["Great that you want to reflect on your goals!"],
        "Deutsch" : ["Toll, dass du über deine Ziele reflektieren willst!"]
      },
      "else" : {
        "English" : ["I understand.", "Reflecting on your goals isn't easy."],
        "Deutsch" : ["Ich kann nachvollziehen", "Es ist nicht einfach zu reflektieren."]
      }
    }
  ]
}
```

Note that the order of the fields is not important. The reply messages will still be the first steps processed after the question has been answered. 

Further note: `cReplyMessages` cannot be specified along with `replyMessages` (unconditional reply messages). If neither of these is present in the question object, then there will be no text replies after the user provides a response, though other next steps, if present, will still occur.

#### <span id="CActions"> Actions </span>

In order to execute actions conditionally, then you would have to replace `nextActions` with `cNextActions` in the question object.

`cNextActions` has to contain a **list** of conditional rules, each conditional rule being an object with at least `if` and `then` fields, and optionally an `else` field.

The `then` and `else` fields of a conditional rule will contain exactly that which `nextActions` would contain: a list of action objects (see <a href="#Actions">Actions</a>).

We will continue working with our example question object. This time, we want to set the boolean variable `wantsToReflect` to `true` if the user answers "Yes" to the question, otherwise we will set it to `false`. We also still want to clear the variable `reflectionText` regardless of the user's answer, so we will include this action in the outcomes of both conditions.  

```
Example question object 1

{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Yes", "No"],
    "Deutsch" : ["Ja", "Nein"]
  },
  "nextQuestion" : "testMorningQs.satisfactionSurvey",
  "cReplyMessages" : [
    {
      "if" : "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0}",
      "then" : {
        "English" : ["Great that you want to reflect on your goals!"],
        "Deutsch" : ["Toll, dass du über deine Ziele reflektieren willst!"]
      },
      "else" : {
        "English" : ["I understand.", "Reflecting on your goals isn't easy."],
        "Deutsch" : ["Ich kann nachvollziehen", "Es ist nicht einfach zu reflektieren."]
      }
    }
  ],
  "cNextActions" : [
    {
      "if" : "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0}",
      "then" : [
        {
          "aType" : "setBooleanVar",
          "args" : ["wantsToReflect", "$B{true}"]
        },
        {
          "aType" : "clearVars",
          "args" : ["reflectionText"]
        }
      ],
      "else" : [
        {
          "aType" : "setBooleanVar",
          "args" : ["wantsToReflect", "$B{false}"]
        },
        {
          "aType" : "clearVars",
          "args" : ["reflectionText"]
        }
      ]
    }
  ]
}
```

Now you can see why the experimenter configuration file tends to get very long!

Having added these conditional operations, we can finally say we are done with our example question object! Now, we will add it to the question category `testMorningQs` of `Condition1`. This is done by just making the entire object above an element of the list `testMorningQs` (order doesn't matter).

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {...},
  "conditionQuestions" : {
    "Condition1" : {
      "questionCategories" : {
        "preTestQs" : [...],
        "testMorningQs" : [
          {
            "qId" : "askReflect",
            "text" : {...},
            "qType" : "singleChoice",
            "options" : {...},
            "nextQuestion" : "testMorningQs.satisfactionSurvey",
            "cReplyMessages" : [...],
            "cNextActions" : [...]
          }
        ],
        "testEveningQs" : [...],
        "postTestMorningQs" : [...],
        "postTestEveningQs" : [...]
      }
    },
    "Condition2" : {
      "questionCategories" : {...}
    }
  }
  ...
}
```

#### <span id="CNextQ"> Next Question</span>

In order to select the next question conditionally, then you would have to replace `nextQuestion` with `cNextQuestions` in the question object.

`cNextQuestions` has to contain a **list** of conditional rules, each conditional rule being an object with at least `if` and `then` fields, and optionally an `else` field.

The `then` and `else` fields of a conditional rule will contain exactly that which `nextQuestion` would contain: a string containing the question category and question ID of the next question.

Since we are done with our first question object, we will turn to a new example, one that might find common use in an experimenter configuration file. This question is a `dummy` question that merely serves to select the next question based on certain states of the experiment or the participant. In this example this question object will serve a different question depending on whether the day of the current stage is odd or even. Assume that all the questions and categories mentioned are already present in the configuration file.

```
Example question object 2 
{
  "qId" : "selectFirstQuestion",
  "qType" : "dummy"
  "cNextQuestions" : [
    {
      "if" : "${STAGE_DAY} MULTIPLE_OF $N{2}",
      "then" : "testMorningQs.evenDay",
      "else" : "testMorningQs.oddDay"
    }
  ]
}
```

And that's it! We can now add this to our experimenter configuration file like before. In the section <a href="#Scheduled">Scheduled Questions</a>, we will schedule this dummy question so that every day, the first question is selected based on which day that is!

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {...},
  "conditionQuestions" : {
    "Condition1" : {
      "questionCategories" : {
        "preTestQs" : [...],
        "testMorningQs" : [
          { "qId" : "selectFirstQuestion", ... },
          { "qId" : "askReflect", ... }
          ...
        ],
        "testEveningQs" : [...],
        "postTestMorningQs" : [...],
        "postTestEveningQs" : [...],
        "surveyQs" : [...]
      }
    },
    "Condition2" : {
      "questionCategories" : {...}
    }
  }
  ...
}
```

### <span id="Reminders"> Reminders </span>

For any question, it is possible to set a reminder for the user to answer the question, in case the user does not answer it within a certain period of time. The experimenter can set the number of reminders for a question, and the time in minutes between each subsequent reminder.

This is done by adding to the question object the property `reminder`. The `reminder` object has two mandatory parameters:

* `numRepeats` - the number of times a reminder should be sent as long as the current question has not been answered
* `freqMins` - the number of minutes that should elapse between subsequent reminders

Let us see an example question below:

```
Example question with reminder

{
  "qId" : "reminderExample",
  "text" : {
    "English" : "If you don't answer this question, we will remind you every 30 minutes. Do you understand?"
    "Deutsch" : "Wenn Sie diese Frage nicht beantworten, erinnern wir Sie alle 30 Minuten. Haben Sie verstanden?"
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Yes", "No"],
    "Deutsch" : ["Na sichi", "Nein"]
  },
  "reminder" : {
    "numRepeats" : 4,
    "freqMins" : 30
  }
}
```

The above question will prompt a reminder to be set as soon as the question has been asked. The first reminder will appear 30 minutes after the question has been asked, the second reminder 60 after minutes, and so on.

In a series of reminders for a given question, the first reminder will be longer, and will contain the text as defined in the [phrases](#span-idphrases-mandatory-phrases-span) object as `"reminderTextLong"`. All subsequent reminders will display the text defined under `"reminderTextShort"`.

If the question is repeated, the reminder(s) will be reset with reference to the time that the repeated question was asked.

After the question is answered, reminders are cancelled, so that they do not appear anymore.

## <span id="Variables">Variables and Constants</span>

In order to enable better interactions with the user, it is possible to save certain responses and use them to define the behaviour of the chatbot. This is done using variables. Variables are essentially named parameters that store a value of a certain data type, and whose value can change throughout the course of the experiment.

In the section on <a href="#Parameters">Participant Parameters</a>, you learned how to declare these. Now, in this section, you will learn how to access their values!

There are two possible types of variables - reserved variables and custom variables. The former are values related to the state of the chatbot that the experimenter has access to, but cannot alter. The latter are those that the experimenter has access to and can manipulate as needed.

In addition to variables, there are also "constants". These define values of a certain data type, and are mainly used in <a href="#Conditions">Conditional Expressions</a>, though also finding a use in the <a href="#Actions">action</a> `setBooleanVar`.

### <span id="ReservedVars"> Reserved Variables </span>

Reserved variables contain certain essential information about the participant and the experiment that the experimenter can use to either display in messages or to condition the behaviour of the chatbot.

Furthermore, some information that reserved variables provide access to might be sensitive information that identifies the user, and therefore should not be stored along with the data collected for the user. These are known as 'sensitive' variables, and will not be stored in the database. Any text accessing these variables will also be saved without the identifying information.

The following is a list of all the reserved variables, their data types, and their descriptions.

| Var Name           | Data Type         | Description                                                                                                                                                       | Sensitive? |
|--------------------|-------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|
| `FIRST_NAME`       | `string`          | First name of the participant taken from Telegram                                                                                                                 | Yes        |
| `UNIQUE_ID`        | `string`          | Unique ID of the participant, generated by the chatbot                                                                                                            | No         |
| `TODAY`            | `string`          | Abbreviated name of the current day (e.g., "Mon", "Wed", "Fri")                                                                                                   | No         |
| `CONDITION`        | `string`          | Name of the participant's condition. Is empty string if participant not assigned                                                                                  | No         |
| `STAGE_NAME`       | `string`          | Name of the currently running experiment stage. Is empty string if no stage running.                                                                              | No         |
| `STAGE_DAY`        | `number`          | Number of the day of the current experiment stage. Is 1 on first day of stage.                                                                                    | No         |
| `ANSWER_LEN_CHARS` | `number`          | Length in characters of the user's current answer                                                                                                                 | No         |
| `ANSWER_LEN_WORDS` | `number`          | Length in words of the user's current answer                                                                                                                      | No         |
| `CURRENT_ANSWER`   | `number`/`strArr` | The current valid answer that the user submitted. Is type `number` only when `qType` of the current question is `number`                                          | No         |
| `TODAY`            | `str`             | Abbreviated form of the English name of the current day ("Sun", "Mon" ... "Sat"). Suitable for defining conditions based on the day.                              | No         |
| `TODAY_NAME`       | `str`             | Full form of the current day name ("Sunday", "Monday" ... "Saturday") in the preferred language of the participant. Suitable for use in messages to participants. | No         |
| `CURRENT_HOUR`     | `number`          | Hour value of the current time (e.g., 13, if current time is 13:44)                                                                                               | No         |
| `CURRENT_MIN`      | `number`          | Minute value of the current time (e.g., 44, if current time is 13:44)                                                                                             | No         |


Reserved variables are accessed by simply taking the name of any of the above reserved variables and enclosing it in `${...}`.

One example is using the variable in a normal text string that is sent to the user. Let's assume the user is on the 2nd day of stage `"Test"`.

The text, `"You are now on Day ${STAGE_DAY} of Stage ${STAGE_NAME}"`, defined by the experimenter, would be seen by the user as `"You are now on Day 2 of Stage Test"`

If the variable does not exist - i.e., is neither the name of a reserved variable nor is an experimenter-defined custom variable - the text will not be replaced, and will be seen by the user as it is. For the next example, let us assume the user's first name is "Bonnie".

Then, the text, `"Welcome to the experiment, ${FIRST_NAME} ${LAST_NAME}"`, defined by the experimenter, would be seen by the user as `"Welcome to the experiment, Bonnie ${LAST_NAME}"`, since there is no reserved variable called `LAST_NAME`.

Another example of accessing reserved variables is specifying conditional expressions, which is covered in depth with many examples in the section <a href="#Conditions">Conditional Expressions</a>

### <span id="CustomVars"> Custom Variables </span>

It would be a shame if you could define <a href="#Parameters">custom parameters</a>, but not be able to access them! Thankfully, that is possible.

Accessing custom variables is done in the exact same way as reserved variables: simply enclose the name of the variable in `${...}`.

Just as with reserved variables, custom variables can be used in text as well as in conditional expressions. 

Array variables (of type `strArr` or `numArr`), when used in text, will display all of the elements in a single line, separated by commas.

Let us take an example where the variable `numGoalsSet` has the value `2`, and the variable `goalsSet` has the value `["Eat cake", "Destroy furniture"]`

The text, `"You set ${numGoalsSet} goals today. They are: \n\n${goalsSet}"`, defined by the experimenter, would be seen by the user as :

```
You set 2 goals today. They are: 

Eat cake, Destroy furniture
```

If the variable does not exist - i.e., is neither the name of a reserved variable nor is an experimenter-defined custom variable - the text will not be replaced, and will be seen by the user as it is. Therefore, ensure that the spelling and case of your variable is correct when attempting to access its value.

### <span id="Constants"> Using Constants </span>

Constants are used to represent a value of a particular data type. It is important to represent the value in the correct way so that the chatbot software understands exactly what it is you want to achieve. Unfortunately, it is not very flexible in its interpretations of certain symbols, particularly when processing <a href="#Conditions">conditional expressions</a>. Therefore, it is important that you specify exactly what data it is that you are trying to represent, and that is done using constants.

Constants find their biggest use in conditional expressions, when evaluating the value of a variable with respect to a certain value that is not present in another variable. This certain value is represented by a constant of the desired data type. However, there is currently one other use of boolean constants, namely in the <a href="#Actions">action</a> `setBooleanVar`.

Corresponding to the <a href="#Parameters">five possible data types</a> that variables can take, there are five possible constants that you can represent. Representing a constant involves a particular syntax, namely enclosing the desired values in particular characters.

The following subsections will cover each of the five data types.

#### Boolean Constants

Boolean constants represent a value of the data type `boolean`, either `true` or `false`.

They are represented by enclosing either the word "true" or "false" (without quotes) within the braces of: `$B{...}`. This constant is not case sensitive, that means it does not matter what case the words "true" and "false" are written within the braces, as long as it contains those letters in that order.

Examples: 

`$B{true}` represents the boolean value `true`

`$B{TrUe}` represents the boolean value `true`

`$B{false}` represents the boolean value `false`

`$B{FaLse}` represents the boolean value `false`

`$B{hello}` is an invalid boolean constant.

#### Number Constants

Number constants represent a value of the type `number`, either a real number or an integer, such as `-123.45` or `419`.

They are represented by enclosing either the number within the braces of: `$N{...}`.

Examples:

`$N{5}` represents the number value `5`

`$N{-14.5}` represents the number value `-14.5`

`$N{0}` represents the number value `0`

`$N{}` is an invalid number constant.

#### Number Array Constants

Number array constants represent a value of the type `numArr`, a list of real numbers or integers, such as `[-123.45, 419]`.

They are represented by enclosing either the number within the braces of: `$N*{...}`, and separating the numbers by commas within the braces. Note that **no square brackets**, which are involved in normal representations of arrays/lists, are needed to define a number array constant.

Note that in some cases, like with operator `HAS_CHOICE_IDX` of <a href="#Conditions">Conditional Expressions</a>, it is important to use the number array constant, even if you are representing only a single value!s

Examples:

`$N*{5}` represents the number array value `[5]`, a list with a single element.

`$N*{-14.5, 5}` represents the number array value `[-14.5, 5]`, a list with two elements

`$N{}` represents the number array value `[]`, an empty list

`$N{hello, 3}` is an invalid number array constant.

`$N{4, ,3}` is an invalid number array constant.

#### String Constants

String constants represent a value of the type `string`, any string of characters, such as `"2fnn&"` or `"spoon and fork"`.

They are represented by enclosing either the string of characters within the braces of: `$S{...}`, **without** any quotes, unless you want the quotes themselves to be a part of the string. In that case, you must use `\"` to represent a quote `"`.

Examples:

`$S{5}` represents the string value `"5"`

`$S{hello}` represents the string value `"hello"`

`$S{\"In quotes\"}` represents the string value `""In quotes""`

`$S{$yM80L5}` represents the string value `"$yM80L5"`

`$S{}` represents the string value `""`, an empty string

#### String Array Constants

String array constants represent a value of the type `strArr`, a list of strings, such as `["2fnn&", "spoon and fork"]`.

They are represented by enclosing either the string within the braces of: `$S*{...}`, and separating the strings by commas within the braces. Note that **no square brackets**, which are involved in normal representations of arrays/lists, are needed to define a string array constant.

Also note that it is not possible for a string constant within your string array to contain commas, as commas are used to separate the string constants in the array. Similarly, the string cannot begin or end with an empty character (space, tab, or new line), as these will just be trimmed off when reading the string array.

Examples:

`$S*{5}` represents the string array value `["5"]`, a list with a single string element.

`$S*{2fnn&, spoon and fork}` represents the string array value `["2fnn&", "spoon and fork"]`, a list with two string elements

`$S*{Hello, my name is Paul. Nice to meet you.}` represents the string array value `["Hello", "my name is Paul. Nice to meet you."]`, a list with two string elements

`$S*{}` represents the string array value `[]`, an empty list

`$S{hello, ,3}` represents the string array value `["hello", "", "3"]`, a list with 3 string elements, the second being an empty string


And that is all you need to know about constants to proceed!

## <span id="Conditions"> Conditional Expressions </span>

Note: This section requires familiarity using variables and constants. Review the previous sections if you are not familiar with these already.

Conditional expressions are expressions that evaluate to true or false. Conditional expressions always perform an operation on two operands, and produce a result based on the operator selected.

These conditional expressions are used in the `if` fields of <a href="#CondNextSteps">Conditional Next Steps</a> portion of questions in order to select the next steps based on certain conditions. They are also used in <a href="#Scheduled">Scheduled Questions</a> if a question that is to be scheduled should only appear under certain circumstances. 

Conditional expressions are therefore helpful in checking whether the experiment is in a certain state or the participant's parameters have certain properties, based on which decisions can be made. For example, if you want the next question to appear only if the participant has answered "Yes" to the current question, you would use a conditional expression to evaluate whether the current answer is equal to "Yes".

As mentioned before, conditional expressions have 2 operands and 1 operator. The operator must always occur in between the operands, separated by at least one space on either side. The operands can be **variables, constants, or expressions themselves** enclosed in parentheses (see Nested Expressions below). The type of operand that you can evaluate depends on the operator you are trying to use. 

Following is a table of all available operators as well as the operands on which they can operate. 

Keep in mind that the operators are **NOT commutative**. This means that `"A op B"` is not the same as `"B op A"`, therefore making the order of operands in the expression important!

| operator          | description                                                   | operand 1 type      | operand 2 type | example                                         | example outcome                                                                                     | notes                                                                                                           |
|-------------------|---------------------------------------------------------------|---------------------|----------------|-------------------------------------------------|-----------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `==`              | Checks equality between two values of the same data type      | any                 | any            | `"${STAGE_NAME} == $S{Test}"`                   | `true` when var `STAGE_NAME` has value `"Test"`                                                     | operands must be of same data type                                                                              |
| `!=`              | Checks inequality between two values of the same data type    | any                 | any            | `"${STAGE_NAME} != $S{Test}"`                   | `true` when var `STAGE_NAME` does not have value `"Test"`                                           | operands must be of same data type                                                                              |
| `>=`              | Checks whether op1 greater than or equal to op2               | number              | number         | `"${STAGE_DAY} >= $N{3}"`                       | `true` when var `STAGE_DAY` has value `>= 3`                                                        |                                                                                                                 |
| `>=`              | Checks whether op1 strictly greater than op2                  | number              | number         | `"${STAGE_DAY} > $N{3}"`                        | `true` when var `STAGE_DAY` has value `> 3`                                                         |                                                                                                                 |
| `<=`              | Checks whether op1 lesser than or equal to op2                | number              | number         | `"${STAGE_DAY} <= $N{3}"`                       | `true` when var `STAGE_DAY` has value `>= 3`                                                        |                                                                                                                 |
| `<`               | Checks whether op1 strictly lesser than op2                   | number              | number         | `"${STAGE_DAY} < $N{3}"`                        | `true` when var `STAGE_DAY` has value `> 3`                                                         |                                                                                                                 |
| `CONTAINS_STRING` | Checks whether op1 contains the string op2                    | string, strArr      | string         | `"${STAGE_NAME} CONTAINS_STRING $S{"Pre"}"`     | `true` when var `STAGE_NAME` has `"Pre"` anywhere as a substring (e.g., `"Pre-Test"`, `"rePresent"`)      | When op1 is a strArr, then returns `true` if any of the strings in the array contains op2 as substring            |
| `IN_ARRAY`        | Checks whether op1 is an element in the array op2             | string, number      | strArr, numArr | `"${progress} IN_ARRAY $N*{10,20,30}"`          | `true` when var `progress` has value `10`, `20`, or `30`                                            |                                                                                                                 |
| `MULTIPLE_OF`     | Checks whether op1 is a multiple of op2                       | number              | number         | `"${STAGE_DAY} MULTIPLE_OF $N{2}"`              | `true` when var `STAGE_DAY` is an even number                                                       |                                                                                                                 |
| `HAS_CHOICE_IDX`  | Checks whether certain option(s) were chosen on a choice question | `${CURRENT_ANSWER}` | numArr         | `"${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,1,3}"` | `true` when the index of the chosen answer in the `options` list is either `0`, `1`, or `3`         | can only be used exclusively for this purpose and in this manner with `singleChoice` or `multiChoice` questions |
| `AND`             | Logical AND checks whether op1 and op2 are both true          | boolean             | boolean        | `"${setGoalsToday} AND ${wantsToReflect}"`      | `true` when the both variables `setGoalsToday` and `wantsToReflect` are `true`                      |                                                                                                                 |
| `OR`               | Logical OR checks whether op1 or op2 are true               | boolean             | boolean        | `"${setGoalsToday} OR ${wantsToReflect}"`       | `true` when either variables `setGoalsToday` or `wantsToReflect` is `true`, or when both are `true` |                                                                                                                 |

See section <a href="CondNextSteps">Conditional Next Steps</a> for an example of `HAS_CHOICE_IDX`.

### Nested Expressions

Most practical applications of conditional expressions would require some nested expressions involving more than two operands and more than one operator. This is also possible! 

You might remember that an expression always has two operands and one operator. So, all you have to do is take an expression, enclose it in parentheses, and put it in the place either operand would occupy in the expression, as seen above, ensuring that there are only two operands in every expression. 

However, you will note that since an expression evaluates to `true` or `false`, an expression used as an operand is necessarily a `boolean` operand. This also entails that nested expressions are only possible with the operators `==,` `!=`, `AND` and `OR`.

Let us look at a few examples. 

Suppose you want to evaluate the conjunction of 3 boolean variables. Your instinct may lead you to write it as:

`${bool1} AND ${bool2} AND ${bool3}`

However, this is **WRONG!** This expression has 3 operands and two operators. In order to convert this into a valid expression with two operands and one operator, this will have to be broken down to make one of the conjunctions a nested expression. There are a couple of ways this is possible:

`(${bool1} AND ${bool2}) AND ${bool3}`

or

`${bool1} AND (${bool2} AND ${bool3})`

You will notice how these two expressions each now have only 2 operands (one boolean constant, and one parenthetical expression) and one operator. You will notice that each of the parenthetical nested expressions also has only two operands (two boolean constants) and one operator.

Another use of nesting expressions is to combine the power of multiple operators. You can construct an individual expression using each operator that you would like, and then combine those with the right parentheses in order to build a nested expression.

`(${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,2}) AND (${STAGE_NAME} == $S{Test})`

This expression has two nested expressions as operands, conjoined with the operator `AND`. Combining the power of two different operators, this expression will evaluate to `true` when the index in the `options` list of the choice chosen on the current question is either `0` or `2`, and the current experiment stage is `"Test"`.

In case you want to add another condition to this expression, you can simply enclose this expression in parentheses and use it as an operand in another expression:

`((${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,2}) AND (${STAGE_NAME} == $S{Test})) OR (${numGoals} <= $N{3})`

In sum, you can create nested expressions of an arbitrary depth, as long as you ensure that every expression (main one and parenthetical nested ones) always have two operands and one operator, where operands can be variables, constants, or parenthetical expressions.

Note that, in the above examples, constants are used to compare the values of certain variables. It is mandatory to use constants to represent these values. The following statements, that do not use constants appropriately, would be **invalid**!

`${STAGE_NAME} == 'Test'`

`${STAGE_DAY} GREATER_THAN 2`

Now, you know everything you need to start conditionally defining the chatbot's behaviour! 

## <span id="Scheduled"> Scheduling Questions </span>

After you have defined all of your questions and the flow of conversation of your chatbot, you may want to schedule certain questions to appear at a certain time. 

The field to define this, `scheduledQuestions`, is a *list* of schedule objects. The field `scheduledQuestions` occurs at the same level of `questionCategories`, wherever that appears. This also means for every set of question categories (i.e., for every condition), you would have only one list of `scheduledQuestions`. 

For each scheduled question, you can specify a list of at least one [experiment stage](#span-idstages-experiment-stages-span) during which this scheduled question should appear. If you specify this, the given question will appear regularly only when the experiment is in one of the specified stages, and will not appear in any other stage. 

In the remainder of the section, we will create a list of schedule objects for each condition, add them to our experimenter configuration file. 

First, we will look at a single schedule object and consider its components:
* `qId` - mandatory, string with the question category and question ID of the question to be scheduled
* `atTime` - mandatory, string with the time in format `HH:MM` at which the scheduled question should occur, with `HH` being in the range `0-23` and `MM` in the range `0-59`.
  * It is also possible to use the value of a parameter using the normal access token - `${parameterName}`. However, it is important to ensure that this parameter contains a string in the format `"HH:MM"`
  * Parameter values can be used in the case of asking the user when they want to receive questions.
* `onDays` - mandatory, the days on which the scheduled questions should occur at the above-mentioned time.
  * must be an array of strings, containing any combination of the strings `["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]` in any order.
  * the case and spelling of the abbreviated days is important!
  * if a question is scheduled to appear only for a given stage, ensure that the days for which you schedule a question match up with the days on which the stage is supposed to be running.
* `if` - optional, a normal conditional expression specifying under which circumstances a certain question should occur.
  * **Note: scheduling different questions for different experiment stages is currently done through this field!**
  * If this field is not specified, the question will be scheduled for all days in which any experimental stage is running.
    * This means that no scheduled questions will appear if no experimental stage is running!
* `stages` - optional (but recommended), a list of strings, each string being the name of an [experiment stage](#span-idstages-experiment-stages-span) in which the question should be scheduled
  * If this field is an empty list `[]`, the question will not appear in any stage. Use this to temporary disable the scheduling of a question without having to delete it.
  * If this field is not mentioned, the question will be scheduled to appear in **every** stage in the experiment.

For the condition `Condition1`, we will create a schedule object for 9 am on the weekdays only during the experiment stage `"Test"`. Additionally, we can add the condition that the parameter `surveyComplete` has to be equal to `true`.

```
Example schedule object 1

{
  "qId" : "testMorningQs.selectFirstQuestion",
  "atTime" : "09:00",
  "onDays" : ["Mon","Tue","Wed","Thu","Fri"],
  "if" : "${surveyComplete} == $B{true}",
  "stages" : ["Test"]
}
```

Now, we will create a question to occur in the evening, prompting the user to reflect on their emotions if they indicated that they want to do so in an earlier question (assume all `qId`s already exist). We want this to occur during **all stages** of the experiment, so the `stages` property will be left out. Furthermore, instead of fixing a time at which this will appear, we will use a parameter value containing a time that the user selects. This parameter will be called `eveningTime`, and we will set this value in the [setup phase](#span-idsetup-setup-questions-and-starting-the-experimentspan).

```
Example schedule object 2

{
  "qId" : "eveningQs.emotionsReflection",
  "atTime" : "${eveningTime}",
  "onDays" : ["Mon","Tue","Wed","Thu","Fri"],
  "if" : "${wantsToReflect} == $B{true}"
}
```

Finally, we will create a question that is scheduled to present a survey only in the stages `Pre-Test` and `Post-Test`. After we create this, we will take all schedule objects and combine them into a list, which we will assign to `scheduledQuestions` of `Condition1`.

```
In configQuestions > Condition1 > scheduledQuestions of json/config.json

[
  {
    "qId" : "testMorningQs.selectFirstQuestion",
    "atTime" : "09:00",
    "onDays" : ["Mon","Tue","Wed","Thu","Fri"],
    "if" : "${surveyComplete} == $B{true}",
    "stages" : ["Test"]
  },
  {
    "qId" : "eveningQs.emotionsReflection",
    "atTime" : "${eveningTime}",
    "onDays" : ["Mon","Tue","Wed","Thu","Fri"],
    "if" : "${wantsToReflect} == $B{true}"
  },
  {
    "qId" : "surveyQs.survey",
    "atTime" : "09:00",
    "onDays" : ["Mon","Tue","Wed","Thu","Fri"],
    "stages" : ["Pre-Test", "Post-Test"]
  }
]
  
```

Now, we will assign this list to the field `scheduledQuestions` of `Condition1` in the experimenter configuration file.

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {...},
  "conditionQuestions" : {
    "Condition1" : {
      "questionCategories" : {...},
      "scheduledQuestions" : [
        { "qId" : "testMorningQs.selectFirstQuestion" ... },
        { "qId" : "eveningQs.emotionsReflection" ... },
        { "qId" : "surveyQs.survey" ... }
      ]
    },
    "Condition2" : {
      "questionCategories" : {...}
    }
  }
  ...
}
```

Similarly, we may want to create a list containing a single scheduled question for `Condition2`. Since `Condition2` has only one experimental stage, we can leave out the field `stages` this time, and the question will be scheduled to occur on every day that the stage is running.
 
This time, we will skip a step and directly added it to the configuration file under `Condition2` of `conditionQuestions`.

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {...},
  "conditionQuestions" : {
    "Condition1" : {
      "questionCategories" : {...},
      "scheduledQuestions" : [...]
    },
    "Condition2" : {
      "questionCategories" : {...},
      "scheduledQuestions" : [
        {
          "qId" : "morningQs.selectFirstQuestion",
          "atTime" : "08:00",
          "onDays" : ["Mon","Tue","Wed","Thu","Fri"]
        }
      ]
    }
  }
  ...
}
```

We are done with defining some questions to be scheduled. 

So how do we now ensure that these questions will appear? When the experiment stage is started using the [action 'startStage'](#span-idactions-actions-span), all of the questions that are defined to appear for that schedule will be appropriately scheduled.

Feel free to skip over the following subsection on conditionless scheduled questions if your experiment has conditions, as it may not pertain to you.

The following section, <a href="#UserPrompt">User Prompted Questions</a>, will show you how to define questions that users themselves can invoke, so that they do not have to wait for scheduled questions to appear.

### Detour: Conditionless Scheduled Questions

The last time we saw our example configuration file for a conditionless experiment was in section <a href="#DefaultCat">Default Question Categories</a>.

We will now briefly revisit that example to see how scheduled questions would be added in such a case.

Just like when there are conditions, `scheduledQuestions` are added on the same level as `questionCategories`. So, when there are no conditions, since `questionCategories` exists on the first level of the experiment JSON object, so will the list `scheduledQuestions`, like so:

```
In json/noCondsConfig.json

{
  "experimentName" : "NoConditions",
  "experimentId" : "RL-NoCond-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentStages" : [...],
  "questionCategories" : {
    "setupQuestions" : [...]
  },
  "scheduledQuestions" : [...]
  ...
}
```

In this case too, the `scheduledQuestions` list is constructed in the same way as before.

## <span id="UserPrompt"> User Prompted Questions </span>

We saw how it is possible to prompt the user to answer questions using scheduled questions and reminders. But what if the user themselves wants to initiate a conversation with your chatbot? This is possible for the user by using the command `/talk`. This section describes what the user will see when they use this command, and how you can define what interactions the user can initiate with the bot and under which conditions this is possible.

When the user sends the `/talk` command, what they will receive in the next message is a list of keywords, along with a description of the kind of conversation they will be initiating with the chatbot, if they send that keyword.

Here is an example of what they might see:

```
Hi FirstName!

I see that you want to tell me something. Send one of the following keywords in bold below corresponding to the topic you want to talk about.

* Goals - Add some work or relationship goals to your day, before you begin reflection.

* Survey - Fill out the survey regarding feedback on interaction with your superiors.

* /cancel - Cancel this operation and return to experiment.
```

As you can see, there are some keywords (`Goals`, `Survey`) along with their descriptions. After this message, the user would simply have to send one of these keywords in a single message, and they would be able to have a conversation with the bot.

What does it mean to have a conversation with the bot? It means that the bot will ask the user one or more questions in a sequence. This is the exact same behaviour as with questions that are scheduled, except the user can decide when to prompt the question to be asked.

The text for the above message can be defined individually for each language in the `experiment` section of the [mandatory phrases](#span-idphrases-mandatory-phrases-span).

To define the keywords and corresponding questions for each keyword, you will use the property `userPromptedQs`. This appears on the same level as `questionCategories` and `scheduledQuestions`, wherever these occur.

The field `userPromptedQs` is a list of objects, each object corresponding to one of the possible interactions that the user can initiate with the chatbot. An object for a user-prompted question has the following properties:

* `keyword` - the keyword that the user must enter to prompt that question. Defined for all available languages.
* `description` - the explanation of what kind of question the user would be prompting by sending that keyword. Defined for all available languages.
* `qId` - the question ID in the form of `"<questionCategory>.<qId>"` (just like in `scheduledQuestions`) that should be asked to the user to start that conversation.
* `stages` (optional) - list of stages for which this question should be available to prompt
  * If this is omitted, question will be available in all stages. If list is empty, question will be available in no stage.
* `if` (optional) - conditions under which the user is allowed to initiate that conversation
  * Conditions specified as described in the section on [Conditional Expressions](#span-idconditions-conditional-expressions-span).
  * When the user sends the message `/talk`, only those options will be listed for which the condition is valid at that given point in time. That is, users will not have the option to initiate a conversation of a certain kind if this condition is not satisfied.

Following these rules, we can define the user-prompted questions for `Condition1`, to achieve what the above example text displays:

```
[
  {
    "keyword" : {
      "English" : "Goals",
      "Deutsch" : "Ziele"
    },
    "description" : {
      "English" : "Add some work or relationship goals to your day, before you begin reflection.",
      "Deutsch" : "Übersetzung nicht verfügbar."
    },
    "qId" : "morningQs.addGoalsLater",
    "stages" : ["Test"],
    "if" : "${reflectionStartedToday} != $B{true}"
  },
  {
    "keyword" : {
      "English" : "Survey",
      "Deutsch" : "Umfrage"
    },
    "description" : {
      "English" : "Fill out the survey regarding feedback on interaction with your superiors",
      "Deutsch" : "Übersetzung nicht verfügbar."
    },
    "qId" : "surveyQs.feedbackSurvey",
    "stages" : ["Test"]
  }
]
```

The above list will generate the example text shown above. If the user sends the command `/talk` and then the keyword `Goals`, they will receive the question with the `qId` `addGoalsLater` in the question category `morningQs` of `Condition1`.

Note that it is only possible for the user to initiate a conversation with the keyword `Goals` the value of their parameter `reflectionStartedToday` is `false`. This means that if they have already started reflection and their parameter `reflectionStartedToday` accordingly has the value `true`, then this option will not appear when they send the command `/talk`, and only the option `Survey` will appear.

Also note that both of these conversations can be initiated only during the stage `Test`. If the user sends the command `/talk` during any other stage, they will simply receive the text as defined in property `cannotStartTalk` of the [mandatory phrases](#span-idphrases-mandatory-phrases-span).

In a similar manner, it is possible to define questions that can only be prompted within certain time frames by using conditional expressions with the parameter values `CURRENT_HOUR` and `CURRENT_MIN`.

Now, we can simply add this list to the property `userPromptedQs` of `Condition1` in our experimenter configuration file:

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {...},
  "conditionQuestions" : {
    "Condition1" : {
      "questionCategories" : {...},
      "scheduledQuestions" : [...],
      "userPromptedQs" : [
        { "keyword" : { "English" : "Goals", "Deutsch" : "Ziele" }, ... },
        { "keyword" : { "English" : "Survey", "Deutsch" : "Umfrage" }, ... }
      ]
    },
    "Condition2" : {
      "questionCategories" : {...},
      "scheduledQuestions" : [...]
    }
  }
  ...
}
```

Notes:
* The user cannot initiate a new conversation when one is already underway, i.e., when there is an outstanding question that has not yet been answered.
* Currently, if you want certain conversations to only be possible during a certain stage, this must be defined in the `"if"` property of the user-defined question.
* The very last option with the keyword `/cancel` will be displayed automatically, and need not be included in the definition.
* See the `experiment` section of the [mandatory phrases](#span-idphrases-mandatory-phrases-span) for all of the displayed text related to user-prompted questions.

The following section, <a href="#Setup">Setup Questions</a>, will then ensure that some important parameters are set correctly so that your experiment runs smoothly.

## <span id="Setup"> Setup Questions and Starting the Experiment</span>

After learning all the components of question objects, we can now come back to looking at our setup questions in detail. While the experimenter has more freedom with defining the questions in the rest of the experiment, that is not quite the case with `setupQuestions`. Setup questions ensure that the correct information is collected from the participant to ensure smooth functioning of the chatbot, such as user language, participant ID, and timezone.

Firstly, remember that the setup occurs before the participant is assigned to any condition. Therefore, it is important that the default `questionCategories` object exists and has a question category called exactly `setupQuestions`, since any questions in the `conditionQuestions` are not yet accessible at the time of setup. Secondly, it is essential to obtain the minimum of language and timezone information (and PID if you want to assign to condition based on that) from the participant. Thirdly, it is essential that this information is stored in the appropriate format in the appropriately named variables. Finally, appropriate actions are required to be taken, such as assigning to condition and starting the first stage.

For these reasons, it is better to not make significant changes to the setup questions (except for adding/removing text and reply messages, which can be done freely.) If you would like to collect more information from the user before assigning to a condition, you may add some questions, but ensure the essential components still remain.

Let us see what the setup looks like.

### Language

The first thing that you would likely want to get from your participant is their preferred language. Since they have not interacted with the chatbot yet, you would likely want to ask your question in all available languages within the same question text. This would also mean that your question text for all languages would be the same, and so would the options.

Here, we have an example language question:

```
In first question of questionCategories > setupQuestions of json/config.json

{
  "qId" : "language",
  "start" : true, 
  "text" : {
    "English" : "Hello! I am <chatbotName>. Please select your language.\n\nHallo! Ich bin <chatbotName>. Bitte wähle eine Sprache aus.",
    "Deutsch" : "Hello! I am <chatbotName>. Please select your language.\n\nHallo! Ich bin <chatbotName>. Bitte wähle eine Sprache aus."
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["English", "Deutsch"],
    "Deutsch" : ["English", "Deutsch"]
  },
  "nextActions" : [
    {
      "aType" : "saveAnswerTo",
      "args" : ["language"]
    }
  ],
  "nextQuestion" : "setupQuestions.PID"
}
```

A few things to notice about this:
* This question object has the field `"start" : true`. Although we didn't cover this, and it doesn't apply to any other questions present elsewhere, it is important to have this.
* The options provided have to essentially be the exact same list of strings as the `languages` field of the experimenter JSON object, with correct spelling and case.
* When no language has been chosen yet (in this case), the default language is applied. Here, it is English. But it's better to have all the text and options in all languages for this question.
* It is important to have the correct spelling `"language"` in the action, which is the same as defined in the field `mandatoryParameters`.
* If you wanted to skip collection of `"PID"` because condition assignment is not based on it, you can set `nextQuestion` to `setupQuestions.timezone`.
* You may add `replyMessages`, but they would also have to be in all languages, since replies are sent before the parameter is saved to the parameter `language`.
  * Or, you could use `cReplyMessages` to give different language reply messages based on the answer. In this case, the messages should be the same for all languages within the `if` or `else` outcome.

This will now be added to our list of setupQuestions:

```
In questionCategories > setupQuestions of json/config.json
[
  {
    "qId" : "language",
    "start" : true, 
    "text" : {
      "English" : "Hello! I am <chatbotName>. Please select your language.\n\nHallo! Ich bin <chatbotName>. Bitte wähle eine Sprache aus.",
      "Deutsch" : "Hello! I am <chatbotName>. Please select your language.\n\nHallo! Ich bin <chatbotName>. Bitte wähle eine Sprache aus."
    },
    "qType" : "singleChoice",
    "options" : {
      "English" : ["English", "Deutsch"],
      "Deutsch" : ["English", "Deutsch"]
    },
    "nextActions" : [
      {
        "aType" : "saveAnswerTo",
        "args" : ["language"]
      }
    ],
    "nextQuestion" : "setupQuestions.PID"
  }
]
```

### PID 

It is possible to skip this field if your `assignmentScheme` is not `"pid"`. However, if your `assignmentScheme` is "pid", then it is essential that you have this question and save the answer to the correct variable.

Now that the user has selected a language, we can start having separate texts for different languages. So we will build up our PID question in the following way:

```
In second question of questionCategories > setupQuestions of json/config.json

{
  "qId" : "PID",
  "qType" : "freeform",
  "text" : {
    "English" : "Type in the participant ID that was given to you.",
    "Deutsch" : "Gib die Teilnehmer-ID ein, die dir vergeben wurde."
  },
  "nextActions" : [
    {
      "aType" : "saveAnswerTo",
      "args" : ["PID"]
    }
  ]
  "nextQuestion" : "setupQuestions.timezone"
}
```

A few things to note here:
* It is not important that the `qType` is `freeform`. You could also have the user choose options from a list, as long as these options correspond to the participant IDs in `json/PIDCondMap.json` (see <a href="#Conds">Conditions</a>)
* We don't yet execute the action `"assignToCondition"`, because once this happens, the chatbot attempts to draw the next questions from the question categories of the assigned condition. Since we still want to ask some setup questions from the default conditionless (categories), it is better to save assigning to condition for the last setup question.
* It is important that the variable saved to is spelled `"PID"`, just as in the field `mandatoryParameters`
* Here as well, it is possible to add `replyMessages` or `cReplyMessages`.

Now, we can add this as well to the list of setup questions

```
In questionCategories > setupQuestions of json/config.json
[
  { "qId" : "language", ... },
  {
    "qId" : "PID",
    "qType" : "freeform",
    "text" : {
      "English" : "Type in the participant ID that was given to you.",
      "Deutsch" : "Gib die Teilnehmer-ID ein, die dir vergeben wurde."
    },
    "nextActions" : [
      {
        "aType" : "saveAnswerTo",
        "args" : ["PID"]
      }
    ]
    "nextQuestion" : "setupQuestions.timezone"
  }
]
```

### Timezone

Now, we come to the last essential setup question. Here, we want to ask the user for their timezone, specifically in the format specified under "TZ database name" in this [list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List). Therefore, when providing options to the user to select from, make sure that your options match the spelling/case of these timezones exactly (with no spaces before, in between, or after the timezone name).

Since the timezone is the last information we need from the participant for setup, we will also assign the participant to their condition after receiving this information. If you have more setup questions that are independent of condition and that you would like to ask before assigning a participant to a condition, then perform this action, `assignToCondition`, only after the last setup question has been answered.

For the following question, we will use some fairly common timezones as options, but this list can and should be expanded.

```
In third question of questionCategories > setupQuestions of json/config.json

{
  "qId" : "timezone",
  "text" : {
    "English" : "Please select your timezone",
    "Deutsch" : "Bitte wähle deine Zeitzone aus"
  },
  "qType" : "singleChoice",
  "options" : {
    "English" : ["Europe/Berlin", "US/Eastern","US/Pacific"],
    "Deutsch" : ["Europe/Berlin", "US/Eastern","US/Pacific"]
  },
  "nextActions" : [
    {
      "aType" : "saveAnswerTo",
      "args" : ["timezone"]
    },
    {
      "aType" : "assignToCondition"
    }
  ],
  "nextQuestion" : "setupQuestions.eveningTime"
}
```

Now, we can add this as well to the list of setup questions

```
In questionCategories > setupQuestions of json/config.json
[
  { "qId" : "language", ... },
  { "qId" : "PID", ... },
  {
    "qId" : "timezone",
    "text" : {
      "English" : "Please select your timezone",
      "Deutsch" : "Bitte wähle deine Zeitzone aus"
    },
    "qType" : "singleChoice",
    "options" : {
      "English" : ["Europe/Berlin", "US/Eastern","US/Pacific"],
      "Deutsch" : ["Europe/Berlin", "US/Eastern","US/Pacific"]
    },
    "nextActions" : [
      {
        "aType" : "saveAnswerTo",
        "args" : ["timezone"]
      },
      {
        "aType" : "assignToCondition"
      }
    ],
    "nextQuestion" : "setupQuestions.startFirstStage"
  }
]
```

### User-Defined Times

As mentioned in the section on [scheduled questions](#span-idscheduled-scheduling-questions-span), we can schedule questions at times that users specify. Here, we will show an example of asking a user for their preferred time, and saving it to the variable `eveningTime` for use during scheduling.

Since it is important for the `atTime` property of a scheduled question to strictly have the format `HH:MM`, we will ask the users to select from options that are already in this format, so that we don't rely on the user to enter their preferred time in the correct format.

```
In fourth question of questionCategories > setupQuestions of json/config.json

{
  "qId" : "eveningTime",
  "qType" : "singleChoice",
  "text" : {
    "English" : "At what time in the evenings would you like to receive questions?",
    "Deutsch" : "Zu welcher Zeit abends möchten Sie Fragen erhalten?"
  },
  "options" : {
    "English" : ["17:00", "18:00", "19:00"],
    "Deutsch" : ["17:00", "18:00", "19:00"]
  },
  "nextActions" : [
    {
      "aType" : "saveAnswerTo",
      "args" : ["eveningTime"]
    }
  ]
  "nextQuestion" : "setupQuestions.startFirstStage"
}
```

As before, we can add this question to the list of setup questions:

```
In questionCategories > setupQuestions of json/config.json
[
  { "qId" : "language", ... },
  { "qId" : "PID", ... },
  { "qId" : "timezone" ... },
  {
    "qId" : "eveningTime",
    "qType" : "singleChoice",
    "text" : {
      "English" : "At what time in the evenings would you like to receive questions?",
      "Deutsch" : "Zu welcher Zeit abends möchten Sie Fragen erhalten?"
    },
    "options" : {
      "English" : ["17:00", "18:00", "19:00"],
      "Deutsch" : ["17:00", "18:00", "19:00"]
    },
    "nextActions" : [
      {
        "aType" : "saveAnswerTo",
        "args" : ["eveningTime"]
      }
    ]
    "nextQuestion" : "setupQuestions.startFirstStage"
  }
]
```

We are very nearly done with the setup and starting the experiment. The only thing that is remaining is to start the first stage of the experiment, so that the experiment is successfully running. This will be covered in the following subsection.

### Starting the First Stage

The first stage has to be started manually as the very last step of the setup, particularly only **after the user has been assigned to a condition**. If you do not start a stage after setup, the experiment **will not run** and the chatbot will not interact with the user as intended. Therefore, this is **an essential step of the setup process**.

Firstly, you might ask, how do you start a stage? All you have to do is execute the following action. 

```
{
  "aType" : "startStage",
  "args" : ["<stageName>"]
}
```

In our example, we will do this using a `dummy` type question called `startFirstStage` in the category `setupQuestions`, which will be invoked after the last setup information has been collected.:

```
Example start stage question

{
  "qId" : "startFirstStage",
  "qType" : "dummy",
  "nextActions" : [
    {
      "aType" : "startStage",
      "args" : ["FirstStage"]
    }
  ]
}
  
```

However, such a question would only work in the case that _all of the conditions_ have their first stage with the _same name_: `FirstStage`. 

Since our conditions have different first stages, we will have to use the field `cNextActions` in this question instead of `nextActions`, to select the stage to be started based on the condition of the participant. In `Condition1`, we also want the first question of the experiment to be asked right after finishing setup, so we will add that in the `cNextQuestions` also.

```
In fifth question of questionCategories > setupQuestions of json/config.json

{
  "qId" : "startFirstStage",
  "qType" : "dummy",
  "cNextActions" : [
    {
      "if" : "${CONDITION} == $S{Condition1}",
      "then" : [
        {
          "aType" : "startStage",
          "args" : ["Pre-Test"]
        }
      ], 
      "else" : [
        {
          "aType" : "startStage",
          "args" : ["Intermediate"]
        }
      ]
    }
  ]
  "cNextQuestions" : [
    {
      "if" : "${CONDITION} == $S{Condition1}",
      "then" : "surveyQs.firstSurvey"
    }
  ]
}
  
```

With this we have defined the stage `Pre-Test` to start after setting up in Condition1, and `Intermediate` in Condition2. Furthermore, the question `surveyQs.firstSurvey` will be presented to participants in `Condition1` immediately after the setup is complete.

Here is another possible scenario that can occur, that we have in `Condition2`: you don't want to start the first stage immediately after setting up, and you instead want to start it on the following day. In Condition2, the stage `Test` is the actual first stage. However, we want day 1 of the `Test` stage to be on the day **after** setup was complete. To achieve this, we don't want to start the stage `Test` immediately after setup is complete. But we are required to start some stage after setup for the experiment to be active. What do we do then?

To get around this issue, we have defined a stage in between setup and `Test`, called `Intermediate`. This stage will be defined to run until the next morning, and the stage `Test` will be started on the next morning. For this, we will have to schedule a question during the stage `Intermediate`, which appears in the morning, and simply starts the new stage `Test` on the first morning of the `Intermediate` stage. This is done by adding two new objects to the experimenter configuration file as follows:

We'll first create the `dummy` type question in the `intermediate` question category of `Condition2`. This question does nothing else but start a new stage, when it is invoked...

```
First question of conditionQuestions > Condition2 > questionCategories > intermediate of json/config.json

{
  "qId" : "startStage",
  "qType" : "dummy",
  "nextActions" : [
    {
      "aType" : "startStage",
      "args" : ["Test"]
    }
  ]
}
```

... then we'll create the schedule object so that the above question is invoked in the morning, when the stage is `Intermediate` ...

```
New schedule object for conditionQuestions > Condition1 > scheduledQuestions of json/config.json

{
  "qId" : "intermediate.startStage",
  "atTime" : "06:00",
  "onDays" : ["Mon","Tue","Wed","Thu","Fri"],
  "stages" : ["Intermediate"]
}

```

... and then we'll add them both to the experimenter JSON object under `questionCategories` and `scheduledQuestions` respectively of `Condition2`!

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {...},
  "conditionQuestions" : {
    "Condition1" : {
      "questionCategories" : {...},
      "scheduledQuestions" : [...]
    },
    "Condition2" : {
      "questionCategories" : {
        "intermediate" : [
          { "qId" : "startStage" ... }
        ],
        "morningQs" : [...]
      },
      "scheduledQuestions" : [
        { "qId" : "intermediate.startStage" ...}
      ]
    },
  }
  ...
}
```

To summarize, we have started the first stage of the experiment differently for each condition:
* In `Condition1`, we start the first stage `Pre-Test` immediately after setup, and the receives the first question (`surveyQs.firstSurvey`) right away.
* In `Condition2`, we start the first stage `Test` on the day following the day of setup, by instead starting the stage `Intermediate` after setup, which simply serves as a buffer before the `Test` stage is started by a scheduled question on the morning of the following day.
  * After setup, the user will not receive anything until the first scheduled question of the stage `Test` appears on the next day.

Now that we are finally done starting our first stages in the appropriate way, we can add our question startFirstStage to the list `setupQuestions`, and then add this list to the experimenter configuration, under the question category `setupQuestions` of the **default** object `questionCategories`. We will do this in one step:

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {
    "setupQuestions" : [
      { "qId" : "language", "start" : true, ... },
      { "qId" : "PID", ... },
      { "qId" : "timezone", ... },
      { "qId" : "eveningTime", ... },
      { "qId" : "startFirstStage", ... }
    ]
  },
  "conditionQuestions" : {...}
  ...
}
```

And we are done with setup! Now you should be equipped with everything you need to collect basic information from the user, assign them to a condition, and then start the first stage of that condition so that the experiment can run.

## <span id="Phrases"> Mandatory Phrases </span>

We are finally at the very last part of the experimenter configuration file! Whew.

Here, the experimenter does not have much freedom, and hence does not need to think too hard about what to do here.

These mandatory phrases are simply phrases that would be displayed by the chatbot when certain events occur.

The following is a description of which cases which phrases occur, along with some notes about them.

* `answerValidation` - phrases related to telling the user when an answer is invalid
  * `defaultInvalid` - default statement of answer not being valid
  * `invalidOption` - when a user types in an option that is not present in the `options` field of `singleChoice` or `multiChoice` questions
  * `noOptions` - when a user selects the 'terminate choosing' answer without selecting any options in `multiChoice` questions
  * `notANumber` - when a user enters something that is not a number in response to a `number` type question
  * `numberTooHigh` - when a user enters a number above the upper bound of the `range` in a `number` type question
    * The variable `${UpperBound}` in this phrase will be replaced by the actual upper bound specified in the question object
  * `numberTooLow` - when a user enters a number below the lower bound of the `range` in a `number` type question
    * The variable `${LowerBound}` in this phrase will be replaced by the actual lower bound specified in the question object
  * `notLongEnoughChars` - when a user's `freeform` or `freeformMulti` answer does not contain enough characters as specified in `minLengthChars`
    * The variable `${MinLength}` in this phrase will be replaced by the actual `minLengthChars` specified in the question object
  * `notLongEnoughWords` - when a user's `freeform` or `freeformMulti` answer does not contain enough words as specified in `minLengthWords`
    * The variable `${MinLength}` in this phrase will be replaced by the actual `minLengthWords` specified in the question object
  * `answerNotConforming` - when the user sends an invalid option for question type `freeform`, when parameter `answerShouldBe` is set
  * `terminateSurveyProperly` - when a user does not send the appropriate message to signify having finished a survey during a `qualtrics` type question
* `keyboards` - phrases sent to the user when prompting certain types of questions
  * `singleChoice` - telling the user to select a single choice in `singleChoice` type questions
  * `multiChoice` - telling the user to select multiple choices and how to terminate choosing in `multiChoice` type questions
  * `terminateAnswer` - single word that user types (`freeformMulti`, `qualtrics`) or selects (`multiChoice`) to finish answering and move on
  * `qualtricsFillPrompt` - telling the user to fill out a survey in `qualtrics` type questions
  * `qualtricsDonePrompt` - telling the user what to send to proceed after filling out the `qualtrics` survey
  * `freeformSinglePrompt` - telling the user to type out their answer only in a single message in `freeform` type questions
  * `freeformMultiPrompt` - telling the user to type out their answer over how many ever messages they want, and how to finish answering in `freeformMulti` type questions.
  * `linkToSurvey` - refer the user to the link to the survey in `qualtrics` type questions.
  * `likert5Options` - options for a five point likert scale in `likert5` type question. Must be a list of length 5.
  * `likert7Options` - options for a five point likert scale in `likert7` type question. Must be a list of length 7.
* `schedule` - phrases regarding messages that are scheduled
  * `scheduleQNotif` - notice when a question has been scheduled. Only appears when `actionMessages` of `debugFlags` is set to `true`.
  * `scheduleANotif` - notice when an action has been scheduled. Only appears when `actionMessages` of `debugFlags` is set to `true`.
  * `dayNames` - names of the days of the week in every language for use in question/reply text, accessible by the variable `TODAY_NAME`
  * `reminderTextLong` - long reminder text displayed in first reminder in series
  * `reminderTextShort` - short reminder text displayed in subsequent reminders in series
* `experiment` - phrases for communicating information about the state of the experiment
  * `endExperiment` - message sent automatically when the experiment has been ended.
  * `reportFeedback` - message sent when the user uses the command `/report`
  * `reportFeedbackCancel` - when the user uses `/cancel` to cancel the reporting of feedback
  * `experimentContinue` - message indicating that the experiment will continue as normal after feedback has been cancelled
  * `reportFeedbackThanks` - message thanking the user for reporting feedback 
  * `repeatFail` - when the user sends command `/repeat` and there is no outstanding question to repeat
  * `cannotHelp` - when the user sends command `/help` and there is an error with displaying the instructions.
  * `didntUnderstand` - when the user sends a message that the bot does not expect, when there are no outstanding questions
  * `cannotInteractAfterEnd` - when the user attempts to converse with the bot after the experiment has ended
  * `nothingToCancel` - when the user sends command `/cancel` although there is nothing outstanding to be cancelled
  * `talkStart` - first message that is sent when the user sends command `/talk`, and there are available options to select
  * `talkCancelDescription` - description of the `/cancel` operation in the list of options for command `/talk`
  * `talkCancelled` - message sent when the user sends `/cancel` after starting the `/talk` operation
  * `talkKeywordNotRecognized` - when the user sends a keyword that is not valid after sending the `/talk` command
  * `cannotStartTalk` - when the user sends `/talk` but there are no options for the user to start an interaction at that time
  * `cannotStartTalkOutstanding` - when the user tries to initiate a conversation with `/talk` although there is currently an outstanding question

Below is the object with all of the above phrases. You can consider this as a template to copy and paste, instead of as an example. You may change phrases to adjust the tone of the chatbot, or add a language as you see fit. Just make sure that the language is spelled correctly, just as it is in the field `languages` of the experimenter JSON object. Also make sure, if you are adding a language, that you enter the language for ALL of the phrases.

After this template, you will see how this is added to the experimenter JSON object.

```
{
  "answerValidation": {
    "defaultInvalid" : {
      "English": "That is not a valid answer.",
      "Deutsch": "Das ist keine gültige Antwort."
    },
    "invalidOption": {
      "English": "Please pick <b>only from the given options</b>.",
      "Deutsch": "Bitte wählen Sie <b>nur aus den vorgebenen Optionen</b>."
    },
    "noOptions": {
      "English": "Please select <b>at least one option</b>.",
      "Deutsch": "Bitte wählen Sie <b>zumindest eine Option</b>."
    },
    "notANumber": {
      "English": "Please enter a number.",
      "Deutsch": "Geben Sie eine Zahl ein."
    },
    "numberTooHigh": {
      "English": "Please enter a number below ${UpperBound}.",
      "Deutsch": "Geben Sie eine Zahl ein, die kleiner ist als ${UpperBound}."
    },
    "numberTooLow": {
      "English": "Please enter a number above ${LowerBound}.",
      "Deutsch": "Geben Sie eine Zahl ein, die größer ist als ${LowerBound}."
    },
    "notLongEnoughChars" : {
      "English": "Please take some more time to put more thought into your answer. It must be more than ${MinLength} characters.",
      "Deutsch": "Nehmen Sie sich die Zeit, eine bedachte Antwort zu geben. Sie muss zumindest ${MinLength} Charaktere betragen."
    },
    "notLongEnoughWords" : {
      "English": "Please take some more time to put more thought into your answer. It must be more than ${MinLength} words.",
      "Deutsch": "Nehmen Sie sich die Zeit, eine bedachte Antwort zu geben. Sie muss zumindest ${MinLength} Wörter betragen."
    },
    "answerNotConforming" : {
      "English" : "That is not a valid answer. Did you mean one of the following?",
      "Deutsch" : "Das ist keine gültige Antwort. Meinten Sie vielleicht eines der Folgenden?"
    },
    "terminateSurveyProperly" : {
      "English" : "Please type the correct response to continue after the survey.",
      "Deutsch" : "Bitte geben Sie die richtige Antwort ein, um nach der Umfrage fortzufahren."
    }
  },
  "keyboards": {
    "singleChoice": {
      "English": "Please select from the available options. You may need to scroll down to see all of them.",
      "Deutsch": "Bitte wählen Sie eine aus den vorgebenen Optionen. Es kann sein, dass Sie durchscrollen müssen, um alle Optionen sehen zu können."
    },
    "multiChoice": {
      "English": "Choose as many options as you like. <b>Remember to click <i>Done</i> to finish choosing.</b> You may need to scroll down to see all options.",
      "Deutsch": "Wählen Sie eine oder mehrere Ihrer gewünschten Optionen. Klicken Sie auf Fertig, wenn fertig. Es kann sein, dass Sie durchscrollen müssen, um alle Optionen sehen zu können."
    },
    "terminateAnswer": {
      "English": "Done",
      "Deutsch": "Fertig"
    },
    "finishedChoosingReply": {
      "English": "I have noted down your choices.",
      "Deutsch": "Ich habe Ihre Wahlen notiert."
    },
    "qualtricsFillPrompt" : {
      "English" : "Please follow the link below to the survey.",
      "Deutsch" : "Folgen Sie dem untenstehenden Link zur Umfrage."
    },
    "qualtricsDonePrompt" : {
      "English" : "Send <i>Done</i> when you are finished with the survey.",
      "Deutsch" : "Senden Sie <i>Fertig</i>, wenn Sie mit der Umfrage fertig sind."
    },
    "freeformSinglePrompt" : {
      "English" : "Type in your answer in a <b>single</b> message and press 'send'.",
      "Deutsch" : "Geben Sie Ihre Antwort in nur <b>einer</b> Nachricht ein."
    },
    "freeformMultiPrompt" : {
      "English" : "Type in your answer over one or multiple messages. <b>Remember to send <i>Done</i> in a separate message when you have finished answering.</b>",
      "Deutsch" : "Geben Sie Ihre Antwort über eine oder mehrere Nachrichten ein. Senden Sie <i>Fertig</i>, wenn fertig."
    },
    "linkToSurvey" : {
      "English" : "Link to Survey (opens in browser)",
      "Deutsch" : "Link zur Umfrage (wird im Browser geöffnet)"
    },
    "likert5Options": {
      "English": [
        "Strongly Disagree",
        "Disagree",
        "Neither",
        "Agree",
        "Strongly Agree"
      ],
      "Deutsch": [
        "Stimme vollständig nicht zu",
        "Stimme nicht zu",
        "Weder noch",
        "Stimme zu",
        "Stimme vollständig zu"
      ]
    },
    "likert7Options": {
      "English": [
        "Strongly Disagree",
        "Disagree",
        "Somewhat Disagree",
        "Neither",
        "Somewhat Agree",
        "Agree",
        "Strongly Agree"
      ],
      "Deutsch": [
        "Stimme vollständig nicht zu",
        "Stimme nicht zu",
        "Stimme eher nicht zu",
        "Weder noch",
        "Stimme eher zu",
        "Stimme zu",
        "Stimme vollständig zu"
      ]
    }
  },
  "schedule" : {
    "scheduleQNotif" : {
      "English" : "Question scheduled for the following time:",
      "Deutsch" : "Frage geplant zur folgenden Zeit:"
    },
    "scheduleANotif" : {
      "English" : "Action scheduled for the following time:",
      "Deutsch" : "Handlung geplant zur folgenden Zeit:"
    },
    "dayNames" : {
      "English" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "Deutsch" : ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
    },
    "reminderTextLong" : {
      "English" : "Reminder: you have an outstanding question. Please provide an answer as instructed, or type <i>/repeat</i> to see the question again.\n\nIf you have already typed or selected your answer(s), it may be that you have not sent the appropriate message to continue. Instead of repeating the question, you may simply continue with your answer in the next message. <b>If you choose to repeat the question, you must enter or select all your answer(s) once again.</b>",
      "Deutsch" : "Hier ist eine Erinnerung, dass Sie eine ausstehende Frage noch haben. Geben Sie Ihre Antwort nach Anweisungen ein, oder senden Sie <i>/repeat</i>, um die Frage zu wiederholen."
    },
    "reminderTextShort" : {
      "English" : "Here's a reminder: you have an outstanding question. Please provide an answer as instructed, or type <i>/repeat</i> to see the question again.",
      "Deutsch" : "Hier ist eine Erinnerung, dass Sie eine ausstehende Frage noch haben. Geben Sie Ihre Antwort nach Anweisungen ein, oder senden Sie <i>/repeat</i>, um die Frage zu wiederholen."
    }
  },
  "experiment" : {
    "endExperiment" : {
      "English" : "You will no longer receive any messages from me. Thank you for participating! I hope I was able to help you improve your decision-making.",
      "Deutsch" : "Sie erhalten von mir keine Nachrichten mehr. Danke für Ihre Teilnahme, und ich hoffe, ich konnte Ihnen dabei helfen, Ihren Entscheidungsprozess zu verbessern."
    },
    "reportFeedback" : {
      "English" : "<b>Report Feedback</b>\n\nJust type in your feedback in a single message and press send!\n\nIf this was a mistake and you don't want to report feedback, send <i>/cancel</i>.",
      "Deutsch" : "<b>Feedback Melden</b>\n\nGeben Sie Ihr Feedback in eine Nachricht ein und schicken Sie es einfach ab!\n\nWenn Sie sich vertan haben und kein Feedback melden wollen, senden Sie <i>/cancel</i>."
    },
    "reportFeedbackCancel" : {
      "English" : "Feedback reporting has been cancelled.",
      "Deutsch" : "Feedback-Melden wurde abgebrochen."
    },
    "experimentContinue" : {
      "English" : "The experiment will now continue as normal. If there is an outstanding question to answer, send <i>/repeat</i> to see it again.",
      "Deutsch" : "Das Experiment geht weiter wie gewohnt. Wenn eine Frage noch aussteht, senden Sie <i>/repeat</i>, um sie wieder aufzurufen."
    },
    "reportFeedbackThanks" : {
      "English" : "Thank you for your valuable feedback!",
      "Deutsch" : "Danke für das nützliche Feedback!"
    },
    "repeatFail" : {
      "English" : "No outstanding questions!",
      "Deutsch" : "Keine ausstehenden Fragen!"
    },
    "cannotHelp" : {
      "English" : "Sorry, I cannot help you any further at this moment!",
      "Deutsch" : "Tut mir leid, ich kann Ihnen zu dieser Zeit nicht weiter helfen!"
    },
    "didntUnderstand" : {
      "English" : "Sorry, I didn't understand what you are trying to say! Send <i>/help</i> if you would like more information on how to interact with me, or wait for the next time that I ask you a question to talk to me.",
      "Deutsch" : "Tut mir leid, ich habe das nicht verstanden! Senden Sie <i>/help</i>, wenn Sie mehr Informationen dazu möchten, wie mit mir zu interagieren ist, oder warten Sie einfach auf meine nächste Frage, um mit mir zu reden."
    },
    "cannotInteractAfterEnd" : {
      "English" : "Sorry, I cannot respond to you at this moment! The experiment has been ended. If you would like to report something, use the /report command.\n\nYou can contact the experimenters directly at srinidhi.srinivas@tuebingen.mpg.de",
      "Deutsch" : "Tut mir leid, ich kann Ihnen zu dieser Zeit nicht antworten! Das Experiment ist beendet worden. Wenn Sie etwas berichten möchten, benutzen Sie den Befehl /report.\n\nSie können die Experimenter direkt unter srinidhi.srinivas@tuebingen.mpg.de kontaktieren."
    },
    "nothingToCancel" : {
      "English" : "No operations that have to be cancelled are running right now!",
      "Deutsch" : "Keine Operationen sind jetzt am Laufen, die abgebrochen werden müssen!"
    },
    "talkStart" : {
      "English" : "Hi ${FIRST_NAME}!\n\nI see that you want to tell me something. Send one of the following keywords in bold below corresponding to the topic you want to talk about.",
      "Deutsch" : "Hi ${FIRST_NAME}!\n\nIch sehe, dass Sie mir etwas sagen wollen. Senden Sie eines der untenstehenden Stichwörter im Fettdruck, das dem Thema entspricht, das Sie besprechen wollen."
    },
    "talkCancelDescription" : {
      "English" : "Cancel this operation and return to experiment.",
      "Deutsch" : "Operation abbrechen und zum Experiment zurückgehen."
    },
    "talkCancelled" : {
      "English" : "Seems like you don't have anything else to tell me now. No problem!",
      "Deutsch" : "Es scheint, dass Sie mir jetzt sonst nichts zu sagen haben. Kein Problem!"
    },
    "talkKeywordNotRecognized" : {
      "English" : "I didn't understand. Please try again and make sure to type in the keyword correctly.",
      "Deutsch" : "Ich habe nicht verstanden. Versuchen Sie noch einmal, und stellen Sie sicher, das Stichwort richtig einzugeben."
    },
    "cannotStartTalk" : {
      "English" : "Sorry, but there is nothing I can talk to you about at this point in time. Please try another time, or wait for the next scheduled question.",
      "Deutsch" : "Entschuldigung, es gibt derzeit nichts, über das ich mit Ihnen reden kann. Versuchen später noch einmal, oder warten Sie auf die nächste geplante Frage."
    },
    "cannotStartTalkOutstanding" : {
      "English" : "Sorry, but I cannot talk to you about anything else while there is an outstanding question. Send <i>/repeat</i> to see the question again.",
      "Deutsch" : "Entschuldigung, ich kann nicht mit Ihnen über sonst etwas reden, wenn eine Frage aussteht. Senden Sie <i>/repeat</i>, um die Frage wieder abzurufen."
    }
  }
}
```

That's a big object! Another reason why the experimenter configuration file tends to get long. 

To include this in the experimenter configuration file, all you need to do is add this object to the `phrases` field at the first level of the experimenter JSON object, like so:

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced"
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...}
  "questionCategories" : {...}
  "conditionQuestions" : {
    "Condition1" : {...},
    "Condition2" : {...},
  },
  "phrases" : {
    "answerValidation" : {...},
    "keyboards : {...},
    "endExperiment : {...}
  }
}
```

<hr> 

... and that is what a complete experimenter configuration file essentially looks like! Congratulations on getting through all of this.

However, there is more that can be done to make our experimenter configuration file neater, and this will be discussed in the next section.

## <span id="Split">Splitting Up the Experiment Configuration File</span>

As we have seen, even our simple example here turns out to be very long. This makes it difficult to keep track of the various parts of the configuration file, which becomes very cumbersome. Moreover, when many parts of the configuration have to be repeated (e.g., when two conditions have similar functionality), copying and pasting large parts of the file multiple times seems painstaking and inefficient.

To make definition of the experiment configuration file more modular, it is possible to define elements in different files, and then link to those elements in the main experimenter configuration file.

The elements that can be defined in different files are either [JSON Objects](#objects) or [JSON Lists](#lists).

To separate an element from the main configuration file, simply let the element stand **alone** at the first level of **its own file**, and **in its place in the main experimenter configuration file**, write in, as a **string**, the **path to the file** with the separate JSON element **from the main directory**. Furthermore, the string has to be enclosed in the following symbols: `$F{...}`

This may be confusing, so let us look at an example. We will first look at how a JSON **object** can be separated into its own file, and we will use the example of the large `phrases` property of the configuration file. In general, since this object does not change much between experiments, it is beneficial to store this `phrases` object in a separate file, and link to the same file in each of your different experiments, as seen below.

Let us create a new file called `phrases.json` in the directory `json`, which is where our configuration files are already located.

```
In json/phrases.json

{
  "answerValidation" : {...},
  "keyboards : {...},
  "endExperiment : {...}
}
```

Further, let us also move the **list** of scheduled questions for `Condition1` to a separate file. You may remember this list from the section on [scheduled questions](#span-idscheduled-scheduling-questions-span).

```
In json/cond1ScheduledQuestions.json

[
  {
    "qId" : "testMorningQs.selectFirstQuestion",
    "atTime" : "09:00",
    "onDays" : ["Mon","Tue","Wed","Thu","Fri"],
    "if" : "${STAGE_NAME} == $S{Test}"
  },
  {
    "qId" : "testEveningQs.reflection",
    "atTime" : "18:00",
    "onDays" : ["Mon","Tue","Wed","Thu","Fri"],
    "if" : "(${STAGE_NAME} == $S{Test}) AND (${wantsToReflect} == $B{true})"
  }
]
  
```

Now, we will replace the properties in the main experimenter file with the links to these files instead.

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : {...},
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...},
  "questionCategories" : {...},
  "conditionQuestions" : {
    "Condition1" : {
      questionCategories: {...},
      scheduledQuestions: "$F{json/cond1ScheduledQuestions.json}"
    },
    "Condition2" : {...},
  },
  "phrases" : "$F{json/phrases.json}"
}
```

This has already cut down the experiment configuration file by hundreds of lines, and made it a lot more manageable. Ideally, a neat experiment configuration file would use this method to replace any object or list that is more than a few lines long, in order to increase manageability and reduce visual clutter. 

If done right, your experiment configuration file may look like this:

```
In json/config.json

{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "msPerCharacterDelay" : 5,
  "instructions" : {...},
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "relConditionSizes" : [1,1],
  "assignmentScheme" : "balanced",
  "conditionMapping" : "$F{json/PIDCondMap.json}",
  "experimentStages" : "$F{json/experimentStages.json}",
  "mandatoryParameters" : {...},
  "customParameters" : "$F{json/parameters.json}",
  "questionCategories" : {
    "setupQuestions" : "$F{json/setupQuestions.json}"
  },
  "conditionQuestions" : {
    "Condition1" : {
      "questionCategories" : {
        "preTestQs" : "$F{json/cond1PreTestQs.json}",
        "testMorningQs" : "$F{json/morningQs.json}",
        "testEveningQs" : "$F{json/eveningQs.json}",
        "postTestMorningQs" : "$F{json/postTestMorningQs.json}",
        "postTestEveningQs" : "$F{json/postTestEveningQs.json}"
      },
      scheduledQuestions: "$F{json/cond1ScheduledQuestions.json}"
    },
    "Condition2" : {
      "questionCategories" : {
        "morningQs" : "$F{json/morningQs.json}",
      },
      scheduledQuestions: "$F{json/cond2ScheduledQuestions.json}"
    },
  },
  "phrases" : "$F{json/phrases.json}"
}
```

Notice how the file `json/morningQs.json` is mentioned more than once, for both `Condition1` and `Condition2`. This ensures that this question category will be exactly the same for both conditions. Therefore, this method of replacing also helps with reusability of portions of the experiment configuration file. So, if you need to make a change to a certain question in this question category, you would not have to make that change in several places - you would just change it once, in the file `json/morningQs.json`, and everything in the configuration file that links to this file will automatically adopt that change!

Keep in mind: **only** lists and objects can be replaced this way. Notice how the property `assignmentScheme` cannot be replaced in such a manner, since it requires a string in its place. This also means that any file that you link to must contain **only one JSON list or JSON object** at the main level (there can, of course, be several nested JSON lists and objects)!