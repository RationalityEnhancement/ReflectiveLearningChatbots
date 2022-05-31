# Defining Your Experiment 

_(up to date for third prototype)_

This pages contains all of the instructions and documentation on how to define an experiment for the Reflective Learning Chatbot in _config.json_.

Sections 1-3 give you a quick overview of the structure of the experiment configuration file, as well as a short example to get started quickly.

Sections 4 onwards contain detailed documentation of each part of the experiment, and show how to build a different example experiment configuration file from start to finish.

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
      <li> <a href="#Stages">Experiment Stages</a> </li>
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
  <li><a href="#Conditions">Conditional Expressions</a></li>
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

Templates such as [this](others/exampleConfig.json) provide the structure already, whose properties only need to be replaced/filled in by the experimenter (see also: next section).

<b><i> ! WARNING - Valid JSON Syntax does NOT mean valid experiment file ! </i></b>

It is important to pay attention to the case of the property names. Use capital letters where directed, and don't use them where not. For example, the field `experimentId` must not be written as `experimentID` or as `ExperimentId`.

It is also important to pay attention to the data type of a given field. If it is mentioned that a field must contain a string value, it cannot contain any other value. E.g., `defaultLanguage` must be a string, and cannot be `4` or `false` or `["English", "German"]`.

## <span id="GettingStarted"> Start With an Example </span>
<hr>

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

Note that this requires you to obtain the participant ID from the participant through chat interactions and store it to the participant parameter `PID` using the `"saveAnswerTo"` action. Details about how to do this will be explained in the coming sections.

The following is an example of `json/PIDCondMap.json`. In this example, `experimentConditions` is `["Experimental","Control"]`. Participant with `PID = 1234` will be assigned to condition `Experimental`, and `4321` will be assigned to `Control`.

```
{
  "1234" : 1,
  "4321" : 0
}
```

### <span id="Stages"> Experiment Stages </span>

An experimental condition **must** be composed of one or more consecutive stages. A stage is a period of the experiment of definite or indefinite length, only one of which runs at a time. Stages are mainly used to define different functionality of the chatbot depending on how long it has been since the user has begun interaction. Therefore, the length of each stage, if specified, is quantified by the number of days a stage lasts before moving on to the next.

In this beginning section of the experimenter configuration file, only the names and durations of the stages are specified. Stage-dependent chatbot behaviour must be defined by using the variables `STAGE_NAME` and `STAGE_DAY` in conditional expressions during the scheduling/definition of questions (see sections <a href="#ReservedVars">Reserved Variables</a>, <a href="#Conditions">Conditional Expressions</a>, and <a href="#NextSteps">Next Steps after Question</a>).

**The first stage must be started manually** at the appropriate time after all of the stage-independent setup questions are complete, by using the action `"startStage"` (see section <a href="#Actions">Actions</a>)

Once the first stage has begun, the stage day will automatically increment by 1 at 21:00 **only on every evening that the stage is defined to be running**. If the number of days of the current stage exceeds the specified number of days for that stage, the next stage is **automatically** started. If there is no next stage, the experiment is automatically ended.

