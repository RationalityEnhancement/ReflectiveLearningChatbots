# Reflective Learning Chatbots

This repository contains a Node.js infrastructure to specify chatbots for reflective learning. A reflective learning chatbot is one that interacts with a user, asking questions which prompt them to reflect on some aspect of their lives. The main purpose of this software is for running experiments on participants and collecting their answers as data.

Once downloaded and set up, the infrastructure can be used by simply designing the experiments, i.e., the questions to be asked, when they are to be asked, etc., in a file and running the software. Read on for further instructions on how this is done...

## Setting up

Setting up this repository assumes basic knowledge and installation of [Git](https://git-scm.com/), basic experience interacting with [Command Line Interfaces](https://en.wikipedia.org/wiki/Command-line_interface), and some familiarity with the [JSON](https://www.json.org/json-en.html) file format.

### Database

* Create an account on [MongoDB Cloud](https://www.mongodb.com/cloud), if you don't have one already. 
  * Follow instructions to create a new project in MongoDB Atlas.
* If you already have an account, log in to MongoDB Cloud and navigate to MongoDB Atlas. 
  * Navigate to your organization, where you will find an overview of all your projects. Click on "New Project" in the top right.
* Follow instructions to create a database cluster within this project. The free (shared) version with default settings will work as well.
* You will be asked to create a user+password to ensure restricted access to the database. Once this is done, creating the cluster may take a few minutes.
* Navigate to the 'Clusters' tab and click on 'CONNECT'. Choose the third option (MongoDB Compass), and copy the connection string starting with _mongodb+srv://_.
* The connection string will have a part _\<password\>_ which should be replaced with the password of the user created above. Save this connection string for later.
* On the left, choose 'Network Access', click 'ADD IP ADDRESS', and add the address 0.0.0.0. This will ensure that the database is accessible by any user that has the user password

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
* Copy the file [.env_template](./.env_template) and paste it in the same directory. Rename this to "_.env_" (without quotes).
* Open the _.env_ file with a text editor, enter the bot token and the database connection strings respectively after the '=' sign, and save this file. It should now look similar to this:

```
BOT_TOKEN=1234567890:eXaMpLeB0tT0kEnBlaHblAhBlaH
DB_CONNECTION_STRING=mongodb+srv://username:Password@cluster0.iblwy.mongodb.net/test
```
* Celebrate

### Hosting the Bot on Your Own Computer

To be able to interact with the bot on Telegram, the bot server (which is defined in this software) must be hosted and running. This can be done on your own computer. This also means that as long as this software is running in your computer, anybody anywhere can interact with your bot. However, if this software is not running on any device, then the bot cannot be interacted with. 

Starting the bot server on your own computer is easy. In the terminal, run the command `npm run start`. You can now interact with the bot on Telegram as long as this terminal window is open and the server is still running.

### Interacting with the Bot on Telegram

* Open Telegram and start a chat with the bot username defined by you when you set up the bot.
* Type `/start` to start chatting!
* Type `/repeat` to have the bot repeat the last question, as long as an answer has not yet been provided.
* Type `/delete_me` to erase your data from the database
  * For the experimenter/developer: use this command to start interaction with the bot afresh.
* Type `/log_part` to log the user information that is stored in the database
  * This will output to the terminal, where you have run the start command
More commands coming soon!

### Defining your Own Experiment

Head on over to [this page](/json) and take note of the instructions there!

### Deploying the Server to Heroku

Instructions coming soon, when I myself figure out how to do this.
