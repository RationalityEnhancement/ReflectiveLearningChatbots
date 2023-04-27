import json
import pandas as pd
import moment
import numpy as np
import sys

# This script extracts data from the downloaded JSON file for the experiment Reflective Learning in Organizations
# and converts it into a CSV file, with each column containing answers to each of the questions
# How to run the script:
# python json_to_csv <experiment_id>

experiment_id = sys.argv[1]
results_folder = f'results/{experiment_id}'

with open(results_folder + '/data.json', 'r') as f:
    all_data = json.load(f)

next_states = {
    'setupQuestions': 'setup',
    'Onboarding': 'onboarding',
    'Morning-Goals-All': 'goal',
    'Pre-Reflection': 'reflection',
    'Int-Reflection': 'reflection',
    'Post-Test': 'post',
    "Pre-Test": "pre",
    "Pre-Test-2": "mid",
    "Goal-Setting": 'reflection',
    'Follow-Up': "followup",
    "Update-Times": "update"
}


def extract_continuous_interactions(allAnswers):
    # Possible continuous interactions: setup, onboarding, goal-setting, reflection, post-test
    interactions = []
    current_state = 'start'  # setup, onboarding, goal, reflection, post
    current_interaction = {}
    for answer in allAnswers:
        category = answer['qId'].split('.')[0]
        givenAnswer = answer['answer'][0]
        new_state = next_states[category]
        if new_state != current_state:
            if 'end' not in current_interaction and 'start' in current_interaction:
                current_interaction['end'] = current_interaction['start']
            interactions.append(current_interaction)
            current_interaction = {
                'type': new_state,
                'start': answer
            }
        else:
            if current_interaction['start']['answer'][0] in ["[No Response]", "[Repeat Question]"]:
                current_interaction['start'] = answer
            current_interaction['end'] = answer

        current_state = new_state

    if 'end' not in current_interaction and 'start' in current_interaction:
        current_interaction['end'] = current_interaction['start']
    interactions.append(current_interaction)
    interactions.pop(0)

    return interactions


participants = all_data['participants']

times = []

# Dictionary that has a key for every unique Id
# Each value is also a dictionary, that contains information about the participant and their interactions
part_info_dict = {}

def add_to_day(stages, stage, day, key, value):
    if stage not in stages:
        stages[stage] = {}
    if day not in stages[stage]:
        stages[stage][day] = {}
    if key in stages[stage][day]:
        stages[stage][day][key] += "|" + str(value)
    else:
        stages[stage][day][key] = str(value).replace("\n",".")

irrelevant_qids = ["readyToStart", "firstRelationshipPrompt", "askAddTaskGoals", "anythingElse", "wantRelationshipGoal",
                   "continueFromInfo", "continueFromExample", "continueFromRelInfo", "continueFromRelExample",
                   "addGoalsLater", "askReflectTaskGoals","wantContinue"]
irrelevant_categories = ["setupQuestions"]

df_columns = ["uniqueId", "teamName", "condition", "timezone", "morningTime", "eveningTime",
              "stageName", "stageDay",
              "goalSetComplete", "goalSetStart", "goalSetLength(s)",
              "wantGoalInfo", "wantGoalExample", "firstTaskGoal", "addTaskGoals", "addWorkGoalsLater",
              "wantRelGoalInfo", "wantRelGoalExample", "addFirstRelGoal", "addRelGoals", "addRelGoalsLater",
              "reflectionComplete", "reflectionStart", "reflectionLength(s)",
              "relGoalsProgress", "relMoreWork", "relImpact", "relEmotions", "relPursuit", "relRelevance",
              "day1RelPursuit", "day1RelRelevance", "day1RelMetaDescription", "day1RelMetaJudgement",
              "dayNRelPursuit", "dayNRelRelevance", "dayNRelMetaDescription", "dayNRelWhatChanged","dayNRelOtherChange",
              "dayNRelChangeMoreRelevant", "dayNRelChangeLessRelevant", "dayNRelChangeEquallyRelevant",
              "dayNRelCanYouImprove", "dayNRelChangeIdeas", "dayNRelChangeSuggestions",
              "relImproveGoalSetting", "relHowImprove", "relPlan", "relPlanRemember"
              "taskGoalsProgress", "moreWork", "impact", "emotions", "pursuitSatisfaction", "goalsImportance",
              "day1Pursuit", "day1Relevance", "day1MetaDescription", "day1MetaJudgement",
              "dayNPursuit", "dayNRelevance", "dayNMetaDescription", "dayNWhatChanged","dayNOtherChange",
              "dayNChangeMoreRelevant", "dayNChangeLessRelevant", "dayNChangeEquallyRelevant",
              "dayNCanYouImprove", "dayNChangeIdeas", "dayNChangeSuggestions",
              "improveGoalSetting", "howImprove", "plan", "planRemember",
              "survey"
              ]

