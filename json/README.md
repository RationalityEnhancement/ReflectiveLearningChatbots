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

The following example shows the beginning of the experiment JSON file, titled `config.json`. If you want to copy the below object into your JSON file, copy only the object and not the text `"In config.json"`.

```
In config.json

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
In config.json

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
In config.json

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

In this beginning section of the experimenter configuration file, only the names and durations of the stages are specified. Stage-dependent chatbot behaviour must be defined by using the variables `STAGE_NAME` and `STAGE_DAY` in conditional expressions during the scheduling/definition of questions (see sections <a href="#ReservedVars">Reserved Variables</a>, <a href="#Conditions">Conditional Expressions</a>, and <a href="#CondNextSteps">Next Steps after Question</a>).

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
In experimentStages of config.json

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
In config.json

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

Example (of a different, condition-less experiment configuration file), `noCondsConfig.json`: 

```
In noCondsConfig.json

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

For example, let us define four parameters. The first one will be a number `numGoalsSet`, that stores the number of goals that the user set, the second one a string array `goalsSet` that stores each of the goals that the user set for themselves on that day, the third one a boolean `wantsToReflect`, indicating a user's preference on whether or not they want to reflect on that given day, and the fourth one `reflectionText` storing the user's answer to a reflection prompt.

```
In config.json

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
    "wantsToReflect" : "boolean",
    "reflectionText" : "strArr"
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
In questionCategories of config.json

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
In config.json

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
In conditionQuestions of config.json

{
  "Condition1" : {...},
  "Condition2" : {...}
}

```

Each of these condition objects has exactly **ONE** property, namely `"questionCategories"`. And if you hadn't guessed it already, this is exactly what you know from the last section - an object containing experimenter-defined names as keys and lists of question objects as values.

Imagine that we want to create, in the first condition, a category for questions in the stage `"Pre-Test"`, two categories for the stage `"Test"`, and two more for the stage `"Post-Test"`. Functionally, these are in no way connected to the actual experiment stages, so you may divide the questions up and name the categories as you want.

Note that each of the lists corresponding to the question categories would be lists of "question objects", as mentioned before, but we will leave those out now because we haven't covered them yet.

