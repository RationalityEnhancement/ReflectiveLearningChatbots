# Reflective Learning Chatbots

This repository contains a Node.js infrastructure to specify chatbots for reflective learning. A reflective learning chatbot is one that interacts with a user, asking questions which prompt them to reflect on some aspect of their lives. The main purpose of this software is for running experiments on participants and collecting their answers as data.

Once downloaded and set up, the infrastructure can be used by simply designing the experiments, i.e., the questions to be asked, when they are to be asked, etc., in a file and running the software. 

This repository can define and host a **single** Telegram chatbot. If you want to host multiple instances at once, you will have to clone this repository multiple times and repeat these steps for each chatbot you want to host.

Read on for further instructions on how all this is done...

## Setting Up

Setting up this repository assumes basic knowledge and installation of [Git](https://git-scm.com/), basic experience interacting with [Command Line Interfaces](https://en.wikipedia.org/wiki/Command-line_interface), and some familiarity with the [JSON](https://www.json.org/json-en.html) file format.

To completely set up a Reflective Learning Chatbot that you can interact with, you will need the following things, which the instructions will walk you through: 
* A MongoDB Cloud account with a cluster set up in MongoDB Atlas
* A Telegram bot
* The software in this repository
* The bot server running, either on a local system or on Heroku

The rest of the instructions will cover each of these steps in detail

### Database

* Create an account on [MongoDB Cloud](https://www.mongodb.com/cloud), if you don't have one already. 
  * Follow instructions to create a new project in MongoDB Atlas.
* If you already have an account, log in to MongoDB Cloud and navigate to MongoDB Atlas. 
  * Navigate to your organization, where you will find an overview of all your projects. Click on "New Project" in the top right.
* Follow instructions to create a database cluster within this project. The free (shared) version with default settings will work.
* You will be asked to create a user+password to ensure restricted access to the database. Once this is done, creating the cluster may take a few minutes.
* Navigate to the 'Database' tab under 'Deployment' and click on 'Connect' next to your new cluster. Choose the third option (MongoDB Compass), and copy the connection string starting with _mongodb+srv://_ under step (2). Downloading MongoDB Compass (step 1) is not necessary.
* The connection string will have a part _\<password\>_ which should be replaced with the password of the user created above. If the database has multiple users, then the _\<user\>_ part will also have to be replaced with the corresponding username created when the cluster is created. Save this connection string for later.
* On the left, choose 'Network Access', click 'ADD IP ADDRESS', and add the address "0.0.0.0" without quotes or click 'Allow Access from Anywhere' to automatically do this. This will ensure that the database is accessible by anyone that has the database connection string.

### Creating a Bot

* Download and install Telegram. Using the Desktop client or Website app will make copying information easier.
* Start a chat with the bot [@BotFather](https://t.me/botfather)
* Follow the instructions to name your bot, etc., and obtain the 'bot token' (HTTP API Token). Save this bot token for later.

### Software Setup
* Download and install [Node.js](https://nodejs.org/en/download/releases/). If possible, download version 17.9.0. This would minimize compatibility issues, as the chatbot software in this repository is built on that version.
  *   Windows: download file "node-v17.9.0-x86.msi"
  *   macOS: download file "node-v17.9.0.pkg"
* Use git to fork this repository into your own account, then clone that forked repository into a local directory of your choice. Navigate to the directory in which you have cloned this repository.
* Open a [terminal](https://geekiam.io/what-is-a-terminal-window/) of your choice.
* Run the command `npm install`
* Copy the file [.env_template](./.env_template) to another file in the same directory with the name "_.env_" (without quotes). 
  * macOS Terminal - `cp .env_template .env`
  * Windows Command Prompt - `copy .env_template .env`
  * This file may be hidden, so you would not be able to see it immediately. `ls -a` on macOS Terminal and `dir /a:h` on Windows Command Prompt will reveal these files.
* Open the _.env_ file with a text editor, enter the bot token and the database connection strings respectively after the '=' sign, and save this file. It should now look similar to this:

```
BOT_TOKEN=1234567890:eXaMpLeB0tT0kEnBlaHblAhBlaH
DB_CONNECTION_STRING=mongodb+srv://username:Password@cluster0.iblwy.mongodb.net/test
```
* Celebrate

### Hosting the Bot on Your Own Computer

To be able to interact with the bot on Telegram, the bot server (which is defined in this software) must be hosted and running. This can be done on your own computer. This also means that as long as this software is running in your computer, anybody anywhere can interact with your bot. However, if this software is not running on any device, then the bot cannot be interacted with. 

Starting the bot server on your own computer is easy. In the terminal, run the command `npm run start-local`. You can now interact with the bot on Telegram as long as this terminal window is open and the server is still running. To close the server, just press `Ctrl + C` in the terminal that the bot is hosted.

Each time you make a change to the experiment, you need to close the server and restart it for the changes to be reflected in chatbot behaviour. Therefore, it is recommended that you use this method to host the bot while designing and testing the experiment, as it is more convenient than testing with a bot that is hosted online.

Skip [ahead](#deploying-the-bot-server-to-heroku) to see how to host the bot on Heroku, an online web application hosting service. Do this when you deploy your chatbot, after you have implemented and tested the functionality of the chatbot locally, so that the bot server does not have to constantly be running on your personal system.

### Interacting with the Bot on Telegram

* Open Telegram and start a chat with the bot username defined by you when you set up the bot.
* Type `/start` to start chatting
  * The bot will lead you through the remainder of the conversation, as defined by the experimenter in the configuration file.
* Type `/repeat` to have the bot repeat the last question, as long as an answer has not yet been provided.
* Type `/next` to have the bot display the next question that is scheduled to appear.
  * Only available when the `enableNext` flag is set to `true` in the experiment configuration file (see [here](json/README.md#span-iddebug-debug-flags-span))
* Type `/help` to have the bot display instructions
  * These are defined by the experimenter in the experiment configuration file
* Type `/talk` to initiate a conversation about certain topics with the bot
  * Times at which this is possible and what conversations topics are available are defined by the experimenter in the experiment configuration file.
* Type `/skip_to` to skip to a particular stage of the experiment
  * After you type this command, the bot will instruct you how to select your desired stage
  * Stages are defined in the experiment configuration file (see [here](json/README.md#span-idstages-experiment-stages-span))
  * Only available when the `experimenter` flag is set to `true` in the experiment configuration file (see [here](json/README.md#span-iddebug-debug-flags-span)))
* Type `/delete_me` to erase data of your interaction with the chatbot from the database
  * For the experimenter/developer: use this command to start interaction with the bot afresh.
  * Only available when the `experimenter` flag is set to `true` in the experiment configuration file (see [here](json/README.md#span-iddebug-debug-flags-span))
* Type `/delete_exp` to erase data of your interaction with the chatbot from the database
  * For the experimenter/developer: use this command to start the experiment afresh
  * Only available when the `experimenter` flag is set to `true` in the experiment configuration file (see [here](json/README.md#span-iddebug-debug-flags-span))
* Type `/log_part` to display the information that is stored in the database for the user from which this command is sent
  * This is the current information about the participant's stage, answers to questions, etc.
  * This will output to the terminal, where you have run the start command
  * Only available when the `experimenter` flag is set to `true` in the experiment configuration file (see [here](json/README.md#span-iddebug-debug-flags-span))
* Type `/log_exp` to display the information about the current experiment that is stored in the database
  * This is the current information about the number of participants currently assigned to each condition, etc.
  * This will also output to the terminal where the start command was run
  * Only available when the `experimenter` flag is set to `true` in the experiment configuration file (see [here](json/README.md#span-iddebug-debug-flags-span))
  
### Defining your Own Experiment

Head on over to [this page](/json/README.md) and take note of the instructions there!

### Downloading Data 

After the experiment is complete, you can download the data collected by the chatbot for all of the participants that interacted with the bot. This does not include any information that may identify the user, either directly or indirectly, unless the user themselves has provided such information in their interaction with the chatbot.

Simply run the command `npm run download-data`. This will save your data to the folder `results/<experimentID>` based on the experiment ID that is specified in the config file (`json/config.json`).

You can run this command any number of times you want, even during the experiment. Each time, the old data downloaded from the last time the command was run will be overwritten.

Data is saved in the formats JSON and CSV.

### Downloading Transcripts

The bot also saves transcripts of the conversation between each user and the chatbot, which includes every message exchanged between the user and the bot, along with the timestamps at which they were sent. This does not include any information that may identify the user, either directly or indirectly, unless the user themselves has provided such information in their interaction with the chatbot.

To download transcripts, run the command `npm run download-transcripts` in the terminal. This will save all the transcripts to the folder `results/<experimentID/transcripts`. Each of the transcripts is a text file entitled with the participants unique identifier randomly generated by the chatbot.

#### What Data is Saved to the Database?

Information about the experiment:
* Experiment information - name, ID
* All conditions and number of participants currently assigned to each of them

Information about the participant:
* Participant random unique identifier assigned by chatbot
* All participant parameters and their current values
* Current stage and current stage day
* Time stamps of start and beginning of each stage
* Assigned condition 
* All questions asked, answer(s) given (or lack thereof), timestamp of answer in participant timezone
  * This includes whether the question was repeated, answered with an invalid answer, or not answered at all.
* Transcripts of entire conversation exchanged between each user and chatbot

### Deleting Sensitive Data

In order for the chatbot to interact with the user, it requires information about the user's Telegram account, namely, an integer ID. Although this doesn't contain any direct information that can identify the owner of the Telegram account, it is unique to the user, so responses from the same user can be connected between different Telegram bots.

This information is temporarily stored in the database, and is required for the duration of the experiment. **After the experiment,** in order to remove user-identifying information from the database, you can run the command `npm run delete-sensitive` in the terminal. Running this command will give you a disclaimer that the sensitive information is required for the continued functioning of the chatbot, and will require you to type in the disclaimer before continuing, so that you don't accidentally delete the essential data.

### Deleting All Data

Once you are finished with the experiment and you have backed up all your data, you can delete all of the information related to your experiment that is stored in the database.

This is done by running the command `npm run delete-all` in the terminal. Running this command will give you a disclaimer that the information is required for the continued functioning of the chatbot, and will require you to type in the disclaimer before continuing, so that you don't accidentally delete the essential data.

### Generating Team Names

TODO: Fill this in

### Deploying the Bot Server to Heroku

* If you don't already have an account, create an account on [Heroku](heroku.com).
* Install the Heroku Command Line Interface (CLI) on your system as directed [here](https://devcenter.heroku.com/articles/heroku-cli#install-the-heroku-cli)
* On your system, open the terminal and navigate to the directory where you have cloned this repository
* Log in to Heroku on the terminal:
  * Run the command `heroku login`
  * Enter your credentials to log in.
* Create a new application on Heroku:
  * Run the command `heroku create <application_name>`
  * When the application has been created, a link will be displayed in the terminal that looks like: `https://<application_name>.herokuapp.com`
* Set the configuration variables:
  * Run the command `heroku config:set BOT_TOKEN=<bot_token>`
  * Run the command `heroku config:set DB_CONNECTION_STRING=<connection_string>`
    * Use the bot token and database connection string that you obtained as described in the section [Software Setup](#software-setup).
    * These are the same that appear in your `.env` file
  * Run the command `heroku config:set URL=<application_link`>
    * Use the application link that you obtained after running the `heroku create` command in the previous step
* Upload the software to your heroku application
  * Run the command `git push heroku main`
  * Watch the terminal for the build status and wait for it to report that the build has been completed.
* Upgrade the Heroku dyno type to the "Basic" plan, which costs $7/mo.
  * Run the command `heroku ps:type web=Basic`
* Celebrate!
  * You can now start interacting with your bot on Telegram!
  * Run the command `heroku logs --tail` to see the live terminal output of your hosted chatbot.

## Updating the Hosted Experiment

Once you host the chatbot experiment on Heroku for the first time, you might want to make changes to the experiment afterwards. To do this, simply edit the configuration file(s) as you please. Once you have tested your changes [locally](#hosting-the-bot-on-your-own-computer) and want to update the online chatbot, take the following steps:

* Commit your changes
  * Run the command `git commit -a -m'updated experiment'`
* Push the changes to Heroku 
  * Run the command `git push heroku main`
* As before, wait until the terminal reports that the build has been completed for the changes to be reflected in the chatbot

## Directory Structure of Repository

```
ReflectiveLearningChatbots
│   README.md
│   index.js (chatbot entry point)    
│   package.json
│   package-lock.json
│
└─── data
│   │   (store auxiliary data for defining experiments, such as team names, images, etc.)
│   
│   
└─── json
│   │   (json files for experiment definition)
│   │   README.md
│   
│
└─── results
│   │   (stores the experiment data downloaded from the database server)
│
└─── src
│   │   (JavaScript files for the chatbot logic)
│   │
│   └───apiControllers
│   │   │  (database helper functions)
│   │
│   └───models
│       │  (MongoDB schemas for different documents)
│   
└─── test
    │   (unit test scripts)  
```