for part in participants:
    key = part['uniqueId']
    if len(part['stages']['activity']) > 0:
        # if part['parameters']['PID'] == 'sribug': continue
        part_info_dict[key] = { "userData": {}, "stages": {}}
        part_info_dict[key]["userData"]["timezone"] = part['parameters']['timezone']
        part_info_dict[key]["userData"]['morningTime'] = part['parameters']['morningTime']
        part_info_dict[key]["userData"]['eveningTime'] = part['parameters']['eveningTime']
        part_info_dict[key]["userData"]['teamName'] = part['parameters']['PID']
        part_info_dict[key]["userData"]['condition'] = part['conditionName']
        part_info_dict[key]['stages'] = {}


        all_interactions = extract_continuous_interactions(part['answers'])

        for interaction in all_interactions:
            interaction_delta = moment.date(interaction['end']['answerTimeStamp']) - moment.date(interaction['start']['answerTimeStamp'])
            stageName = interaction['start']['stageName']
            stageDay = interaction['start']['stageDay']

            if interaction['type'] == "goal":
                complete = interaction['end']['answer'][0] != "[No Response]"
                add_to_day(part_info_dict[key]['stages'], stageName, stageDay, "goalSetComplete", complete)
                add_to_day(part_info_dict[key]['stages'], stageName, stageDay, "goalSetStart", interaction['start']['answerTimeStamp'])
                add_to_day(part_info_dict[key]['stages'], stageName, stageDay, "goalSetLength(s)", interaction_delta.seconds)
            elif interaction['type'] == "reflection":
                complete = interaction['end']['answer'][0] != "[No Response]"
                add_to_day(part_info_dict[key]['stages'], stageName, stageDay, "reflectionComplete", complete)
                add_to_day(part_info_dict[key]['stages'], stageName, stageDay, "reflectionStart", interaction['start']['answerTimeStamp'])
                add_to_day(part_info_dict[key]['stages'], stageName, stageDay, "reflectionLength(s)", interaction_delta.seconds)

        for answer in part['answers']:
            category, qId = answer['qId'].split('.')
            if qId not in irrelevant_qids and category not in irrelevant_categories:
                add_to_day(part_info_dict[key]['stages'], answer['stageName'], answer['stageDay'], qId, '|'.join(answer['answer']))

df_rows = []

stage_should_days = {
    "Onboarding":1,
    "Pre-Test":1, "Goal-Setting":2, "Pre-Test-2":1, "Intervention":2, "Post-Test":1, "Follow-Up":1
}

for uniqueId, part in part_info_dict.items():
    for stage in stage_should_days.keys():
        if stage in part["stages"]:
            should_days = max(part["stages"][stage].keys())
        else:
            should_days = stage_should_days[stage]
        days = list(range(1,should_days + 1))
        for day in days:
            row_dict = {}
            if stage in part["stages"] and day in part["stages"][stage]:
                row_dict = part["stages"][stage][day].copy()
            row_dict["uniqueId"] = uniqueId
            row_dict["stageDay"] = day
            row_dict["stageName"] = stage
            row_dict.update(part["userData"])
            df_rows.append(row_dict)

csv_df = pd.DataFrame.from_records(df_rows, columns=df_columns)

display_cols = ["uniqueId", "stageName", "stageDay", "reflectionComplete", "reflectionStart", "reflectionLength(s)","survey"]
#print(json.dumps(part_info_dict, sort_keys=False, indent=4))
print(csv_df[display_cols])
csv_df.to_csv(results_folder + '/csv_data.csv')