```
In conditionQuestions of config.json

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
In conditionQuestions of config.json

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
In config.json

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
* "This is the first line \nThis is the second line" -> This is the first line <line break>This is the second line

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

### <span id="QTypes"> Question Types</span>

The question type of the question, a string occupying the field `qType` of the question object, defines the type of response that a user is supposed to give to the question. Each question type has some additional associated parameters, either optional or mandatory, that are added directly to the question object.

Before continuing on with our example question object, let us take a look at all of the possible question types and the additional parameters. You can <a href="qtskip">skip ahead</a> if you simply want to continue with the example.

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
  }
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

Once the user is finished with the survey, they must send the <a href="#Phrases">phrase</a> `keyboards.terminateAnswer` for the appropriate language in a single message, so that the chatbot can continue.

The value of the `qType` of the question object should be `"qualtrics"`

The following are mandatory parameters that must be added to the question object for this question type to function appropriately:
* `qualtricsLink` - string containing the base URL to the target survey (without any query strings)

The following are optional parameters that can be added to the question object for expanded functionality:
* `qualtricsFields` - list containing objects each having a `field` and `value`. Each of these is appended to the link as query strings to be passed as meta-data for the survey response.
  * `field` and `value` must be strings. `value` can also be the value of a <a href="#Variables">variable</a> at that point in time.
  * `value` should not contain characters &, = or ?

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

| aType               | description                                                                                          | arg 1                    | arg 1 type                | arg 2       | arg 2 type                                | example action object                                                 | notes                                                                                        |
|---------------------|------------------------------------------------------------------------------------------------------|--------------------------|---------------------------|-------------|-------------------------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| `assignToCondition` | Assigns user to a particular condition based on the `assignmentScheme`                               | none                     | none                      | none        | none                                      | `{ "aType" : "assignToCondition" }`                                   |                                                                                              |
| `scheduleQuestions` | Schedules all the questions present in the `scheduledQuestions` field of the current condition       | none                     | none                      | none        | none                                      | `{ "aType" : "scheduleQuestions" }`                                   |                                                                                              |
| `startStage`        | Starts a certain experiment stage at day 1, ending the previous stage if any was running             | name of valid stage      | string                    | none        | none                                      | `{ "aType" : "startStage", args : ["Pre-Test"] }`                     |                                                                                              |
| `incrementStageDay` | Manually increment the current day of a stage by 1  | name of valid stage      | string                    | none        | none                                      | `{ "aType" : "incrementStageDay", args : ["Test"] }`                  | incrementing of stage day occurs automatically on a daily basis already                      | 
| `endExperiment`     | Manually causes the experiment to end | none                     | none                      | none        | none                                      | `{ "aType" : "incrementStageDay" }`                                   | ending experiment occurs automatically after the end of last stage (if it has finite length) |
| `saveAnswerTo`      | Save the user's answer to the current question to a certain variable (parameter)                     | valid variable name      | string, strArr, or number | none        | none                                      | `{ "aType" : "saveAnswerTo", args : ["numGoalsSet"] }`                | save to number only when `qType` is `"number"`                                               |
| `addAnswerTo`       | Add the user's current answer to the end of a certain array variable (parameter)                     | valid variable name | strArr or numArr          | none        | none                                      | `{ "aType" : "addAnswerTo", args : ["goalsSetToday"] }`               | add to number array only when `qType` is `"number"`                                          |
| `setBooleanVar`     | Set the value of a particular boolean variable to either true or false                               | valid variable name | boolean                   | new value   | <a href="#Constants">boolean constant</a> | `{ "aType" : "setBooleanVar", args : ["wantsToReflect", "$B{true}"] }` |                                                                                              |
| `addValueTo`        | Add a number value to a number variable                                                              | valid variable name | number                    | added value | <a href="#Constants">number constant</a>  | `{ "aType" : "addValueTo", args : ["numGoalsSet", "$N{2}"] }`         |                                                                                              |
| `clearVar`          | Clears a certain variable to default value (see <a href="#Parameters">Parameters</a>)                | valid variable name | any parameter type        | none         | none                                      | `{ "aType" : "clearVar", args : ["goalsSetToday"] }`         |                                                                                              |


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
      "aType" : "clearVar",
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
      "aType" : "clearVar",
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
      "aType" : "clearVar",
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
          "aType" : "clearVar",
          "args" : ["reflectionText"]
        }
      ],
      "else" : [
        {
          "aType" : "setBooleanVar",
          "args" : ["wantsToReflect", "$B{false}"]
        },
        {
          "aType" : "clearVar",
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
In config.json

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

And that's it! We can now add this to our experimenter configuration file like before:

```
In config.json

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
      "questionCategories" : {
        "preTestQs" : [...],
        "testMorningQs" : [
          { "qId" : "selectFirstQuestion", ... },
          { "qId" : "askReflect", ... }
          ...
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

## <span id="Variables">Variables and Constants</span>
<hr>

In order to enable better interactions with the user, it is possible to save certain responses and use them to define the behaviour of the chatbot. This is done using variables. Variables are essentially named parameters that store a value of a certain data type, and whose value can change throughout the course of the experiment.

In the section on <a href="#Parameters">Participant Parameters</a>, you learned how to declare these. Now, in this section, you will learn how to access their values!

There are two possible types of variables - reserved variables and custom variables. The former are values related to the state of the chatbot that the experimenter has access to, but cannot alter. The latter are those that the experimenter has access to and can manipulate as needed.

In addition to variables, there are also "constants". These define values of a certain data type, and are mainly used in <a href="#Conditions">Conditional Expressions</a>, though also finding a use in the <a href="#Actions">action</a> `setBooleanVar`.

### <span id="ReservedVars"> Reserved Variables </span>

Reserved variables contain certain essential information about the participant and the experiment that the experimenter can use to either display in messages or to condition the behaviour of the chatbot.

Furthermore, some information that reserved variables provide access to might be sensitive information that identifies the user, and therefore should not be stored along with the data collected for the user. These are known as 'sensitive' variables, and will not be stored in the database. Any text accessing these variables will also be saved without the identifying information.

The following is a list of all the reserved variables, their data types, and their descriptions.

| Var Name           | Data Type     | Description                                                                                                          | Sensitive? |
|--------------------|---------------|----------------------------------------------------------------------------------------------------------------------|------------|
| `FIRST_NAME`       | `string`        | First name of the participant taken from Telegram                                                                    | Yes        |
| `UNIQUE_ID`        | `string`        | Unique ID of the participant, generated by the chatbot                                                               | No         |
| `TODAY`            | `string`        | Abbreviated name of the current day (e.g., "Mon", "Wed", "Fri")                                                      | No         |
| `STAGE_NAME`       | `string`        | Name of the currently running experiment stage. Is empty string if no stage running.                                 | No         |
| `STAGE_DAY`        | `number`        | Number of the day of the current experiment stage. Is 1 on first day of stage.                                       | No         |
| `ANSWER_LEN_CHARS` | `number`        | Length in characters of the user's current answer                                                                    | No         |
| `ANSWER_LEN_WORDS` | `number`        | Length in words of the user's current answer                                                                         | No         |
| `CURRENT_ANSWER`   | `number`/`strArr` | The current valid answer that the user submitted. Is type `number` only when `qType` of the current question is `number` | No         |

Reserved variables are accessed by simply taking the name of any of the above reserved variables and enclosing it in `${...}`.

One example is using the variable in a normal text string that is sent to the user. Let's assume the user is on the 2nd day of stage `"Test"`.

The text, `"You are now on Day ${STAGE_DAY} of Stage ${STAGE_NAME}"`, defined by the experimenter, would be seen by the user as `"You are now on Day 2 of Stage Test"`

If the variable does not exist - i.e., is neither the name of a reserved variable nor is an experimenter-defined custom variable - the text will not be replaced, and will be seen by the user as it is. For the next example, let us assume the user's first name is "Bonnie".

Then, the text, `"Welcome to the experiment, ${FIRST_NAME} ${LAST_NAME}"`, defined by the experimenter, would be seen by the user as `"Welcome to the experiment, Bonnie ${LAST_NAME}"`, since there is no reserved variable called `LAST_NAME`.

Another example of accessing reserved variables is specifying conditional expressions, which is covered in depth with many examples in the section <a href="#Conditions>Conditional Expressions</a>

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

## <span id="Conditions"> Conditional Expressions </span>
<hr>

Note: This section requires familiarity using variables and constants. Review the previous sections if you are not familiar with these already.

Conditional expressions are expressions that evaluate to true or false. Conditional expressions always perform an operation on two operands, and produce a result based on the operator selected.

These conditional expressions are used in the `if` fields of <a href="#CondNextSteps">Conditional Next Steps</a> portion of questions in order to select the next steps based on certain conditions. They are also used in <a href="#Scheduled">Scheduled Questions</a> if a question that is to be scheduled should only appear under certain circumstances. 

Conditional expressions are therefore helpful in checking whether the experiment is in a certain state or the participant's parameters have certain properties, based on which decisions can be made. For example, if you want the next question to appear only if the participant has answered "Yes" to the current question, you would use a conditional expression to evaluate whether the current answer is equal to "Yes".

As mentioned before, conditional expressions have 2 operands and 1 operator. The operator must always occur in between the operands, separated by at least one space on either side. The operands can be variables, constants, or expressions themselves enclosed in parentheses (see Nested Expressions below). The type of operand that you can evaluate depends on the operator you are trying to use. 

Following is a table of all available operators as well as the operands on which they can operate. 

Keep in mind that the operators are **NOT commutative**. This means that `"A op B"` is not the same as `"B op A"`, therefore making the order of operands in the expression important!

| operator          | description                                                   | operand 1 type      | operand 2 type | example                                         | example outcome                                                                                   | notes                                                                                                           |
|-------------------|---------------------------------------------------------------|---------------------|----------------|-------------------------------------------------|---------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `==`              | Checks equality between two values of the same data type      | any                 | any            | `"${STAGE_NAME} == $S{Test}"`                   | `true` when var `STAGE_NAME` has value `"Test"`                                                   | operands must be of same data type                                                                              |
| `!=`              | Checks inequality between two values of the same data type    | any                 | any            | `"${STAGE_NAME} != $S{Test}"`                   | `true` when var `STAGE_NAME` does not have value `"Test"`                                         | operands must be of same data type                                                                              |
| `>=`              | Checks whether op1 greater than or equal to op2               | number              | number         | `"${STAGE_DAY} >= $N{3}"`                       | `true` when var `STAGE_DAY` has value `>= 3`                                                      |                                                                                                                 |
| `>=`              | Checks whether op1 strictly greater than op2                  | number              | number         | `"${STAGE_DAY} > $N{3}"`                        | `true` when var `STAGE_DAY` has value `> 3`                                                       |                                                                                                                 |
| `<=`              | Checks whether op1 lesser than or equal to op2                | number              | number         | `"${STAGE_DAY} <= $N{3}"`                       | `true` when var `STAGE_DAY` has value `>= 3`                                                      |                                                                                                                 |
| `<`               | Checks whether op1 strictly lesser than op2                   | number              | number         | `"${STAGE_DAY} < $N{3}"`                        | `true` when var `STAGE_DAY` has value `> 3`                                                       |                                                                                                                 |
| `CONTAINS_STRING` | Checks whether op1 contains the string op2                    | string              | string         | `"${STAGE_NAME} CONTAINS_STRING $S{"Pre"}"`     | `true` when var `STAGE_NAME` has `Pre` anywhere as a substring                                    |                                                                                                                 |
| `IN_ARRAY`        | Checks whether op1 is an element in the array op2             | string, number      | strArr, numArr | `"${progress} IN_ARRAY $N*{10,20,30}"`          | `true` when var `progress` has value `10`, `20`, or `30`                                          |                                                                                                                 |
| `MULTIPLE_OF`     | Checks whether op1 is a multiple of op2                       | number              | number         | `"${STAGE_DAY} MULTIPLE_OF $N{2}"`              | `true` when var `STAGE_DAY` is an even number                                                     |                                                                                                                 |
| `HAS_CHOICE_IDX`  | Checks whether certain option(s) were chosen on a choice question | `${CURRENT_ANSWER}` | numArr         | `"${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,1,3}"` | `true` when the index of the chosen answer in the `options` list is either `0`, `1`, or `3`         | can only be used exclusively for this purpose and in this manner with `singleChoice` or `multiChoice` questions |
| `AND`             | Logical AND checks whether op1 and op2 are both true          | boolean             | boolean        | `"${setGoalsToday} AND ${wantsToReflect}"`      | `true` when the both variables `setGoalsToday` and `wantsToReflect` are `true`                    | |
| `OR`               | Logical OR checks whether op1 or op2 are true               | boolean             | boolean        | `"${setGoalsToday} OR ${wantsToReflect}"`       | `true` when either variables `setGoalsToday` or `wantsToReflect` is `true`, or when both are `true` | |

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

Now, you know everything you need to start conditionally defining the chatbot's behaviour!

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
