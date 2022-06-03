# Reflective Learning Chatbots

This repository contains a Node.js infrastructure to specify chatbots for reflective learning. A reflective learning chatbot is one that interacts with a user, asking questions which prompt them to reflect on some aspect of their lives. The main purpose of this software is for running experiments on participants and collecting their answers as data.

Once downloaded and set up, the infrastructure can be used by simply designing the experiments, i.e., the questions to be asked, when they are to be asked, etc., in a file and running the software. Read on for further instructions on how this is done...

## Setting up

Setting up this repository assumes basic knowledge and installation of [Git](https://git-scm.com/), basic experience interacting with [Command Line Interfaces](https://en.wikipedia.org/wiki/Command-line_interface), and some familiarity with the [JSON](https://www.json.org/json-en.html) file format.

To completely set up a Reflective Learning Chatbot that you can interact with, you will need the following things: 
* A MongoDB Cloud account with a cluster set up in MongoDB Atlas
* A Telegram bot
* The software in this repository
* The bot server running, either on a local system or on Heroku

The rest of the instructions will walk you through each of these steps.

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
* Use git to clone this repository into a local directory of your choice. Navigate to the directory in which you have cloned this repository.
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

Starting the bot server on your own computer is easy. In the terminal, run the command `npm run start-local`. You can now interact with the bot on Telegram as long as this terminal window is open and the server is still running.

### Interacting with the Bot on Telegram

* Open Telegram and start a chat with the bot username defined by you when you set up the bot.
* Type `/start` to start chatting!
* Type `/repeat` to have the bot repeat the last question, as long as an answer has not yet been provided.
* Type `/next` to have the bot display the next question that is scheduled to appear.
  * If nothing appears, it is likely that the debug settings for this are turned off. (see instructions to define experiments)
* Type `/delete_me` to erase your data from the database
  * For the experimenter/developer: use this command to start interaction with the bot afresh.
* Type `/log_part` to display the information that is stored in the database for the user from which this command is sent
  * This is the current information about the participant's stage, answers to questions, etc.
  * This will output to the terminal, where you have run the start command
* Type `/log_exp` to display the information about the current experiment that is stored in the database
  * This is the current information about the number of participants currently assigned to each condition, etc.
  * This will also output to the terminal where the start command was run
* This will output to the terminal, where you have run the start command
More commands coming soon!

### Defining your Own Experiment

Head on over to [this page](/json/README.md) and take note of the instructions there!

### Downloading Data 

After the experiment is complete, you can download the data collected by the chatbot for all of the participants that interacted with the bot. This does not include any information that may identify the user, either directly or indirectly.

Simply run the command `npm run download-data`. This will save your data to the folder `results/<experimentID>` based on the experiment ID that is specified in the config file (`json/config.json`).

You can run this command any number of times you want, even during the experiment. Each time, the old data downloaded from the last time the command was run will be overwritten.

Data is saved in the formats JSON and CSV.

### Deleting Sensitive Data

In order for the chatbot to interact with the user, it requires information about the user's Telegram account, namely, an integer ID. Although this doesn't contain any direct information that can identify the owner of the Telegram account, it is unique to the user, so responses from the same user can be connected between different Telegram bots.

This information is temporarily stored in the database, and is required for the duration of the experiment. **After the experiment,** in order to remove user-identifying information from the database, you can run the command `npm run delete-sensitive` in the terminal. Running this command will give you a disclaimer that the sensitive information is required for the continued functioning of the chatbot, and will require you to type in the disclaimer before continuing, so that you don't accidentally delete the essential data.

### Deploying the Bot Server to Heroku

Instructions coming soon, when I myself figure out how to do this.