It is possible to have a stage of indefinite length. However, in this case, it is up to the experimenter to **manually** ensure that the next stage begins under the right conditions, by using the action `"startStage"` whenever required (for example, after a certain question is answered).

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
      "name" : "Test",
      "lengthDays" : 2
      "onDays" : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    }
  ]
}
```

Now, to add this to the experiment JSON object we are building, we must simply assign it to the `experimentStages` field.

```
{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "conditionAssignments" : [1,1],
  "assignmentScheme" : "balanced"
  "experimentStages" : {
    "Condition1" : [{ "name" : "Pre-Test" ...}, { "name" : "Test" ...}, { "name" : "Post-Test" ...}],
    "Condition2" : [{ "name" : "Test" ...}]
   }
  ...
}
```

### Stages without Experimental Conditions

If you decide not to define experimental conditions, it is still possible to define stages. However, in this case, the field experimentStages at the first level of the experiment JSON object must directly be a list of stage objects, instead of an object with each condition as it is above.

Example (of a different, condition-less experiment configuration file): 

```
{
  "experimentName" : "NoConditions",
  "experimentId" : "RL-NoCond-1",
  "languages" : [...],
  "defaultLanguage" : "English",
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
<hr>

Now, experimenters can define parameters, which are essentially variable values that are stored for each participant, and that can be manipulated in certain ways throughout the course of the experiment (see section <a href="#Actions">Actions</a>). These do not only store information about the participant (e.g., `participantIsSmoker`), but also can be used to set variables that control the behaviour of the chatbot (e.g., `setGoalsToday`).

These are defined by two objects at the first level of the experiment JSON object. 

The first parameter object is called `mandatoryParameters`. This contains parameters essential to the running of the experiment, such as `"language"`, `"timezone"`, and `"PID"`. It is better to leave this object alone, as custom parameters cannot be defined here, and the pre-defined parameters need to have the same names and data types as is given. 

The second parameter object is called `customParameters`. Here, the experimenter can define any number of key-value pairs, the key being the name of the variable (string) and the value being the data type of the variable (string). The following are the possible data types:
* "str" - Simple string variable (default value is empty string)
* "number" - Simple number variable (integer or decimal; default value is 0)
* "boolean" - Simple boolean (true or false; default value is false)
* "strArr" - Array of simple strings (default value is empty array)
* "numArr" - Array of simple numbers (default value is empty array)

For example, let us define three parameters. The first one will be a number `numGoalsSet`, that stores the number of goals that the user set, the second one a string array `goalsSet` that stores each of the goals that the user set for themselves on that day, and the third one a boolean `wantsToReflect`, indicating a user's preference on whether or not they want to reflect on that given day.

```
{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "conditionAssignments" : [1,1],
  "assignmentScheme" : "balanced"
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {
    "numGoalsSet" : "number",
    "goalsSet" : "strArr",
    "wantsToReflect" : "boolean"
  }
  ...
}
```

## <span id="QCats"> Question Categories </span>
<hr>

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

Let us create a question category called `"setupQuestions"` as the only category in our conditionless categories. Since we have not yet seen what question objects look like, we will make placeholders for them and revisit them when we discuss question objects.

```
{
  "setupQuestions" : [
    {
      "qId" : "language",
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
{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "conditionAssignments" : [1,1],
  "assignmentScheme" : "balanced"
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...}
  "questionCategories" : {
    "setupQuestions" : [...]
  }
  ...
}
```

In case your experiment does not have any conditions, you can (and have to) define all your question categories in this default object.

### <span id="CQCats"> Condition Question Categories </span>

NOTE: These are optional! As long as your experiment doesn't have any conditions, you can leave these out completely. But if your experiment does have conditions, you must create a set of question categories for each condition. 

After creating our conditionless question categories, we now want to create sets of question categories for each condition. The condition question categories are, syntactically, the exact same as the conditionless question categories. The only difference is where they are placed in the experiment JSON object!

The experiment JSON object has, at the first level, another object called `"conditionQuestions"`. This, just like the one for `"experimentStages"`, contains the names of the conditions as keys. All conditions must be present in this object. The values of each of these objects is another object that we will soon go deeper into.

Let us already create the skeleton of this object with each of the conditions:

```
{
  "Condition1" : {...},
  "Condition2" : {...}
}

```

Each of these condition objects has exactly **ONE** property, namely `"questionCategories"`. And if you hadn't guessed it already, this is exactly what you know from the last section - an object containing experimenter-defined names as keys and lists of question objects as values.

Imagine that we want to create, in the first condition, a category for questions in the stage `"Pre-Test"`, two categories for the stage `"Test"`, and two more for the stage `"Post-Test"`. Functionally, these are in no way connected to the actual experiment stages, so you may divide the questions up and name the categories as you want.

Note that each of the lists corresponding to the question categories would be lists of "question objects", as mentioned before, but we will leave those out now because we haven't covered them yet.

```
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
      "morningQs" : [...]
    }
  }
}
```

Note how the question categories of `"Condition2"` are independent of those of `"Condition1"`, and will not be accessible if the user is assigned to `"Condition1"`, and vice versa.

Finally, all we have to do is assign this entire object to the `conditionQuestions` field at the first level of the experiment JSON object. Doing this, we get:

```
{
  "experimentName" : "ReflectiveLearning",
  "experimentId" : "RL-Exp-1",
  "languages" : [...],
  "defaultLanguage" : "English",
  "debug" : { ... },
  "experimentConditions" : ["Condition1", "Condition2"],
  "conditionAssignments" : [1,1],
  "assignmentScheme" : "balanced"
  "experimentStages" : {...},
  "mandatoryParameters" : {...},
  "customParameters" : {...}
  "questionCategories" : {...}
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
<hr>

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

Step by step, we will now build up a simple question asking a yes-or-no question to the user on whether they would like to later receive a prompt to reflect on the goals that they have just set.

### <span id="QID"> Question ID</span>

The question ID is simply a unique identifier for the question within the question category. No other question within the category is allowed to have the same name, although questions in other categories may have the same name.

It is a simple string, and it will occupy the value of the field `qId` (case is important) of the question object.

So, here we have our new-born question object that we have just christened:

```
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
* "This is the first line \nThis is the second line" -> This is the first line <line break>This is the second line

The question text can also contain values of variables, which you can access as described in section <a href="#Variables">Variables</a>.

By default, the amount of time it takes for a question to appear to the user depends on the length of the question, in order to simulate typing by the bot.

Let us now actually write the text for our example question, in both languages. The value of the `text` field of the question object is itself an object, with the keys being all of the available languages for the experiment, and the values being the text string that is to be displayed for a user who has chosen that particular language. Our example question object, taking some shape, now ends up looking like this:

```
{
  "qId" : "askReflect",
  "text" : {
    "English" : "Would you like to reflect on your goals later today?",
    "Deutsch" : "Hier ist die deutsche Übersetzung der obigen Frage?"
  }
}
```

### <span id="QTypes"> Question Types</span>

The question type of the question, a string occupying the field `qType` of the question object, defines the type of response that a user is supposed to give to the question. Each question type has some additional associated parameters, either optional or mandatory, that are added directly to the question object.

Before continuing on with our example question object, let us take a look at all of the possible question types and the additional parameters:

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

Example question that prompts free typing in a single message, with the requirement that the answer is at least 10 words: 

```
{
  "qId" : "exFreeform",
  "text" : {...},
  "qType" : "freeform",
  "minLengthWords" : 10
}
```

#### Freeform Multi - "freeformMulti"

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
{
  "qId" : "exFreeformMulti",
  "text" : {...},
  "qType" : "freeformMulti",
  "minLengthChars" : 100
}
```

### <span id="NextSteps"> Next Steps </span>

#### <span id="Replies">Reply Messages</span>
#### <span id="Actions"> Actions </span>
#### <span id="NextQ"> Next Question</span>

## <span id="Variables">Variables and Constants</span>
<hr>

### <span id="ReservedVars"> Reserved Variables </span>
### <span id="CustomVars"> Custom Variables </span>
### <span id="Constants"> Using Constants </span>

## <span id="Conditions"> Conditional Expressions </span>
<hr>

## <span id="Scheduled"> Scheduling Questions </span>
<hr>

## <span id="Phrases"> Mandatory Phrases </span>
<hr>

The remainder of this description will show you the mandatory and optional features an experiment requires to run.

Follow this documentation along with an [example experiment configuration](others/exampleConfig.json) to see how the following example would translate into an actual document. 

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
